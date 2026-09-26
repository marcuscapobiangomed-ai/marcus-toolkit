"""Busca real em bases científicas. Nenhuma contagem ou metadado vem de LLM.

- PubMed: NCBI E-utilities (esearch + efetch).
- Europe PMC: REST API (search, resultType=core).
- LILACS / SciELO: os portais bloqueiam acesso automatizado, então a busca é
  feita no portal e o resultado exportado em RIS é importado aqui — a contagem
  continua sendo a real do arquivo exportado.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EUROPEPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
USER_AGENT = "artigos-v2/2.0 (revisao de literatura; contato via NCBI_EMAIL)"


@dataclass
class Registro:
    base: str
    id_base: str
    titulo: str
    autores: list[str] = field(default_factory=list)  # "Sobrenome AB"
    revista: str = ""
    ano: str = ""
    volume: str = ""
    numero: str = ""
    paginas: str = ""
    doi: str = ""
    pmid: str = ""
    resumo: str = ""
    tipos: list[str] = field(default_factory=list)
    idioma: str = ""
    issn: str = ""
    url: str = ""
    acesso: str = ""  # data de acesso ao URL, como texto ("12 set 2026")

    @property
    def chave_dedup(self) -> str:
        if self.doi:
            return "doi:" + self.doi.lower().strip()
        if self.pmid:
            return "pmid:" + self.pmid
        return "titulo:" + re.sub(r"[^a-z0-9]", "", self.titulo.lower())[:120]

    def para_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def de_dict(cls, dados: dict) -> "Registro":
        # estado.json antigo não tem issn/url/acesso; chave desconhecida (versão futura) é ignorada
        conhecidos = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in dados.items() if k in conhecidos})


@dataclass
class ResultadoBusca:
    base: str
    consulta: str
    total: int
    registros: list[Registro]
    data_busca: str
    traducao: str = ""  # como a base interpretou a consulta (PubMed QueryTranslation)


def _get(url: str, timeout: float = 60) -> bytes:
    requisicao = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ultimo = None
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(requisicao, timeout=timeout) as resposta:
                return resposta.read()
        except Exception as e:  # rede instável: repete com espera
            ultimo = e
            time.sleep(1.5 * (tentativa + 1))
    raise RuntimeError(f"Falha ao acessar {url.split('?')[0]}: {ultimo}")


def _texto(elemento) -> str:
    if elemento is None:
        return ""
    return re.sub(r"\s+", " ", "".join(elemento.itertext())).strip()


def normalizar_issn(valor: str) -> str:
    """Extrai o primeiro ISSN do texto e devolve no formato 0102-311X ("" se não houver)."""
    m = re.search(r"\b(\d{4})-?(\d{3}[\dXx])\b", valor or "")
    return f"{m.group(1)}-{m.group(2).upper()}" if m else ""


def doi_de_url(valor: str) -> str:
    """'https://doi.org/10.1590/X' -> '10.1590/X'; qualquer outro texto -> ''."""
    m = re.match(r"^\s*(?:https?://)?(?:dx\.)?doi\.org/(10\.\S+?)[\s.]*$", valor or "", re.I)
    return m.group(1) if m else ""


# ISSN -> abreviatura NLM (MedlineTA); vale para o processo inteiro, o catálogo quase não muda
_CACHE_NLM: dict[str, str] = {}

# Etiquetas de campo MeSH aceitas pelo PubMed ("X"[MeSH Terms], X[mh], "X"[majr:noexp]...)
_ETIQUETA_MESH = r"(?i:mesh\s+major\s+topic|mesh\s+terms|mesh|mh|majr)(?:\s*:\s*(?i:noexp))?"
_OPERADOR = r"(?i:AND|OR|NOT)\b"
PADRAO_MESH = re.compile(
    r'(?:"(?P<citado>[^"]+)"'
    r"|(?<![\w\-/])(?!" + _OPERADOR + r")(?P<livre>[^\s()\"\[\]]+(?:\s+(?!" + _OPERADOR
    + r")[^\s()\"\[\]]+)*))"
    r"\s*\[\s*(?P<etiqueta>" + _ETIQUETA_MESH + r")\s*\]")


# --------------------------------------------------------------------------- PubMed

class PubMed:
    def __init__(self, api_key: str | None = None, email: str | None = None):
        self.api_key = api_key
        self.email = email
        self._ultimo = 0.0
        self._cache_mesh: dict[str, str] = {}  # termo em minúsculas -> descritor oficial ("" = inexistente)

    def _params(self, **extra) -> str:
        params = {"tool": "artigos-v2", **extra}
        if self.api_key:
            params["api_key"] = self.api_key
        if self.email:
            params["email"] = self.email
        return urllib.parse.urlencode(params)

    def _respeitar_limite(self):
        intervalo = 0.11 if self.api_key else 0.35  # 10 req/s com chave, 3 sem
        espera = self._ultimo + intervalo - time.monotonic()
        if espera > 0:
            time.sleep(espera)
        self._ultimo = time.monotonic()

    def contar(self, consulta: str) -> tuple[int, str]:
        self._respeitar_limite()
        dados = json.loads(_get(f"{EUTILS}/esearch.fcgi?" + self._params(db="pubmed", term=consulta,
                                                                          retmode="json", retmax=0)))
        resultado = dados["esearchresult"]
        return int(resultado.get("count", 0)), resultado.get("querytranslation", "")

    def buscar_ids(self, consulta: str, limite: int, ordenar: str = "relevance") -> tuple[int, list[str], str]:
        self._respeitar_limite()
        dados = json.loads(_get(f"{EUTILS}/esearch.fcgi?" + self._params(
            db="pubmed", term=consulta, retmode="json", retmax=limite, sort=ordenar)))
        resultado = dados["esearchresult"]
        return int(resultado.get("count", 0)), resultado.get("idlist", []), resultado.get("querytranslation", "")

    def buscar(self, consulta: str, limite: int, data_busca: str) -> ResultadoBusca:
        total, ids, traducao = self.buscar_ids(consulta, limite)
        return ResultadoBusca("PubMed", consulta, total, self.detalhes(ids), data_busca, traducao)

    def detalhes(self, pmids: list[str]) -> list[Registro]:
        registros = []
        for i in range(0, len(pmids), 100):
            self._respeitar_limite()
            lote = ",".join(pmids[i:i + 100])
            raiz = ET.fromstring(_get(f"{EUTILS}/efetch.fcgi?" + self._params(db="pubmed", id=lote, retmode="xml")))
            registros.extend(self._parse(artigo) for artigo in raiz.findall("PubmedArticle"))
        return registros

    # ------------------------------------------------------------- NLM Catalog

    def abreviatura_nlm(self, issn: str) -> str:
        """Abreviatura oficial (MedlineTA) da revista pelo ISSN no NLM Catalog.

        Devolve "" quando a revista não está no catálogo ou não tem abreviatura
        (comum em revistas só do SciELO/LILACS). Erro de rede sobe para quem chamou
        e não entra no cache.
        """
        issn = normalizar_issn(issn)
        if not issn:
            return ""
        if issn in _CACHE_NLM:
            return _CACHE_NLM[issn]
        self._respeitar_limite()
        busca = json.loads(_get(f"{EUTILS}/esearch.fcgi?" + self._params(
            db="nlmcatalog", term=f'"{issn}"[ISSN]', retmode="json")))
        ids = busca["esearchresult"].get("idlist", [])[:10]
        abreviatura = ""
        if ids:
            self._respeitar_limite()
            resumo = json.loads(_get(f"{EUTILS}/esummary.fcgi?" + self._params(
                db="nlmcatalog", id=",".join(ids), retmode="json")))["result"]
            candidatos = [resumo[i] for i in ids if isinstance(resumo.get(i), dict)]
            # indexada no MEDLINE hoje primeiro; depois qualquer uma com abreviatura
            candidatos.sort(key=lambda c: c.get("currentindexingstatus") != "Y")
            for c in candidatos:
                abreviatura = (c.get("medlineta") or c.get("isoabbreviation") or "").strip()
                if abreviatura:
                    break
        _CACHE_NLM[issn] = abreviatura
        return abreviatura

    # --------------------------------------------------------------------- MeSH

    def descritor_mesh(self, termo: str) -> str:
        """Nome oficial do descritor MeSH para o termo ("" se não existe).

        Aceita o próprio descritor ou um termo de entrada ("Heart Attack" ->
        "Myocardial Infarction"). Qualificadores e conceitos suplementares não contam.
        """
        chave = re.sub(r"\s+", " ", termo).strip().lower()
        if chave in self._cache_mesh:
            return self._cache_mesh[chave]
        self._respeitar_limite()
        busca = json.loads(_get(f"{EUTILS}/esearch.fcgi?" + self._params(
            db="mesh", term=f'"{chave}"[MH]', retmode="json")))
        ids = [i for i in busca["esearchresult"].get("idlist", []) if i.startswith("68")][:10]
        oficial = ""
        if ids:
            self._respeitar_limite()
            resumo = json.loads(_get(f"{EUTILS}/esummary.fcgi?" + self._params(
                db="mesh", id=",".join(ids), retmode="json")))["result"]
            for i in ids:
                termos = (resumo.get(i) or {}).get("ds_meshterms") or []
                if any(t.lower() == chave for t in termos):
                    oficial = termos[0]
                    break
        self._cache_mesh[chave] = oficial
        return oficial

    def validar_descritores_mesh(self, consulta: str) -> tuple[str, list[str]]:
        """Confere cada descritor marcado como MeSH na estratégia.

        Descritor inexistente vira texto livre ("X"[tiab]) e entra na lista de
        inválidos; termo de entrada é trocado pelo descritor oficial, mantendo a
        etiqueta. Sem rede, devolve a consulta intacta e lista vazia.
        """
        achados = list(PADRAO_MESH.finditer(consulta or ""))
        if not achados:
            return consulta, []
        oficiais = {}
        try:
            for m in achados:
                termo = (m.group("citado") or m.group("livre")).split("/")[0].strip()
                if termo.lower() not in oficiais:
                    oficiais[termo.lower()] = self.descritor_mesh(termo)
        except Exception:  # rede, cota, JSON inesperado: melhor a consulta original que nenhuma
            return consulta, []

        invalidos = []

        def trocar(m):
            bruto = (m.group("citado") or m.group("livre")).strip()
            termo, _, qualificador = bruto.partition("/")
            termo = termo.strip()
            oficial = oficiais.get(termo.lower(), "")
            if not oficial:
                if termo.lower() not in (i.lower() for i in invalidos):
                    invalidos.append(termo)
                return f'"{termo}"[tiab]'
            if oficial.lower() == termo.lower():
                return m.group(0)
            return f'"{oficial}{"/" + qualificador if qualificador else ""}"[{m.group("etiqueta")}]'

        return PADRAO_MESH.sub(trocar, consulta), invalidos

    @staticmethod
    def _parse(artigo) -> Registro:
        citacao = artigo.find("MedlineCitation")
        art = citacao.find("Article")
        revista = art.find("Journal")
        edicao = revista.find("JournalIssue") if revista is not None else None

        ano = _texto(edicao.find("PubDate/Year")) if edicao is not None else ""
        if not ano and edicao is not None:
            ano = _texto(edicao.find("PubDate/MedlineDate"))[:4]

        autores = []
        for autor in art.findall("AuthorList/Author"):
            sobrenome = _texto(autor.find("LastName"))
            if sobrenome:
                autores.append(f"{sobrenome} {_texto(autor.find('Initials'))}".strip())
            elif autor.find("CollectiveName") is not None:
                autores.append(_texto(autor.find("CollectiveName")))

        partes_resumo = []
        for parte in art.findall("Abstract/AbstractText"):
            rotulo = parte.get("Label")
            texto = _texto(parte)
            partes_resumo.append(f"{rotulo}: {texto}" if rotulo else texto)

        doi = ""
        for eloc in art.findall("ELocationID"):
            if eloc.get("EIdType") == "doi":
                doi = _texto(eloc)
        if not doi:
            for aid in artigo.findall("PubmedData/ArticleIdList/ArticleId"):
                if aid.get("IdType") == "doi":
                    doi = _texto(aid)

        abreviatura = _texto(citacao.find("MedlineJournalInfo/MedlineTA")) or (
            _texto(revista.find("ISOAbbreviation")) if revista is not None else "")

        issns = {} if revista is None else {i.get("IssnType", ""): _texto(i) for i in revista.findall("ISSN")}
        issn = normalizar_issn(issns.get("Print") or issns.get("Electronic") or next(iter(issns.values()), "")
                               or _texto(citacao.find("MedlineJournalInfo/ISSNLinking")))

        return Registro(
            base="PubMed",
            id_base=_texto(citacao.find("PMID")),
            pmid=_texto(citacao.find("PMID")),
            titulo=_texto(art.find("ArticleTitle")).rstrip("."),
            autores=autores,
            revista=abreviatura,
            ano=ano,
            volume=_texto(edicao.find("Volume")) if edicao is not None else "",
            numero=_texto(edicao.find("Issue")) if edicao is not None else "",
            paginas=_texto(art.find("Pagination/MedlinePgn")) or next(
                (_texto(e) for e in art.findall("ELocationID") if e.get("EIdType") == "pii"), ""),
            doi=doi,
            resumo=" ".join(partes_resumo),
            tipos=[_texto(t) for t in art.findall("PublicationTypeList/PublicationType")],
            idioma=_texto(art.find("Language")),
            issn=issn,
        )


# ----------------------------------------------------------------------- Europe PMC

class EuropePMC:
    def buscar(self, consulta: str, limite: int, data_busca: str) -> ResultadoBusca:
        registros, cursor, total = [], "*", 0
        while len(registros) < limite:
            tamanho = min(1000, limite - len(registros))
            url = EUROPEPMC + "?" + urllib.parse.urlencode({
                "query": consulta, "format": "json", "resultType": "core",
                "pageSize": tamanho, "cursorMark": cursor})
            dados = json.loads(_get(url))
            total = int(dados.get("hitCount", 0))
            pagina = (dados.get("resultList") or {}).get("result", [])
            registros.extend(self._parse(r) for r in pagina)
            proximo = dados.get("nextCursorMark")
            if not pagina or not proximo or proximo == cursor:
                break
            cursor = proximo
        return ResultadoBusca("Europe PMC", consulta, total, registros[:limite], data_busca)

    def contar(self, consulta: str) -> tuple[int, str]:
        url = EUROPEPMC + "?" + urllib.parse.urlencode({"query": consulta, "format": "json", "pageSize": 1})
        return int(json.loads(_get(url)).get("hitCount", 0)), ""

    @staticmethod
    def _parse(r: dict) -> Registro:
        jornal = r.get("journalInfo") or {}
        autores = []
        for a in (r.get("authorList") or {}).get("author", []):
            if a.get("lastName"):
                autores.append(f"{a['lastName']} {a.get('initials', '')}".strip())
            elif a.get("collectiveName"):
                autores.append(a["collectiveName"])
        resumo = re.sub(r"<[^>]+>", " ", html.unescape(r.get("abstractText", "")))
        return Registro(
            base="Europe PMC",
            id_base=f"{r.get('source', '')}:{r.get('id', '')}",
            pmid=r.get("pmid", "") or "",
            titulo=html.unescape(r.get("title", "")).rstrip("."),
            autores=autores,
            revista=(jornal.get("journal") or {}).get("isoabbreviation")
            or (jornal.get("journal") or {}).get("title", ""),
            ano=str(jornal.get("yearOfPublication") or r.get("pubYear") or ""),
            volume=str(jornal.get("volume", "") or ""),
            numero=str(jornal.get("issue", "") or ""),
            paginas=r.get("pageInfo", "") or "",
            doi=r.get("doi", "") or "",
            resumo=re.sub(r"\s+", " ", resumo).strip(),
            tipos=(r.get("pubTypeList") or {}).get("pubType", []),
            idioma=r.get("language", "") or "",
            issn=normalizar_issn((jornal.get("journal") or {}).get("issn") or (jornal.get("journal") or {}).get("essn") or ""),
        )


# ---------------------------------------------------------------- RIS (LILACS/SciELO)

def importar_ris(caminho: str | Path, base: str) -> list[Registro]:
    """Lê um arquivo RIS exportado do portal BVS (LILACS) ou SciELO."""
    registros, atual = [], {}
    for linha in Path(caminho).read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"^([A-Z][A-Z0-9])  - ?(.*)$", linha)
        if not m:
            continue
        tag, valor = m.group(1), m.group(2).strip()
        if tag == "ER":
            if atual:
                registros.append(_registro_ris(atual, base, len(registros) + 1))
            atual = {}
        else:
            atual.setdefault(tag, []).append(valor)
    if atual:
        registros.append(_registro_ris(atual, base, len(registros) + 1))
    return registros


def _registro_ris(campos: dict, base: str, n: int) -> Registro:
    def um(*tags):
        for t in tags:
            if campos.get(t):
                return campos[t][0]
        return ""

    autores = [_autor_ris(nome) for nome in campos.get("AU", []) + campos.get("A1", []) if nome.strip()]
    inicio, fim = um("SP"), um("EP")
    doi = doi_de_url(um("DO")) or um("DO")
    url = ""
    for endereco in campos.get("UR", []):
        if doi_de_url(endereco):  # link do doi.org é o DOI, não um URL de acesso
            doi = doi or doi_de_url(endereco)
        elif not url and re.match(r"^https?://", endereco.strip(), re.I):
            url = endereco.strip()
    return Registro(
        base=base,
        id_base=um("ID", "AN") or f"{base}-{n}",
        titulo=um("TI", "T1").rstrip("."),
        autores=autores,
        revista=um("J2", "JA", "JO", "T2"),
        ano=(um("PY", "Y1", "DA")[:4]),
        volume=um("VL"),
        numero=um("IS"),
        paginas=f"{inicio}-{fim}" if inicio and fim else inicio,
        doi=doi,
        resumo=" ".join(campos.get("AB", []) + campos.get("N2", [])),
        tipos=campos.get("M3", []) + campos.get("TY", []),
        idioma=um("LA"),
        issn=normalizar_issn(" ".join(campos.get("SN", []))),
        url=url,
    )


# partículas de prenome que não viram inicial — só em minúsculas: "E" maiúsculo é inicial (Altamirano, E)
_PARTICULAS = {"de", "da", "do", "dos", "das", "e", "del", "della", "di", "du", "van", "von", "der", "y"}


def _autor_ris(nome: str) -> str:
    """'Silva, Maria de Fátima' -> 'Silva MF'; 'Altamirano, E.' -> 'Altamirano E'."""
    nome = re.sub(r"\s+", " ", nome).strip()
    if "," not in nome:
        return nome
    sobrenome, prenomes = [p.strip() for p in nome.split(",", 1)]
    pedacos = [p for p in re.split(r"[\s.\-]+", prenomes) if p and p[0].isalpha()]
    iniciais = ""
    for p in pedacos:
        if p in _PARTICULAS:
            continue
        # "Silva, MF" já vem em iniciais; "SILVA, ANA BEATRIZ" é prenome em caixa alta
        ja_iniciais = (p.isupper() and p.isalpha() and len(pedacos) == 1
                       and (len(p) <= 2 or (len(p) == 3 and sum(c in "AEIOU" for c in p) <= 1)))
        iniciais += p if ja_iniciais else p[0].upper()
    return f"{sobrenome} {iniciais}".strip()


def deduplicar(resultados: list[ResultadoBusca]) -> tuple[list[Registro], int]:
    """Remove duplicatas entre bases (DOI > PMID > título). Mantém o primeiro visto."""
    vistos, unicos, duplicados = {}, [], 0
    for resultado in resultados:
        for r in resultado.registros:
            chaves = {r.chave_dedup, "titulo:" + re.sub(r"[^a-z0-9]", "", r.titulo.lower())[:120]}
            if r.pmid:
                chaves.add("pmid:" + r.pmid)
            if any(c in vistos for c in chaves):
                duplicados += 1
                existente = next(vistos[c] for c in chaves if c in vistos)
                # completa metadados faltantes do registro mantido
                for campo in ("doi", "pmid", "resumo", "volume", "numero", "paginas", "issn", "url"):
                    if not getattr(existente, campo) and getattr(r, campo):
                        setattr(existente, campo, getattr(r, campo))
                continue
            for c in chaves:
                vistos[c] = r
            unicos.append(r)
    return unicos, duplicados

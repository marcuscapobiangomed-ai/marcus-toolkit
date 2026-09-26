"""Checagens online independentes: referência existe? a busca do PubMed reproduz?"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EUROPEPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"


class Verificador:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self._ultimo = 0.0

    def _get_json(self, url: str) -> dict:
        espera = self._ultimo + (0.12 if self.api_key else 0.36) - time.monotonic()
        if espera > 0:
            time.sleep(espera)
        self._ultimo = time.monotonic()
        requisicao = urllib.request.Request(url, headers={"User-Agent": "artigos-v2-auditoria/2.0"})
        for tentativa in range(3):
            try:
                with urllib.request.urlopen(requisicao, timeout=40) as r:
                    return json.loads(r.read().decode("utf-8"))
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))
        return {}

    def _esearch(self, termo: str, retmax: int = 3) -> tuple[int, list[str]]:
        params = {"db": "pubmed", "term": termo, "retmode": "json", "retmax": retmax, "tool": "artigos-v2"}
        if self.api_key:
            params["api_key"] = self.api_key
        dados = self._get_json(f"{EUTILS}/esearch.fcgi?" + urllib.parse.urlencode(params))["esearchresult"]
        return int(dados.get("count", 0)), dados.get("idlist", [])

    def _titulos_pubmed(self, ids: list[str]) -> dict[str, str]:
        if not ids:
            return {}
        params = {"db": "pubmed", "id": ",".join(ids), "retmode": "json", "tool": "artigos-v2"}
        if self.api_key:
            params["api_key"] = self.api_key
        dados = self._get_json(f"{EUTILS}/esummary.fcgi?" + urllib.parse.urlencode(params)).get("result", {})
        return {i: dados.get(i, {}).get("title", "") for i in ids}

    def contar_pubmed(self, estrategia: str) -> int:
        return self._esearch(estrategia, retmax=0)[0]

    def verificar_descritor_mesh(self, termo: str) -> dict:
        """O termo é o nome exato de um descritor MeSH?

        No PubMed, "Termo"[mh] só recupera algo com o nome do descritor; um sinônimo (termo de
        entrada, ex.: "High Blood Pressure") ou termo inexistente ("Predictive Factors") volta vazio.
        Devolve {"existe": bool, "descritor": nome oficial quando o termo é só sinônimo}.
        """
        termo = re.sub(r"\s+", " ", termo.strip().strip('"*')).strip()
        params = {"db": "mesh", "term": f'"{termo}"[MeSH Terms]', "retmode": "json", "retmax": 5, "tool": "artigos-v2"}
        if self.api_key:
            params["api_key"] = self.api_key
        ids = self._get_json(f"{EUTILS}/esearch.fcgi?" + urllib.parse.urlencode(params))["esearchresult"].get("idlist", [])
        if not ids:
            return {"existe": False, "descritor": ""}
        params = {"db": "mesh", "id": ",".join(ids), "retmode": "json", "tool": "artigos-v2"}
        if self.api_key:
            params["api_key"] = self.api_key
        dados = self._get_json(f"{EUTILS}/esummary.fcgi?" + urllib.parse.urlencode(params)).get("result", {})
        nomes = [(dados.get(i) or {}).get("ds_meshterms") or [""] for i in ids]
        for nome in nomes:  # o primeiro termo do registro é o nome do descritor
            if nome[0].lower() == termo.lower():
                return {"existe": True, "descritor": nome[0]}
        return {"existe": False, "descritor": nomes[0][0]}

    def verificar_referencia(self, referencia: str) -> dict:
        """Procura a referência no PubMed (PMID, DOI, título) e, se não achar, no Europe PMC."""
        titulo = extrair_titulo(referencia)
        pmid = re.search(r"PMID:?\s*(\d{5,9})", referencia, re.I)
        doi = re.search(r"(10\.\d{4,9}/[^\s,;]+[^\s,;.])", referencia)
        try:
            # Com PMID/DOI, basta o título da base estar contido na referência (não depende de achar o título).
            if pmid:
                encontrado = self._titulos_pubmed([pmid.group(1)])
                t = encontrado.get(pmid.group(1), "")
                if t and similaridade(t, referencia) >= 0.7:
                    return {"status": "verificada", "fonte": f"PubMed PMID {pmid.group(1)}", "titulo_base": t}
            if doi:
                n, ids = self._esearch(f"{doi.group(1)}[doi]")
                if n:
                    t = self._titulos_pubmed(ids[:1]).get(ids[0], "")
                    if similaridade(t, referencia) >= 0.7:
                        return {"status": "verificada", "fonte": f"PubMed via DOI (PMID {ids[0]})", "titulo_base": t}
                    return {"status": "divergente", "fonte": f"DOI aponta para outro artigo (PMID {ids[0]})",
                            "titulo_base": t}
            if titulo and len(titulo.split()) >= 4:
                palavras = [w for w in re.findall(r"[A-Za-zÀ-ÿ]{4,}", titulo)][:12]
                n, ids = self._esearch(" AND ".join(f"{w}[ti]" for w in palavras), retmax=5)
                for i, t in self._titulos_pubmed(ids).items():
                    if similaridade(t, titulo) >= 0.75:
                        return {"status": "verificada", "fonte": f"PubMed por título (PMID {i})", "titulo_base": t}
                # SciELO/LILACS costumam estar no Europe PMC
                consulta = f'TITLE:"{titulo[:200]}"' if len(titulo) < 200 else " AND ".join(f"TITLE:{w}" for w in palavras)
                dados = self._get_json(EUROPEPMC + "?" + urllib.parse.urlencode(
                    {"query": consulta, "format": "json", "pageSize": 5}))
                for r in (dados.get("resultList") or {}).get("result", []):
                    if similaridade(r.get("title", ""), titulo) >= 0.75:
                        return {"status": "verificada", "fonte": f"Europe PMC ({r.get('source')}:{r.get('id')})",
                                "titulo_base": r.get("title", "")}
        except Exception as e:
            return {"status": "erro", "fonte": f"falha na consulta: {e}", "titulo_base": ""}
        return {"status": "nao_encontrada", "fonte": "não localizada no PubMed nem no Europe PMC",
                "titulo_base": ""}


def extrair_titulo(referencia: str) -> str:
    """Heurística: em Vancouver/ABNT o título é o trecho após o bloco de autores."""
    texto = re.sub(r"^\s*\[?\d+[\.\)\]]\s*", "", referencia).strip()
    partes = [p.strip() for p in re.split(r"\.\s+", texto) if p.strip()]
    if len(partes) < 2:
        return texto
    i = 0
    while i < len(partes) - 1 and i <= 8 and _parece_autoria(partes[i]):
        i += 1
    return partes[i].strip(" .")


PARTICULAS = r"(?:de|da|do|dos|das|del|della|di|du|van|von|der|den|le|la|e)"


def _parece_autoria(trecho: str) -> bool:
    itens = [x.strip() for x in re.split(r"[,;]", trecho) if x.strip()]
    # Vancouver: "Silva AB, de Oliveira GMM, Lima ÂMLD, et al"
    autor = rf"(?:(?:{PARTICULAS}|[A-ZÀ-Ý][\w'’\-À-ÿ]*)\s)+[A-ZÀ-Ý]{{1,5}}"
    if itens and all(re.fullmatch(rf"{autor}|et al\.?|[A-ZÀ-Ý][\w'’\-À-ÿ ]+ (?:Group|Consortium|Collaborators)", x)
                     for x in itens):
        return True
    # ABNT: "SILVA, A", "B.; SOUZA, C", "D"
    if re.search(r"\b[A-ZÀ-Ý]{2,}\b", trecho) and len(trecho.split()) <= 6 and not re.search(r"[a-zà-ÿ]{4,}", trecho):
        return True
    return bool(re.fullmatch(r"([A-Z]\.?\s?;?\s?)+", trecho))


def _tokens(texto: str) -> set[str]:
    return {w for w in re.findall(r"[a-zà-ÿ0-9]{3,}", texto.lower())}


def similaridade(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))

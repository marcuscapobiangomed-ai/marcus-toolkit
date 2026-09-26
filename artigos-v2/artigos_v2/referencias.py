"""Referências: formatação (Vancouver / ABNT) a partir de metadados verificados
e resolução das citações [R12] escritas pelo modelo.

O modelo só enxerga chaves curtas (R1..Rn) de registros reais. Qualquer chave
que não exista é removida do texto e registrada como citação bloqueada, então
o artigo final não tem como citar uma referência inventada.
"""

from __future__ import annotations

import os
import re
from dataclasses import fields, replace

from .bases import PubMed, Registro, doi_de_url, normalizar_issn

PADRAO_CITACAO = re.compile(r"\[\s*(R\d+(?:\s*[,;–-]\s*R\d+)*)\s*\]")


# ------------------------------------------------------------ preparação (C2)

def preparar_referencias(registros: list[Registro], pubmed=None) -> list[Registro]:
    """Devolve cópias dos registros prontas para formatar, sem nunca levantar erro.

    - registro de outra base com PMID: metadados canônicos do PubMed (a base de
      origem é mantida);
    - sem PMID, com ISSN: abreviatura NLM da revista pelo NLM Catalog;
    - senão: abreviatura sem pontos ("Rev. Saude Publica" -> "Rev Saude Publica");
    - páginas, e-locators, DOI e URL normalizados.

    Na primeira falha de rede as consultas seguintes são puladas (sem rede, cada
    tentativa custaria vários segundos) e cada registro segue com o que já tinha.
    """
    copias = [replace(r, autores=list(r.autores), tipos=list(r.tipos)) for r in registros]
    try:
        if pubmed is None:
            pubmed = PubMed(os.environ.get("NCBI_API_KEY") or None, os.environ.get("NCBI_EMAIL") or None)
        rede = {"ok": True}
        canonicos = _canonicos_pubmed(copias, pubmed, rede)
        saida = []
        for r in copias:
            try:
                saida.append(_preparar(r, canonicos, pubmed, rede))
            except Exception:
                saida.append(r)
        return saida
    except Exception:
        return copias


def _canonicos_pubmed(registros: list[Registro], pubmed, rede: dict) -> dict[str, Registro]:
    pmids = list(dict.fromkeys(r.pmid.strip() for r in registros
                               if r.base != "PubMed" and r.pmid.strip().isdigit()))
    if not pmids or not hasattr(pubmed, "detalhes"):
        return {}
    try:
        return {c.pmid: c for c in pubmed.detalhes(pmids) if c.pmid}
    except Exception:
        rede["ok"] = False
        return {}


def _preparar(r: Registro, canonicos: dict[str, Registro], pubmed, rede: dict) -> Registro:
    canonico = canonicos.get(r.pmid.strip()) if r.base != "PubMed" else None
    doi_original, doi_canonico = _normalizar_doi(r.doi).lower(), _normalizar_doi(canonico.doi).lower() if canonico else ""
    if canonico and not (doi_original and doi_canonico and doi_original != doi_canonico):
        # PubMed manda; o que ele não tiver vem do registro original
        valores = {f.name: getattr(canonico, f.name) or getattr(r, f.name) for f in fields(Registro)}
        valores.update(base=r.base, id_base=r.id_base, acesso=r.acesso)
        r = Registro(**valores)
    elif r.base != "PubMed" and r.issn and rede["ok"] and hasattr(pubmed, "abreviatura_nlm"):
        try:
            abreviatura = pubmed.abreviatura_nlm(r.issn)
        except Exception:
            rede["ok"] = False
            abreviatura = ""
        if abreviatura:
            r = replace(r, revista=abreviatura)

    doi = _normalizar_doi(r.doi) or doi_de_url(r.url)
    url = normalizar_url(r.url)
    if doi_de_url(url):
        url = ""
    return replace(r, revista=abreviar_revista(r.revista), paginas=normalizar_paginas(r.paginas),
                   doi=doi, url=url, issn=normalizar_issn(r.issn) or r.issn.strip())


def _normalizar_doi(doi: str) -> str:
    doi = (doi or "").strip()
    doi = doi_de_url(doi) or re.sub(r"^doi:\s*", "", doi, flags=re.I)
    return doi.rstrip(".;, ")


def abreviar_revista(nome: str) -> str:
    """Estilo NLM: sem pontos e sem espaços repetidos."""
    nome = re.sub(r"\.(?=\S)", " ", (nome or "").strip())  # "J.Bras" -> "J Bras"
    nome = nome.replace(".", "")
    return re.sub(r"\s+", " ", nome).strip(" ,;:")


def normalizar_paginas(paginas: str) -> str:
    """'pp. 45-50' -> '45-50'; 'e20230045-e20230045' -> 'e20230045'; PII do SciELO -> ''."""
    texto = re.sub(r"\s+", " ", (paginas or "").strip())
    while True:  # "p. p. 45", "pp.45", "pág. 3"
        sem_prefixo = re.sub(r"^(?:pages?|p[aá]gs?|pp?)(?:\.\s*|\s+)(?=\S)", "", texto, flags=re.I)
        if sem_prefixo == texto or not re.match(r"[\w]", sem_prefixo):
            break
        texto = sem_prefixo
    texto = texto.strip(" .,;:")
    if re.match(r"^S\d{4}-?\d{3}[\dX]", texto, re.I):  # PII (S0102-311X2020...) não é paginação
        return ""
    texto = re.sub(r"\s*(?:--|[–—-])\s*", "-", texto)
    inicio, sep, fim = texto.partition("-")
    if sep and inicio.lower() == fim.lower():
        return inicio
    return texto


def normalizar_url(url: str) -> str:
    url = (url or "").strip().rstrip(".,;")
    m = re.match(r"^([a-z][a-z0-9+.\-]*://)(.*)$", url, re.I)
    if not m:
        return re.sub(r"/{2,}", "/", url)
    return m.group(1) + re.sub(r"/{2,}", "/", m.group(2))


# ------------------------------------------------------------- formatação

def _limpar(texto: str) -> str:
    """Higiene de pontuação: nada de '..', '.?', '?.', ', .', espaço antes de pontuação."""
    texto = re.sub(r"\s+", " ", texto).strip()
    anterior = None
    while anterior != texto:
        anterior = texto
        texto = re.sub(r"\s+([.,;:?!])", r"\1", texto)
        texto = re.sub(r"([?!])[.,;:]+", r"\1", texto)
        texto = re.sub(r"\.([?!])", r"\1", texto)
        texto = re.sub(r"[,;:]+\.", ".", texto)
        texto = re.sub(r"(?<!\.)\.\.(?!\.)", ".", texto)
        texto = re.sub(r"([,;:])\1+", r"\1", texto)
        texto = re.sub(r",([;:])", r"\1", texto)
    return texto


def _pontuar(texto: str) -> str:
    """Fecha a frase com ponto, exceto se já termina em '?' ou '!'."""
    texto = re.sub(r"\s+", " ", texto or "").strip().rstrip(" ,;:")
    if texto.endswith(("?", "!")):
        return texto
    return texto.rstrip(". ") + "." if texto.strip(". ") else ""


def vancouver(r: Registro) -> str:
    autores = [a.strip().rstrip(".,; ") for a in r.autores if a.strip().rstrip(".,; ")]
    lista = ", ".join(autores[:6]) + (", et al" if len(autores) > 6 else "")
    partes = []
    if lista:
        partes.append(_pontuar(lista))
    if r.titulo.strip():
        partes.append(_pontuar(r.titulo))
    fonte = abreviar_revista(r.revista)
    detalhe = " ".join(x for x in (f"{fonte}." if fonte else "", r.ano.strip()) if x)
    volume, numero = r.volume.strip(), r.numero.strip()
    if volume or numero:
        detalhe += ";" + volume + (f"({numero})" if numero else "")
    paginas = normalizar_paginas(r.paginas)
    if paginas:
        detalhe += ":" + paginas
    if detalhe.strip(" .;:"):
        partes.append(_pontuar(detalhe.lstrip(";:")))
    texto = _limpar(" ".join(partes))
    doi = _normalizar_doi(r.doi)
    url = normalizar_url(r.url)
    if doi:
        texto += f" doi:{doi}"
    elif r.pmid.strip():
        texto += f" PMID: {r.pmid.strip()}."
    elif url:
        acesso = r.acesso.strip().rstrip(".")
        texto += f" Disponível em: {url}" + (f" [citado em {acesso}]." if acesso else ".")
    return texto.strip()


def abnt(r: Registro) -> str:
    def autor_abnt(nome: str) -> str:
        nome = nome.strip().rstrip(".,; ")
        pedacos = nome.split(" ")
        # "Silva AB": último pedaço são as iniciais; senão é autor coletivo ("Grupo Brasil")
        if len(pedacos) < 2 or not re.fullmatch(r"[A-ZÀ-Ý]{1,4}", pedacos[-1]):
            return nome.upper()
        sobrenome = " ".join(pedacos[:-1])
        return f"{sobrenome.upper()}, " + " ".join(f"{i}." for i in pedacos[-1])

    nomes = [a for a in r.autores if a.strip().rstrip(".,; ")]
    if len(nomes) > 3:
        autores = autor_abnt(nomes[0]) + " et al."
    else:
        autores = "; ".join(autor_abnt(a) for a in nomes)
    partes = []
    if autores:
        partes.append(_pontuar(autores))
    if r.titulo.strip():
        partes.append(_pontuar(r.titulo))
    fonte = re.sub(r"\s+", " ", r.revista).strip().rstrip(". ,;")
    detalhes = [fonte] if fonte else []
    if r.volume.strip():
        detalhes.append(f"v. {r.volume.strip()}")
    if r.numero.strip():
        detalhes.append(f"n. {r.numero.strip()}")
    paginas = normalizar_paginas(r.paginas)
    if paginas:  # e-locator (e20230045) não leva "p."
        detalhes.append(paginas if paginas[0].isalpha() else f"p. {paginas}")
    if r.ano.strip():
        detalhes.append(r.ano.strip())
    if detalhes:
        partes.append(_pontuar(", ".join(detalhes)))
    texto = _limpar(" ".join(partes))
    doi = _normalizar_doi(r.doi)
    url = normalizar_url(r.url)
    if doi:
        texto += f" DOI: https://doi.org/{doi}."
    elif url:
        texto += f" Disponível em: {url}."
        if r.acesso.strip().rstrip("."):
            texto += f" Acesso em: {r.acesso.strip().rstrip('.')}."
    return texto.strip()


FORMATOS = {"vancouver": vancouver, "abnt": abnt}


def _expandir(grupo: str) -> list[str]:
    """'R3, R5-R7' -> ['R3','R5','R6','R7']"""
    chaves = []
    for parte in re.split(r"\s*[,;]\s*", grupo):
        faixa = re.match(r"R(\d+)\s*[–-]\s*R(\d+)$", parte)
        if faixa:
            a, b = int(faixa.group(1)), int(faixa.group(2))
            if a <= b and b - a < 50:
                chaves.extend(f"R{i}" for i in range(a, b + 1))
                continue
        if re.fullmatch(r"R\d+", parte):
            chaves.append(parte)
    return chaves


def _compactar(numeros: list[int]) -> str:
    """[1,2,3,5] -> '1-3,5' (padrão Vancouver)."""
    numeros = sorted(set(numeros))
    faixas, inicio, anterior = [], None, None
    for n in numeros:
        if inicio is None:
            inicio = anterior = n
        elif n == anterior + 1:
            anterior = n
        else:
            faixas.append((inicio, anterior))
            inicio = anterior = n
    if inicio is not None:
        faixas.append((inicio, anterior))
    return ",".join(f"{a}-{b}" if b - a >= 2 else (f"{a},{b}" if b > a else f"{a}") for a, b in faixas)


class Numerador:
    """Numera as citações por ordem de primeira aparição no artigo inteiro."""

    def __init__(self, validas: set[str]):
        self.validas = validas
        self.ordem: list[str] = []
        self.bloqueadas: list[str] = []

    def resolver(self, texto: str) -> str:
        """Troca [R3, R7] por marcador numérico {{cite:1,2}} (renderizado depois)."""

        def troca(m):
            numeros = []
            for chave in _expandir(m.group(1)):
                if chave not in self.validas:
                    self.bloqueadas.append(chave)
                    continue
                if chave not in self.ordem:
                    self.ordem.append(chave)
                numeros.append(self.ordem.index(chave) + 1)
            return "{{cite:" + _compactar(numeros) + "}}" if numeros else ""

        texto = PADRAO_CITACAO.sub(troca, texto)
        return re.sub(r"[ \t]+([.,;:])", r"\1", texto)


def chaves_citadas(texto: str) -> list[str]:
    return [c for m in PADRAO_CITACAO.finditer(texto) for c in _expandir(m.group(1))]


def renderizar_citacoes(texto: str, formato: str = "sobrescrito") -> list[tuple[str, bool]]:
    """Quebra o texto em trechos (texto, é_sobrescrito) para o exportador .docx."""
    trechos, pos = [], 0
    for m in re.finditer(r"\{\{cite:([^}]*)\}\}", texto):
        if m.start() > pos:
            trechos.append((texto[pos:m.start()], False))
        numeros = m.group(1)
        if formato == "sobrescrito":
            if trechos and not trechos[-1][1]:  # sobrescrito cola na palavra: "tratamento¹³"
                trechos[-1] = (trechos[-1][0].rstrip(), False)
            trechos.append((numeros, True))
        elif formato == "colchetes":
            trechos.append((f"[{numeros}]", False))
        else:
            trechos.append((f"({numeros})", False))
        pos = m.end()
    if pos < len(texto):
        trechos.append((texto[pos:], False))
    return trechos


def texto_plano(texto: str, formato: str = "colchetes") -> str:
    return "".join(t for t, _ in renderizar_citacoes(texto, formato))

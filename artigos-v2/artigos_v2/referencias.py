"""Referências: formatação (Vancouver / ABNT) a partir de metadados verificados
e resolução das citações [R12] escritas pelo modelo.

O modelo só enxerga chaves curtas (R1..Rn) de registros reais. Qualquer chave
que não exista é removida do texto e registrada como citação bloqueada, então
o artigo final não tem como citar uma referência inventada.
"""

from __future__ import annotations

import re

from .bases import Registro

PADRAO_CITACAO = re.compile(r"\[\s*(R\d+(?:\s*[,;–-]\s*R\d+)*)\s*\]")


def vancouver(r: Registro) -> str:
    autores = r.autores[:6]
    lista = ", ".join(autores) + (", et al" if len(r.autores) > 6 else "")
    partes = []
    if lista:
        partes.append(lista + ".")
    partes.append(_pontuar(r.titulo))
    fonte = r.revista.rstrip(".")
    detalhe = f"{fonte}. {r.ano}" if fonte else r.ano
    if r.volume:
        detalhe += f";{r.volume}"
        if r.numero:
            detalhe += f"({r.numero})"
    if r.paginas:
        detalhe += f":{r.paginas}"
    partes.append(detalhe + ".")
    if r.doi:
        partes.append(f"doi:{r.doi}")
    elif r.pmid:
        partes.append(f"PMID: {r.pmid}.")
    return " ".join(partes)


def abnt(r: Registro) -> str:
    def autor_abnt(nome: str) -> str:
        pedacos = nome.split(" ")
        if len(pedacos) < 2:
            return nome.upper()
        iniciais = pedacos[-1]
        sobrenome = " ".join(pedacos[:-1])
        return f"{sobrenome.upper()}, " + " ".join(f"{i}." for i in iniciais)

    if len(r.autores) > 3:
        autores = autor_abnt(r.autores[0]) + " et al."
    else:
        autores = "; ".join(autor_abnt(a) for a in r.autores)
        autores = autores + ("." if autores and not autores.endswith(".") else "")
    trecho = f"{autores} {_pontuar(r.titulo)} {r.revista.rstrip('.')},"
    if r.volume:
        trecho += f" v. {r.volume},"
    if r.numero:
        trecho += f" n. {r.numero},"
    if r.paginas:
        trecho += f" p. {r.paginas},"
    trecho += f" {r.ano}."
    if r.doi:
        trecho += f" DOI: https://doi.org/{r.doi}."
    return trecho.strip()


FORMATOS = {"vancouver": vancouver, "abnt": abnt}


def _pontuar(texto: str) -> str:
    texto = texto.strip()
    return texto if texto.endswith((".", "?", "!")) else texto + "."


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

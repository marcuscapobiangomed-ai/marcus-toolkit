"""Cada função é uma skill da revisão, rodada isoladamente sobre o artigo pronto.

Os valores seguem a rubrica da skill `artigos` (Introdução 1,5; Métodos 2,5;
Resultados 2,5; Referências 1,5; Figuras/tabelas 1,0). A Discussão não tem
valor explícito na rubrica: aqui vale 1,0 para fechar 10. Humanização é
avaliada à parte (não entra na nota da rubrica).
"""

from __future__ import annotations

import re
import statistics
from collections import Counter

from .leitor import Artigo
from .verificacao import Verificador

PONTOS = {"ok": 1.0, "parcial": 0.5, "nao_verificavel": 0.5, "falha": 0.0}

BASES = {
    "PubMed": r"pub\s?med|medline", "SciELO": r"scielo", "LILACS": r"lilacs", "BVS": r"\bbvs\b|biblioteca virtual em sa[uú]de",
    "Europe PMC": r"europe\s?pmc", "Scopus": r"scopus", "Web of Science": r"web of science", "Embase": r"embase",
    "Cochrane": r"cochrane", "CINAHL": r"cinahl", "Google Acadêmico": r"google (acad[eê]mico|scholar)",
}

TRANSICOES = ["além disso", "ademais", "outrossim", "nesse sentido", "nesse contexto", "diante disso", "dessa forma",
              "desse modo", "sendo assim", "portanto", "em suma", "em síntese", "por fim", "no que tange",
              "no que diz respeito", "tendo em vista", "à luz de", "no âmbito", "contudo", "entretanto", "todavia"]
ENFASE_VAZIA = ["vale ressaltar", "é importante ressaltar", "é importante destacar", "cabe destacar", "convém salientar",
                "é fundamental", "é crucial", "é imprescindível", "de suma importância", "papel crucial",
                "papel fundamental", "cada vez mais", "nos dias de hoje", "no cenário atual", "lança luz", "abre caminho"]
REBUSCADOS = ["permeia", "permeiam", "corrobora", "corroboram", "denota", "denotam", "salienta", "salientam",
              "evidencia-se", "evidenciam-se", "elucida", "elucidam", "fomenta", "fomentam", "potencializa",
              "alavanca", "perpassa", "perpassam", "mitiga", "mitigam", "multifacetado", "multifacetada",
              "holístico", "holística", "sinergia"]
ORDINAIS = ["primeiramente", "em primeiro lugar", "em segundo lugar", "em terceiro lugar", "por último"]
ROBOTICAS = ["os resultados demonstraram que", "é possível observar que", "observa-se que", "nota-se que",
             "verifica-se que", "pode-se observar que"]
DIVERGENCIA = ["diverge", "divergem", "divergência", "diferentemente", "em contraste", "ao contrário",
               "contradiz", "contrasta", "discordância", "discordante", "inconsistente", "inconsistência",
               "não confirmou", "não confirmaram", "resultado oposto", "resultados opostos", "conflitante"]
PONTO_DE_VISTA = ["entendemos", "acreditamos", "defendemos", "a nosso ver", "na nossa avaliação", "parece-nos",
                  "nossa leitura", "consideramos", "argumentamos", "sustentamos", "esta revisão sugere",
                  "esta revisão indica", "nossa interpretação", "o que nos leva"]


def _item(criterio, status, peso=1.0, evidencia=""):
    return {"criterio": criterio, "status": status, "peso": peso, "evidencia": evidencia}


def _nota(itens) -> float:
    total = sum(i["peso"] for i in itens)
    return round(100 * sum(i["peso"] * PONTOS[i["status"]] for i in itens) / total, 1) if total else 0.0


def _resultado(id_, nome, valor, itens):
    return {"id": id_, "nome": nome, "valor": valor, "nota": _nota(itens), "itens": itens}


def _palavras(texto: str) -> int:
    return len(re.findall(r"\w+", texto))


def _frases(paragrafo: str) -> list[str]:
    limpo = re.sub(r"\[\^?[^\]]*\]", "", paragrafo)
    limpo = re.sub(r"\b(et al|p|n|vs|ex|Dr|Dra|Sr|Sra|fig|i\.e|e\.g)\.", lambda m: m.group(0).replace(".", "§"), limpo)
    return [f for f in re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ý\"“(])", limpo) if _palavras(f) > 0]


def _contar(texto: str, termos: list[str]) -> Counter:
    minusculo = texto.lower()
    return Counter({t: len(re.findall(rf"(?<![\wà-ÿ]){re.escape(t)}(?![\wà-ÿ])", minusculo))
                    for t in termos if re.search(rf"(?<![\wà-ÿ]){re.escape(t)}(?![\wà-ÿ])", minusculo)})


# ----------------------------------------------------------------- Introdução

def skill_estrutura_introducao(artigo: Artigo, **_) -> dict:
    itens = []
    obrigatorias = ["introducao", "metodos", "resultados", "discussao", "conclusao", "referencias"]
    faltando = [s for s in obrigatorias if s not in artigo.secoes and not (s == "referencias" and artigo.referencias)]
    itens.append(_item("Seções obrigatórias presentes (Introdução, Métodos, Resultados, Discussão, Conclusão, "
                       "Referências)", "ok" if not faltando else "falha", 2, f"faltando: {faltando}" if faltando else ""))
    tem_resumo = "resumo" in artigo.secoes and "abstract" in artigo.secoes
    itens.append(_item("Resumo e Abstract presentes", "ok" if tem_resumo else "parcial" if "resumo" in artigo.secoes
                       else "falha", 0.5))
    intro = artigo.secoes.get("introducao", [])
    palavras = _palavras("\n".join(intro))
    itens.append(_item("Introdução com no máximo 3 páginas (~1.350 palavras em fonte 12, espaço 1,5)",
                       "ok" if 0 < palavras <= 1350 else "parcial" if palavras <= 1600 else "falha", 1,
                       f"{palavras} palavras"))
    ultimo = intro[-1].lower() if intro else ""
    penultimo = intro[-2].lower() if len(intro) > 1 else ""
    objetivo_ultimo = bool(re.search(r"objetiv|prop[oõ]e-se|busca-se|pretende-se|esta revis[aã]o (visa|tem)", ultimo))
    itens.append(_item("Objetivo no último parágrafo da Introdução",
                       "ok" if objetivo_ultimo else "parcial" if re.search(r"objetiv", penultimo) else "falha", 2,
                       intro[-1][:200] if intro else "introdução não encontrada"))
    cita_intro = sum(1 for p in intro if re.search(r"\[\^|\[\d", p))
    itens.append(_item("Introdução fundamentada com citações", "ok" if cita_intro >= max(1, len(intro) // 2)
                       else "parcial" if cita_intro else "falha", 1, f"{cita_intro}/{len(intro)} parágrafos com citação"))
    preambulo = " ".join(artigo.preambulo).lower()
    itens.append(_item("Nome do(a) orientador(a) consta no trabalho (se houver orientação)",
                       "ok" if "orientador" in preambulo or "orientadora" in preambulo else "nao_verificavel", 0.5))
    return _resultado("introducao", "Estrutura e Introdução", 1.5, itens)


# -------------------------------------------------------------------- Métodos

def _texto_metodos(artigo: Artigo) -> str:
    tabelas = "\n".join(t.texto for t in artigo.tabelas if t.secao == "metodos")
    return artigo.texto("metodos") + "\n" + tabelas


def _estrategia_pubmed(artigo: Artigo) -> str | None:
    for t in artigo.tabelas:
        for linha in t.linhas:
            if linha and re.search(r"pub\s?med", linha[0], re.I) and len(linha) > 1:
                candidata = max(linha[1:], key=len)
                if re.search(r"\b(AND|OR)\b|\[", candidata):
                    return candidata
    for p in artigo.secoes.get("metodos", []):
        m = re.search(r"(\(.*(?:\[MeSH|\[tiab|\[Title/Abstract|\[mh).*\))", p)
        if m:
            return m.group(1)
    return None


def _n_reportado(artigo: Artigo, base_regex: str) -> int | None:
    textos = [t.texto for t in artigo.tabelas] + artigo.secoes.get("resultados", []) + artigo.secoes.get("metodos", [])
    for texto in textos:
        m = re.search(base_regex + r"[^\n\d]{0,25}?\(?n\s*=\s*(\d+)", texto, re.I)
        if m:
            return int(m.group(1))
    for t in artigo.tabelas:
        for linha in t.linhas:
            if linha and re.search(base_regex, linha[0], re.I) and linha[-1].strip().isdigit():
                return int(linha[-1])
    return None


def skill_metodos(artigo: Artigo, verificador: Verificador | None = None, **_) -> dict:
    texto = _texto_metodos(artigo)
    minusculo = texto.lower()
    itens = []
    bases = [nome for nome, rx in BASES.items() if re.search(rx, minusculo)]
    itens.append(_item("PubMed entre as bases (obrigatório)", "ok" if "PubMed" in bases else "falha", 2,
                       f"bases citadas: {bases}"))
    itens.append(_item("No mínimo duas bases de dados", "ok" if len(bases) >= 2 else "falha", 2, f"{len(bases)} base(s)"))
    itens.append(_item("Descritores informados (DeCS/MeSH)", "ok" if re.search(r"decs|mesh|descritor", minusculo)
                       else "falha", 1.5))
    itens.append(_item("Estratégia com operadores booleanos (AND/OR)", "ok" if re.search(r"\bAND\b|\bOR\b", texto)
                       else "parcial" if re.search(r"operador", minusculo) else "falha", 1.5))
    itens.append(_item("Critérios de inclusão descritos", "ok" if re.search(r"crit[eé]rios? de inclus|inclu[ií]d[oa]s .*(estudos|artigos)", minusculo)
                       else "falha", 1.5))
    itens.append(_item("Critérios de exclusão descritos", "ok" if re.search(r"crit[eé]rios? de exclus|exclu[ií]d[oa]s", minusculo)
                       else "falha", 1.5))
    itens.append(_item("Recorte temporal (período de publicação)", "ok" if re.search(r"(19|20)\d{2}\s*(a|e|até|-|–)\s*(19|20)\d{2}|últimos \d+ anos", minusculo)
                       else "falha", 1))
    itens.append(_item("Data da busca informada", "ok" if re.search(r"\d{1,2}/\d{1,2}/\d{4}|(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)( de)? (19|20)\d{2}", minusculo)
                       else "falha", 1))
    itens.append(_item("Etapas de seleção descritas (duplicatas, triagem, elegibilidade)",
                       "ok" if all(re.search(rx, minusculo) for rx in (r"duplicad|duplicat", r"t[ií]tulo", r"resumo"))
                       else "parcial" if re.search(r"t[ií]tulo|resumo", minusculo) else "falha", 1))

    estrategia = _estrategia_pubmed(artigo)
    if verificador and estrategia:
        reportado = _n_reportado(artigo, r"pub\s?med")
        try:
            atual = verificador.contar_pubmed(estrategia)
            if reportado is None:
                itens.append(_item("Busca no PubMed reproduzível (a professora vai conferir)", "nao_verificavel", 2,
                                   f"hoje retorna {atual}; nº relatado não encontrado no texto"))
            else:
                desvio = abs(atual - reportado) / max(reportado, 1)
                status = "ok" if desvio <= 0.15 else "parcial" if desvio <= 0.35 else "falha"
                itens.append(_item("Busca no PubMed reproduzível (a professora vai conferir)", status, 2,
                                   f"relatado {reportado}, hoje {atual} ({desvio:.0%} de diferença)"))
        except Exception as e:
            itens.append(_item("Busca no PubMed reproduzível", "nao_verificavel", 2, f"falha ao consultar: {e}"))
    else:
        itens.append(_item("Busca no PubMed reproduzível (a professora vai conferir)", "nao_verificavel", 2,
                           "estratégia do PubMed não encontrada no texto" if not estrategia else "modo offline"))
    return _resultado("metodos", "Métodos", 2.5, itens)


# ----------------------------------------------------------------- Resultados

def _numeros_prisma(artigo: Artigo) -> dict:
    texto = "\n".join([t.texto for t in artigo.tabelas] + artigo.secoes.get("resultados", []) + artigo.legendas)
    padroes = {
        "identificados": r"(?:registros?|estudos?|artigos?) (?:identificad|encontrad|recuperad)\w*[^()\n]{0,60}\(n\s*=\s*(\d+)\)",
        "duplicatas": r"duplica\w*[^()\n]{0,40}\(n\s*=\s*(\d+)\)",
        "triados": r"(?:triad|rastread|selecionad\w* para leitura de t[ií]tulo)\w*[^()\n]{0,60}\(n\s*=\s*(\d+)\)",
        "avaliados": r"(?:avaliad|lid)\w*[^()\n]{0,40}(?:elegibilidade|[ií]ntegra|texto completo)[^()\n]{0,20}\(n\s*=\s*(\d+)\)",
        "incluidos": r"inclu[ií]d\w*[^()\n]{0,50}\(n\s*=\s*(\d+)\)",
    }
    achados = {}
    for nome, rx in padroes.items():
        m = re.search(rx, texto, re.I)
        if m:
            achados[nome] = int(m.group(1))
    excluidos = [int(n) for n in re.findall(r"exclu[ií]d\w*[^()\n]{0,30}\(n\s*=\s*(\d+)\)", texto, re.I)]
    achados["excluidos"] = excluidos
    return achados


def skill_resultados(artigo: Artigo, **_) -> dict:
    itens = []
    legendas = " ".join(artigo.legendas).lower()
    tem_fluxo = bool(re.search(r"fluxograma|prisma", legendas + " " + artigo.texto("resultados").lower()))
    itens.append(_item("Fluxograma da seleção (PRISMA) presente", "ok" if tem_fluxo else "falha", 2))

    n = _numeros_prisma(artigo)
    checagens, erros = [], []
    if {"identificados", "duplicatas", "triados"} <= n.keys():
        checagens.append(n["identificados"] - n["duplicatas"] == n["triados"])
        if not checagens[-1]:
            erros.append(f"{n['identificados']} − {n['duplicatas']} ≠ {n['triados']}")
    if {"triados", "avaliados"} <= n.keys() and n["excluidos"]:
        checagens.append(n["triados"] - n["avaliados"] in n["excluidos"])
        if not checagens[-1]:
            erros.append(f"triados {n['triados']} − avaliados {n['avaliados']} não bate com excluídos {n['excluidos']}")
    if {"avaliados", "incluidos"} <= n.keys() and n["excluidos"]:
        checagens.append(n["avaliados"] - n["incluidos"] in n["excluidos"])
        if not checagens[-1]:
            erros.append(f"avaliados {n['avaliados']} − incluídos {n['incluidos']} não bate com excluídos {n['excluidos']}")
    if checagens:
        itens.append(_item("Números do fluxograma fecham entre as etapas",
                           "ok" if all(checagens) else "falha", 2,
                           "; ".join(erros) or f"{sum(checagens)} de {len(checagens)} contas conferidas"))
    else:
        itens.append(_item("Números do fluxograma fecham entre as etapas", "nao_verificavel", 2,
                           "números não legíveis (fluxograma em imagem?)"))

    sintese = [t for t in artigo.tabelas if t.secao in ("resultados", "discussao") and len(t.linhas) > 1
               and not re.search(r"identifica|triagem", t.texto, re.I)]
    itens.append(_item("Artigos incluídos organizados em tabela/quadro", "ok" if sintese else "falha", 2))
    if sintese and "incluidos" in n:
        linhas = max(len(t.linhas) - 1 for t in sintese)
        itens.append(_item("Tabela tem uma linha por estudo incluído", "ok" if linhas == n["incluidos"] else "parcial",
                           1, f"{linhas} linhas × {n['incluidos']} incluídos"))
    texto = artigo.texto("resultados")
    itens.append(_item("Resultado da busca e nº após critérios descritos no texto",
                       "ok" if re.search(r"\d+", texto) and re.search(r"inclu[ií]d", texto, re.I) else "falha", 1))
    itens.append(_item("Breve descrição dos principais pontos dos estudos",
                       "ok" if _palavras(texto) >= 250 else "parcial" if _palavras(texto) >= 120 else "falha", 1,
                       f"{_palavras(texto)} palavras"))
    roboticas = _contar(texto, ROBOTICAS)
    itens.append(_item("Sem frases robotizadas em série (\"observa-se que\"...)",
                       "ok" if sum(roboticas.values()) <= 1 else "parcial" if sum(roboticas.values()) <= 3 else "falha",
                       0.5, dict(roboticas) or ""))
    return _resultado("resultados", "Resultados", 2.5, itens)


# ---------------------------------------------------------------- Referências

def _eh_vancouver(ref: str) -> bool:
    return bool(re.search(r"^\s*\d*\.?\s*(?:(?:de|da|do|dos|das|del|di|van|von)\s)?[A-ZÀ-Ý][\w'’\-À-ÿ ]+ [A-ZÀ-Ý]{1,5}[,.]", ref)
                and re.search(r"\b(19|20)\d{2}\s*;?\s*\d*", ref))


def skill_referencias(artigo: Artigo, verificador: Verificador | None = None, **_) -> dict:
    refs = artigo.referencias
    itens = [_item("No mínimo 25 referências", "ok" if len(refs) >= 25 else "falha", 2, f"{len(refs)} referências")]

    citados = [n for grupo in artigo.citacoes for n in grupo]
    if citados:
        unicos = set(citados)
        sem_ref = sorted(n for n in unicos if n > len(refs) or n < 1)
        nao_citadas = sorted(set(range(1, len(refs) + 1)) - unicos)
        itens.append(_item("Toda citação no texto tem referência correspondente", "ok" if not sem_ref else "falha", 1.5,
                           f"citações sem referência: {sem_ref}" if sem_ref else ""))
        itens.append(_item("Toda referência é citada no texto", "ok" if not nao_citadas else
                           "parcial" if len(nao_citadas) <= 2 else "falha", 1,
                           f"não citadas: {nao_citadas[:15]}" if nao_citadas else ""))
        primeiras = list(dict.fromkeys(citados))
        em_ordem = all(b > a for a, b in zip(primeiras, primeiras[1:]))
        itens.append(_item("Numeração por ordem de primeira citação (Vancouver)", "ok" if em_ordem else "parcial", 1))
    else:
        itens.append(_item("Citações numéricas identificáveis no texto", "nao_verificavel", 1.5,
                           "nenhuma citação numérica encontrada (estilo autor-data?)"))

    padrao = sum(_eh_vancouver(r) for r in refs)
    itens.append(_item("Formatação consistente (padrão Vancouver detectado)",
                       "ok" if refs and padrao / len(refs) >= 0.9 else "parcial" if padrao else "falha", 1,
                       f"{padrao}/{len(refs)} no padrão"))

    verificacao = []
    if verificador and refs:
        for i, ref in enumerate(refs, 1):
            r = verificador.verificar_referencia(ref)
            verificacao.append({"n": i, "referencia": ref[:220], **r})
        ok = sum(v["status"] == "verificada" for v in verificacao)
        divergentes = [v["n"] for v in verificacao if v["status"] == "divergente"]
        ausentes = [v["n"] for v in verificacao if v["status"] == "nao_encontrada"]
        status = "ok" if ok == len(refs) else "parcial" if ok / len(refs) >= 0.8 and not divergentes else "falha"
        itens.append(_item("Referências reais (verificadas no PubMed/Europe PMC)", status, 3,
                           f"{ok}/{len(refs)} verificadas; DOI divergente: {divergentes}; não localizadas: {ausentes}"))
    else:
        itens.append(_item("Referências reais (verificadas no PubMed/Europe PMC)", "nao_verificavel", 3, "modo offline"))
    resultado = _resultado("referencias", "Referências", 1.5, itens)
    resultado["verificacao"] = verificacao
    return resultado


# ---------------------------------------------------------- Figuras e tabelas

def skill_figuras_tabelas(artigo: Artigo, **_) -> dict:
    titulos = [l for l in artigo.legendas if re.match(r"^\s*(figura|quadro|tabela|gr[aá]fico)\s*\d+", l, re.I)]
    fontes = [l for l in artigo.legendas if re.match(r"^\s*fonte", l, re.I)]
    objetos = len(artigo.tabelas)
    itens = [
        _item("Figuras/quadros/tabelas com título numerado", "ok" if titulos and len(titulos) >= min(objetos, 2)
              else "parcial" if titulos else "falha", 2, f"{len(titulos)} título(s) para {objetos} tabela(s)"),
        _item("Legenda/fonte abaixo de cada figura/quadro", "ok" if fontes and len(fontes) >= len(titulos)
              else "parcial" if fontes else "falha", 1.5, f"{len(fontes)} fonte(s) para {len(titulos)} título(s)"),
    ]
    corpo = artigo.corpo.lower()
    chamadas = [t for t in titulos if re.search(r"(figura|quadro|tabela|gr[aá]fico)\s*" +
                                                re.search(r"\d+", t).group(0), corpo, re.I)]
    itens.append(_item("Cada figura/quadro é citado no texto", "ok" if titulos and len(chamadas) == len(titulos)
                       else "parcial" if chamadas else "falha", 1, f"{len(chamadas)}/{len(titulos)} citados"))
    return _resultado("figuras", "Figuras, tabelas e quadros", 1.0, itens)


# ------------------------------------------------------ Discussão e APS/SUS

def skill_discussao(artigo: Artigo, **_) -> dict:
    texto = artigo.texto("discussao")
    minusculo = texto.lower()
    divergencias = _contar(texto, DIVERGENCIA)
    opiniao = _contar(texto, PONTO_DE_VISTA)
    itens = [
        _item("Nomeia pelo menos uma divergência real entre estudos", "ok" if divergencias else "falha", 2,
              dict(divergencias) or ""),
        _item("Tem ponto de vista claro do autor", "ok" if opiniao else "parcial" if re.search(r"sugere|indica", minusculo)
              else "falha", 1.5, dict(opiniao) or ""),
        _item("Contexto APS/SUS/UBS brasileiro", "ok" if re.search(r"\bsus\b|aten[cç][aã]o prim[aá]ria|\baps\b|\bubs\b", minusculo)
              else "falha", 1.5),
        _item("Discute limitações", "ok" if re.search(r"limita[cç]", minusculo) else "falha", 1),
        _item("Discussão dialoga com a literatura (citações)", "ok" if len(re.findall(r"\[\^|\[\d", texto)) >= 5
              else "parcial" if re.search(r"\[\^|\[\d", texto) else "falha", 1),
    ]
    internacionais = re.findall(r"(american|european|nice\b|\besc\b|\baha\b|\bada\b|\bwho\b|oms)", minusculo)
    if internacionais:
        contextualiza = re.search(r"internaciona|no brasil|brasileir|ministério da saúde", minusculo)
        itens.append(_item("Diretrizes internacionais identificadas como tais", "ok" if contextualiza else "parcial", 0.5))
    return _resultado("discussao", "Discussão e realismo APS/SUS", 1.0, itens)


# ---------------------------------------------------------------- Humanização

def skill_humanizacao(artigo: Artigo, **_) -> dict:
    secoes = {s: artigo.secoes.get(s, []) for s in ("introducao", "resultados", "discussao", "conclusao")}
    paragrafos = [p for ps in secoes.values() for p in ps if _palavras(p) > 20]  # ritmo: só parágrafos de verdade
    corpo = "\n\n".join(p for ps in secoes.values() for p in ps)                  # vocabulário: o texto todo
    itens = []

    elegiveis = [p for p in paragrafos if len(_frases(p)) >= 5]
    variados = [p for p in elegiveis if any(_palavras(f) < 10 for f in _frases(p)) and any(_palavras(f) > 25 for f in _frases(p))]
    if elegiveis:
        pct = len(variados) / len(elegiveis)
        itens.append(_item("Parágrafos longos misturam frase curta (<10) e longa (>25)",
                           "ok" if pct >= 0.6 else "parcial" if pct >= 0.3 else "falha", 2,
                           f"{len(variados)}/{len(elegiveis)} parágrafos"))
    comprimentos = [_palavras(f) for p in paragrafos for f in _frases(p)]
    if len(comprimentos) > 5:
        cv = statistics.pstdev(comprimentos) / statistics.mean(comprimentos)
        itens.append(_item("Irregularidade do comprimento das frases (burstiness)",
                           "ok" if cv >= 0.45 else "parcial" if cv >= 0.35 else "falha", 2, f"CV = {cv:.2f}"))
    travessoes = [p for p in paragrafos if p.count("—") + p.count(" – ") >= 3]
    itens.append(_item("Nenhum parágrafo com 3+ travessões", "ok" if not travessoes else "falha", 1,
                       f"{len(travessoes)} parágrafo(s)"))
    transicoes = _contar(artigo.corpo, TRANSICOES)  # "3+ vezes no artigo inteiro" (checklist da skill)
    repetidas = {t: n for t, n in transicoes.items() if n >= 3}
    itens.append(_item("Nenhuma transição repetida 3+ vezes", "ok" if not repetidas else "falha", 1.5, repetidas or ""))
    palavras = max(_palavras(corpo), 1)
    enfase = sum(_contar(corpo, ENFASE_VAZIA).values())
    itens.append(_item("Ênfase vazia (\"é importante ressaltar\"...) rara", "ok" if enfase / palavras * 1000 <= 1
                       else "parcial" if enfase / palavras * 1000 <= 2.5 else "falha", 1,
                       f"{enfase} ocorrência(s): {dict(_contar(corpo, ENFASE_VAZIA))}"))
    rebuscados = _contar(corpo, REBUSCADOS)
    itens.append(_item("Verbos diretos em vez de rebuscados", "ok" if sum(rebuscados.values()) <= 2
                       else "parcial" if sum(rebuscados.values()) <= 5 else "falha", 1, dict(rebuscados) or ""))
    ordinais = _contar(corpo, ORDINAIS)
    itens.append(_item("Sem lista disfarçada de prosa (primeiramente... por último)", "ok" if sum(ordinais.values()) <= 1
                       else "falha", 1, dict(ordinais) or ""))
    iguais = 0
    for ps in secoes.values():
        tamanhos = [len(_frases(p)) for p in ps if _palavras(p) > 20]
        iguais += sum(1 for a, b in zip(tamanhos, tamanhos[1:]) if a == b)
    pares = max(sum(max(len([p for p in ps if _palavras(p) > 20]) - 1, 0) for ps in secoes.values()), 1)
    itens.append(_item("Parágrafos vizinhos com número de frases diferente", "ok" if iguais / pares <= 0.3
                       else "parcial" if iguais / pares <= 0.5 else "falha", 1, f"{iguais}/{pares} pares iguais"))
    metodos = artigo.texto("metodos").lower()
    itens.append(_item("Métodos sem opinião (humanização não vazou)", "ok" if not _contar(metodos, PONTO_DE_VISTA) else "falha",
                       1))
    return _resultado("humanizacao", "Humanização do texto", 0.0, itens)


SKILLS = [skill_estrutura_introducao, skill_metodos, skill_resultados, skill_referencias, skill_figuras_tabelas,
          skill_discussao, skill_humanizacao]

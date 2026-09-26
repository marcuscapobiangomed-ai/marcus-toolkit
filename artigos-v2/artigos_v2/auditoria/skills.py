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

from .leitor import Artigo, expandir_numeros
from .verificacao import PARTICULAS, Verificador, extrair_titulo

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
# Siglas: operadores booleanos e siglas universais não precisam de definição
SIGLAS_LIVRES = {"DNA", "RNA", "AND", "OR", "NOT"}
SIGLAS_MISTAS = r"DeCS|MeSH|SciELO"
IA_NOS_METODOS = (r"(?i:intelig[eê]ncia artificial|chat\s?gpt|\bGPT-?\d|\bLLMs?\b|modelos? (?:amplos? )?de linguagem"
                  r"|ferramentas? automatizadas?)|\bIA\b")  # "IA" só em maiúsculas
ACOES_METODOS = (r"triag|triad|selecion|sele[cç][aã]o|extra[ií]|extra[cç]|redig|reda[cç]|revis|anal[ií]s|classific"
                 r"|aux[ií]li|apoio|assistid|utiliz|empreg|usad|usando|gerad|conduzid|realizad|automatiz")
# abreviaturas de periódico com ponto (NLM não usa pontos: "Rev Saude Publica", não "Rev. Saúde Pública")
ABREV_PERIODICO = (r"Rev|Bras|J|Med|Enferm|Cienc|Ciênc|Colet|Esc|Int|Am|Eur|Arq|Cad|Nutr|Clin|Epidemiol|Serv|Fam"
                   r"|Res|Cardiol|Soc|Psicol|Odontol|Pediatr|Ann|Arch|Intern|Gen|Pract|Br|Engl|Natl|Acad|Sci|Assoc"
                   r"|Hosp|Nurs|Physiol|Pharm|Ther|Prev|Glob|Saude|Publica|Latinoam|Gaucha|Paul")
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
    itens.append(_siglas_definidas(artigo))
    return _resultado("introducao", "Estrutura e Introdução", 1.5, itens)


CRITERIO_SIGLAS = "Siglas definidas na primeira ocorrência"


def _siglas_definidas(artigo: Artigo) -> dict:
    """Da Introdução à Conclusão, a primeira ocorrência de cada sigla é a definição: "Atenção Primária (APS)"."""
    vistas, sem_definicao = set(), []
    for secao in ("introducao", "metodos", "resultados", "discussao", "conclusao"):
        for paragrafo in artigo.secoes.get(secao, []):
            texto = re.sub(r"\[[^\]]*\]", " ", paragrafo)                    # citações e campos [MeSH Terms]
            texto = re.sub(r"Europe PMC", " ", texto)                         # nome próprio da base
            texto = re.sub(r"\b[A-Z_]+:(?=[\"(\[\w])", " ", texto)             # campos do Europe PMC (LANG:"por")
            padrao = rf"(?<![\w\-/])(?:({SIGLAS_MISTAS})|([A-ZÁÂÃÉÊÍÓÔÕÚÇ]{{2,6}}(?:-\d{{1,2}})?)s?)(?![\w\-/])"
            for m in re.finditer(padrao, texto):
                sigla = m.group(1) or m.group(2)
                if sigla in vistas or sigla in SIGLAS_LIVRES or re.fullmatch(r"X{0,2}(?:IX|IV|V?I{0,3})", sigla):
                    continue
                vistas.add(sigla)
                definida = (re.search(r"[\wÀ-ÿ]\s*\(\s*$", texto[:m.start()])
                            and re.match(r"\s*\)", texto[m.end():]))
                if not definida:
                    sem_definicao.append(f"{sigla} ({secao})")
    status = "ok" if not sem_definicao else "parcial" if len(sem_definicao) <= 2 else "falha"
    return _item(CRITERIO_SIGLAS, status, 1,
                 f"sem definição \"Nome por extenso (SIGLA)\" na 1ª ocorrência: {sem_definicao[:15]}" if sem_definicao else "")


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


NUM = r"(\d{1,3}(?:\.\d{3})+|\d+)"  # 1054 ou 1.054 (milhar no padrão brasileiro)


def _int(numero: str) -> int:
    return int(numero.replace(".", ""))


def _n_reportado(artigo: Artigo, base_regex: str) -> int | None:
    textos = [t.texto for t in artigo.tabelas] + artigo.secoes.get("resultados", []) + artigo.secoes.get("metodos", [])
    for texto in textos:
        m = re.search(base_regex + r"[^\n\d]{0,25}?\(?n\s*=\s*" + NUM, texto, re.I)
        if m:
            return _int(m.group(1))
    for t in artigo.tabelas:
        for linha in t.linhas:
            if linha and re.search(base_regex, linha[0], re.I) and re.fullmatch(NUM, linha[-1].strip()):
                return _int(linha[-1].strip())
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

    so_texto = artigo.texto("metodos")
    itens.append(_item("Métodos descrevem o processo conduzido pelos autores",
                       "ok" if re.search(r"\b(?:autor|revisor|pesquisador|avaliador)(?:e?s|as|a)?\b", so_texto, re.I)
                       else "parcial", 0.5, "" if so_texto else "seção de Métodos não encontrada"))
    itens.append(_sem_ia_nos_metodos(so_texto))

    estrategia = _estrategia_pubmed(artigo)
    itens.append(_descritores_mesh_existem(estrategia or texto, verificador))
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


CRITERIO_IA_METODOS = "Nenhuma etapa atribuída a IA/ferramentas nos Métodos"
TAG_MESH = r"\[(?:mesh(?:\s+terms|\s+major\s+topic)?|mh|majr)(?::\s*no\s*exp)?\]"
# descritores MeSH são em inglês: estas palavras marcam a prosa dos Métodos antes de um termo sem aspas
PROSA_ANTES_DO_TERMO = {"foi", "foram", "é", "a", "o", "as", "os", "e", "em", "no", "na", "nos", "nas", "com", "de",
                        "do", "da", "dos", "das", "para", "por", "pelo", "pela", "como", "usando", "utilizou-se",
                        "usou-se", "estratégia", "busca", "pubmed", "termo", "termos", "descritor", "descritores",
                        "depois", "ainda", "também", "além", "combinados", "combinado", "seguinte", "seguintes"}


def _sem_ia_nos_metodos(texto: str) -> dict:
    """Frases dos Métodos que põem IA/ferramenta como agente de uma etapa (triagem, extração, redação...).

    Só a menção ao tema não conta ("estudos sobre inteligência artificial"): a frase precisa de uma ação.
    """
    texto = re.sub(r"\[[^\]]*\]", "", texto)
    # o tema da revisão ("estudos sobre inteligência artificial") não é etapa atribuída a ferramenta
    texto = re.sub(rf"(?i:sobre|acerca d[aeo]s?|envolvendo|baseados? em|baseadas? em)\s+(?:{IA_NOS_METODOS})", " ", texto)
    frases = [f for f in re.split(r"(?<=[.!?])\s+", texto) if re.search(IA_NOS_METODOS, f)]
    etapas = [f.strip()[:160] for f in frases if re.search(ACOES_METODOS, f, re.I)]
    return _item(CRITERIO_IA_METODOS, "ok" if not etapas else "falha", 1, etapas[:3] or "")


def descritores_mesh(estrategia: str) -> list[str]:
    """Termos marcados como MeSH ([MeSH Terms], [mh], [MeSH], [majr]) numa estratégia do PubMed."""
    termos = []
    for m in re.finditer(TAG_MESH, estrategia, re.I):
        antes = estrategia[:m.start()].rstrip()
        if antes.endswith('"'):
            termo = antes[antes.rfind('"', 0, len(antes) - 1) + 1:-1]
        else:
            # sem aspas, o termo são as palavras logo antes da marcação, sem a prosa em português
            palavras = []
            for palavra in reversed(re.split(r'[()\[\]":;]|\.\s|\b(?:AND|OR|NOT)\b', antes)[-1].split()[-8:]):
                if palavra.lower().strip(",") in PROSA_ANTES_DO_TERMO:
                    break
                palavras.insert(0, palavra)
            termo = " ".join(palavras)
        termo = re.sub(r"\s+", " ", termo.split("/")[0]).strip(" *")  # "Hypertension/therapy"[mh]
        if termo and termo.lower() not in {t.lower() for t in termos}:
            termos.append(termo)
    return termos


def _descritores_mesh_existem(estrategia: str, verificador: Verificador | None) -> dict:
    criterio = "Descritores MeSH da estratégia existem no MeSH"
    termos = descritores_mesh(estrategia or "")
    if not termos:
        return _item(criterio, "nao_verificavel", 1, "nenhum termo marcado como [MeSH Terms]/[mh] na estratégia")
    if not verificador:
        return _item(criterio, "nao_verificavel", 1, f"modo offline; descritores: {termos}")
    invalidos = []
    try:
        for termo in termos:
            r = verificador.verificar_descritor_mesh(termo)
            if not r["existe"]:
                invalidos.append(f"{termo} (o descritor é \"{r['descritor']}\")" if r.get("descritor") else termo)
    except Exception as e:
        return _item(criterio, "nao_verificavel", 1, f"falha ao consultar o MeSH: {e}")
    return _item(criterio, "ok" if not invalidos else "falha", 1,
                 f"não existem como descritor (no PubMed, [mh] não recupera nada): {invalidos}" if invalidos
                 else f"{len(termos)} descritor(es) conferido(s)")


# ----------------------------------------------------------------- Resultados

def _numeros_prisma(artigo: Artigo) -> dict:
    texto = "\n".join([t.texto for t in artigo.tabelas] + artigo.secoes.get("resultados", []) + artigo.legendas)
    padroes = {
        "identificados": r"(?:registros?|estudos?|artigos?) (?:identificad|encontrad|recuperad)\w*[^()\n]{0,60}\(n\s*=\s*" + NUM + r"\)",
        "duplicatas": r"duplica\w*[^()\n]{0,40}\(n\s*=\s*" + NUM + r"\)",
        "triados": r"(?:triad|rastread|selecionad\w* para leitura de t[ií]tulo)\w*[^()\n]{0,60}\(n\s*=\s*" + NUM + r"\)",
        "avaliados": r"(?:avaliad|lid)\w*[^()\n]{0,40}(?:elegibilidade|[ií]ntegra|texto completo)[^()\n]{0,20}\(n\s*=\s*" + NUM + r"\)",
        "incluidos": r"inclu[ií]d\w*[^()\n]{0,50}\(n\s*=\s*" + NUM + r"\)",
    }
    achados = {}
    for nome, rx in padroes.items():
        m = re.search(rx, texto, re.I)
        if m:
            achados[nome] = _int(m.group(1))
    excluidos = [_int(n) for n in re.findall(r"exclu[ií]d\w*[^()\n]{0,30}\(n\s*=\s*" + NUM + r"\)", texto, re.I)]
    achados["excluidos"] = excluidos
    return achados


def skill_resultados(artigo: Artigo, **_) -> dict:
    itens = []
    legendas = " ".join(artigo.legendas).lower()
    tem_fluxo = bool(re.search(r"fluxograma|prisma", legendas + " " + artigo.texto("resultados").lower()))
    itens.append(_item("Fluxograma da seleção (PRISMA) presente", "ok" if tem_fluxo else "falha", 2))
    itens.append(_prisma_2020_citado(artigo))

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
    itens.append(_numeros_padrao_brasileiro(artigo))
    return _resultado("resultados", "Resultados", 2.5, itens)


CRITERIO_NUMEROS = "Números no padrão brasileiro (vírgula decimal, IC 95%)"
NUMERO_EM_INGLES = [
    # p-valor com ponto: p<0.05, p = 0.001
    r"\bp\s*[<>=≤≥]\s*0?\.\d+",
    # ponto decimal com 1–2 casas (0.05, 1.5); "1.054" é separador de milhar brasileiro e não entra
    r"(?<![\w.,/:\-])\d+\.\d{1,2}(?![\w]|[.,]\d)",
    r"\b95\s*%\s*CI\b", r"\bCI\s*95\s*%",
]


def _numeros_padrao_brasileiro(artigo: Artigo) -> dict:
    textos = artigo.secoes.get("resultados", []) + [t.texto for t in artigo.tabelas
                                                    if t.secao in ("resultados", "discussao")]
    achados = []
    for texto in textos:
        texto = re.sub(r"\[[^\]]*\]|https?://\S+|doi:?\s*\S+", " ", texto, flags=re.I)  # citações, links e DOIs
        for rx in NUMERO_EM_INGLES:
            achados += [m.group(0) for m in re.finditer(rx, texto)]
    achados = list(dict.fromkeys(achados))
    return _item(CRITERIO_NUMEROS, "ok" if not achados else "parcial" if len(achados) <= 2 else "falha", 1,
                 f"formato em inglês: {achados[:10]}" if achados else "")


def _eh_prisma_2020(ref: str) -> bool:
    return bool(re.search(r"PRISMA 2020 statement|10\.1136/bmj\.n71\b", ref, re.I))


def _cita(texto: str, n: int) -> bool:
    """O texto cita a referência n? ([^n], [n] ou (n), inclusive em faixas "[^3-7]")."""
    grupos = re.findall(r"\[\^?([\d,;\s\-–]+)\]|\((\d+(?:\s*[,;\-–]\s*\d+)*)\)", texto)
    return any(n in expandir_numeros(a or b) for a, b in grupos)


def _prisma_2020_citado(artigo: Artigo) -> dict:
    criterio = "Modelo PRISMA 2020 citado (nas referências e nos Métodos ou na fonte da Figura)"
    n = next((i for i, r in enumerate(artigo.referencias, 1) if _eh_prisma_2020(r)), None)
    if n is None:
        return _item(criterio, "falha", 1, "declaração PRISMA 2020 (Page et al., BMJ 2021;372:n71) ausente das referências")
    onde = [nome for nome, texto in (("Métodos", artigo.texto("metodos")),
                                     ("fonte da Figura", "\n".join(artigo.legendas))) if _cita(texto, n)]
    return _item(criterio, "ok" if onde else "parcial", 1,
                 f"referência {n}, citada em: {onde}" if onde else f"referência {n} não é citada nos Métodos nem na Figura")


# ---------------------------------------------------------------- Referências

def _eh_vancouver(ref: str) -> bool:
    return bool(re.search(r"^\s*\d*\.?\s*(?:(?:de|da|do|dos|das|del|di|van|von)\s)?[A-ZÀ-Ý][\w'’\-À-ÿ ]+ [A-ZÀ-Ý]{1,5}[,.]", ref)
                and re.search(r"\b(19|20)\d{2}\s*;?\s*\d*", ref))


def _fasciculo_malformado(ref: str) -> str:
    """Suplemento colado no volume ('21Suppl 02'), repetido no fascículo ou com zero à esquerda ('Suppl 02')."""
    m = re.search(r"\b(?:19|20)\d{2}\s*;\s*(\d+[A-Za-z][^:(.]*(?:\([^)]*\))?|\d+\s*\((?:[^)]*\bSuppl\.?\s*0\d[^)]*)\))", ref)
    return m.group(1).strip() if m else ""


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
    itens += _detalhes_referencias(refs)

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


def _sem_numero(ref: str) -> str:
    return re.sub(r"^\s*\[?\d+[\.\)\]]\s*", "", ref).strip()


def _problemas_nlm(ref: str) -> bool:
    """Periódico abreviado com pontos ("Rev. Bras. Enferm.") no trecho depois do título."""
    titulo = extrair_titulo(ref)
    inicio = ref.find(titulo) + len(titulo) if titulo and titulo in ref else 0
    ano = re.search(r"\.\s*(?:19|20)\d{2}\s*(?:[;:(]|[A-Z][a-z]{2}\b|\.|$)", ref[inicio:])
    trecho = ref[inicio:inicio + ano.start() + 1] if ano else ref[inicio:]
    return bool(re.search(rf"\b(?:{ABREV_PERIODICO})\.\s+[A-ZÀ-Ý]", trecho))


def _pontuacao_duplicada(ref: str) -> list[str]:
    """"..", ".,", ",." e ". ." — sem contar reticências, "et al.," e iniciais ABNT ("SILVA, A. B.,")."""
    achados = []
    for m in re.finditer(r"(?<!\.)\.\.(?!\.)|\.,|,\.|(?<!\.)\.\s\.(?!\.)", ref):
        antes = ref[max(0, m.start() - 8):m.start()]
        if m.group(0) == ".," and re.search(r"(?:\bet al|(?<![\w])[A-ZÀ-Ý])$", antes):
            continue
        achados.append(ref[max(0, m.start() - 15):m.end() + 5])
    return achados


def _tem_paginas(ref: str) -> bool:
    return bool(re.search(r"(?:19|20)\d{2}[^.]{0,40}?;[^.:]*:\s*[A-Za-z]{0,4}\d+|\bp\.\s*\d+|\be\d{3,}\b|:\s*e\d+", ref))


def _eh_artigo_de_periodico(ref: str) -> bool:
    """Vancouver "2020;54(3)" ou ABNT "v. 54" — livros, sites e documentos não têm páginas obrigatórias."""
    return bool(re.search(r"\b(?:19|20)\d{2}\s*(?:[A-Z][a-z]{2}(?:\s\d{1,2})?)?\s*;\s*\d+|\bv\.\s*\d+", ref))


def _url_indevida(ref: str) -> str:
    urls = [u for u in re.findall(r"https?://\S+|\bwww\.\S+", ref) if "doi.org/" not in u]
    if not urls:
        return ""
    if re.search(r"\b10\.\d{4,9}/|PMID:?\s*\d", ref, re.I):
        return "URL com DOI/PMID"
    if not re.search(r"cit(?:ado|ed)|acess(?:o|ado) em|accessed", ref, re.I):
        return "URL sem data de acesso"
    return ""


def _autores_sem_iniciais(ref: str) -> list[str]:
    """No bloco de autores Vancouver ("Silva AB, Altamirano, Souza C."), autor sem iniciais."""
    texto = _sem_numero(ref)
    if re.match(r"^[A-ZÀ-Ý]{2,}[\w\-]*,\s", texto):  # ABNT: "SILVA, A. B.; ..."
        return []
    fim = re.search(r"\.\s", texto)  # em Vancouver as iniciais não têm ponto: o 1º ". " fecha o bloco
    itens = [x.strip() for x in (texto[:fim.start()] if fim else "").split(",") if x.strip()]
    autor = rf"(?:(?:{PARTICULAS}|[A-ZÀ-Ý][\w'’\-À-ÿ]*)\s)+[A-ZÀ-Ý]{{1,5}}"
    if len(itens) < 2 or not any(re.fullmatch(autor, x) for x in itens):
        return []  # autor institucional ("Brasil. Ministério da Saúde.") ou bloco não reconhecido
    return [x for x in itens if re.fullmatch(rf"(?:{PARTICULAS}\s)?[A-ZÀ-Ý][\w'’\-À-ÿ]+", x) and not x.isupper()]


def _detalhes_referencias(refs: list[str]) -> list[dict]:
    """Detalhes de formatação (pesos baixos: não devem dominar a rubrica)."""
    def status(problemas, total):
        return "ok" if not problemas else "parcial" if len(problemas) <= max(1, total // 10) else "falha"

    vancouver = [(i, r) for i, r in enumerate(refs, 1) if _eh_vancouver(r)]
    itens = []
    if vancouver:
        pontos = [i for i, r in vancouver if _problemas_nlm(r)]
        itens.append(_item("Periódicos abreviados no padrão NLM (sem pontos)", status(pontos, len(vancouver)), 0.5,
                           f"com pontos na abreviatura: {pontos[:15]}" if pontos else ""))
    else:
        itens.append(_item("Periódicos abreviados no padrão NLM (sem pontos)", "nao_verificavel", 0.5,
                           "referências fora do padrão Vancouver"))
    duplicada = {i: d for i, r in enumerate(refs, 1) if (d := _pontuacao_duplicada(r))}
    itens.append(_item("Sem pontuação duplicada (\"..\", \".,\", \",.\")", status(duplicada, len(refs)), 0.5,
                       "; ".join(f"[{i}] …{d[0]}…" for i, d in list(duplicada.items())[:8])))
    periodicos = [(i, r) for i, r in enumerate(refs, 1) if _eh_artigo_de_periodico(r)]
    sem_paginas = [i for i, r in periodicos if not _tem_paginas(r)]
    itens.append(_item("Páginas ou e-locator presentes", status(sem_paginas, len(periodicos)) if periodicos
                       else "nao_verificavel", 0.5, f"sem páginas: {sem_paginas[:15]}" if sem_paginas else ""))
    urls = {i: u for i, r in enumerate(refs, 1) if (u := _url_indevida(r))}
    itens.append(_item("URL só quando não há DOI/PMID, com data de acesso", status(urls, len(refs)), 0.5,
                       "; ".join(f"[{i}] {u}" for i, u in list(urls.items())[:10])))
    fasciculos = {i: f for i, r in enumerate(refs, 1) if (f := _fasciculo_malformado(r))}
    itens.append(_item("Volume e fascículo bem formados (ex.: 21(Suppl 2), não 21Suppl 02(Suppl 02))",
                       status(fasciculos, len(refs)), 0.5,
                       "; ".join(f"[{i}] {f}" for i, f in list(fasciculos.items())[:10])))
    sem_iniciais = {i: a for i, r in enumerate(refs, 1) if (a := _autores_sem_iniciais(r))}
    itens.append(_item("Autores com iniciais", status(sem_iniciais, len(refs)), 0.5,
                       "; ".join(f"[{i}] {', '.join(a)}" for i, a in list(sem_iniciais.items())[:10])))
    return itens


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
        _limitacoes_enxutas(artigo),
        _item("Discussão dialoga com a literatura (citações)", "ok" if len(re.findall(r"\[\^|\[\d", texto)) >= 5
              else "parcial" if re.search(r"\[\^|\[\d", texto) else "falha", 1),
    ]
    internacionais = re.findall(r"(american|european|nice\b|\besc\b|\baha\b|\bada\b|\bwho\b|oms)", minusculo)
    if internacionais:
        contextualiza = re.search(r"internaciona|no brasil|brasileir|ministério da saúde", minusculo)
        itens.append(_item("Diretrizes internacionais identificadas como tais", "ok" if contextualiza else "parcial", 0.5))
    return _resultado("discussao", "Discussão e realismo APS/SUS", 1.0, itens)


def _limitacoes_enxutas(artigo: Artigo) -> dict:
    """Limitações num só parágrafo da Discussão, sem se espalhar pelo resumo e pela conclusão."""
    padrao = r"limita[cç][aãõ]|limitante"
    na_discussao = [p for p in artigo.secoes.get("discussao", []) if re.search(padrao, p, re.I)]
    fora = [s for s in ("resumo", "abstract", "conclusao") if re.search(padrao + r"|limitation", artigo.texto(s), re.I)]
    palavras = sum(_palavras(p) for p in na_discussao)
    ok = len(na_discussao) <= 1 and not fora and palavras <= 150
    return _item("Limitações enxutas: um parágrafo na Discussão, sem repetir no resumo/conclusão",
                 "ok" if ok else "parcial" if len(na_discussao) <= 2 and not fora else "falha", 1,
                 f"{len(na_discussao)} parágrafo(s), {palavras} palavras" + (f"; também em: {fora}" if fora else ""))


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

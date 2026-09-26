"""Prompts do pipeline, derivados da skill `artigos` (revisão de literatura Qualis A1)."""

from __future__ import annotations

import json

from .config import RAIZ

SISTEMA = """Você é um pesquisador brasileiro da área da saúde, experiente em revisões de literatura \
publicadas em revistas Qualis A1 (ex.: RBMFC). Escreve em português do Brasil, registro científico formal.

Regras que nunca podem ser quebradas:
- Não invente dados, números, estudos, autores, anos ou DOIs. Use só os fatos e as referências fornecidos.
- Cite apenas com as chaves fornecidas, no formato [R12] ou [R3, R7]. Nunca crie chaves novas.
- Contexto brasileiro: APS/SUS/UBS. Diretriz internacional deve ser identificada como tal e contextualizada \
com o que se pratica de fato nas UBS; não descreva recursos como sempre disponíveis no SUS se isso não for real."""


def _expressoes() -> str:
    caminho = RAIZ / "referencias" / "expressoes-a-evitar.md"
    return caminho.read_text(encoding="utf-8") if caminho.exists() else ""


def _refs(referencias: list[dict], limite_resumo: int = 350) -> str:
    linhas = []
    for r in referencias:
        autor = (r["autores"][0].split(" ")[0] + (" et al." if len(r["autores"]) > 1 else "")) if r["autores"] else "s/ autor"
        resumo = (r.get("resumo") or "")[:limite_resumo]
        linhas.append(f"[{r['chave']}] {autor}, {r['ano']}. {r['titulo']}. {r['revista']}. Resumo: {resumo}")
    return "\n".join(linhas)


def escopo(tema: str, revista: str, normas: str, artigos_base: list[str], periodo: tuple[int, int],
           observacoes: str) -> list[dict]:
    pedido = f"""Etapa 1 — Alinhar escopo de uma revisão de literatura.

Tema: {tema}
Revista de destino: {revista}
Normas da revista (trecho): {normas[:3000] or "não fornecidas"}
Artigos-base fornecidos pelo autor: {", ".join(artigos_base) or "nenhum"}
Período de publicação: {periodo[0]}–{periodo[1]}
Observações do autor: {observacoes or "nenhuma"}

Produza o protocolo da busca. As consultas precisam ser específicas o bastante para retornar entre 20 e 300 \
registros por base (não inclua filtros de data, idioma ou tipo: eles são adicionados automaticamente).
- PubMed: sintaxe PubMed com termos MeSH ([MeSH Terms]) e sinônimos em [tiab], unidos com AND/OR.
- Europe PMC: sintaxe Europe PMC (TITLE_ABS:"termo", AND/OR), termos em inglês e português.
- Descritores DeCS (português) e MeSH (inglês) usados.
- Critérios de inclusão e exclusão objetivos e verificáveis pelo título/resumo.
- 3 consultas PubMed de CONTEXTO (epidemiologia, cenário brasileiro/APS/SUS, diretrizes) para a introdução \
e discussão — essas não entram no fluxograma.

Responda SOMENTE com JSON:
{{"titulo_provisorio": "...", "pergunta": "...", "objetivo": "...",
  "descritores_decs": ["..."], "descritores_mesh": ["..."],
  "consultas": {{"pubmed": "...", "europepmc": "..."}},
  "criterios_inclusao": ["..."], "criterios_exclusao": ["..."],
  "consultas_contexto": ["...", "...", "..."]}}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def refinar_consultas(consultas: dict, contagens: dict, alvo: tuple[int, int], protocolo: dict) -> list[dict]:
    pedido = f"""As consultas abaixo retornaram contagens fora da faixa desejada ({alvo[0]}–{alvo[1]} registros no \
total, somando as bases). Ajuste-as (mais específicas se passou do máximo; mais amplas se ficou abaixo do mínimo), \
mantendo a pergunta de pesquisa.

Pergunta: {protocolo.get("pergunta")}
Consultas atuais: {json.dumps(consultas, ensure_ascii=False)}
Contagens (já com filtros de data/idioma): {json.dumps(contagens, ensure_ascii=False)}

Responda SOMENTE com JSON: {{"consultas": {{"pubmed": "...", "europepmc": "..."}}}}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def triagem(protocolo: dict, registros: list[dict], fase: str) -> list[dict]:
    criterios = "\n".join(f"E{i + 1}. {c}" for i, c in enumerate(protocolo["criterios_exclusao"]))
    inclusao = "\n".join(f"- {c}" for c in protocolo["criterios_inclusao"])
    instrucao = (
        "Triagem por TÍTULO e RESUMO: exclua só o que claramente não atende; na dúvida, mantenha."
        if fase == "triagem" else
        "Avaliação de ELEGIBILIDADE: leitura criteriosa do resumo completo e dos metadados. Exclua o que não "
        "atende a todos os critérios de inclusão. Use E0 quando o resumo não trouxer informação suficiente."
    )
    itens = "\n\n".join(
        f"{r['chave']} | {r['ano']} | {', '.join(r['tipos'][:3])} | {r['titulo']}\nResumo: {(r['resumo'] or 'sem resumo')[:1500]}"
        for r in registros
    )
    pedido = f"""{instrucao}

Pergunta: {protocolo["pergunta"]}
Critérios de inclusão:
{inclusao}
Critérios de exclusão:
E0. Informação insuficiente no título/resumo para confirmar os critérios
{criterios}

Registros:
{itens}

Responda SOMENTE com JSON, um item por registro, sem pular nenhum:
[{{"chave": "R1", "decisao": "incluir" | "excluir", "criterio": "E2" (só quando excluir)}}]"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def sintese(protocolo: dict, registros: list[dict]) -> list[dict]:
    itens = "\n\n".join(f"{r['chave']} | {r['ano']} | {r['titulo']}\nResumo: {r['resumo'][:2500]}" for r in registros)
    pedido = f"""Extraia, apenas do que está escrito em cada resumo, os dados para o quadro-síntese da revisão.
Pergunta da revisão: {protocolo["pergunta"]}
Se um dado não estiver no resumo, escreva "não informado no resumo". Frases curtas, sem citar chaves.

{itens}

Responda SOMENTE com JSON:
[{{"chave": "R1", "desenho": "tipo de estudo", "populacao": "população/amostra e local",
   "achados": "principais achados relacionados à pergunta (até 40 palavras)"}}]"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def metodos(fatos: dict) -> list[dict]:
    pedido = f"""Escreva a seção MÉTODOS de uma revisão de literatura a partir destes fatos reais da busca:

{json.dumps(fatos, ensure_ascii=False, indent=1)}

Obrigatório: tipo de estudo; pergunta norteadora; bases consultadas (PubMed obrigatória) e data da busca; \
descritores DeCS/MeSH; filtros de período/idioma/tipo; critérios de inclusão e de exclusão; etapas de seleção \
(remoção de duplicatas, triagem por título/resumo, avaliação de elegibilidade) e como os dados foram extraídos \
para o quadro-síntese. As estratégias de busca completas de cada base ficam no Quadro 1, inserido \
automaticamente logo após esta seção: remeta a ele, não as reescreva.
Não afirme nada que não esteja nos fatos (ex.: não diga que houve dois revisores independentes). \
Seção seca, técnica e replicável. Sem citações. Sem subtítulos em markdown; parágrafos separados por linha em branco."""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def resultados(fatos: dict, incluidos: list[dict]) -> list[dict]:
    pedido = f"""Escreva a seção RESULTADOS da revisão.

Números do fluxograma (use exatamente estes, sem arredondar): {json.dumps(fatos, ensure_ascii=False)}
Estudos incluídos (use a chave para citar cada um pelo menos uma vez):
{json.dumps(incluidos, ensure_ascii=False, indent=1)}

Estrutura: um parágrafo com o resultado da busca e da seleção citando a Figura 1 (fluxograma PRISMA); \
depois uma descrição breve dos principais pontos abordados pelos estudos incluídos, agrupados por tema \
(não estudo por estudo), remetendo ao Quadro 2 (quadro-síntese). Humanização mínima: sem opinião, sem frases como \
"os resultados demonstraram que". Não crie tabela nem figura no texto (elas são inseridas depois). \
Parágrafos separados por linha em branco, sem markdown."""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def introducao(protocolo: dict, contexto: list[dict], minimo_citacoes: int) -> list[dict]:
    pedido = f"""Escreva a INTRODUÇÃO da revisão sobre: {protocolo["pergunta"]}

Referências verificadas disponíveis (cite com a chave):
{_refs(contexto)}

Requisitos: no máximo ~1.100 palavras (limite de 3 páginas); contextualize o problema com dados \
epidemiológicos e com a realidade da APS/SUS; justifique a revisão; o ÚLTIMO parágrafo apresenta o \
objetivo de forma clara e direta: "{protocolo["objetivo"]}". Cite pelo menos {minimo_citacoes} referências \
distintas da lista. Humanização moderada. Parágrafos separados por linha em branco, sem markdown."""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def discussao(protocolo: dict, sintese_incluidos: list[dict], contexto: list[dict], minimo_citacoes: int) -> list[dict]:
    pedido = f"""Escreva a DISCUSSÃO da revisão sobre: {protocolo["pergunta"]}

Achados dos estudos incluídos (quadro-síntese):
{json.dumps(sintese_incluidos, ensure_ascii=False, indent=1)}

Outras referências verificadas disponíveis:
{_refs(contexto)}

Requisitos: interprete os achados em vez de repeti-los; compare estudos e nomeie pelo menos uma divergência \
real entre eles, com uma explicação plausível (amostra, desenho, cenário); traga ponto de vista do autor; \
discuta implicações para a APS/SUS com realismo; inclua um parágrafo de limitações desta revisão. \
Cite pelo menos {minimo_citacoes} referências distintas. Cautela sempre ancorada em dado ou estudo nomeado. \
Parágrafos separados por linha em branco, sem markdown."""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def conclusao(protocolo: dict, discussao_texto: str) -> list[dict]:
    pedido = f"""Escreva a CONCLUSÃO (1–2 parágrafos, sem citações) respondendo ao objetivo: {protocolo["objetivo"]}
Base: a discussão abaixo.

{discussao_texto[:6000]}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


def resumos(titulo: str, secoes: dict) -> list[dict]:
    corpo = "\n\n".join(f"## {nome}\n{texto[:3500]}" for nome, texto in secoes.items())
    pedido = f"""A partir do artigo abaixo, produza título, resumo estruturado e abstract.
Título provisório: {titulo}

{corpo}

Responda SOMENTE com JSON:
{{"titulo": "título final em português (sem ponto final)", "title": "English title",
  "resumo": "Objetivo: ... Métodos: ... Resultados: ... Conclusão: ... (até 250 palavras, sem citações)",
  "palavras_chave": ["3 a 5 descritores DeCS"],
  "abstract": "Objective: ... Methods: ... Results: ... Conclusion: ... (up to 250 words)",
  "keywords": ["3 to 5 MeSH terms"]}}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


INTENSIDADE = {
    "introducao": "MODERADA: abertura pode ser mais envolvente e o ritmo variar, mas o objetivo no último parágrafo "
                  "continua claro e direto.",
    "metodos": "MÍNIMA: só tire a cadência robótica de listas repetidas. Seção seca, técnica e replicável.",
    "resultados": "MÍNIMA a MODERADA: números intocáveis; só reescreva frases robotizadas repetidas.",
    "discussao": "MÁXIMA: ponto de vista, ênfase, tensões entre estudos comentadas com naturalidade, variação de "
                 "ritmo entre parágrafos — mantendo o registro científico.",
    "conclusao": "MODERADA.",
}


def humanizar(secao: str, texto: str) -> list[dict]:
    pedido = f"""Revisão de ESTILO (humanização) da seção {secao.upper()}. Intensidade: {INTENSIDADE.get(secao, "MODERADA")}

Aplique em sequência: (1) correção do fluxo de pensamento — ideias irregulares como numa mente real, quebrando \
padrões controlados demais; (2) quebra-padrões — elimine sinais de texto de IA; (3) teste de credibilidade — \
reescreva o que soar polido ou preciso demais; (4) moldador de voz — ponto de vista real; (5) detector de almas \
— reescreva as frases mais artificiais como quem explica a um colega.

Técnicas objetivas: em cada parágrafo de 5–6 frases, pelo menos uma frase curta (<10 palavras) e uma longa \
(>25 palavras); no máximo 1–2 travessões por parágrafo; verbos diretos ("mostra", "confirma", "indica") em vez \
de rebuscados; cautela ancorada em dado específico; nada de "Primeiramente... Em segundo lugar... Por fim..."; \
parágrafos vizinhos com tamanhos diferentes.

Construções a evitar:
{_expressoes()}

REGRAS ABSOLUTAS: não altere nenhum número, dado, resultado, nome de estudo ou estratégia de busca; mantenha \
TODAS as marcações de citação exatamente como estão ([R3], [R3, R7]) junto da afirmação que sustentam; não \
acrescente informação nova. Devolva SOMENTE o texto reescrito, parágrafos separados por linha em branco, sem markdown.

Texto:
{texto}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]


CHECKLIST = [
    "Nenhum parágrafo tem o mesmo número de frases/tamanho que o anterior em sequência",
    "Não há 3+ ocorrências da mesma expressão de transição no artigo",
    "Métodos e Resultados secos, exatos e sem opinião",
    "Discussão tem pelo menos um trecho com ponto de vista claro do autor",
    "Texto reflete a realidade da APS/SUS, sem simular contexto de outro país",
    "Nenhum parágrafo tem 3+ travessões; verbos diretos em vez de rebuscados",
    "Discussão nomeia pelo menos uma divergência real entre estudos",
    "Sem lista disfarçada de prosa (Primeiramente... Em segundo lugar... Por fim...)",
    "Lido em voz alta, soa como algo que uma pessoa diria",
    "Objetivo está no último parágrafo da Introdução",
]


def checklist(texto: str) -> list[dict]:
    itens = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(CHECKLIST))
    pedido = f"""Faça a conferência final do artigo abaixo com este checklist:
{itens}

Responda SOMENTE com JSON: [{{"item": 1, "ok": true, "observacao": "evidência curta"}}]

Artigo:
{texto[:60000]}"""
    return [{"role": "system", "content": SISTEMA}, {"role": "user", "content": pedido}]

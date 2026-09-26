# Modelos para escrita: ranking, escada no OmniRoute e custos de API

Levantamento de **26/09/2026**. Os rankings e os preços mudam todo mês: confira antes de mudar a escada.

- **Preços da Anthropic:** conferidos na página oficial ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
- **Demais preços e placares:** vêm das fontes linkadas em cada tabela.

## 1. Os melhores modelos do mundo para escrita (set/2026)

Nenhum placar sozinho mede "escrita científica longa em português", então cruzei três tipos de sinal:

- **Preferência humana:** Arena (Creative Writing e Non-English, atualizados em 25/09).
- **Juiz automático:** EQ-Bench Creative Writing v3 e Longform.
- **Inteligência geral:** Artificial Analysis (AA).

| # | Modelo | EQ CW v3 (pos.) | EQ Longform (pos.) | Arena Creative Writing (pos.) | Arena Non-English (pos.) | AA Index |
|---|---|---|---|---|---|---|
| 1 | **Claude Opus 5.5** (Anthropic) | 2050 (#7) | 84,6 (#3) | **1521 (#1)**¹ | **1501 (#1)** | **57,6 (#1)** |
| 2 | Claude Fable 5.1 (Anthropic) | 2162 (#2) | 85,3 (#2) | 1484 (#7) | 1496 (#2) | 53,4 |
| 3 | Claude Opus 5 (Anthropic) | 2133 (#3) | **86,3 (#1)** | 1472 (#12) | 1483 (#11) | 50,8 |
| 4 | Claude Fable 5 (Anthropic) | 1943 (#11) | 83,0 (#4) | 1501 (#2) | 1494 (#3) | 49,6 |
| 5 | GPT-6 Astra (OpenAI) | **2173 (#1)** | 82,8 (#6) | 1453 (#31) | 1462 (#38) | 52,7 |
| 6 | GPT-6 Sol (OpenAI) | 2125 (#4) | 82,8 (#8) | 1451 (#34) | 1448 (#55) | 47,5 |
| 7 | Kimi K3 (Moonshot) | 2082 (#5) | 79,6 (#17) | 1458 (#25) | 1477 (#18) | 43,6 |
| 8 | GLM-5.3 (Z.ai, pesos abertos) | 2075 (#6) | 81,8 (#11) | 1456 (#27) | 1464 (#31) | 44,8 |
| 9 | Gemini 3.8 Flash (Google) | 1748 (#30) | 76,8 (#25) | 1482 (#9) | 1483 (#13) | 40,9 |
| 10 | Grok 4.7 (xAI) | 2007 (#8) | 83,0 (#5) | 1427 (#72) | 1435 (#81) | 46,4 |

¹ Nota ainda preliminar: só 487 votos, com margem de ±29.

Fontes: [Arena](https://arena.ai/leaderboard/text/creative-writing), [EQ-Bench CW v3](https://eqbench.com/creative_writing.html), [EQ-Bench Longform](https://eqbench.com/creative_writing_longform.html), [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models).

### Leitura

- **A família Claude lidera nos três tipos de sinal**, e é a única que aparece bem em todos. O Opus 5.5 é o nº 1 em preferência humana e em textos não-inglês, e ainda é o Claude de ponta mais barato.
- **GPT-6 tem sinais contraditórios.** Lidera o EQ-Bench (juiz automático), mas vai mal na preferência humana da Arena.
- **Gemini Flash também diverge.** Vai bem na Arena, mas tem índice alto de vícios de texto de IA no EQ-Bench (22–28, contra 5–10 dos melhores). Por isso fica fora da escada de escrita e entra só na triagem.
- **Área médica:** na categoria Medicine & Healthcare da Arena, os líderes com volume de votos são Claude Opus 4.6/4.7, Kimi K3 e Fable 5.1.
- **Português:** não existe placar confiável e atual de escrita longa em PT-BR. A Maritaca diz que o Sabiá 4 Thinking lidera em redação jurídica, mas a comparação foi contra a geração anterior de modelos. Pode valer como revisão de português, não como escritor principal.

### Ressalvas dos placares

- **EQ-Bench:** usa Claude como juiz (possível viés a favor do Claude) e avalia ficção em inglês.
- **Artificial Analysis:** mede inteligência geral, não escrita.

## 2. Custos de API

Preços em US$ por 1M tokens, tier padrão, sem batch e sem cache. Câmbio: R$ 5,18 (fechamento de 25/09/2026).

A coluna **"Por chamada"** assume uma chamada de 8 mil tokens de entrada + 6 mil de saída.

| Modelo | Entrada | Saída | Por chamada (US$) | Por chamada (R$) |
|---|---:|---:|---:|---:|
| Claude Fable 5.1 | 10,00 | 50,00 | 0,380 | 1,97 |
| GPT-6 Astra | 10,00 | 50,00 | 0,380 | 1,97 |
| Claude Opus 5 | 5,00 | 25,00 | 0,190 | 0,98 |
| **Claude Opus 5.5** | 4,00 | 20,00 | 0,152 | 0,79 |
| Kimi K3 | 3,00 | 15,00 | 0,114 | 0,59 |
| **Claude Sonnet 5** | 2,00 | 10,00 | 0,076 | 0,39 |
| GPT-6 Sol | 2,00 | 10,00 | 0,076 | 0,39 |
| Grok 4.7 | 2,00 | 6,00 | 0,052 | 0,27 |
| Sabiá 4 Thinking (R$ 5 / R$ 40) | ~0,97 | ~7,72 | 0,054 | 0,28 |
| GLM-5.3 | 1,40 | 4,40 | 0,038 | 0,19 |
| Claude Haiku 4.5 | 1,00 | 5,00 | 0,038 | 0,20 |
| **Gemini 3.8 Flash**² | 0,75 | 3,75 | 0,029 | 0,15 |
| GLM-5.3 Flash | 0,15 | 0,50 | 0,004 | 0,02 |

² O Gemini 3.8 Flash tem plano grátis, e o preço sobe para 1,50 / 7,50 em 01/01/2027.

Fontes: [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) (conferido), [OpenAI](https://developers.openai.com/api/docs/pricing), [Kimi](https://platform.kimi.ai/docs/pricing/chat), [Z.ai](https://docs.z.ai/guides/overview/pricing), [xAI](https://docs.x.ai/docs/models), [Google](https://ai.google.dev/gemini-api/docs/pricing), [Maritaca](https://docs.maritaca.ai/pt/precos).

### Quanto custa um artigo completo no pipeline v2

O pipeline faz cerca de 50 chamadas por artigo, divididas por papel. Volume estimado para um artigo típico (~130 registros triados, ~25 incluídos):

- **Triagem:** 138 mil tokens de entrada e 21 mil de saída.
- **Técnico:** 73 mil de entrada e 12,5 mil de saída.
- **Escrita:** 77 mil de entrada e 22 mil de saída.

| Escada | Escrita | Técnico | Triagem | **Total** | Total (R$) |
|---|---:|---:|---:|---:|---:|
| **Recomendada**: Opus 5.5 escreve, Sonnet 5 no técnico, Gemini Flash na triagem | 0,75 | 0,27 | 0,18 | **US$ 1,20** | R$ 6,22 |
| Qualidade máxima: Fable 5.1 escreve, Opus 5.5 no técnico, Sonnet 5 na triagem | 1,87 | 0,54 | 0,49 | **US$ 2,90** | R$ 15,01 |
| Tudo no Opus 5.5 | 0,75 | 0,54 | 0,97 | **US$ 2,26** | R$ 11,72 |
| Tudo no GPT-6 Astra | 1,87 | 1,35 | 2,43 | **US$ 5,66** | R$ 29,29 |
| Econômica: Kimi K3 escreve, GLM-5.3 no técnico, GLM Flash na triagem | 0,56 | 0,16 | 0,03 | **US$ 0,75** | R$ 3,88 |
| Mínima: GLM-5.3 em tudo | 0,20 | 0,16 | 0,29 | **US$ 0,65** | R$ 3,35 |

Esses valores são estimativas. **O painel mostra o gasto real de cada artigo por modelo e por etapa**; use os números dele depois do primeiro artigo real. Três ressalvas:

- **Tokens de raciocínio contam como saída.** No Opus 5.5 e no Fable 5.1 o raciocínio está sempre ligado, o que pode multiplicar o custo de escrita por 1,5 a 3.
- **Tokenizador mais novo:** do Claude 4.7 em diante, o mesmo texto gera cerca de 30% mais tokens.
- **Dá para economizar com cache e batch.** No Opus 5.5 a leitura do cache custa 5% do preço de entrada, e o batch dá 50% de desconto.

## 3. A escada configurada (`config/escada.json`)

A escada só desce um degrau quando o modelo de cima falha (erro, cota ou resposta vazia). Todo degrau usado aparece no painel como "fallback".

| Papel | 1º | 2º | 3º | 4º | 5º |
|---|---|---|---|---|---|
| **Escrita** (introdução, discussão, conclusão, humanização, resumo) | Claude Opus 5.5 | Claude Opus 5 | Kimi K3 | GPT-6 Sol | GLM-5.3 |
| **Técnico** (escopo, métodos, resultados, quadro-síntese, checklist) | Claude Sonnet 5 | GPT-6 Sol | GLM-5.3 | Gemini 3.8 Flash | |
| **Triagem** (título/resumo e elegibilidade) | Gemini 3.8 Flash | Claude Haiku 4.5 | GLM-5.3 Flash | | |
| **Auditoria** (parecer por IA, fora do sistema) | GPT-6 Sol | Kimi K3 | Claude Sonnet 5 | | |

Por que a escada foi montada assim:

- **Escrita só com modelos de ponta.** Não há degrau gratuito fraco: se todos falharem, o pipeline para e você retoma depois (`retomar`). Um parágrafo escrito por um modelo ruim estraga o artigo.
- **Um provedor diferente logo no 3º degrau.** Se a API da Anthropic cair, o artigo continua.
- **Triagem barata:** é classificação, não escrita. Mesmo assim, as decisões ficam em `triagem.csv` para os autores conferirem.
- **Auditoria com outra família de modelo** (GPT/Kimi): evita que o Claude avalie o próprio texto.
- **Para qualidade máxima:** troque o 1º degrau da escrita por `anthropic/claude-fable-5-1` (cerca de 2,5× o custo da escrita).

## 4. Cuidados no OmniRoute

- **Nomes dos modelos:** o catálogo do OmniRoute ainda não tem `claude-opus-5-5`, `claude-fable-5-1`, `gpt-6-*` nem `gemini-3.8-flash`. Adicione em *Providers → [provedor] → Custom Models* e rode `python -m artigos_v2 modelos`, que marca o que está AUSENTE.
- **Compressão:** o OmniRoute comprime prompts e respostas por padrão (Caveman, "terse prose"), o que degrada texto longo. O cliente do v2 já envia `x-omniroute-compression: off` em toda chamada.
- **Custo real:** quando o OmniRoute devolve `X-OmniRoute-Response-Cost`, esse valor vira o "gasto real" no painel. Para modelos por assinatura ou cota grátis, marque `gratuito_no_omniroute: true` na escada.
- **Termos de uso:** usar o login do Claude Pro/Max (OAuth, prefixo `cc/`) em ferramentas de terceiros viola os termos da Anthropic desde abril/2026. Use chave de API (`anthropic/`). O próprio OmniRoute marca Kiro e Antigravity como proibidos via proxy, e Qoder/OpenCode/NVIDIA como "caution".
- **Dados sensíveis:** planos gratuitos (Gemini free, Meta "contributor") podem usar o conteúdo para treino. Nesse pipeline só passam resumos públicos, mas evite dados de pacientes.

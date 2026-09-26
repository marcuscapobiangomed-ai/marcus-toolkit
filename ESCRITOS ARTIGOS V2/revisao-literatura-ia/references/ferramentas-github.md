# Ferramentas do GitHub relevantes (pesquisa de 2026-09-25)

Lista curada do que existe hoje em codigo aberto e pode encurtar caminho ao evoluir este projeto.
Nenhum destes foi instalado/copiado automaticamente — sao referencia para consulta manual.

## PubMed / NCBI
- **cyanheads/pubmed-mcp-server** — servidor MCP (TypeScript) que ja fala PubMed + Europe PMC + PMC +
  Unpaywall + formatacao de citacao (APA/MLA/BibTeX/RIS/Vancouver) + MeSH. Alternativa/backup ao
  plugin `bio-research:pubmed` ja instalado nesta maquina.
- **krassowski/easy-entrez** — cliente Python leve para E-utilities, se algum dia precisarmos de um
  script Python standalone em vez de MCP.
- **biopython** (`Bio.Entrez`) — o wrapper Python classico de E-utilities.

## SciELO
- **scieloorg/articlemetaapi**, **scieloorg/oai-pmh**, **scieloorg/citedby** — clientes oficiais da
  propria SciELO/BIREME para as APIs descritas em `fontes-e-apis.md`. Sao a fonte de verdade caso
  algum endpoint mude.
- `scieloapi.py` (tambem do org scieloorg) esta marcado **descontinuado** — nao usar.

## BVS / LILACS / DeCS
- **bireme/decs-api** — codigo-fonte (Django/Elasticsearch) da API de DeCS.
- **bireme/iahx-server**, **bireme/iahx-controller** — codigo do motor de busca por tras do Portal
  BVS. Nao sao bibliotecas-cliente prontas, mas explicam os parametros de busca (`q=`, `lang=`, etc).
- Nao existe hoje nenhum wrapper de terceiros decente para buscar LILACS/BVS programaticamente —
  por isso o caminho adotado aqui e navegador real no portal publico.

## Revisao sistematica / triagem de literatura
- **asreview/asreview** — ferramenta madura (publicada na Nature Machine Intelligence) de triagem
  ativa de grandes listas de artigos. Pode ser usada no futuro para ranquear resultados antes da
  redacao, se o volume de artigos for muito grande para triagem manual.
- **kurtvalcorza/agentic-research** — o achado mais proximo do que estamos construindo: pipeline
  PRISMA/Cochrane/GRADE feito como skills do Claude Code, com portoes de verificacao de DOI/retratacao
  e reconciliacao aritmetica do fluxo PRISMA. Vale estudar a estrutura dele conforme este projeto
  evoluir.
- **Black-Lights/prisma-review-tool** — outra automacao PRISMA-2020 pensada para rodar via MCP com
  Claude; usa arXiv/OpenAlex/Semantic Scholar (nao PubMed/SciELO/BVS), mas o desenho de duas
  passagens de triagem e reaproveitavel.
- **urschrei/pyzotero** — cliente Python do Zotero. Se no futuro quisermos exportar as referencias
  verificadas para um gerenciador bibliografico de verdade, e o caminho natural.

## Verificacao de citacao / anti-alucinacao
- **markrussinovich/refchecker** — verifica cada citacao de um texto contra Semantic Scholar/OpenAlex/
  CrossRef/DBLP/ACL Anthology e sinaliza citacoes provavelmente inventadas. E o modelo mais proximo do
  que o agente `verificador-citacoes.md` deste projeto faz manualmente — dá pra usar como inspiracao
  ou, futuramente, como camada extra de checagem automatizada.
- **Vikranth3140/Citation-Hallucination-Detection** — implementacao parecida (lookup exato + fuzzy
  matching + LLM), util como segunda opiniao/fallback mais barato.

## Catalogos de skills (uteis para nao reinventar a roda)
- **O0000-code/awesome-academic-skills**, **lingzhi227/agent-research-skills**,
  **aipoch/medical-research-skills**, **brycewang-stanford/lit-review-agent-tools** — indices de
  skills prontas de Claude Code/Codex para pesquisa academica e escrita cientifica. Vale espiar antes
  de criar uma skill nova do zero no futuro.
- **andrehuang/academic-writing-agents** — orquestrador multiagente (revisores de logica, prosa,
  bibliografia, LaTeX) para polir um rascunho ja pronto — inspiracao para a etapa de revisao final.
- **diogoprov/ia-revisao-literatura** — material em portugues sobre onde ferramentas de IA falham em
  revisao de literatura; boa leitura de contexto para reforcar as guardas de veracidade deste projeto.

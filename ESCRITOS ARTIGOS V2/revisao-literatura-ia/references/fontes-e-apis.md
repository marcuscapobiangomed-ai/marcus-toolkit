# Fontes e APIs — o que é real, verificado em 2026-09-25

Este arquivo existe para nao repetir a pesquisa toda vez. Tudo abaixo foi confirmado
de verdade (fetch direto ou busca na sessao que originou este projeto) — nao e achismo.
Se algo aqui parecer desatualizado numa execucao futura, reconfirme antes de confiar.

## PubMed / MEDLINE / PMC — tem API publica, sem necessidade de chave

- Base: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` (`esearch.fcgi`, `efetch.fcgi`, `esummary.fcgi`).
- Chave de API e **opcional**: sem chave, 3 req/s; com chave gratuita (conta NCBI), 10 req/s.
- Registrar `tool=` e `email=` em cada chamada e boa pratica (nao obrigatorio tecnicamente).
- `retmax` de `esearch`/`esummary` e limitado a 10.000 por chamada — usar `usehistory=y` (WebEnv/query_key) para paginar em buscas grandes.
- Texto completo automatizado so e permitido via: `efetch db=pmc`, OAI-PMH da PMC
  (`https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/`, `set=pmc-open`), ou a BioC API
  (`https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml/{PMID|PMCID}/unicode`).
  **Nunca faca scraping do HTML do PubMed/PMC** — e contra a politica deles e, na pratica, bloqueado por bot-check.
- Evitar rodar lotes grandes (100+ chamadas) em horario de pico dos EUA (seg-sex, 5h-21h horario do leste).
- **Nesta sessao ja existe um conector MCP pronto** (plugin `bio-research:pubmed`) com as ferramentas
  `search_articles`, `get_article_metadata`, `get_full_text_article`, `find_related_articles`,
  `convert_article_ids`, `lookup_article_by_citation`, `get_copyright_status`. **Prefira sempre essas
  ferramentas** em vez de montar chamadas HTTP na mao — elas ja tratam rate limit/formatacao.
  Os plugins `bio-research:c-trials` (ClinicalTrials.gov), `bio-research:biorxiv`, `bio-research:chembl`,
  `bio-research:consensus` e `bio-research:ot` (Open Targets) tambem existem e reforcam a cobertura
  quando o tema toca ensaios clinicos, farmacologia ou mecanismos biologicos.

## SciELO — tem API, mas so para metadados por ID/DOI/ISSN (NAO busca por palavra-chave)

- `https://articlemeta.scielo.org/api/v1/` — **ArticleMeta**, sem chave, confirmado ao vivo:
  - `GET /collection/?code={scl|arg|cub|spa|...}` — metadados de uma colecao nacional.
  - `GET /journal/?issn={ISSN}` — metadados de um periodico.
  - `GET /article/?code={PID}&format=json|xmlpubmed|xmlcrossref&body=true` — registro completo de um artigo.
  - `GET /article/identifiers/?issn={ISSN}&from=YYYY-MM-DD&until=YYYY-MM-DD&limit=N&offset=N` — so enumera PIDs, nao busca por termo.
  - Para downloads grandes, a SciELO recomenda os dumps estaticos mensais (`static.scielo.org`) em vez de martelar a API.
- `https://citedby.scielo.org/api/v1/` — **CitedBy**, sem chave, confirmado ao vivo:
  - `GET /pid/?q={PID SciELO}`, `GET /doi/?q={DOI}`, `GET /meta/?title=...&author=...&year=...`
  - Serve para confirmar que uma citacao realmente existe e ver quem a cita.
- **`developers.scielo.org` nao existe** (DNS nao resolve). A documentacao real e `docs.scielo.org`
  (redireciona para `scielo.readthedocs.io`).
- **Busca por palavra-chave so existe no site humano `search.scielo.org`**, e esse dominio tem
  protecao anti-bot ("Bunny Shield") que **bloqueia HTTP puro (curl/WebFetch) com 403**.
  => Para buscar por tema no SciELO, e obrigatorio usar o **navegador de verdade** (`mcp__Claude_Browser__*`):
  navegar ate `https://search.scielo.org/?q=<termo>&lang=pt`, ler a pagina renderizada (`get_page_text`/`read_page`),
  e so depois usar a ArticleMeta API para enriquecer/confirmar cada registro achado (por PID/DOI/ISSN).
- OAI-PMH existe mas e inconsistente por colecao nacional (funciona na SciELO Colombia no teste feito;
  esta morto na plataforma nova do SciELO Brasil) — nao assumir que funciona em toda colecao sem checar.

## BVS / LILACS (BIREME) — NAO tem API publica de busca bibliografica

- A propria BIREME declara oficialmente (`docs.api.bvsalud.org/apis/index.yaml`): acesso aos registros
  bibliograficos da BVS via API **nao esta disponivel para uso publico**, nem sob pedido, parceria ou pagamento.
  A busca so pode ser feita pela interface do Portal Regional da BVS.
- A **unica API publica de verdade** e a do **DeCS** (vocabulario controlado, tipo MeSH em PT/ES/EN):
  `https://api.bvsalud.org/decs/v2/` (`/get-tree`, `/search-by-words`) — precisa de `apikey` liberada por
  formulario gratuito da BIREME. Serve so para expandir termos de busca, nao para achar artigos.
  O site humano `https://decs.bvsalud.org` pode ser consultado sem chave (via navegador).
- **Caminho pratico e real para buscar no LILACS/BVS**: o proprio portal de busca
  `https://pesquisa.bvsalud.org/portal/?q=<expressao>&lang=<pt|es|en>&count=<n>&start=<offset>&output=json|xml|rss`
  Confirmado ao vivo (via navegador): aceita sintaxe tipo Solr com prefixo de campo
  (`ti:`, `mh:`, `tw:`, `ab:`, `au:`, `ta:`, `da:`, boolean AND/OR, aspas para frase),
  ex.: `q=ti:malaria AND mh:"Antimalarials"`.
  **Esse dominio tambem tem protecao anti-bot (Bunny Shield)** — so funciona de fato com um
  navegador real executando JS, nao com `requests`/`curl` puro.
  => Igual ao SciELO: usar `mcp__Claude_Browser__*` para navegar e ler os resultados de verdade.
- O filtro por base especifica (`fq=db:LILACS`) nao se comportou como esperado no teste; o campo Solr
  real parece ser `instance` (ex.: `instance:"lilacsplus"`). Tratar como algo a confirmar na hora, nao
  como certeza.

## Testes ao vivo feitos na construcao do painel (2026-09-25)

- **Anti-bot (Bunny Shield)**: Chrome *headless* fica preso em "Submitting..." tanto no SciELO quanto na
  BVS. Chrome real com janela (`headless: false`, `channel: 'chrome'`, perfil persistente) passa em
  poucos segundos. Depois de passar, `fetch()` executado dentro da propria pagina herda os cookies e
  acessa os endpoints de dados.
- **SciELO**: `search.scielo.org/?q=...&lang=pt&count=100&from=0&sort=RELEVANCE` + filtros
  `filter[year_cluster][]=AAAA` (um por ano) e `filter[la][]=pt|en|es`. `output=json` NAO funciona, mas
  `output=ris` devolve RIS completo (AU, TI, TT, JO, J2, SN, VL, IS, DO, ID=PID-colecao, PY, AB em varios
  idiomas). O mesmo artigo aparece em colecoes diferentes (ex.: `-scl` e `-spa`) — deduplicar por PID.
  Alguns links de colecoes legadas so funcionam em `http://` (nao forcar https).
- **BVS/LILACS**: `pesquisa.bvsalud.org/portal/?q=...&lang=pt&output=json&count=100&from=N` +
  `filter[db][]=LILACS`, `filter[year_cluster][]=AAAA`, `filter[la][]=pt`, `filter[fulltext][]=1`
  (todos confirmados no campo `fq` da resposta Solr). `fq=db:LILACS` e `filter=db:(...)` NAO funcionam.
  A raiz `pesquisa.bvsalud.org/` redireciona para erro — aquecer o anti-bot em `/portal/`.
  Pagina do registro para verificacao: `/portal/resource/pt/<id>`.
- **PubMed**: filtros escritos na propria string (replicaveis): `("AAAA/01/01"[dp] : "3000"[dp])`,
  `(portuguese[la] OR english[la] OR spanish[la])`, `"free full text"[Filter]`, `NOT (review[pt] OR ...)`.
  O site pubmed.ncbi.nlm.nih.gov tem reCAPTCHA para navegador automatizado — usar so a API.
  Retratacao aparece em `pubtype` como "Retracted Publication" (testado com o PMID 9500320).
- **Crossref** `api.crossref.org/works/{doi}`: campo `updated-by` traz avisos de retratacao.
- **DOCX no macOS**: `textutil` converte HTML em DOCX mas descarta imagens e achata tabelas; o painel
  injeta figura e tabela nativas do Word no pacote depois da conversao.

## Regra geral de veracidade

1. Nunca afirme uma URL, DOI, PMID ou PID sem **ter aberto e lido** a pagina/registro de verdade
   (navegador ou API) nesta execucao.
2. Se um site bloquear o acesso (403, captcha, timeout), **diga isso ao usuario** em vez de
   inventar um resultado plausivel.
3. Toda citacao usada no artigo final tem que estar rastreavel ate uma fonte realmente aberta,
   registrada na tabela de "fontes verificadas" (ver `agents/verificador-citacoes.md`).

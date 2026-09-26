# Revisão de Literatura IA

Sistema para gerar artigos de revisão de literatura com **fontes reais e conferidas**: você informa um
tema, ele pesquisa de verdade no **PubMed** (API oficial), no **SciELO** e no **LILACS** (Chrome real via
Playwright), confere cada referência na fonte original, escreve no padrão do *Modelo de Escrita
Científica V3* do professor e audita cada citação duas vezes.

## Duas formas de usar

### 1. Painel visual (recomendado)

```bash
cd "ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel"
npm install          # só na primeira vez
node server.mjs      # abre em http://localhost:4777
```

No painel: **+ Novo artigo** → tema → **Gerar artigo**. Você acompanha as 9 etapas ao vivo, vê cada fonte
com a captura de tela da página conferida, a triagem completa (com motivo de cada exclusão), as
estratégias exatas para replicar a busca e o checklist de entrega. No fim: **Baixar .docx**.

### 2. Linha de comando / Claude Code

```bash
node painel/cli.mjs gerar "tema" --tipo integrativa --anos 5 --min 25
node painel/cli.mjs retomar <id>          # continua de onde parou, sem refazer etapas
node painel/cli.mjs buscar scielo "estratégia"   # busca avulsa (JSON), usada pelos agentes
node painel/cli.mjs status                # qual motor de IA está disponível
```

No Claude Code, a skill `/revisao-literatura` chama o painel e resume o resultado.

## Os 14 agentes e o que garante a veracidade

| Agente | O que faz | Trava de veracidade |
| --- | --- | --- |
| 1 Planejador | Monta PICo, descritores MeSH/DeCS e strings | Confere cada termo no vocabulário MeSH (o que não existe vira texto livre) e conta os resultados no PubMed, refinando se vier 0 ou mais de 400 |
| 2 Pesquisador | PubMed pela API E-utilities; SciELO e LILACS num Chrome real | Registros vêm das bases; nada é gerado |
| 3 Deduplicação | Remove duplicatas (DOI, PMID, título) e registros sem resumo ou retratados | Retratação detectada pelo PubMed/Crossref |
| 4 Triagem | Aplica os critérios a cada título/resumo e registra o motivo; segunda opinião para exclusões regionais | A IA só escolhe entre IDs existentes |
| 5 Verificador de Fontes | Reabre cada fonte na origem: PubMed, SciELO (ArticleMeta + página), LILACS (página), DOI no Crossref | Reprova o que não confirma; salva captura de tela como evidência |
| 6 Extração | Extrai país, delineamento, amostra, achados | Todo número extraído é conferido contra o resumo |
| 7 Redator | Introdução (objetivo no fim) e Discussão só com as fontes aprovadas | Citações só por número de fonte existente |
| 8 Auditor (2×) | Confere cada frase citada contra o resumo; números, cópia literal, citações inexistentes | Corrige ou remove; o que sobrar vira pendência |
| 9 Estilo Acadêmico | Tira padrões de escrita de IA | Trava: não muda fatos, números, citações, força das afirmações nem delineamentos |
| 10 Editor | Título, resumo, abstract e conclusão | Números do resumo conferidos com os Resultados |
| 11 Limitações e Coerência | Um único parágrafo de limitações, sem ressalvas espalhadas | Sem citações e sem números novos |
| 12 Tabelas | Tabela 1, Quadro 1 e Tabela 2 nas normas ABNT/IBGE | Montadas **por código** a partir da extração conferida |
| 13 Fluxograma | PRISMA 2020 em SVG e PNG | Números reais da busca, aritmética conferida |
| 14 Diagramação | Métodos e Resultados por código, siglas por extenso, referências Vancouver **por código** (abreviatura NLM), DOCX ABNT | Referências nunca passam pela IA |

Conferência visual do Word: `node painel/scripts/previa-docx.mjs <artigo.docx> <prefixo>` gera imagens
das seções, tabelas e figuras.

## Segunda conferência independente (recomendada antes de entregar)

A auditoria interna depende da qualidade do modelo de IA. No primeiro artigo gerado com o modelo
gratuito, uma conferência independente feita com agentes Claude ainda encontrou 38 imprecisões
(desfecho "colecistectomia difícil" tratado como conversão, OR univariado no lugar do multivariado,
país de estudo errado). Para repetir essa conferência num trabalho:

```bash
node painel/scripts/pacote-auditoria.mjs <id>        # gera auditoria-entrada.json (resumos + afiliações)
# agentes independentes re-extraem a Tabela 1 e auditam frase a frase, com verificador adversarial
node painel/scripts/aplicar-conferencia.mjs <id> <resultado.json>
node painel/cli.mjs retomar <id>                     # regenera artigo, tabela, resumo e DOCX
```

Tudo fica registrado em `relatorio-verificacao.md` (seção "Conferência independente").

## Motor de IA

Escolhido automaticamente, na ordem: **Claude CLI** (use sua assinatura; rode `claude auth login` uma vez
no Terminal) → **chave Anthropic** → **OpenRouter** (a chave gratuita desta máquina funciona, mas é
limitada a ~50 chamadas por dia; cada artigo usa cerca de 25). Configure em **Configurações** no painel.

## Onde ficam os artigos

`ESCRITOS ARTIGOS V2/Artigos/painel/<data>-<tema>/`: `artigo.docx`, `artigo.md`, `artigo.html`,
`fluxograma-prisma.png`, `fontes-verificadas.md`, `evidencias/`, `triagem.csv`,
`relatorio-verificacao.md`.

## Estrutura do projeto

```
revisao-literatura-ia/
├── painel/                     <- motor + interface (Node 20+, Playwright)
│   ├── server.mjs  cli.mjs  public/
│   └── lib/ (pipeline, fontes/pubmed|scielo|bvs|crossref, navegador, llm, prompts, auditoria, referencias…)
├── skills/revisao-literatura/SKILL.md
├── agents/                     <- modo alternativo com agentes do Claude Code
├── references/fontes-e-apis.md <- o que foi verificado sobre cada base
└── scripts/scielo_articlemeta.py
```

Instalar skill e agentes no Claude Code desta máquina:

```bash
cp -r agents/* ~/.claude/agents/ && cp -r skills/* ~/.claude/skills/
mkdir -p ~/.claude/references && cp references/*.md ~/.claude/references/
```

## Limites honestos

- Revisão **integrativa** é o padrão porque descreve com exatidão o que o sistema faz. Para
  **sistemática**, os Métodos trazem campos `[AUTORES: …]` para a dupla seleção humana independente
  (com Kappa) e a avaliação de risco de viés — o sistema nunca escreve que isso foi feito.
- Triagem e extração são baseadas em resumos, e isso é declarado nas Limitações do artigo.
- SciELO e LILACS não têm API de busca; o painel usa o portal público num Chrome real (janela visível
  durante a busca). Se a proteção anti-bot mudar, a busca ali pode falhar — o painel avisa.
- O artigo é um rascunho de alta qualidade, não um trabalho pronto para entrega: exige revisão crítica
  dos autores, e o uso de IA deve ser declarado (a declaração já vem no texto).

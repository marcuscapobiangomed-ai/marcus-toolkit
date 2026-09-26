---
name: revisao-literatura
description: Gera um artigo de revisao de literatura cientifica sobre um tema pedido pelo usuario, pesquisando de verdade no PubMed (API oficial) e no SciELO e LILACS (Chrome real via Playwright), conferindo cada referencia na fonte original, redigindo no padrao do modelo do professor (introducao com objetivo, metodos replicaveis com data e strings exatas, fluxograma PRISMA, tabela, discussao, 25+ referencias Vancouver) e auditando cada citacao duas vezes. Use quando o usuario pedir "revisao de literatura sobre X", "artigo cientifico com fontes reais sobre X" ou similar.
---

# Skill: revisao-literatura

A regra desta skill: **nada entra no artigo sem ter sido recuperado e conferido de verdade nesta
execucao.** Referencias sao montadas por codigo a partir dos metadados conferidos (a IA nunca escreve a
lista de referencias), os Metodos e os numeros do fluxograma sao gerados por codigo a partir do que
realmente aconteceu, e todo numero citado no texto precisa existir no resumo da fonte citada.

Motor: o **Painel de Revisao de Literatura** em
`/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/`.

## Passo 0 — Entender o pedido

Confirme com o usuario apenas o que for essencial e nao tiver default razoavel:

- Tema (quanto mais especifico, mais replicavel a busca).
- Tipo de revisao: `integrativa` (padrao), `narrativa` ou `sistematica`. Se for sistematica, avise:
  os Metodos virao com campos `[AUTORES: ...]` para a dupla selecao humana e o risco de vies, que o
  painel nunca inventa.
- Periodo (padrao: ultimos 5 anos), minimo de referencias (padrao: 25), autores e revista-alvo.
- Declaracao de uso de IA no artigo: `nenhuma` (padrao), `breve` ou `completa` — decisao dos autores.
  Nunca escreva uma declaracao com informacao falsa (ex.: que a IA so ajudou nas buscas, quando
  tambem redigiu).

## Passo 1 — Gerar pelo painel (modo recomendado)

Rode em segundo plano (demora de 20 a 40 minutos com modelo gratuito; uma janela do Chrome abre
sozinha durante a busca e a verificacao no SciELO/LILACS — e esperado):

```bash
node "/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/cli.mjs" gerar "TEMA" --pergunta "PERGUNTA" --tipo integrativa --anos 5 --min 25 --declaracao nenhuma
```

Se falhar no meio, retome sem refazer o que ja foi feito:
`node ".../painel/cli.mjs" retomar ID-DO-TRABALHO`.

Ou abra o painel visual (`node ".../painel/server.mjs"` e acesse http://localhost:4777), que mostra o
progresso ao vivo, as fontes com captura de tela da pagina conferida, a triagem completa e o checklist.

Motor de IA: automatico — Claude CLI (se `claude auth login` foi feito no Terminal), chave Anthropic
ou OpenRouter (a chave gratuita desta maquina permite ~50 chamadas/dia; cada artigo usa ~25).

## Passo 2 — Conferir o resultado

A saida fica em `ESCRITOS ARTIGOS V2/Artigos/painel/<id>/`:

- `artigo.docx`, `artigo.md`, `artigo.html` — o artigo completo;
- `fluxograma-prisma.png` — Figura 1;
- `fontes-verificadas.md` + `evidencias/` — cada referencia com as checagens feitas e captura da pagina;
- `triagem.csv` — decisao e motivo para cada registro triado;
- `relatorio-verificacao.md` — checklist de entrega, rodadas de auditoria e pendencias.

Leia `relatorio-verificacao.md` e relate ao usuario: numero de referencias, itens do checklist que
falharam e pendencias para revisao humana. Nao declare o artigo "pronto para submissao": ele precisa de
revisao critica dos autores.

## Os 14 agentes do painel

Planejador → Pesquisador → Deduplicacao → Triagem (com segunda opiniao regional) → Verificador de
Fontes → Extracao → Redator → Auditor (2 rodadas) → Estilo Academico (tira padroes de escrita de IA,
com trava que preserva fatos) → Editor (resumo/abstract/conclusao) → Limitacoes e Coerencia (um unico
paragrafo de limitacoes) → Tabelas → Fluxograma PRISMA 2020 → Diagramacao (DOCX ABNT).

## Modo alternativo — agentes do Claude Code

Quando o usuario quiser acompanhar a pesquisa passo a passo, use os agentes em `../../agents/`:
Pesquisador PubMed, Pesquisador SciELO e Pesquisador BVS LILACS (em paralelo), depois o Verificador de
Citacoes (obrigatorio, cetico, independente) e o Redator (so com fontes aprovadas). No acabamento:
Agente de Estilo Academico, Editor de Limitacoes e Coerencia, Designer de Tabelas, Designer de
Fluxograma e Diagramador de Documento. Os pesquisadores usam o navegador do app
(`mcp__Claude_Browser__*`) ou, fora do app, o comando `cli.mjs buscar`. Salve o resultado em
`ESCRITOS ARTIGOS V2/Artigos/<slug-do-tema>/`.

## Limites honestos

- A triagem e a extracao sao feitas com apoio de ferramentas automatizadas e baseadas em resumos;
  os Metodos descrevem isso em linguagem neutra.
- A declaracao de uso de IA e opcional (decisao dos autores); o sistema nunca escreve informacao
  falsa sobre como o texto foi produzido. Confira a politica do periodico ou da disciplina.
- SciELO e LILACS dependem de navegacao automatizada no portal publico (nao ha API de busca); se a
  protecao anti-bot mudar, a busca ali pode falhar — o painel avisa em vez de inventar resultado.

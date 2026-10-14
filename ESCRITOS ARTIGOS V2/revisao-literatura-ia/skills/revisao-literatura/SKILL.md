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

## Passo 3 — Devolutiva do Orientador (Revisão Pós-Leitura)

Quando o orientador ler o artigo e der sua devolutiva de correções, você pode lançá-la diretamente:

```bash
node ".../painel/cli.mjs" orientador ID-DO-TRABALHO "parecer de correções do orientador"
```

Ou no painel web (http://localhost:4777), na aba **✍ Devolutiva do Orientador**. O sistema:
1. Salva um snapshot de backup da versão atual em `versoes/`.
2. Analisa cirurgicamente as demandas do orientador e identifica as seções que precisam de alteração (Introdução, Discussão, Conclusão, Resumo, Título, Métodos ou Resultados).
3. Reescreve as seções afetadas atendendo ao orientador, mantendo o padrão Qualis A1 e preservando 100% das fontes e citações Vancouver válidas.
4. Regenera o Word (.docx) nas normas ABNT e registra o histórico completo de rodadas.

## Passo 4 — Ingestão e Correção de Artigos Prontos (.docx ou .pdf)

Se o usuário já possuir um manuscrito ou artigo pronto em formato `.docx` ou `.pdf` e desejar revisá-lo com base no parecer do orientador e no modelo de escrita:

```bash
node ".../painel/cli.mjs" importar caminho/artigo.docx --orientacoes "parecer do orientador..."
# ou para PDF:
node ".../painel/cli.mjs" importar caminho/artigo.pdf --orientacoes "parecer do orientador..."
```

Ou no painel web (http://localhost:4777), clicando em **📥 Importar .docx / .pdf**:
1. O extrator Python (`pymupdf` e `python-docx`) decompõe o documento, identifica as seções (Título, Resumo, Abstract, 1 Introdução, 2 Métodos, 3 Resultados, 4 Discussão, 5 Conclusão e Referências) e converte tabelas para Markdown.
2. Gera imediatamente o documento Word (`.docx`) diagramado nas normas ABNT (Times New Roman 12, espaçamento 1,5, margens 3/2 cm, paginação).
3. Aciona o **Agente Revisor do Orientador** e o **Agente de Estilo Acadêmico** para reescrever as seções aplicando os apontamentos da banca/orientador e o **Modelo de Escrita Científica Qualis A1** (voz autoral, eliminação de clichês de IA, precisão de unidades laboratoriais e diferenciação de desfechos diretos vs substitutos).
4. Salva a rodada em `versoes/rodada-1-.../` com relatório de alterações e permite novas rodadas de correções subsequentes na aba **✍ Devolutiva do Orientador**.

## Diretrizes Metodológicas Qualis A1 (PRISMA 2020 & JBI)

O sistema incorpora salvaguardas metodológicas obrigatórias:
1. **Unidades de Marcadores Inflamatórios (PCR e Biomarcadores):** NUNCA comparar diretamente valores nominais com unidades distintas. Ao cotejar mg/dL e mg/L, explicitar a conversão (ex.: 10 mg/dL = 100 mg/L, 12x maior que 8,2 mg/L) e discutir essa variação como viés de mensuração e padronização laboratorial.
2. **Origem Geográfica Fidedigna:** O país da amostra é obtido estritamente da casuística hospitalar ou afiliação dos autores. É terminantemente proibido inferir o país dos pacientes pela sede ou país do periódico. Se ausente, reportar `NI`.
3. **Desfechos Primários vs. Indiretos:** Discriminar com clareza nos Resultados, na Tabela 1 e na Discussão os estudos que mensuraram o desfecho clínico primário duro (ex.: conversão para cirurgia aberta) daqueles que avaliaram indicadores indiretos ou substitutos (ex.: dificuldade operatória, escore de Parkland, necessidade de colecistectomia subtotal de resgate).
4. **Avaliação Crítica do Rigor Metodológico (JBI):** Coluna dedicada na Tabela 1 apresentando o Rigor JBI (Alta, Moderada, Baixa) com pontuação crítica (ex.: 8/9, 7/9) e explicitação da régua metodológica nas notas de rodapé.
5. **Critérios Hierarquizados no PRISMA 2020:** O afunilamento de registros elegíveis é justificado formalmente por critérios objetivos hierarquizados (priorização de delineamentos observacionais analíticos com estimativas ajustadas e arquivamento de séries puramente descritivas, casuísticas sobrepostas ou dados insuficientes), banindo justificativas vagas de "menor prioridade".

## Os agentes do painel

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

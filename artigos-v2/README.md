# Artigos v2

Pipeline de **revisão de literatura (Qualis A1)** que segue a skill `artigos` etapa por etapa. Ele:

- usa o **OmniRoute** com uma escada de modelos de escrita;
- mostra no **painel** quanto cada artigo custou e qual IA foi usada em cada etapa;
- **exporta o .docx final sozinho** ao terminar;
- tem uma **auditoria externa** que roda cada skill separadamente sobre qualquer artigo pronto.

```bash
pip install -r requirements.txt
export OMNIROUTE_BASE_URL=http://localhost:20128/v1   # padrão do OmniRoute
export OMNIROUTE_API_KEY=...                          # Dashboard → API Keys (se REQUIRE_API_KEY=true)
export NCBI_API_KEY=...                               # opcional: 10 req/s no PubMed em vez de 3

python -m artigos_v2 modelos                          # confere a escada contra o /v1/models do OmniRoute
python -m artigos_v2 exemplo-pedido pedido.json       # edite tema, autores, orientador, revista, normas
python -m artigos_v2 painel &                         # http://127.0.0.1:8765
python -m artigos_v2 gerar pedido.json --auditar      # gera, exporta o .docx e audita
```

Tudo fica em `dados/artigos/<id>/`:

- `artigo.docx`: o artigo final.
- `artigo.md`: o mesmo texto em Markdown.
- `triagem.csv`: decisão da triagem para cada registro.
- `estado.json`: checkpoint de cada etapa.
- `auditoria.md`: relatório da auditoria externa.

## Comandos

| Comando | O que faz |
|---|---|
| `gerar pedido.json [--auditar] [--com-ia]` | Roda o pipeline inteiro e exporta o .docx automaticamente |
| `retomar <id>` | Continua um artigo que parou (erro, cota, queda), sem refazer etapas prontas |
| `revisar <id> triagem.csv` | Importa as decisões de seleção revisadas pelos autores; o PRISMA e o texto passam a segui-las |
| `exportar <id> [--saida arq.docx]` | Reexporta o .docx a partir do estado salvo, sem gastar IA |
| `painel [--porta 8765]` | Painel: gasto real × custo em API, por artigo, modelo e etapa; fallbacks; download do .docx |
| `auditar artigo.docx [--offline] [--com-ia]` | Roda as skills separadamente sobre qualquer artigo (.docx/.md/.txt) |
| `modelos` | Lista quais modelos da escada existem ou estão AUSENTES no OmniRoute |
| `custos` | Resumo de gastos no terminal |

## Como o pipeline segue a skill

1. **Escopo** (papel técnico). Define pergunta, objetivo, descritores DeCS/MeSH, estratégias por base, critérios de inclusão/exclusão e buscas de contexto.
2. **Busca real.**
   - PubMed (E-utilities) e Europe PMC (REST), com filtros de período e idioma aplicados na própria estratégia.
   - LILACS e SciELO bloqueiam acesso automatizado: exporte o resultado do portal em RIS e aponte em `"ris": {"LILACS": "lilacs.ris"}` no pedido. A contagem continua sendo a real.
   - Se a busca retorna registros demais, o modelo refina a estratégia (até 3 vezes). O pipeline nunca corta registros em silêncio, porque isso quebraria o PRISMA.
3. **Triagem e elegibilidade** (papel triagem). As decisões vão para `triagem.csv` com o motivo de cada exclusão.
4. **Quadro-síntese**, extraído só do que está no resumo de cada estudo.
5. **Métodos → Resultados → Introdução → Discussão → Conclusão**, nessa ordem (a da skill).
6. **Reforço de referências**, se faltar para chegar a 25.
7. **Humanização por seção**, com a intensidade calibrada da skill.
8. **Resumo/Abstract → montagem → checklist → .docx**.

## O artigo é dos autores

Vocês pesquisam, leem, decidem e reescrevem; o pipeline trabalha a partir disso.

- **O que vocês fizeram vira fato nos Métodos.** Declare no pedido, em `contribuicao_autores`, o que vocês de fato fizeram. Por exemplo: triagem por dois autores de forma independente, divergências resolvidas com o orientador, leitura na íntegra, extração com conferência cruzada, busca manual, redação e revisão. Os Métodos descrevem esse processo na voz dos autores e não atribuem nenhuma etapa a ferramentas.
- **As decisões de seleção de vocês prevalecem.** Abram o `triagem.csv` (no Excel serve), corrijam as colunas `triagem`/`elegibilidade` (`incluir`/`excluir`) e escrevam o motivo com as palavras de vocês. Depois rodem:

  ```bash
  python -m artigos_v2 revisar <id> triagem.csv   # recalcula o PRISMA com as decisões de vocês
  python -m artigos_v2 retomar <id>               # refaz síntese, texto e .docx a partir delas
  ```

  O fluxograma passa a mostrar os motivos de exclusão escritos por vocês. Os Métodos registram que todas as decisões foram revisadas pelos autores.
- **Limitações curtas e sem desculpas.**
  - Um único parágrafo curto na Discussão, só com limitações do corpo de evidências e como vocês as contornaram.
  - Nada que o processo de vocês já cobriu (por exemplo, "só resumos", se vocês leram na íntegra).
  - Nenhuma menção a ferramentas.
  - O parágrafo termina com o que a revisão agrega.
  - Resumo e Conclusão não repetem ressalvas. A auditoria confere tudo isso.
- **O estilo não mexe no que vocês afirmaram.** Um parágrafo volta ao original se a reescrita:
  - tirar ou acrescentar um modalizador ("sugere", "pode", "associou-se");
  - introduzir certeza ou causalidade ("demonstra", "eleva", "aumenta o risco");
  - trocar o desenho do estudo ("série de casos" → "coorte").

  O resto da reescrita é aproveitado. A contagem usa só formas verbais: "resultados" não conta como "resultar".

## Garantias (o que o código impede, não só o prompt)

- **Referência inventada não entra.** O modelo só vê chaves `[R12]` de registros reais do PubMed/Europe PMC/RIS. Chave que não existe é removida do texto e registrada como "citação bloqueada".
- **Referências numeradas por ordem de citação.** São formatadas (Vancouver ou ABNT) a partir dos metadados verificados, nunca do texto do modelo.
- **O PRISMA sai dos dados.** Os números do fluxograma são contados das decisões registradas e conferidos antes de exportar (identificados − duplicatas = triados, e assim por diante).
- **A humanização não mexe em dados.** Se a reescrita mudar um número ou uma citação, ela é refeita. Se falhar de novo, fica o texto original, e o painel mostra `rejeitada`.
- **Métodos descrevem o que foi feito de fato.** O prompt proíbe inventar procedimentos (por exemplo, "dois revisores independentes"). As estratégias exatas ficam no Quadro 1.

## O .docx exportado

- **Formato:** A4, Times New Roman 12, espaçamento 1,5, margens 3/2 cm e número de página.
- **Início:** título em português e em inglês, autores, orientador(a) e instituição; Resumo/Abstract com palavras-chave.
- **Seções numeradas.**
- **Quadro 1** (estratégias de busca por base, data e nº de registros), dentro de Métodos.
- **Figura 1** (fluxograma PRISMA editável no Word, com os motivos de exclusão).
- **Quadro 2** (síntese dos estudos).
- **Legendas:** título acima e "Fonte:" abaixo de cada figura e quadro.
- **Citações** em sobrescrito, entre colchetes ou entre parênteses, conforme a revista.
- **Referências** no formato escolhido.

## Painel

Atualiza a cada 5 s e mostra:

- **Gasto real × custo equivalente em API**, em R$ ou US$. Modelos por assinatura ou cota grátis aparecem com gasto real zero, mas com o custo que teriam em API.
- **Por modelo, por etapa e por artigo.**
- **Cada chamada**, com o modelo que respondeu, o degrau da escada (fallback), tokens, custo, latência e erro.
- **Eventos do pipeline** e a **nota da auditoria externa**.
- **Link para baixar o .docx.**

## Auditoria externa (skills rodadas por fora)

O `auditar` não usa nada do pipeline: lê só o arquivo final, como a banca leria. Por isso serve para medir **o quanto o sistema foi funcional**, inclusive em artigos gerados por outro sistema.

| Skill | Valor na rubrica | O que confere |
|---|---:|---|
| Estrutura e Introdução | 1,5 | Seções obrigatórias; Resumo/Abstract; ≤3 páginas; objetivo no último parágrafo; citações; orientador |
| Métodos | 2,5 | PubMed + ≥2 bases; descritores; AND/OR; critérios; período; data; etapas de seleção; **refaz a busca do PubMed e compara com o nº relatado** (a professora vai conferir) |
| Resultados | 2,5 | Fluxograma; **contas do PRISMA fecham**; quadro com uma linha por estudo incluído; descrição dos achados; frases robotizadas |
| Referências | 1,5 | ≥25; toda citação tem referência e vice-versa; ordem Vancouver; formato; **cada referência verificada no PubMed/Europe PMC** (DOI/PMID/título) |
| Figuras e tabelas | 1,0 | Título numerado, "Fonte:", citadas no texto |
| Discussão e APS/SUS | 1,0* | Divergência entre estudos, ponto de vista, contexto SUS/APS/UBS, limitações, diretrizes internacionais identificadas |
| Humanização | — | Mistura de frases curtas e longas; irregularidade (CV); travessões; transições repetidas; ênfase vazia; verbos rebuscados; lista disfarçada de prosa; métodos sem opinião |

\* A rubrica da skill não dá valor explícito à Discussão; aqui vale 1,0 para fechar 10.

**Parecer por IA:** com `--com-ia`, cada skill também recebe o parecer de outra família de modelo (escada `auditoria`), com o custo registrado no painel.

**Artigos gerados pelo v2:** o relatório também compara o checklist que o próprio sistema marcou com o que a auditoria encontrou.

## Escada de modelos

Ver [docs/modelos-escrita.md](docs/modelos-escrita.md) para o ranking mundial de modelos de escrita (set/2026), a comparação de custos de API e o custo estimado por artigo. A escada fica em [config/escada.json](config/escada.json).

## Limitações honestas

- **Elegibilidade automática:** sem a revisão dos autores, é feita pelo resumo completo. Com `revisar`, valem as decisões de vocês, inclusive as da leitura na íntegra.
- **Métodos:** descrevem só as etapas que vocês declararam em `contribuicao_autores`. O sistema não inventa etapas, porque a banca e a revista conferem.
- **LILACS e SciELO:** precisam da exportação RIS feita no portal, porque as APIs bloqueiam acesso automatizado.
- **Checagens de estilo da auditoria:** são heurísticas objetivas (as mesmas da skill). Use `--com-ia` para uma leitura qualitativa.

## Testes

```bash
pip install pytest && python -m pytest -q
```

Os testes rodam o pipeline inteiro com um OmniRoute falso (inclusive falhas e fallback) e bases falsas. Também cobrem:

- o .docx gerado;
- as contas do PRISMA;
- o bloqueio de citações inventadas;
- a regra que impede a humanização de mexer em dados;
- retomar depois de uma falha;
- a auditoria;
- as rotas do painel.

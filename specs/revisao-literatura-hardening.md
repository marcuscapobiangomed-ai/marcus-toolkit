# Especificação: Correção e Blindagem da Revisão de Literatura IA

## Objetivo
Corrigir meticulosamente o manuscrito atual ("Fatores associados à conversão da colecistectomia videolaparoscópica...") para que atinja padrão de submissão imediata em periódico Qualis A/PubMed, e reestruturar os pipelines, agentes, prompts, funções determinísticas e checklists do aplicativo `revisao-literatura-ia` para prevenir definitivamente erros metodológicos, aritméticos, de formatação e de estilo em execuções futuras.

## Descrição Geral
O projeto compreende duas frentes de engenharia:
1. **Frente Editorial/Artigo:** Correção textual, metodológica e factual do artigo existente em `ESCRITOS ARTIGOS V2/Artigos/painel/20260925-213749-fatores-preditores-de-conversao-da-colec/`, com substituição de dados incompletos ("NI"), retificação da soma geográfica, saneamento da Tabela 2, inserção de referenciais metodológicos clássicos e regeneração dos formatos Markdown, DOCX e HTML.
2. **Frente Arquitetura/Pipeline:** Atualização dos módulos JavaScript em `ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/lib/` (`secoes.mjs`, `prompts.mjs`, `pipeline.mjs`, `checklist.mjs`), eliminando truncamentos arbitrários de países, proibindo dados ausentes não sinalizados, estruturando avaliação de risco de viés, tratando eixos vazios e adicionando testes automatizados no checklist.

## Requisitos Indispensáveis

### 1. Correções no Manuscrito Atual
1.1. Substituir os três registros com amostra "NI" na Tabela 1 pelos valores reais apurados nos textos integrais:
   - Ochoa-Ortiz et al., 2023 [6]: 66 pacientes adultos.
   - Lauferman et al., 2022 [10]: 80 pacientes adultos (de casuística de 188 CVL).
   - Ramírez-Giraldo et al., 2022 [29]: 319 pacientes adultos (estudo de validação diagnóstica).
1.2. Retificar a Seção 3.3 (Delineamento e Geografia), garantindo que a soma dos países feche rigorosamente em 28 estudos e 13 países: Índia (9), México (3), Argentina (2), Colômbia (2), Japão (2), Paraguai (2), Turquia (2), Bolívia (1), China (1), Nepal (1), Paquistão (1), Tailândia (1) e Venezuela (1).
1.3. Eliminar a linha com n=0 (0,0%) da Tabela 2 e ajustar o texto correspondente nos Métodos (2.8) e Resultados (3.4).
1.4. Inserir na Seção 2.1 o referencial clássico de revisão integrativa (Mendes, Silveira e Galvão / Whittemore & Knafl) explicitando a adoção complementar do fluxo PRISMA 2020.
1.5. Preencher a Seção 2.7 com a declaração do instrumento de avaliação de risco de viés e qualidade metodológica (baseado no checklist JBI para estudos observacionais).
1.6. Reformular a justificativa dos 87 artigos excluídos nas seções 2.5 e 3.1, enquadrando-a como refinamento protocolar pré-definido por critérios de robustez e elegibilidade.
1.7. Incluir na Seção 4.3 (Limitações) a declaração explícita de potencial viés de disponibilidade/acesso decorrente do filtro `free full text`.
1.8. Adequar os descritores nos Resumos (PT, EN, ES) aos vocabulários controlados DeCS/MeSH.
1.9. Reordenar ou harmonizar as referências para que a referência metodológica [28] (PRISMA) não segregue descontinuamente os estudos primários da revisão.
1.10. Regenerar com sucesso `artigo.md`, `artigo.docx` e `artigo.html`.

### 2. Blindagem e Engenharia da Pipeline (`painel/lib/`)
2.1. Em `secoes.mjs`:
   - Refatorar `sinteseQualidade(estudos)` para que calcule e liste 100% dos países sem usar `slice(0, 6)`, garantindo asserção matemática estrita ($\sum n_i = N$).
   - Refatorar `quadroEixos(e, estudos)` para ocultar ou tratar dinamicamente eixos que não possuam estudos alocados ($n = 0$).
   - Atualizar templates de métodos para incluir o referencial de revisão integrativa quando `tipoRevisao === 'integrativa'`.
2.2. Em `prompts.mjs`:
   - Atualizar `promptExtracao` com diretiva estrita proibindo "NI" no campo amostra e reforçando a busca do tamanho amostral.
   - Atualizar `promptEstilo` para identificar e eliminar aberturas formulaicas repetitivas ("No plano...", "No espectro...", "No domínio...").
   - Atualizar `promptLimitacoes` para sempre auditar filtros restritivos (como acesso aberto gratuito).
   - Adicionar template/agente para avaliação de risco de viés/qualidade metodológica (JBI).
2.3. Em `checklist.mjs`:
   - Adicionar validações automáticas:
     - Zero "NI" no campo amostra da Tabela 1.
     - Soma geográfica dos estudos bate 100% com o total de estudos incluídos.
     - Tabela 2 não contém linhas com n=0.
     - Referencial metodológico presente de acordo com o tipo de revisão.
2.4. Em `pipeline.mjs`:
   - Integrar as novas regras determinísticas no ciclo de montagem e validação do artigo.

## Casos Extremos
- Estudos com múltiplos países de afiliação ou país não informado: devem ser tratados com fallback seguro sem corromper a soma total.
- Eixos temáticos em que nenhum artigo foi classificado: o sistema não deve exibir linhas nulas na tabela final, transferindo essa informação para uma nota explicativa de lacuna na literatura.
- Resumos sem tamanho da amostra (n) explícito no abstract: o sistema deve sinalizar pendência crítica antes da entrega ou acionar consulta automatizada ao texto completo.

## Fora de Escopo
- Alterar o tema ou escopo clínico do artigo (fatores preditores de conversão da CVL).
- Alterar os 28 artigos originais incluídos na revisão (manter o corpus analisado e auditado).
- Reescrever a lógica do Playwright ou das APIs de busca PubMed/SciELO/LILACS, exceto no que tange aos filtros e tratamento de metadados.

## Critérios de Aceitação
- [ ] Artigo `artigo.md` retificado com 0 erros factuais de contagem geográfica.
- [ ] Tabela 1 sem nenhum "NI" no campo amostra (estudos 6, 10 e 29 com seus $n$ reais inseridos).
- [ ] Tabela 2 limpa, sem categoria com $n=0$.
- [ ] Metodologia (2.1 e 2.7) e Limitações (4.3) com fundamentação científica completa e sem "teto arbitrário".
- [ ] Arquivos `.docx` e `.html` gerados e validados.
- [ ] Funções `secoes.mjs`, `prompts.mjs`, `checklist.mjs` e `pipeline.mjs` atualizadas e sem regressões.
- [ ] Checklist automatizado executado e 100% aprovado.

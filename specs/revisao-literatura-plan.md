# Plano de Implementação: Correção e Blindagem da Revisão de Literatura IA

Baseado na especificação: [revisao-literatura-hardening.md](file:///Users/user/Documents/Tool-Kit/specs/revisao-literatura-hardening.md)

## Fase 1: Blindagem da Engenharia de Código (`painel/lib/`)
### Tarefa 1.1: Refatoração de `secoes.mjs`
- **Arquivo:** `ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/lib/secoes.mjs`
- **Ações:**
  1. Refatorar `sinteseQualidade(estudos)`:
     - Mapear todos os países sem limitação (`.slice(0, 6)`).
     - Gerar texto descritivo com contagem exata e percentual.
     - Assegurar que a soma dos estudos por país feche com `estudos.length`.
  2. Refatorar `quadroEixos(e, estudos)`:
     - Filtrar eixos que possuam `doEixo.length === 0`.
     - Caso haja eixos sem estudos, adicionar observação na nota de rodapé identificando os eixos desprovidos de literatura como lacunas de pesquisa.
  3. Atualizar `textoMetodos(e)`:
     - Quando `tipoRevisao === 'integrativa'`, citar Mendes, Silveira e Galvão (2008) / Whittemore & Knafl (2005) como referencial da revisão integrativa e PRISMA 2020 como referencial adaptado para o fluxo de triagem.
     - Na seção 2.7, parametrizar avaliação com base nas diretrizes do Joanna Briggs Institute (JBI).

### Tarefa 1.2: Refatoração de `prompts.mjs`
- **Arquivo:** `ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/lib/prompts.mjs`
- **Ações:**
  1. No `promptExtracao`: Inserir regra obrigatória: "A amostra (n) é OBRIGATÓRIA. Não use 'NI' para amostra. Se o resumo não declarar o n total, use o n do subgrupo ou aponte explicitamente a necessidade de busca no texto completo."
  2. No `promptEstilo`: Inserir instrução restritiva contra tiques de IA: proibir aberturas repetitivas do tipo "No plano...", "No espectro...", "No domínio...".
  3. No `promptLimitacoes`: Adicionar verificação de filtros de busca (como "free full text") e exigência de que vieses de seleção decorrentes de filtros de gratuidade sejam expressamente citados.
  4. Adicionar prompt/estrutura para avaliação de risco de viés JBI (`promptQualidadeMetodologica`).

### Tarefa 1.3: Refatoração de `checklist.mjs`
- **Arquivo:** `ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/lib/checklist.mjs`
- **Ações:**
  1. Inserir teste automatizado de integridade amostral: verificar se há "NI" no campo Amostra da Tabela 1.
  2. Inserir teste automatizado de integridade geográfica: verificar se a soma dos países equivale a 100% dos estudos.
  3. Inserir teste de eixos: verificar se há eixos vazios na Tabela 2.
  4. Inserir teste de metodologia: verificar menção a referencial metodológico condizente.

---

## Fase 2: Correção Meticulosa do Artigo Atual
### Tarefa 2.1: Atualização dos Registros e Base de Metadados
- **Arquivos:**
  - `ESCRITOS ARTIGOS V2/Artigos/painel/20260925-213749-fatores-preditores-de-conversao-da-colec/registros.json`
  - `ESCRITOS ARTIGOS V2/Artigos/painel/20260925-213749-fatores-preditores-de-conversao-da-colec/estado.json`
- **Ações:**
  - Atualizar os campos `amostra` dos estudos [6] (Ochoa-Ortiz, 66 pacientes), [10] (Lauferman, 80 pacientes) e [29] (Ramírez-Giraldo, 319 pacientes).

### Tarefa 2.2: Atualização do Artigo em Markdown (`artigo.md`)
- **Arquivo:** `ESCRITOS ARTIGOS V2/Artigos/painel/20260925-213749-fatores-preditores-de-conversao-da-colec/artigo.md`
- **Ações:**
  - Tabela 1: atualizar linhas de Ochoa-Ortiz [6], Lauferman [10] e Ramírez-Giraldo [29].
  - Seção 3.3: corrigir a distribuição geográfica e de delineamentos (Índia 9, México 3, Argentina 2, Colômbia 2, Japão 2, Paraguai 2, Turquia 2, Bolívia 1, China 1, Nepal 1, Paquistão 1, Tailândia 1, Venezuela 1).
  - Tabela 2: remover linha do Eixo 5 ($n=0$) e ajustar notas.
  - Seções 2.1, 2.5, 2.7, 3.1: inserir referencial de revisão integrativa, adequar justificativa protocolar de seleção e instrumento JBI de avaliação crítica.
  - Seção 4.3: inserir discussão sobre o viés do filtro `free full text`.
  - Resumos (PT, EN, ES) e Descritores: harmonizar com vocabulário DeCS/MeSH.
  - Citação de Ramírez-Giraldo [29]: garantir consistência de chamada no texto.

### Tarefa 2.3: Regeneração de Documentos de Saída (DOCX e HTML)
- **Ações:**
  - Executar os scripts do painel para compilar `artigo.docx` e `artigo.html` perfeitamente alinhados ao novo `artigo.md`.

---

## Fase 3: Validação, Testes e Review (Skill Review)
- Executar testes automatizados no Node.js sobre os módulos atualizados.
- Validar se o checklist de conformidade alcança 100% de aprovação.
- Elaborar o Relatório Final de Review em conformidade com `skills/review/SKILL.md`.

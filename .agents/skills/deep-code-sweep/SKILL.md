---
name: deep-code-sweep
description: >-
  Metodologia mandatória de varredura cirúrgica e auditoria profunda direcionada
  a uma área específica do projeto: inspeção minuciosa linha a linha, rastreamento
  de cada integração e fluxo, anotação exaustiva de falhas, vulnerabilidades e
  oportunidades de melhoria, avaliação de impacto no contexto global, acionamento
  integrado do Deep Problem Solver e entrega de dossiê executivo de alto padrão.
---

# Deep Code Sweep (Varredura Cirúrgica & Auditoria Profunda de Área)

Esta skill define o protocolo mandatório de engenharia reversa, inspeção estática/dinâmica e auditoria profunda de código direcionada a um módulo, subsistema ou área específica do projeto.

O objetivo é banir análises superficiais de alto nível: a varredura desce até cada linha de código, disseca todas as ramificações de fluxo e conexões com o restante do ecossistema, cataloga todas as falhas e oportunidades, contextualiza o impacto no sistema como um todo, executa o protocolo **Deep Problem Solver** para os pontos mais críticos e entrega um plano tático executivo impecável.

---

## O Ciclo da Varredura Cirúrgica em 7 Fases Obrigatórias

```
  [1. Delimitação & Enquadramento da Área-Alvo]
                        │
                        ▼
  [2. Varredura Linha a Linha & Rastreamento de Fluxos]
                        │
                        ▼
  [3. Mapeamento de Integrações & Efeitos Colaterais]
                        │
                        ▼
  [4. Catálogo Exaustivo de Achados (Falhas + Oportunidades)]
                        │
                        ▼
  [5. Avaliação Holística no Contexto Global do Projeto]
                        │
                        ▼
  [6. Acionamento Integrado do Deep Problem Solver]
                        │
                        ▼
  [7. Dossiê Executivo de Entrega & Plano Tático]
```

---

### FASE 1: Delimitação e Enquadramento da Área-Alvo
- **Escopo Exato:** Qual módulo, diretório, arquivo ou fluxo funcional é o alvo da varredura?
- **Inventário de Arquivos:** Quais arquivos, componentes, scripts ou rotas pertencem diretamente a essa área?
- **Contrato & Responsabilidade:** Qual é a função primordial esperada dessa área dentro da arquitetura do projeto?

---

### FASE 2: Varredura Linha a Linha & Rastreamento de Fluxos
A leitura e auditoria devem ser minuciosas, examinando bloco por bloco:
1. **Fluxo de Entrada:**
   - Como os dados chegam? Há sanitização, validação de schema, tratamento de nulos/undefined ou valores fora da faixa esperada?
2. **Fluxo de Execução (Síncrono / Assíncrono):**
   - Como ocorrem as chamadas assíncronas (`async/await`, Promises)?
   - Há riscos de *race conditions*, concorrência desordenada, loops bloqueantes ou vazamento de recursos?
3. **Fluxo de Erros e Exceções:**
   - Onde estão os blocos `try/catch`?
   - Há erros silenciados indevidamente (`catch (e) {}`), mensagens genéricas ou exceções que causam crash silencioso?
4. **Fluxo de Estado & Persistência:**
   - Onde o estado é modificado? Há mutações diretas indevidas de objetos compartilhados?
   - Como e quando os dados são gravados em disco, banco de dados ou memória?
5. **Fluxo de Saída & Apresentação:**
   - O retorno da função ou endpoint atende com precisão ao contrato esperado pelo consumidor ou pela interface?

---

### FASE 3: Mapeamento de Integrações & Efeitos Colaterais
Nenhum módulo é uma ilha. Rastreie:
1. **Dependências de Entrada (Upstream):** Quem chama essa área? Quais parâmetros são enviados?
2. **Dependências de Saída (Downstream):** Quais outros módulos, APIs, bancos ou utilitários essa área consome?
3. **Efeitos Colaterais Silenciosos:** A execução dessa área altera arquivos compartilhados, variáveis de ambiente ou telemetria sem o conhecimento explícito de outros módulos?
4. **Acoplamento Indevido:** Há dependências circulares, importações desnecessárias ou violações de responsabilidade única?

---

### FASE 4: Catálogo Exaustivo de Achados
Divida rigorosamente as anotações em três categorias:

#### A. Falhas, Bugs e Vulnerabilidades Críticas
- Inconsistências de lógica ou regras de negócio violadas.
- Brechas de segurança, injeção de comandos ou perda de dados.
- Gargalos de concorrência ou crashes potenciais.
- Falhas de tipagem ou ausência de tratamento de edge cases.

#### B. Oportunidades de Melhoria Estrutural
- Refatoração de trechos duplicados ou prolixos.
- Clareza terminológica e padrões de código.
- Modularização e desacoplamento de responsabilidades.

#### C. Aprimoramentos de Performance, Telemetria & UX
- Otimização de tempo de resposta, latência e consumo de memória/tokens.
- Feedback de status em tempo real para a interface/usuário.
- Transparência de telemetria, logs estruturados e auditoria.

---

### FASE 5: Avaliação no Contexto Global do Projeto
Analise como cada falha e cada ideia repercute no todo:
- **Impacto no Sistema Completo:** Se alterarmos isso, o que pode quebrar em outras áreas?
- **Harmonia Arquitetural:** Essa mudança aproxima o projeto dos seus padrões centrais (ex: modularidade, resiliência, estética visual, integridade de dados)?
- **Custo-Benefício Sistêmico:** O ganho de robustez justifica a complexidade adicionada?

---

### FASE 6: Acionamento Integrado do Deep Problem Solver
Para cada falha crítica ou melhoria prioritária identificada na varredura, aplique formalmente o ciclo do **Deep Problem Solver**:
1. **Foco Isolado:** Isolar o problema em questão (um de cada vez).
2. **Exaustão de Causas:** Mapear todas as possíveis causas (dados de entrada, lógica de backend, interface/UX, arquitetura sistêmica).
3. **Divergência de Soluções:** Formular as 4 opções clássicas (Opção A Mínima, Opção B Integrada, Opção C Autônoma/Engine, Opção D Híbrida com prós/contras).
4. **Visão Holística & Convergência:** Escolher e justificar a solução soberana ponderando estabilidade, harmonia visual, integridade científica e performance.

---

### FASE 7: Dossiê Executivo de Entrega
Apresente a entrega estruturada no seguinte modelo padronizado:

```markdown
# 🔬 Dossiê de Varredura Cirúrgica & Auditoria Profunda
**Área Auditada:** `[caminho/módulo/subsistema]`
**Data & Escopo:** `[data/versão]`

## 1. Mapeamento Arquitetural & Fluxos da Área
- Síntese dos fluxos rastreados (entrada -> processamento -> integração -> saída).

## 2. Matriz Exaustiva de Achados
| ID | Tipo | Severidade | Linha / Função | Descrição do Achado | Impacto no Sistema |
|---|---|---|---|---|---|
| F-01 | Falha | Alta/Crítica | `arquivo:linha` | Detalhe da inconsistência | O que provoca no todo |
| M-01 | Melhoria | Média | `arquivo:linha` | Oportunidade de refatoração | Ganho arquitetural |
| P-01 | Performance | Baixa/Média | `arquivo:linha` | Gargalo ou consumo excessivo | Ganho de velocidade/recurso |

## 3. Dissecção Deep Problem Solver (Para os Achados Críticos)
- Aplicação do ciclo de 4 etapas para cada ponto prioritário (Anatomia -> Causas -> Soluções A/B/C/D -> Escolha Soberana).

## 4. Plano Tático de Execução Priorizado
1. **Ação Imediata (Cirúrgica):** ...
2. **Ação Estrutural (Robustez):** ...
3. **Polimento & Otimização (UX/Performance):** ...
```

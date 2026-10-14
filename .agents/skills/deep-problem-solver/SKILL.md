---
name: deep-problem-solver
description: >-
  Metodologia mandatória de resolução profunda de problemas (um por vez):
  análise profunda do problema, levantamento exaustivo de todas as possíveis causas,
  exploração de todas as possíveis soluções e escolha da solução mais recomendada
  considerando o impacto e harmonia com o conjunto completo do sistema.
---

# Deep Problem Solver (Análise Profunda & Solução Holística)

Esta skill define o protocolo mandatório de engenharia cognitiva para dissecar e resolver problemas, bugs e novas funcionalidades complexas.

## Princípio Fundamental: "Um Problema de Cada Vez"
Nunca tente solucionar múltiplos problemas estruturais de uma vez só. Isole o foco, aprofunde-se na raiz, esgote as hipóteses e tome decisões deliberadas.

---

## O Ciclo em 4 Etapas Obrigatórias

```
  [1. Anatomia do Problema]
            │ (um de cada vez)
            ▼
  [2. Exaustão de Causas] ──> Por que isso acontece? (Listar todas as origens possíveis)
            │
            ▼
  [3. Divergência de Soluções] ──> O que podemos fazer? (Mapear todos os caminhos)
            │
            ▼
  [4. Convergência Holística] ──> Qual é a melhor solução para o SISTEMA COMPLETO?
```

---

### ETAPA 1: Anatomia do Problema (Isolamento)
- **Definição Objetiva:** Qual é exatamente a dor, a inconsistência ou a necessidade que estamos enfrentando?
- **Delimitação de Escopo:** O que está dentro e o que está fora deste problema específico?
- **Evidência Concreta:** Onde isso se manifesta no código, na UI, no dado ou na experiência do usuário?

---

### ETAPA 2: Mapeamento de Todas as Possíveis Causas
Pergunte-se ativamente: *"O que pode estar gerando isso?"*
Explore sistematicamente:
1. **Causa de Dados / Modelo:** O dado de entrada é inconsistente, nulo, ambíguo ou incompleto?
2. **Causa de Lógica / Backend:** Há regras de negócio mal sincronizadas, chamadas assíncronas concorrentes ou rotas faltantes?
3. **Causa de Interface / UX:** O usuário fica sem feedback visual, sem clareza de onde clicar ou o fluxo é cognitivamente confuso?
4. **Causa Sistêmica / Arquitetural:** Há acoplamento indevido, falta de abstração ou duplicação de responsabilidades?

---

### ETAPA 3: Levantamento de Todas as Possíveis Soluções
Não se contente com a primeira resposta intuitiva. Liste explicitamente pelo menos 3 a 4 alternativas viáveis:
- **Opção A (Mínima / Pontual):** Ajuste localizado e rápido (baixo impacto, mas resolve o sintoma).
- **Opção B (Integrada / Guiada):** Solução focada na experiência do usuário com feedback claro e transição natural.
- **Opção C (Autônoma / Deep Engine):** Pipeline inteligente que automatiza o ciclo de ponta a ponta (coleta -> correção cirúrgica -> regeneração -> reauditoria).
- **Opção D (Híbrida / Modular):** Combinação de automação com controle granular pelo usuário.

Para cada opção, avalie:
- **Prós (Vantagens)**
- **Contras (Riscos, complexidade ou débitos técnicos)**
- **Esforço vs Retorno**

---

### ETAPA 4: Escolha da Mais Recomendada (Visão do Conjunto Completo)
Analise como a escolha interage com:
- **Estabilidade & Robustez:** Quebra testes existentes ou introduz regressões?
- **Consistência Visual & Cognitiva:** Mantém o padrão estético (ex: Dark Glassmorphism, feedback tátil/sonoro, HUD)?
- **Integridade Científica / Regras de Negócio:** Preserva dados críticos, citações, backups e logs?
- **Escalabilidade Futura:** Facilita manutenções ou novas extensões pelos agentes?

**Conclusão:** Apresentar a recomendação soberana com o plano passo a passo de implementação.

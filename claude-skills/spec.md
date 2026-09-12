---
name: spec
description: Entrevista estruturada e gera especificação detalhada do projeto
tags: [planning, specification, interview]
---

# Skill: spec

Seu objetivo é fazer uma entrevista estruturada com o usuário para entender completamente o que ele quer construir. Não comece a construir nada. Apenas faça perguntas e colete informações.

## Processo

1. **Cumprimento**: Pergunte qual é o nome do projeto/recurso que quer construir
2. **Objetivo Principal**: Pergunte qual é o objetivo principal - por que isso precisa existir?
3. **Descrição Geral**: Peça uma descrição clara do que é esse projeto/recurso
4. **Requisitos Indispensáveis**: Pergunte quais são os requisitos OBRIGATÓRIOS - o que absolutamente deve ter para que funcione?
5. **Escopo de Exclusão**: Pergunte o que EXPLICITAMENTE NÃO está incluído no escopo
6. **Casos Extremos**: Pergunte quais são os casos extremos, erros ou cenários especiais que precisam ser tratados
7. **Definição de Concluído**: Pergunte como saber que o projeto está 100% pronto - quais são os critérios de aceitação?
8. **Restrições**: Pergunte se há restrições (tecnológicas, de tempo, de recursos, etc.)
9. **Contexto Adicional**: Pergunte se há mais algo importante que não foi mencionado

## Regras

- **Uma pergunta por vez**: Nunca faça múltiplas perguntas juntas
- **Escuta ativa**: Faça perguntas de esclarecimento baseadas na resposta anterior
- **Seja específico**: Em vez de "há requisitos adicionais?", pergunte "quais informações precisam ser exibidas?" ou "que ações o usuário pode fazer?"
- **Confirme o entendimento**: Resuma o que entendeu e peça confirmação

## Saída

Quando tiver informações suficientes, crie um arquivo de especificação em `specs/<nome>.md` com este formato:

```
# Especificação: [Nome do Projeto]

## Objetivo
[Por que isso precisa existir]

## Descrição Geral
[O que é, em linguagem clara]

## Requisitos Indispensáveis
- [Requisito 1]
- [Requisito 2]
- ...

## Escopo de Exclusão
- [Não inclui X]
- [Não inclui Y]
- ...

## Casos Extremos & Tratamento de Erros
- [Cenário 1]: [Como deve se comportar]
- [Cenário 2]: [Como deve se comportar]
- ...

## Restrições
- [Restrição técnica]
- [Restrição de tempo]
- ...

## Definição de Concluído (Critérios de Aceitação)
- [ ] [Critério 1]
- [ ] [Critério 2]
- [ ] [Critério 3]
- ...

## Notas Adicionais
[Qualquer contexto importante não coberto acima]
```

**Não comece a construir**. Apenas gere a especificação e avise que está pronta para `/build`.

---
name: build
description: Constrói exatamente o que a especificação descreve, sem adicionar extras
tags: [implementation, construction, execution]
---

# Skill: build

Seu objetivo é construir exatamente o que está descrito em `specs/<nome>.md`. Não adicione funcionalidades não especificadas, não refatore código desnecessário, não invente requisitos.

## Processo

1. **Leia a Especificação**: Abra e leia completamente o arquivo `specs/<nome>.md`
2. **Planeje a Construção**: Identifique quais tarefas precisam ser feitas para atender aos requisitos
3. **Construa Incrementalmente**: Implemente requisito por requisito
4. **Teste Conforme Avança**: Verifique que cada requisito é atendido
5. **Não Adicione Extras**: Se algo não está na spec, não faça
6. **Não Refatore**: Não toque em código que não é necessário para atender à spec

## Regras Rigorosas

- **Respeite os Requisitos Indispensáveis**: Todos devem ser implementados
- **Trate Casos Extremos**: Implemente o que foi especificado para casos extremos
- **Sem Gold-Plating**: Não adicione "nice-to-haves" não especificados
- **Sem Refatorações Livres**: Só mude código se for necessário para cumprir a spec
- **Sem Comentários Desnecessários**: Apenas se for realmente necessário para entender

## Saída Final

Quando a construção estiver concluída, liste todos os requisitos da especificação que foram atendidos:

```
## ✅ Requisitos Atendidos

### Requisitos Indispensáveis
- ✅ [Requisito 1]
- ✅ [Requisito 2]
- ...

### Casos Extremos Tratados
- ✅ [Caso 1]
- ✅ [Caso 2]
- ...

### Critérios de Aceitação
- ✅ [Critério 1]
- ✅ [Critério 2]
- ...
```

**Não comece o loop de revisão**. Apenas avise que está pronto para `/review`.

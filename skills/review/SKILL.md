---
name: review
description: Compara a build atual com a especificação e valida conformidade
tags: [verification, quality-assurance, validation]
---

# Skill: review

Seu objetivo é comparar a build atual com o arquivo `specs/<nome>.md` e validar se todos os requisitos foram atendidos.

## Processo

1. **Leia a Especificação**: Abra `specs/<nome>.md` e releia completamente
2. **Inspecione a Build**: Examine o código/projeto construído
3. **Valide Requisito por Requisito**: Para cada requisito indispensável:
   - Verifique se está implementado
   - Teste se funciona conforme especificado
   - Procure por bugs ou inconsistências
4. **Valide Casos Extremos**: Para cada caso extremo especificado:
   - Verifique se está tratado
   - Teste o comportamento esperado
   - Procure por falhas no tratamento
5. **Valide Critérios de Aceitação**: Para cada critério de aceitação:
   - Confirme que é atendido
   - Se não for, especifique o que está faltando
6. **Liste Todas as Lacunas**: Se algo falhar, documente exatamente qual requisito falhou

## Checklist de Validação

Para cada item na especificação:
- [ ] O código realmente existe?
- [ ] O comportamento bate com o que foi especificado?
- [ ] Os testes passam?
- [ ] Há código extra não especificado?
- [ ] A arquitetura foi respeitada?

## Saída

```markdown
# Relatório de Review: [Nome do Projeto]

## Status Geral: [APROVADO / REPROVADO]

### Requisitos Indispensáveis
- [x] Requisito 1: OK
- [ ] Requisito 2: FALHA - [descrever o que falta]

### Casos Extremos
- [x] Caso 1: OK

### Itens Fora de Escopo Detectados (se houver)
- Nenhum / [listar código extra que não foi pedido]

### Próximos Passos
- [O que precisa ser corrigido antes da aprovação final]
```

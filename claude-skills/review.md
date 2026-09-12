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
- [ ] Requisito está implementado?
- [ ] Implementação segue a descrição da spec?
- [ ] Há bugs ou comportamentos inesperados?
- [ ] Trata os casos extremos especificados?
- [ ] Atende ao critério de aceitação?

## Saída

### Se TUDO está OK ✅

```
## ✅ APROVADO

Todos os requisitos da especificação foram atendidos:

- ✅ [Requisito 1]
- ✅ [Requisito 2]
- ✅ [Requisito 3]
- ...

A build está pronta para uso.
```

### Se há LACUNAS ❌

```
## ❌ FALHAS ENCONTRADAS

### Requisito: [Nome do Requisito]
**Status**: Falta
**Especificação**: [O que deveria fazer]
**Achado**: [O que está acontecendo/faltando]
**Ação necessária**: [Correção específica]

### Caso Extremo: [Nome do Caso]
**Status**: Não tratado / Tratado incorretamente
**Especificação**: [O que deveria fazer]
**Achado**: [Comportamento atual]
**Ação necessária**: [Correção específica]

### Critério: [Critério de Aceitação]
**Status**: Não atendido
**Especificação**: [O que deveria acontecer]
**Achado**: [O que está acontecendo]
**Ação necessária**: [Correção específica]

---

## Próximo Passo

Execute `/build` novamente com as correções necessárias.
```

## Regras de Validação

- **Seja Específico**: Em vez de "isso não funciona", diga "quando X, esperado Y, mas obtido Z"
- **Referencie a Spec**: Para cada falha, cite o requisito/critério exato da especificação
- **Diferencie Bugs de Incompletude**: 
  - Incompletude = falta inteiramente
  - Bug = implementado mas com erro
- **Não Adicione Requisitos**: Apenas valide o que está na spec
- **Teste Realista**: Simule como um usuário real usaria o projeto

## Loop Contínuo

Se há lacunas:
1. Documente tudo claramente
2. Espere que `/build` corrija as falhas
3. Execute `/review` novamente
4. Repita até aprovação

Se está tudo OK:
1. Aprove explicitamente com ✅ APROVADO
2. Avise que a build pode ser considerada completa

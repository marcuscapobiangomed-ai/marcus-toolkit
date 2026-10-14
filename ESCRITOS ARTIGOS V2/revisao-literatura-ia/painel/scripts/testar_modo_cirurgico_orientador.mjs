import assert from 'node:assert';
import { desmembrarArtigo, remontarArtigo } from '../lib/orientador.mjs';
import { auditarFidelidadeSecao } from '../lib/fidelidade.mjs';

console.log('========================================================');
console.log('TESTE DE PRECISÃO CIRÚRGICA: DEVOLUTIVA DO ORIENTADOR');
console.log('========================================================\n');

// 1. Teste de desmembramento e preservação exata
console.log('1. Testando desmembramento e remontagem imutável...');
const artigoOriginal = `# Título de Teste

**RESUMO:** Resumo inicial da pesquisa.

**Palavras-chave:** teste, pesquisa.

## 1 Introdução

Parágrafo 1 da introdução sobre telemonitoramento.
Parágrafo 2 com citação de ensaio clínico [1].

## 2 Métodos

Coorte prospectiva com 100 pacientes acompanhados por 12 meses [2].

## 3 Resultados

Redução de 15 mmHg na PAS (p = 0,001) e 8 mmHg na PAD [1].

## 4 Discussão

A efetividade observada corrobora a literatura prévia [1].
No entanto, o custo de implementação ainda representa barreira em países em desenvolvimento [2].

## 5 Conclusão

O telemonitoramento demonstrou eficácia clínica relevante.

## Referências

1. Silva A, et al. Telemedicina e hipertensão. Arq Bras Cardiol. 2024;120(1):1-10.
2. Santos B, et al. Desfechos cardiovasculares. Rev Saude Publica. 2023;57:45.
`;

const partes = desmembrarArtigo(artigoOriginal);
assert.strictEqual(partes.titulo, 'Título de Teste');
assert.strictEqual(partes.resumo, 'Resumo inicial da pesquisa.');
assert.ok(partes.introducao.includes('Parágrafo 1'));
assert.ok(partes.metodos.includes('Coorte prospectiva'));
assert.ok(partes.resultados.includes('Redução de 15 mmHg'));
assert.ok(partes.discussao.includes('A efetividade observada'));
assert.ok(partes.conclusao.includes('O telemonitoramento demonstrou'));

const remontado = remontarArtigo(partes);
assert.ok(remontado.includes('## 1 Introdução'));
assert.ok(remontado.includes('## 4 Discussão'));
console.log('✔ Desmembramento e remontagem estrutural validados.');

// 2. Teste do Guardrail em Modo Cirúrgico vs Amplo
console.log('\n2. Testando Guardrail de Fidelidade com modo cirúrgico...');
const textoDiscussaoOriginal = `A efetividade observada corrobora a literatura prévia [1].
No entanto, o custo de implementação ainda representa barreira em países em desenvolvimento [2].`;

// No modo cirúrgico, o usuário ajustou uma frase e manteve os números e citações
const textoDiscussaoCirurgico = `A efetividade observada corrobora fortemente a literatura prévia de centros terciários [1].
No entanto, o custo de implementação ainda representa barreira em países em desenvolvimento [2].`;

const auditCirurgica = auditarFidelidadeSecao({
  secao: 'discussao',
  textoOriginal: textoDiscussaoOriginal,
  textoReescrito: textoDiscussaoCirurgico,
  fontes: [{ n: 1, titulo: 'Silva' }, { n: 2, titulo: 'Santos' }],
  modo: 'cirurgico',
});

assert.strictEqual(auditCirurgica.aprovado, true);
console.log('✔ Modo cirúrgico aprovou ajuste pontual sem reversão.');

// 3. Teste de alucinação de citação que deve ser barrada mesmo no cirúrgico
const textoDiscussaoComCitacaoInvalida = `A efetividade observada corrobora a literatura prévia [99].
No entanto, o custo de implementação ainda representa barreira em países em desenvolvimento [2].`;

const auditBarrada = auditarFidelidadeSecao({
  secao: 'discussao',
  textoOriginal: textoDiscussaoOriginal,
  textoReescrito: textoDiscussaoComCitacaoInvalida,
  fontes: [{ n: 1, titulo: 'Silva' }, { n: 2, titulo: 'Santos' }],
  modo: 'cirurgico',
});

assert.strictEqual(auditBarrada.aprovado, false);
console.log('✔ Guardrail bloqueou citação inexistente [99] mesmo no modo cirúrgico.');

console.log('\n========================================================');
console.log('TODAS AS ASSERÇÕES DE PRECISÃO CIRÚRGICA PASSARAM COM SUCESSO!');
console.log('========================================================\n');

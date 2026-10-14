import { auditarFidelidadeSecao, aplicarGuardrailFidelidade } from '../lib/fidelidade.mjs';

console.log('========================================================');
console.log('TESTE DO GUARDRAIL DE FIDELIDADE FACTUAL E NUMÉRICA');
console.log('========================================================\n');

const fontesMock = [
  { n: 1, titulo: 'Estudo Clínico A', resumo: 'Incidência de infarto foi de 14,2% no grupo controle e 8,1% na intervenção (p = 0,004).' },
  { n: 2, titulo: 'Ensaio B', resumo: 'Avaliados 450 pacientes com redução do risco relativo em 28% (IC95% 15 a 39%).' },
  { n: 3, titulo: 'Coorte C', resumo: 'Mortalidade cardiovascular diminuiu significativamente.' },
];

// Teste 1: Reescrita autoral legítima (preserva fatos e citações)
console.log('1. Testando reescrita legítima (preserva números e citações)...');
const textoOriginal1 = `
A casuística avaliada demonstrou incidência de infarto de 14,2% no grupo controle vs 8,1% na intervenção [1].
Além disso, a redução do risco relativo foi estimada em 28% em uma coorte de 450 pacientes [2].
`;
const textoReescritoLegitimo = `
Em consonância com as evidências de ensaios randomizados, os pacientes sob intervenção apresentaram taxa de infarto de 8,1%, em contraste com 14,2% observados nos controles [1].
De forma complementar, observou-se diminuição de 28% no risco relativo na análise de 450 indivíduos [2].
`;

const res1 = auditarFidelidadeSecao({
  secao: 'discussao',
  textoOriginal: textoOriginal1,
  textoReescrito: textoReescritoLegitimo,
  fontes: fontesMock,
});
console.log(`- Aprovado: ${res1.aprovado}`);
console.log(`- Erros críticos: ${res1.errosCriticos}`);
if (res1.aprovado) {
  console.log('✔ Teste 1 PASSOU: reescrita fiel aceita com sucesso.');
} else {
  console.error('✖ Teste 1 FALHOU:', res1.problemas);
}

// Teste 2: Alucinação Numérica (IA inventa número que não existe)
console.log('\n2. Testando detecção de número inventado sem fonte...');
const textoReescritoAlucinacao = `
Em consonância com ensaios clínicos, observou-se redução de 89,4% nos eventos cardiovasculares [1].
A casuística de 450 pacientes confirmou benefício [2].
`;
const res2 = auditarFidelidadeSecao({
  secao: 'discussao',
  textoOriginal: textoOriginal1,
  textoReescrito: textoReescritoAlucinacao,
  fontes: fontesMock,
});
console.log(`- Aprovado: ${res2.aprovado}`);
console.log(`- Erros críticos: ${res2.errosCriticos}`);
console.log(`- Problemas detectados:`, res2.problemas.map(p => p.detalhe));
if (!res2.aprovado && res2.problemas.some(p => p.tipo === 'numero_inventado')) {
  console.log('✔ Teste 2 PASSOU: número inventado "89,4%" foi barrado com sucesso.');
} else {
  console.error('✖ Teste 2 FALHOU.');
}

// Teste 3: Citação inexistente ([99])
console.log('\n3. Testando citação inexistente fora do rol de referências...');
const textoReescritoCitacaoFalsa = `
A taxa de infarto foi de 14,2% [99].
`;
const res3 = auditarFidelidadeSecao({
  secao: 'discussao',
  textoOriginal: textoOriginal1,
  textoReescrito: textoReescritoCitacaoFalsa,
  fontes: fontesMock,
});
console.log(`- Aprovado: ${res3.aprovado}`);
if (!res3.aprovado && res3.problemas.some(p => p.tipo === 'citacao_inexistente')) {
  console.log('✔ Teste 3 PASSOU: citação [99] rejeitada como inexistente.');
} else {
  console.error('✖ Teste 3 FALHOU.');
}

// Teste 4: Guardrail de Reversão Cirúrgica
console.log('\n4. Testando Guardrail com Reversão Automática...');
const trabalhoMock = {
  log: (msg) => console.log(`  [LOG TRABALHO]: ${msg}`),
};

const guardrailResultado = await aplicarGuardrailFidelidade({
  trabalho: trabalhoMock,
  secao: 'discussao',
  tituloSecao: 'Discussão',
  textoOriginal: textoOriginal1,
  textoReescrito: textoReescritoAlucinacao,
  fontes: fontesMock,
  funcaoReexecutarIa: async () => {
    // Simula uma tentativa que ainda falha
    return 'Ainda alucinando 95% sem respaldo [1].';
  },
});

console.log(`- Revertido: ${guardrailResultado.revertido}`);
console.log(`- Alterou: ${guardrailResultado.alterou}`);
if (guardrailResultado.revertido && guardrailResultado.textoFinal === textoOriginal1) {
  console.log('✔ Teste 4 PASSOU: reversão cirúrgica de segurança preservou o texto original intacto.');
} else {
  console.error('✖ Teste 4 FALHOU.');
}

console.log('\n========================================================');
console.log('TODOS OS TESTES DE FIDELIDADE FORAM CONCLUÍDOS!');
console.log('========================================================');

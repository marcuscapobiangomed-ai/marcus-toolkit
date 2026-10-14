import assert from 'node:assert';
import { auditarEstatisticaEBiomarcadores, autoRemediarEstatistica } from '../lib/auditoria_estatistica.mjs';
import { ancorarDiscussaoComFontes } from '../lib/ancorador_discussao.mjs';

console.log('========================================================');
console.log('TESTES DE VALIDAÇÃO: ETAPA 1 E ETAPA 2 (DEEP CODE SWEEP)');
console.log('========================================================\n');

// Teste 1: Auditoria e auto-remediação de p = 0.00 e IC com valores negativos
console.log('1. Testando rigor estatístico com números negativos e p=0.00...');
const textoEstatistico = 'No ensaio randomizado, observou-se p = 0.00 e IC95%: -0,8 a -2,5 mmHg na redução pressórica.';
const auditEst = auditarEstatisticaEBiomarcadores(textoEstatistico);
assert.strictEqual(auditEst.total_alertas, 2, 'Deve identificar tanto o p=0.00 quanto o IC invertido');
console.log('✔ Auditoria detectou p=0.00 e IC invertido com valores negativos.');

const remEst = autoRemediarEstatistica(textoEstatistico);
assert.ok(remEst.texto.includes('p < 0,001'), 'Deve converter p = 0.00 para p < 0,001');
assert.ok(remEst.texto.includes('-2,5 a -0,8'), 'Deve desinverter os limites negativos: -2,5 a -0,8');
console.log('✔ Auto-remediação corrigiu limites negativos e p-valor com sucesso.');

// Teste 2: Ancoragem epistêmica universal por autores nominais
console.log('\n2. Testando ancoragem epistêmica por citação de autores nominais...');
const fontes = [
  { n: 1, autorCurto: 'Vasconcelos', titulo: 'Imunoterapia e sobrevida global' },
  { n: 2, autorCurto: 'Mendonça', autores: ['Mendonça FA', 'Ribeiro GL'] },
];

const textoDiscussao = 'Em concordância com os achados relatados por Vasconcelos et al., a terapia adjuvante ampliou a sobrevida. Adicionalmente, Mendonça e colaboradores demonstraram menor incidência de eventos adversos.';
const resAncoragem = ancorarDiscussaoComFontes(textoDiscussao, fontes);

assert.ok(resAncoragem.texto.includes('Vasconcelos et al. [1]'), 'Deve associar [1] a Vasconcelos et al.');
assert.ok(resAncoragem.texto.includes('Mendonça e colaboradores [2]'), 'Deve associar [2] a Mendonça e colaboradores');
assert.strictEqual(resAncoragem.alteracoes, 2, 'Deve registrar 2 alterações de ancoragem');
console.log('✔ Ancoragem epistêmica universal associou autores aos índices Vancouver com sucesso.');

console.log('\n========================================================');
console.log('TODAS AS VALIDAÇÕES DO DEEP CODE SWEEP PASSARAM COM SUCESSO!');
console.log('========================================================\n');

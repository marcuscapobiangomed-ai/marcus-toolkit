import assert from 'node:assert';
import { auditarConsistenciaResumoVsCorpo } from '../lib/fidelidade.mjs';

console.log('🧪 Iniciando teste de Consistência Interna (Resumo vs. Métodos/Resultados - P3)...');

// Cenário 1: Resumo e Resultados Perfeitamente Alinhados
const c1 = auditarConsistenciaResumoVsCorpo({
  resumo: 'O estudo avaliou uma amostra de 150 pacientes. A taxa de resposta foi de 64,5% no grupo intervenção e a sobrevida global atingiu 18,2 meses.',
  metodos: 'Foram incluídos no ensaio clínico uma amostra de 150 pacientes com diagnóstico confirmado.',
  resultados: 'O desfecho primário evidenciou resposta objetiva em 64,5% dos indivíduos tratados. A mediana de sobrevida global foi estimada em 18,2 meses.',
  discussao: 'Estes achados reforçam a eficácia da terapêutica.',
});

console.log(`[Cenário 1] Consistente -> Score: ${c1.score}%, Status: ${c1.status}, Inconsistências: ${c1.inconsistencias.length}`);
assert.strictEqual(c1.score, 100, 'Cenário alinhado deve ter score 100%');
assert.strictEqual(c1.status, 'Consistente', 'Status deve ser Consistente');
assert.strictEqual(c1.inconsistencias.length, 0, 'Não deve haver inconsistências');

// Cenário 2: Resumo com valor numérico órfão / alucinado
const c2 = auditarConsistenciaResumoVsCorpo({
  resumo: 'Avaliados 150 pacientes. A incidência de complicações foi de 38,7% no seguimento.',
  metodos: 'Participaram 150 pacientes.',
  resultados: 'A taxa de eventos adversos observada foi de 12,4%.',
});

console.log(`[Cenário 2] Valor Órfão -> Score: ${c2.score}%, Status: ${c2.status}, Inconsistências: ${c2.inconsistencias.length}`);
assert(c2.score < 100, 'Score deve ser reduzido');
assert(c2.inconsistencias.some((i) => i.token.includes('38,7') || i.token.includes('38.7')), 'Deve identificar 38,7 como número não presente no corpo');

// Cenário 3: Divergência Amostral Crítica (N=150 no resumo vs N=300 no corpo)
const c3 = auditarConsistenciaResumoVsCorpo({
  resumo: 'Neste ensaio com amostra de 150 pacientes, a resposta foi favorável.',
  metodos: 'A coorte final contou com uma amostra total de 300 pacientes após os critérios de elegibilidade.',
  resultados: 'Todos os 300 participantes completaram o protocolo.',
});

console.log(`[Cenário 3] Divergência Amostral -> Inconsistências: ${c3.inconsistencias.length}`);
assert(c3.inconsistencias.some((i) => i.tipo === 'discrepancia_amostral_critica'), 'Deve acusar discrepancia_amostral_critica');

console.log('✅ Todos os testes de Consistência Interna (Fase 5 - P3) passaram com 100% de sucesso!\n');

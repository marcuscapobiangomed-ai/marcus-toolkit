import assert from 'node:assert';
import {
  gerarContribuicoesCRediT,
  gerarDeclaracoesEticas,
  executarAgenteComplianceEtico,
} from '../lib/compliance_etico.mjs';

console.log('🧪 Iniciando teste de Autoria CRediT Real e Condicionalidade de Diretrizes (P5)...');

// Teste 1: Autores reais informados
const autsReais = 'Silva JA, Santos M, Oliveira R';
const credit1 = gerarContribuicoesCRediT(autsReais);
console.log(`[Teste 1] Autores reais -> ${credit1.distribuicao.length} autores mapeados`);
assert.strictEqual(credit1.pendente, false, 'Não deve constar como pendente');
assert.strictEqual(credit1.distribuicao.length, 3, 'Deve conter exatamente 3 autores');
assert.strictEqual(credit1.distribuicao[0].nome, 'Silva JA', 'Primeiro autor deve ser Silva JA');
assert.strictEqual(credit1.distribuicao[1].nome, 'Santos M', 'Segundo autor deve ser Santos M');
assert.strictEqual(credit1.distribuicao[2].nome, 'Oliveira R', 'Terceiro autor deve ser Oliveira R');
assert(!credit1.textoCRediT.includes('Dr. Marcus C.'), 'Não deve conter Dr. Marcus C. forjado');
assert(!credit1.textoCRediT.includes('Consórcio de Revisão'), 'Não deve conter Consórcio forjado');

// Teste 2: Sem autores informados
const credit2 = gerarContribuicoesCRediT([]);
console.log(`[Teste 2] Sem autores -> Pendente: ${credit2.pendente}, Itens: ${credit2.distribuicao.length}`);
assert.strictEqual(credit2.pendente, true, 'Deve constar como pendente');
assert.strictEqual(credit2.distribuicao.length, 0, 'Distribuição deve estar vazia sem inventar autores');
assert(credit2.textoCRediT.includes('preenchidos pelos pesquisadores responsáveis'), 'Deve conter nota orientativa transparente');
assert(!credit2.textoCRediT.includes('Dr. Marcus C.'), 'Não deve inventar autor');

// Teste 3: Sem PROSPERO falso
const dec = gerarDeclaracoesEticas({});
console.log('[Teste 3] Declarações Éticas -> Verificando ausência de PROSPERO forjado');
assert(!dec.blocoMarkdown.includes('CRD42024891024'), 'Não deve inventar id PROSPERO falso');

// Teste 4: Condicionalidade de Diretriz (Revisão vs Observacional)
const compRevisao = executarAgenteComplianceEtico({ delineamento: 'Revisão Sistemática', diretriz: 'PRISMA 2020' }, ['Silva JA']);
console.log(`[Teste 4] Compliance Revisão -> Diretriz: ${compRevisao.diretriz_aplicada}`);
assert.strictEqual(compRevisao.diretriz_aplicada, 'PRISMA 2020', 'Para revisão deve aplicar PRISMA 2020');
assert.strictEqual(compRevisao.prismaChecklist.checklistMapeado.length, 28, 'PRISMA deve ter 28 itens mapeados (incluindo 10a e 10b)');

const compObs = executarAgenteComplianceEtico({ delineamento: 'Estudo de Coorte Observacional', diretriz: 'STROBE' }, ['Silva JA']);
console.log(`[Teste 5] Compliance Observacional -> Diretriz: ${compObs.diretriz_aplicada}`);
assert.strictEqual(compObs.diretriz_aplicada, 'STROBE', 'Para observacional deve aplicar STROBE');
assert(compObs.prismaChecklist.checklistMapeado.length < 27, 'STROBE tem itens próprios do EQUATOR Network');

console.log('✅ Todos os testes de Autoria Real e Diretrizes (Fase 6 - P5) passaram com 100% de sucesso!\n');

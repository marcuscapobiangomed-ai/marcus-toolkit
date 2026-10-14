import assert from 'node:assert';
import { paisDaAfiliacao } from '../lib/pais_afiliacao.mjs';
import { migrarRegistros } from './migrar_registros_importados.mjs';

console.log('🧪 Teste: país por afiliação real e migração de registros importados');

assert.strictEqual(paisDaAfiliacao('Department of Cardiology, University of São Paulo, São Paulo, Brazil.'), 'Brasil');
assert.strictEqual(paisDaAfiliacao('Mayo Clinic, Rochester, MN, USA.'), 'Estados Unidos');
assert.strictEqual(paisDaAfiliacao('Hospital Clínico, Santiago, Chile'), 'Chile');
assert.strictEqual(paisDaAfiliacao('Some Institute of Medicine'), '');
assert.strictEqual(paisDaAfiliacao(''), '');
console.log('✔ extração de país: ok (sem evidência => vazio)');

const regs = {
  'ref-imp-1': { uid: 'ref-imp-1', base_origem: 'scielo', pais: 'América Latina', afiliacao: 'Mayo Clinic, Rochester, USA.', pmid: '123', doi: '10.1000/x', url: '' },
  'ref-imp-2': { uid: 'ref-imp-2', base_origem: 'lilacs', pais: 'NI', afiliacao: '', doi: '', url: '', periodico: 'Revista X' },
  'ref-gerada-1': { uid: 'ref-gerada-1', base_origem: 'pubmed', pais: 'XX' },
};
const { novo, mudancas } = migrarRegistros(regs);
assert.strictEqual(novo['ref-imp-1'].base_origem, 'pubmed');
assert.strictEqual(novo['ref-imp-1'].pais, 'Estados Unidos');
assert.strictEqual(novo['ref-imp-2'].base_origem, 'nao_verificada');
assert.strictEqual(novo['ref-imp-2'].pais, 'Não informado');
assert.strictEqual(novo['ref-imp-2'].origem_verificada, false);
assert.deepStrictEqual(novo['ref-gerada-1'], regs['ref-gerada-1']);
assert.strictEqual(mudancas.length, 2);
console.log('✔ migração: valores antigos corrigidos; registros não importados intactos');

console.log('✅ Teste de país real e migração passou com 100% de sucesso!');

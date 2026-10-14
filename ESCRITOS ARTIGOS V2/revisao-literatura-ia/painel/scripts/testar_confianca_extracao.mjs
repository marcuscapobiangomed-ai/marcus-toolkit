import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PY = path.join(__dirname, 'extrair_documento.py');

console.log('🧪 Iniciando teste de Confiança e Integridade da Extração Estrutural (P7)...');

// Testaremos via python inline chamando a função avaliar_confianca_extracao
function testarFuncaoPython(codigoPython) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['-c', codigoPython], {
      env: { ...process.env, PYTHONPATH: path.dirname(SCRIPT_PY) },
    });
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => { out += d.toString(); });
    py.stderr.on('data', (d) => { err += d.toString(); });
    py.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python exit ${code}: ${err}`));
      resolve(JSON.parse(out));
    });
  });
}

async function run() {
  // Teste 1: Documento completo canônico com todas as seções e 15 referências
  const pyCodeCompleto = `
import json, sys
sys.path.insert(0, "${path.dirname(SCRIPT_PY)}")
from extrair_documento import avaliar_confianca_extracao

secoes = ['introducao', 'metodos', 'resultados', 'discussao', 'conclusao', 'referencias']
refs = [f"Ref {i}" for i in range(16)]
palavras = 1500
titulo = "Eficácia da Imunoterapia no Tratamento Oncológico Avançado: Revisão"
md = "# " + titulo + "\\n\\n**RESUMO:** Estudo avalia imunoterapia.\\n\\n## 1 Introdução"

score, alertas = avaliar_confianca_extracao(secoes, refs, palavras, titulo, md)
print(json.dumps({"score": score, "alertas": alertas}))
`;

  const res1 = await testarFuncaoPython(pyCodeCompleto);
  console.log(`[Teste 1] Documento Completo -> Score: ${res1.score}%, Alertas: ${res1.alertas.length}`);
  assert.strictEqual(res1.score, 100, 'Documento completo canônico deve atingir 100% de confiança');
  assert.strictEqual(res1.alertas.length, 0, 'Documento completo não deve ter alertas estruturais');

  // Teste 2: Documento incompleto (sem Métodos e Resultados, poucas referências, título genérico)
  const pyCodeIncompleto = `
import json, sys
sys.path.insert(0, "${path.dirname(SCRIPT_PY)}")
from extrair_documento import avaliar_confianca_extracao

secoes = ['introducao', 'discussao']
refs = ["Silva JA, 2020.", "Santos M, 2021."]
palavras = 400
titulo = "Artigo Científico Importado"
md = "# " + titulo + "\\n\\nTexto sem resumo estruturado."

score, alertas = avaliar_confianca_extracao(secoes, refs, palavras, titulo, md)
print(json.dumps({"score": score, "alertas": alertas}))
`;

  const res2 = await testarFuncaoPython(pyCodeIncompleto);
  console.log(`[Teste 2] Documento Incompleto -> Score: ${res2.score}%, Alertas: ${res2.alertas.length}`);
  assert(res2.score < 60, `Score esperado < 60%, obtido: ${res2.score}%`);
  assert(res2.alertas.length > 3, 'Documento incompleto deve acusar múltiplos alertas estruturais');
  assert(res2.alertas.some(a => a.includes('Métodos') || a.includes('Metodos')), 'Deve acusar falta de Métodos');
  assert(res2.alertas.some(a => a.includes('Resultados')), 'Deve acusar falta de Resultados');
  assert(res2.alertas.some(a => a.includes('Confiança estrutural moderada/baixa')), 'Deve alertar para conferência prévia');

  console.log('✅ Todos os testes de Confiança e Integridade Estrutural (Fase 4 - P7) passaram com 100% de sucesso!\n');
}

run().catch((e) => {
  console.error('❌ Falha no teste:', e);
  process.exit(1);
});

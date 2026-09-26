#!/usr/bin/env node
// Aplica o resultado de uma conferencia independente (re-extracao da Tabela 1 + correcoes confirmadas
// por verificador adversarial) ao estado de um trabalho, para depois re-rodar a finalizacao.
// Uso: node scripts/aplicar-conferencia.mjs <id-do-trabalho> <resultado.json>
import fs from 'node:fs';
import path from 'node:path';
import { dividirFrases, numeroNoResumo, numerosRelevantes, paragrafos } from '../lib/auditoria.mjs';
import { JOBS_DIR } from '../lib/config.mjs';
import { expandirCitacao } from '../lib/referencias.mjs';
import { normalizar, similaridade } from '../lib/texto.mjs';

const [id, arqResultado] = process.argv.slice(2);
const dir = path.join(JOBS_DIR, id);
const estado = JSON.parse(fs.readFileSync(path.join(dir, 'estado.json'), 'utf8'));
const regs = JSON.parse(fs.readFileSync(path.join(dir, 'registros.json'), 'utf8'));
const resultado = JSON.parse(fs.readFileSync(arqResultado, 'utf8'));

// numero final (artigo.md) -> uid -> numero provisorio (estado)
const uidPorFinal = new Map(estado.referencias.map((r) => [r.n, r.uid]));
const provPorUid = new Map(estado.aprovados.map((u, i) => [u, i + 1]));
const paraProvisorio = (txt) => txt.replace(/\[(\d+(?:\s*[-–,]\s*\d+)*)\]/g, (m, c) => {
  const nums = expandirCitacao(c).map((n) => provPorUid.get(uidPorFinal.get(n))).filter(Boolean);
  return nums.length ? `[${[...new Set(nums)].sort((a, b) => a - b).join(',')}]` : '';
});
const semCitacoes = (s) => normalizar(s.replace(/\[[\d,\s–-]+\]/g, ' '));

const relatorio = { extracao: { aplicados: 0, numeros_removidos: [] }, correcoes: [] };

// 1. Tabela 1
for (const e of resultado.estudos || []) {
  const uid = uidPorFinal.get(e.n);
  if (!uid) continue;
  const base = `${regs[uid].titulo} ${regs[uid].resumo}`;
  const x = { pais: e.pais, delineamento: e.delineamento, amostra: e.amostra, exposicao: e.exposicao, desfechos: e.desfechos, achados: e.achados, eixo: e.eixo, fonte_extracao: 'conferencia-independente' };
  for (const campo of ['amostra', 'achados']) {
    const ruins = numerosRelevantes(x[campo] || '').filter((n) => !numeroNoResumo(n, base));
    if (ruins.length) relatorio.extracao.numeros_removidos.push({ n: e.n, campo, numeros: ruins, texto: x[campo] });
  }
  estado.extracoes[uid] = x;
  relatorio.extracao.aplicados++;
}

// 2. Correcoes confirmadas
for (const a of resultado.auditorias || []) {
  if (!a) continue;
  const chave = a.secao === 'introducao' ? 'introducao' : 'discussao';
  for (const v of a.veredictos || []) {
    const p = a.problemas[v.indice];
    if (!p || !v.problema_real) continue;
    const correcao = (v.correcao_final || p.correcao_sugerida || '').trim();
    const texto = estado[chave];
    const frases = paragrafos(texto).flatMap(({ texto: t }) => dividirFrases(t));
    const alvo = frases.map((f) => ({ f, s: similaridade(semCitacoes(f), semCitacoes(p.frase_exata)) })).sort((x, y) => y.s - x.s)[0];
    const item = { secao: a.secao, frase: p.frase_exata, tipo: p.tipo, justificativa: v.justificativa, correcao };
    if (!alvo || alvo.s < 0.85) {
      item.status = `não localizada (similaridade ${alvo?.s?.toFixed(2)})`;
    } else if (/^REMOVER$/i.test(correcao) || !correcao) {
      estado[chave] = texto.replace(alvo.f, '').replace(/ {2,}/g, ' ');
      item.status = 'removida';
    } else {
      estado[chave] = texto.replace(alvo.f, paraProvisorio(correcao));
      item.status = 'corrigida';
    }
    relatorio.correcoes.push(item);
  }
}

// 3. Refaz resumo/conclusao e a finalizacao com os dados corrigidos
estado.fechamento = null;
const modeloConferencia = 'Claude (Anthropic), na conferência independente da Tabela 1 e das afirmações';
if (!estado.llm.modelos.includes(modeloConferencia)) estado.llm.modelos.push(modeloConferencia);
estado.etapas.finalizacao = { titulo: estado.etapas.finalizacao.titulo, status: 'pendente' };
estado.status = 'interrompido';
estado.conferencia_independente = {
  extracoes_refeitas: relatorio.extracao.aplicados,
  correcoes_aplicadas: relatorio.correcoes.filter((c) => c.status !== 'não localizada').length,
  detalhes: relatorio.correcoes,
};
fs.writeFileSync(path.join(dir, 'estado.json'), JSON.stringify(estado, null, 1));
fs.writeFileSync(path.join(dir, 'conferencia-independente.json'), JSON.stringify(relatorio, null, 1));
console.log(JSON.stringify({ extracao: relatorio.extracao, correcoes: relatorio.correcoes.map((c) => `${c.status}: ${c.frase.slice(0, 90)}`) }, null, 1));

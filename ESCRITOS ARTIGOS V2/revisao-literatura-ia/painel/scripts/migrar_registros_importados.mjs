#!/usr/bin/env node
/**
 * Migração opcional: reclassifica base_origem e país nos registros.json de artigos
 * IMPORTADOS antes da reforma (uids "ref-imp-*").
 *
 * Uso:
 *   node scripts/migrar_registros_importados.mjs            # dry-run (não grava nada)
 *   node scripts/migrar_registros_importados.mjs --aplicar  # grava, com backup .bak-pre-migracao
 *
 * Regras: apenas evidência já presente no registro (doi/url/pmid/periódico/afiliação).
 * Nenhuma consulta de rede. Sem evidência => 'nao_verificada' / 'Não informado'.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JOBS_DIR } from '../lib/config.mjs';
import { classificarBaseOrigem } from '../lib/base_origem.mjs';
import { paisDaAfiliacao } from '../lib/pais_afiliacao.mjs';

export function migrarRegistros(regs) {
  const novo = {};
  const mudancas = [];
  for (const [uid, r] of Object.entries(regs)) {
    if (!uid.startsWith('ref-imp-')) { novo[uid] = r; continue; }
    const { base, evidencia } = classificarBaseOrigem(r);
    const pais = paisDaAfiliacao(r.afiliacao || '') || 'Não informado';
    const atualizado = {
      ...r,
      base_origem: base,
      base_evidencia: evidencia,
      origem_verificada: base !== 'nao_verificada',
      pais,
      pais_evidencia: r.afiliacao && pais !== 'Não informado' ? 'afiliação' : '',
    };
    if (r.base_origem !== base || r.pais !== pais) {
      mudancas.push({ uid, base: `${r.base_origem} → ${base}`, pais: `${r.pais} → ${pais}` });
    }
    novo[uid] = atualizado;
  }
  return { novo, mudancas };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const aplicar = process.argv.includes('--aplicar');
  let total = 0;
  for (const d of fs.readdirSync(JOBS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const arq = path.join(JOBS_DIR, d.name, 'registros.json');
    if (!fs.existsSync(arq)) continue;
    let regs;
    try { regs = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { continue; }
    const { novo, mudancas } = migrarRegistros(regs);
    if (!mudancas.length) continue;
    total += mudancas.length;
    console.log(`\n${d.name}: ${mudancas.length} registro(s) a migrar`);
    mudancas.slice(0, 5).forEach((m) => console.log(`  ${m.uid}  base ${m.base}  |  país ${m.pais}`));
    if (aplicar) {
      fs.copyFileSync(arq, `${arq}.bak-pre-migracao`);
      fs.writeFileSync(arq, JSON.stringify(novo, null, 2), 'utf8');
      console.log('  ✔ gravado (backup criado)');
    }
  }
  console.log(`\n${aplicar ? 'Migrados' : 'A migrar (dry-run)'}: ${total} registro(s).`);
  if (!aplicar && total) console.log('Rode com --aplicar para gravar.');
}

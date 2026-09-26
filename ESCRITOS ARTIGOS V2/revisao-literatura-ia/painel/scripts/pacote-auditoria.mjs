#!/usr/bin/env node
// Monta auditoria-entrada.json para uma conferencia independente (humana ou por outros agentes):
// cada referencia final com metadados, resumo original e URL confirmada.
import fs from 'node:fs';
import path from 'node:path';
import { JOBS_DIR } from '../lib/config.mjs';

const id = process.argv[2];
if (!id) {
  console.error('uso: node scripts/pacote-auditoria.mjs <id-do-trabalho>');
  process.exit(1);
}
const dir = path.join(JOBS_DIR, id);
const estado = JSON.parse(fs.readFileSync(path.join(dir, 'estado.json'), 'utf8'));
const regs = JSON.parse(fs.readFileSync(path.join(dir, 'registros.json'), 'utf8'));

const referencias = (estado.referencias || []).map((r) => {
  const g = regs[r.uid] || {};
  const v = estado.verificacoes?.[r.uid] || {};
  return {
    n: r.n,
    uid: r.uid,
    n_provisorio: (estado.aprovados || []).indexOf(r.uid) + 1,
    base: g.base_origem,
    afiliacao: g.afiliacao || '',
    periodico_completo: g.periodico_completo || '',
    referencia_vancouver: r.texto,
    titulo: g.titulo,
    titulos_alternativos: g.titulos_alternativos || [],
    autores: g.autores,
    ano: g.ano,
    periodico: g.periodico,
    volume: g.volume,
    numero: g.numero,
    paginas: g.paginas,
    doi: g.doi,
    doi_confirmado_no_crossref: v.doi_confirmado,
    pmid: g.pmid || null,
    pid_scielo: g.pid || null,
    colecao_scielo: g.colecao || null,
    id_bvs: g.origem === 'bvs' ? g.id : null,
    url_confirmada: v.url_confirmada,
    resumo: g.resumo,
  };
});

const saida = path.join(dir, 'auditoria-entrada.json');
fs.writeFileSync(saida, JSON.stringify({ id, titulo: estado.titulo, data_busca: estado.data_busca, referencias }, null, 1));
console.log(saida);
console.log(`${referencias.length} referências`);

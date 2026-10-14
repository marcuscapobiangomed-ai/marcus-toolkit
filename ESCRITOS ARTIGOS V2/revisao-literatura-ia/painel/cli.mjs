#!/usr/bin/env node
import fs from 'node:fs';
import * as bvs from './lib/fontes/bvs.mjs';
import * as pubmed from './lib/fontes/pubmed.mjs';
import * as scielo from './lib/fontes/scielo.mjs';
import { statusProvedores } from './lib/llm.mjs';
import { fecharNavegador } from './lib/navegador.mjs';
import { PADROES, Trabalho } from './lib/pipeline.mjs';
import { importarArtigo } from './lib/importador.mjs';

const AJUDA = `Painel de Revisão de Literatura — linha de comando

  node cli.mjs gerar "tema" [--pergunta "..."] [--tipo integrativa|sistematica|narrativa] [--anos 5]
                            [--bases pubmed,scielo,lilacs] [--min 25] [--provedor auto|claude_cli|anthropic|openrouter]
                            [--autores "..."] [--revista "..."] [--declaracao nenhuma|breve|completa]
  node cli.mjs retomar <id-do-trabalho>
  node cli.mjs orientador <id-do-trabalho> "devolutiva de correções" [--arquivo parecer.txt] [--instrucoes "..."]
  node cli.mjs importar <arquivo.docx|arquivo.pdf> [--tema "..."] [--orientacoes "..."] [--arquivo-orientacoes parecer.txt] [--sem-revisao]
  node cli.mjs buscar pubmed|scielo|lilacs "estratégia" [--anos 5] [--max 20]   (saída JSON, para agentes)
  node cli.mjs status
`;

function opcoes(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) o[args[i].slice(2)] = args[i + 1]?.startsWith('--') || args[i + 1] === undefined ? true : args[++i];
    else o._.push(args[i]);
  }
  return o;
}

async function acompanhar(trabalho) {
  trabalho.on('log', (l) => console.log(`[${l.t.slice(11, 19)}] ${l.msg}`));
  process.on('SIGINT', () => {
    console.log('\nCancelando…');
    trabalho.cancelar = true;
  });
  await trabalho.executar();
  await fecharNavegador();
  const e = trabalho.estado;
  console.log(`\nStatus: ${e.status}${e.erro ? ` — ${e.erro}` : ''}`);
  console.log(`Pasta: ${trabalho.dir}`);
  if (e.checklist) for (const i of e.checklist.itens) console.log(`  [${i.ok ? 'x' : ' '}] ${i.item}`);
  process.exitCode = e.status === 'concluido' ? 0 : 1;
}

const [comando, ...resto] = process.argv.slice(2);
const o = opcoes(resto);

if (comando === 'gerar') {
  const t = Trabalho.criar({
    tema: o._[0],
    pergunta: o.pergunta || '',
    tipo_revisao: o.tipo || PADROES.tipo_revisao,
    anos: Number(o.anos || PADROES.anos),
    bases: o.bases ? String(o.bases).split(',') : PADROES.bases,
    min_referencias: Number(o.min || PADROES.min_referencias),
    provedor: o.provedor || 'auto',
    autores: o.autores || '',
    revista_alvo: o.revista || '',
    declaracao_ia: ['nenhuma', 'breve', 'completa'].includes(o.declaracao) ? o.declaracao : PADROES.declaracao_ia,
  });
  console.log(`Trabalho ${t.estado.id}`);
  await acompanhar(t);
} else if (comando === 'retomar') {
  await acompanhar(Trabalho.carregar(o._[0]));
} else if (comando === 'orientador') {
  const id = o._[0];
  if (!id) {
    console.error('Uso: node cli.mjs orientador <id-do-trabalho> "parecer do orientador" [--arquivo parecer.txt] [--instrucoes "..."] [--sem-backup]');
    process.exit(1);
  }
  let devolutiva = o._.slice(1).join(' ').trim();
  if (o.arquivo) {
    if (!fs.existsSync(o.arquivo)) {
      console.error(`Arquivo "${o.arquivo}" não encontrado.`);
      process.exit(1);
    }
    devolutiva = fs.readFileSync(o.arquivo, 'utf8').trim();
  }
  if (!devolutiva) {
    console.error('Informe a devolutiva do orientador como texto entre aspas ou através do argumento --arquivo <caminho>.');
    process.exit(1);
  }
  const t = Trabalho.carregar(id);
  t.on('log', (l) => console.log(`[${l.t.slice(11, 19)}] ${l.msg}`));
  console.log(`Aplicando devolutiva do orientador no trabalho ${id}...`);
  const res = await t.aplicarDevolutiva({
    devolutiva,
    instrucoes_adicionais: o.instrucoes || '',
    criar_backup: !o['sem-backup'],
    modo: o.modo || (o.amplo ? 'amplo' : 'cirurgico'),
    secoes_permitidas: o.secoes ? o.secoes.split(',').map((s) => s.trim().toLowerCase()) : null,
  });
  console.log(`\n✔ Rodada ${res.rodada} concluída!`);
  console.log(`Parecer sintetizado: ${res.resumo_parecer}`);
  for (const alt of res.alteracoes || []) {
    console.log(`  - [${alt.secao}]: ${alt.resumo_mudancas}`);
  }
} else if (comando === 'importar') {
  const arq = o._[0];
  if (!arq) {
    console.error('Uso: node cli.mjs importar <arquivo.docx|arquivo.pdf> [--tema "..."] [--orientacoes "..."] [--arquivo-orientacoes parecer.txt] [--sem-revisao]');
    process.exit(1);
  }
  if (!fs.existsSync(arq)) {
    console.error(`Arquivo "${arq}" não encontrado.`);
    process.exit(1);
  }
  let orientacoes = o.orientacoes || '';
  if (o['arquivo-orientacoes']) {
    if (!fs.existsSync(o['arquivo-orientacoes'])) {
      console.error(`Arquivo de orientações "${o['arquivo-orientacoes']}" não encontrado.`);
      process.exit(1);
    }
    orientacoes = fs.readFileSync(o['arquivo-orientacoes'], 'utf8').trim();
  }
  console.log(`Importando artigo a partir de "${arq}"...`);
  const resultado = await importarArtigo({
    caminhoArquivo: arq,
    nomeArquivo: arq.split('/').pop(),
    tema: o.tema || '',
    orientacoes,
    aplicarRevisao: !o['sem-revisao'],
    declaracaoIa: ['nenhuma', 'breve', 'completa'].includes(o.declaracao) ? o.declaracao : 'breve',
    progressoCb: (msg) => console.log(msg),
  });
  console.log(`\n✔ Artigo importado com sucesso!`);
  console.log(`ID: ${resultado.id}`);
  console.log(`Título: ${resultado.titulo}`);
  console.log(`Seções identificadas: ${resultado.secoes.join(', ')}`);
  console.log(`Total de referências: ${resultado.total_referencias}`);
  if (resultado.revisao) {
    console.log(`✔ Revisão com modelo de escrita aplicada (Rodada ${resultado.revisao.rodada})!`);
  }
} else if (comando === 'buscar') {
  const [base, consulta] = o._;
  const anoInicial = new Date().getFullYear() - Number(o.anos || 5);
  const max = Number(o.max || 20);
  try {
    let r;
    if (base === 'pubmed') r = await pubmed.buscar(pubmed.montarEstrategia(consulta, { anoInicial }), { max });
    else if (base === 'scielo') r = await scielo.buscar(consulta, { anoInicial, max });
    else if (base === 'lilacs' || base === 'bvs') r = await bvs.buscar(consulta, { anoInicial, base: base === 'lilacs' ? 'LILACS' : null, max });
    else throw new Error(`Base desconhecida: ${base}`);
    r.registros = r.registros.slice(0, max);
    console.log(JSON.stringify(r, null, 1));
  } finally {
    await fecharNavegador();
  }
} else if (comando === 'status') {
  console.log(JSON.stringify(await statusProvedores(true), null, 1));
} else {
  console.log(AJUDA);
}

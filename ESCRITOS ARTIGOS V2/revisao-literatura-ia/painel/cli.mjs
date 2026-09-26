#!/usr/bin/env node
import * as bvs from './lib/fontes/bvs.mjs';
import * as pubmed from './lib/fontes/pubmed.mjs';
import * as scielo from './lib/fontes/scielo.mjs';
import { statusProvedores } from './lib/llm.mjs';
import { fecharNavegador } from './lib/navegador.mjs';
import { PADROES, Trabalho } from './lib/pipeline.mjs';

const AJUDA = `Painel de Revisão de Literatura — linha de comando

  node cli.mjs gerar "tema" [--pergunta "..."] [--tipo integrativa|sistematica|narrativa] [--anos 5]
                            [--bases pubmed,scielo,lilacs] [--min 25] [--provedor auto|claude_cli|anthropic|openrouter]
                            [--autores "..."] [--revista "..."] [--declaracao nenhuma|breve|completa]
  node cli.mjs retomar <id-do-trabalho>
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

#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { JOBS_DIR, PAINEL_DIR, chaveAnthropic, chaveOpenRouter, lerConfig, salvarConfig } from './lib/config.mjs';
import { statusProvedores, consultarUsoProvedores } from './lib/llm.mjs';
import { exportarArtigo } from './lib/exportar.mjs';
import { markdownParaHtml } from './lib/markdown.mjs';
import { fecharNavegador, navegadorAberto } from './lib/navegador.mjs';
import { ETAPAS, PADROES, Trabalho } from './lib/pipeline.mjs';

const PORTA = Number(process.env.PORTA || lerConfig().porta);
const PUBLICO = path.join(PAINEL_DIR, 'public');
const RE_ID = /^\d{8}-\d{6}-[a-z0-9-]+$/;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

fs.mkdirSync(JOBS_DIR, { recursive: true });

const emMemoria = new Map();
const fila = [];
let atual = null;
const ouvintes = new Map();

function carregar(id) {
  if (emMemoria.has(id)) return emMemoria.get(id);
  return Trabalho.carregar(id);
}

// Trabalhos que estavam rodando quando o servidor caiu ficam marcados como interrompidos.
for (const id of fs.readdirSync(JOBS_DIR).filter((d) => RE_ID.test(d))) {
  try {
    const t = Trabalho.carregar(id);
    const idadeMin = (Date.now() - fs.statSync(path.join(JOBS_DIR, id, 'estado.json')).mtimeMs) / 60000;
    const semPidRecente = !t.estado.pid && idadeMin < 15;
    if (['executando', 'na_fila'].includes(t.estado.status) && !processoVivo(t.estado) && !semPidRecente) {
      t.estado.status = 'interrompido';
      for (const e of Object.values(t.estado.etapas)) if (e.status === 'executando') e.status = 'pendente';
      t.salvar();
    }
  } catch {
    // pasta sem estado valido
  }
}

// Um trabalho pode estar rodando em outro processo (linha de comando): confere se o PID dele existe.
function processoVivo(estado) {
  if (!estado.pid || estado.pid === process.pid) return false;
  try {
    process.kill(estado.pid, 0);
    return true;
  } catch {
    return false;
  }
}

function transmitir(id, dados) {
  for (const res of ouvintes.get(id) || []) res.write(`data: ${JSON.stringify(dados)}\n\n`);
}

function conectar(t) {
  if (t._conectado) return;
  t._conectado = true;
  t.on('log', (linha) => transmitir(t.estado.id, { tipo: 'log', linha }));
  t.on('estado', () => transmitir(t.estado.id, { tipo: 'estado', status: t.estado.status, etapas: t.estado.etapas, llm: t.estado.llm }));
  t.on('fim', () => transmitir(t.estado.id, { tipo: 'fim', status: t.estado.status }));
}

function enfileirar(t) {
  emMemoria.set(t.estado.id, t);
  conectar(t);
  t.estado.status = 'na_fila';
  t.salvar();
  fila.push(t);
  processarFila();
}

async function processarFila() {
  if (atual || !fila.length) return;
  atual = fila.shift();
  try {
    await atual.executar();
  } finally {
    atual = null;
    if (!fila.length) await fecharNavegador();
    processarFila();
  }
}

function resumo(e) {
  return {
    id: e.id, tema: e.params.tema, titulo: e.titulo || '', status: e.status, criado_em: e.criado_em,
    incluidos: e.prisma?.incluidos ?? null, referencias: e.referencias?.length ?? null,
    checklist: e.checklist ? `${e.checklist.aprovados}/${e.checklist.total}` : null,
    etapas: ETAPAS.map(([k]) => e.etapas[k]?.status),
    llm: {
      chamadas: e.llm?.chamadas || 0,
      tokens_total: e.llm?.tokens_total || 0,
      tokens_entrada: e.llm?.tokens_entrada || 0,
      tokens_saida: e.llm?.tokens_saida || 0,
      custo_usd: e.llm?.custo_usd || 0,
      provedor: e.llm?.provedor || null,
    },
  };
}

function listar() {
  return fs.readdirSync(JOBS_DIR)
    .filter((d) => RE_ID.test(d) && fs.existsSync(path.join(JOBS_DIR, d, 'estado.json')))
    .map((id) => {
      try {
        return resumo(emMemoria.get(id)?.estado || JSON.parse(fs.readFileSync(path.join(JOBS_DIR, id, 'estado.json'), 'utf8')));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

function configPublica() {
  const c = lerConfig();
  const or = chaveOpenRouter(c);
  return {
    janela_navegador: c.janela_navegador, contato_email: c.contato_email,
    modelo_openrouter: c.modelo_openrouter, modelo_claude: c.modelo_claude, modelo_anthropic: c.modelo_anthropic,
    tem_openrouter: Boolean(or), origem_openrouter: or?.origem || '',
    tem_anthropic: Boolean(chaveAnthropic(c)), tem_ncbi: Boolean(c.ncbi_api_key),
  };
}

function responder(res, status, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof corpo === 'string' || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 1e6) reject(new Error('Corpo grande demais'));
    });
    req.on('end', () => {
      try {
        resolve(dados ? JSON.parse(dados) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

function servirArquivo(res, raiz, relativo, download = false) {
  const alvo = path.resolve(raiz, relativo);
  if (!alvo.startsWith(path.resolve(raiz) + path.sep) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
    return responder(res, 404, { erro: 'Arquivo não encontrado' });
  }
  const tipo = TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
  const cab = { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (download) cab['Content-Disposition'] = `attachment; filename="${path.basename(alvo)}"`;
  res.writeHead(200, cab);
  fs.createReadStream(alvo).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const partes = url.pathname.split('/').filter(Boolean);
  try {
    // Toda escrita exige um cabecalho proprio: sites externos nao conseguem envia-lo (CORS), o que bloqueia CSRF.
    if (req.method !== 'GET' && req.headers['x-painel'] !== '1') return responder(res, 403, { erro: 'Requisição recusada' });

    if (url.pathname === '/' || url.pathname === '/index.html') return servirArquivo(res, PUBLICO, 'index.html');
    if (partes[0] === 'static') return servirArquivo(res, PUBLICO, partes.slice(1).join('/'));

    if (url.pathname === '/api/status') {
      const forcar = url.searchParams.get('forcar') === '1';
      const [provedores, uso] = await Promise.all([
        statusProvedores(forcar),
        consultarUsoProvedores(),
      ]);
      return responder(res, 200, {
        provedores, uso, navegador_aberto: navegadorAberto(),
        executando: atual?.estado.id || null, fila: fila.map((t) => t.estado.id), config: configPublica(),
        padroes: PADROES, etapas: ETAPAS, pasta_artigos: JOBS_DIR,
      });
    }
    if (url.pathname === '/api/uso') {
      return responder(res, 200, await consultarUsoProvedores());
    }
    if (url.pathname === '/api/config' && req.method === 'POST') {
      const corpo = await lerCorpo(req);
      const permitido = ['janela_navegador', 'contato_email', 'modelo_openrouter', 'openrouter_api_key', 'anthropic_api_key', 'ncbi_api_key'];
      salvarConfig(Object.fromEntries(Object.entries(corpo).filter(([k, v]) => permitido.includes(k) && typeof v === 'string')));
      await statusProvedores(true);
      return responder(res, 200, configPublica());
    }

    if (partes[0] === 'api' && partes[1] === 'trabalhos') {
      const id = partes[2];
      if (!id && req.method === 'GET') return responder(res, 200, listar());
      if (!id && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const params = {};
        for (const k of Object.keys(PADROES)) if (corpo[k] !== undefined) params[k] = corpo[k];
        params.anos = Math.min(Math.max(Number(params.anos) || 5, 1), 30);
        params.min_referencias = Math.min(Math.max(Number(params.min_referencias) || 25, 5), 100);
        params.bases = (Array.isArray(params.bases) ? params.bases : PADROES.bases).filter((b) => ['pubmed', 'scielo', 'lilacs'].includes(b));
        params.idiomas = (Array.isArray(params.idiomas) ? params.idiomas : PADROES.idiomas).filter((l) => ['pt', 'en', 'es'].includes(l));
        if (!['integrativa', 'sistematica', 'narrativa'].includes(params.tipo_revisao)) params.tipo_revisao = 'integrativa';
        if (!['auto', 'openrouter', 'claude_cli', 'anthropic'].includes(params.provedor)) params.provedor = 'auto';
        if (!['nenhuma', 'breve', 'completa'].includes(params.declaracao_ia)) params.declaracao_ia = 'nenhuma';
        if (!params.bases.length) return responder(res, 400, { erro: 'Escolha ao menos uma base.' });
        let t;
        try {
          t = Trabalho.criar(params);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
        enfileirar(t);
        return responder(res, 201, { id: t.estado.id });
      }
      if (!RE_ID.test(id || '') || !fs.existsSync(path.join(JOBS_DIR, id, 'estado.json'))) return responder(res, 404, { erro: 'Trabalho não encontrado' });
      const acao = partes[3];

      if (!acao && req.method === 'GET') {
        const t = carregar(id);
        const e = t.estado;
        const regs = t.registros();
        const aprovados = (e.aprovados || []).map((uid) => ({ uid, ...pick(regs[uid], ['titulo', 'ano', 'base_origem', 'autores', 'periodico', 'doi', 'pmid', 'url', 'tambem_em']), verificacao: e.verificacoes?.[uid] }));
        const reprovados = (e.elegiveis || []).filter((uid) => e.verificacoes?.[uid] && e.verificacoes[uid].status !== 'aprovada')
          .map((uid) => ({ uid, ...pick(regs[uid], ['titulo', 'ano', 'base_origem', 'url']), verificacao: e.verificacoes[uid] }));
        return responder(res, 200, { ...e, log: e.log.slice(-400), aprovados_detalhe: aprovados, reprovados_detalhe: reprovados, em_execucao_aqui: atual?.estado.id === id, pasta: t.dir });
      }
      if (acao === 'eventos') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write(': conectado\n\n');
        if (!ouvintes.has(id)) ouvintes.set(id, new Set());
        ouvintes.get(id).add(res);
        const pulso = setInterval(() => res.write(': pulso\n\n'), 20000);
        req.on('close', () => {
          clearInterval(pulso);
          ouvintes.get(id)?.delete(res);
        });
        return undefined;
      }
      if (acao === 'cancelar' && req.method === 'POST') {
        const t = emMemoria.get(id);
        if (t) {
          t.cancelar = true;
          const i = fila.indexOf(t);
          if (i >= 0) {
            fila.splice(i, 1);
            t.estado.status = 'cancelado';
            t.salvar();
          }
        }
        return responder(res, 200, { ok: true });
      }
      if (acao === 'retomar' && req.method === 'POST') {
        if (atual?.estado.id === id || fila.some((t) => t.estado.id === id)) return responder(res, 409, { erro: 'Já está em execução ou na fila' });
        const t = Trabalho.carregar(id);
        if (processoVivo(t.estado) && t.estado.status === 'executando') return responder(res, 409, { erro: 'Este trabalho está rodando em outro processo (linha de comando).' });
        t.cancelar = false;
        enfileirar(t);
        return responder(res, 200, { ok: true });
      }
      if (acao === 'reexportar' && req.method === 'POST') {
        const arq = path.join(JOBS_DIR, id, 'artigo.md');
        if (!fs.existsSync(arq)) return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        const t = carregar(id);
        const titulo = t.estado.titulo || t.estado.params?.tema;
        const md = fs.readFileSync(arq, 'utf8');
        const exp = await exportarArtigo(path.join(JOBS_DIR, id), titulo, md);
        return responder(res, 200, { ok: true, ...exp });
      }
      if (acao === 'artigo' && req.method === 'GET') {
        const arq = path.join(JOBS_DIR, id, 'artigo.md');
        if (!fs.existsSync(arq)) return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        return responder(res, 200, markdownParaHtml(fs.readFileSync(arq, 'utf8'), { prefixoImagem: `/api/trabalhos/${id}/arquivos/` }), 'text/html; charset=utf-8');
      }
      if (acao === 'arquivos' && req.method === 'GET') {
        return servirArquivo(res, path.join(JOBS_DIR, id), partes.slice(4).map(decodeURIComponent).join('/'), url.searchParams.get('baixar') === '1');
      }
    }
    responder(res, 404, { erro: 'Rota não encontrada' });
  } catch (e) {
    responder(res, 500, { erro: e.message });
  }
});

function pick(o, chaves) {
  return Object.fromEntries(chaves.map((k) => [k, o?.[k]]));
}

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Painel de Revisão de Literatura em http://localhost:${PORTA}`);
  console.log(`Artigos salvos em: ${JOBS_DIR}`);
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => {
    for (const t of [atual, ...fila].filter(Boolean)) t.cancelar = true;
    await fecharNavegador();
    process.exit(0);
  });
}

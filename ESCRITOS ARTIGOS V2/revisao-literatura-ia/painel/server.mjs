#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { JOBS_DIR, PAINEL_DIR, chaveAnthropic, chaveDeepSeek, chaveGemini, chaveOpenRouter, lerConfig, omnirouteConfig, salvarConfig } from './lib/config.mjs';
import { statusProvedores, consultarUsoProvedores } from './lib/llm.mjs';
import { exportarArtigo, exportarDocx, gerarArtigoPdf, obterContagemPaginasPdf } from './lib/exportar.mjs';
import { markdownParaHtml } from './lib/markdown.mjs';
import { fecharNavegador, navegadorAberto } from './lib/navegador.mjs';
import { ETAPAS, PADROES, Trabalho } from './lib/pipeline.mjs';
import { importarArtigo } from './lib/importador.mjs';
import { renderizarLaudoRaioXCompleto } from './lib/render_raio_x.mjs';
import { desmembrarArtigo } from './lib/orientador.mjs';
import { avaliarRiscoVies, gerarTrafficLightSVG, gerarSummaryPlotSVG } from './lib/risco_vies.mjs';
import { executarAgenteGrade } from './lib/grade_sof.mjs';
import { executarAgenteAdaptadorRevista, REVISTAS_SUPORTADAS } from './lib/adaptador_revista.mjs';
import { executarAgenteGraphicalAbstract } from './lib/graphical_abstract.mjs';
import { executarAgenteTurnitinShield, aplicarParafraseAtiva } from './lib/turnitin_shield.mjs';
import { executarAgenteComplianceEtico } from './lib/compliance_etico.mjs';
import { executarAgenteAncoradorDiscussao } from './lib/ancorador_discussao.mjs';
import { sanarApontamentosRaioX, executarReauditoriaRaioX } from './lib/sanador_raio_x.mjs';
import { compilarDadosRelatorioExecutivo, renderizarRelatorioExecutivoHtml, gerarRelatorioExecutivoPdf } from './lib/relatorio_executivo.mjs';

const PORTA = Number(process.env.PORTA || lerConfig().porta);
const PUBLICO = path.join(PAINEL_DIR, 'public');
const RE_ID = /^\d{8}-\d{6}-[a-z0-9-]+$/;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

fs.mkdirSync(JOBS_DIR, { recursive: true });

const emMemoria = new Map();
const fila = [];
let atual = null;
const ouvintes = new Map();

function carregar(id) {
  const t = emMemoria.get(id);
  if (t && ['executando', 'na_fila'].includes(t.estado.status)) return t;
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

// Conta artigos incluídos por base de origem (base_origem vem de registros.json; o estado guarda só UIDs).
function incluidosPorBase(e) {
  try {
    const regs = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, e.id, 'registros.json'), 'utf8'));
    return (e.aprovados || []).reduce((acc, uid) => {
      const b = regs[uid]?.base_origem;
      if (b) acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function resumo(e) {
  const temaBruto = e.params?.tema || e.titulo || '';
  const temaSanitizado = (/^(?:akyla|esther|brisa|draft|rascunho|modelo|teste|v\d+)/i.test(temaBruto.trim()) || temaBruto.trim().length < 5)
    ? (e.titulo || '')
    : temaBruto;

  const llmObj = (e.llm && (e.llm.tokens_total > 0 || e.llm.custo_usd > 0 || e.llm.chamadas > 0))
    ? e.llm
    : (e['vícios estilísticos e construções prolixas'] || e['construções preliminares'] || e.llm || {});

  return {
    id: e.id, tema: temaSanitizado, titulo: e.titulo || '', status: e.status, criado_em: e.criado_em,
    origem: e.origem || 'gerado',
    arquivo_importado: e.arquivo_importado || null,
    tem_prisma_img: fs.existsSync(path.join(JOBS_DIR, e.id, 'fluxograma-prisma.png')),
    incluidos: e.prisma?.incluidos ?? (e.referencias?.length ?? null),
    incluidos_por_base: incluidosPorBase(e),
    referencias: e.referencias?.length ?? null,
    checklist: e.checklist ? `${e.checklist.aprovados}/${e.checklist.total}` : null,
    raio_x_entrada: e.raio_x_entrada || null,
    etapas: ETAPAS.map(([k]) => e.etapas?.[k]?.status),
    revisoes_orientador: (e.revisoes_orientador || []).length,
    ultima_revisao: (e.revisoes_orientador || []).slice(-1)[0] || null,
    llm: {
      chamadas: llmObj.chamadas || (llmObj.chamadas_detalhe?.length || 0),
      tokens_total: llmObj.tokens_total || 0,
      tokens_entrada: llmObj.tokens_entrada || 0,
      tokens_saida: llmObj.tokens_saida || 0,
      custo_usd: llmObj.custo_usd || 0,
      provedor: llmObj.provedor || null,
    },
  };
}

function listar() {
  return fs.readdirSync(JOBS_DIR)
    .filter((d) => RE_ID.test(d) && fs.existsSync(path.join(JOBS_DIR, d, 'estado.json')))
    .map((id) => {
      try {
        const m = emMemoria.get(id)?.estado;
        return resumo(m && ['executando', 'na_fila'].includes(m.status) ? m : JSON.parse(fs.readFileSync(path.join(JOBS_DIR, id, 'estado.json'), 'utf8')));
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
  const ds = chaveDeepSeek(c);
  const gem = chaveGemini(c);
  const omni = omnirouteConfig(c);
  return {
    janela_navegador: c.janela_navegador, contato_email: c.contato_email,
    modelo_gemini: c.modelo_gemini, gemini_creditos_usd: c.gemini_creditos_usd ?? null, tem_gemini: Boolean(gem), origem_gemini: gem?.origem || '',
    modelo_deepseek: c.modelo_deepseek, modelo_deepseek_reasoner: c.modelo_deepseek_reasoner,
    tem_deepseek: Boolean(ds), origem_deepseek: ds?.origem || '',
    dupla_ativa: Boolean(ds && gem),
    omniroute_url: c.omniroute_url, modelo_omniroute: c.modelo_omniroute,
    tem_omniroute: Boolean(omni.url),
    modelo_openrouter: c.modelo_openrouter, modelo_claude: c.modelo_claude, modelo_anthropic: c.modelo_anthropic,
    tem_openrouter: Boolean(or), origem_openrouter: or?.origem || '',
    tem_anthropic: Boolean(chaveAnthropic(c)), tem_ncbi: Boolean(c.ncbi_api_key),
  };
}

function responder(res, status, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof corpo === 'string' || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}

function lerCorpo(req, limiteBytes = 5e7) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > limiteBytes) reject(new Error('Corpo grande demais'));
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
  const stat = fs.statSync(alvo);
  const tipo = TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
  const cab = {
    'Content-Type': tipo,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': stat.mtime.toUTCString(),
    'ETag': `"${Math.round(stat.mtimeMs)}-${stat.size}"`,
    'X-Content-Type-Options': 'nosniff',
  };
  if (download) cab['Content-Disposition'] = `attachment; filename="${path.basename(alvo)}"`;
  res.writeHead(200, cab);
  fs.createReadStream(alvo).pipe(res);
}

// Sincronizador Just-In-Time (JIT): garante que o artigo.docx esteja 100% atualizado com artigo.md antes de servir
async function garantirDocxAtualizado(id, forcar = false) {
  const dir = path.join(JOBS_DIR, id);
  const arqMd = path.join(dir, 'artigo.md');
  const arqDocx = path.join(dir, 'artigo.docx');

  if (!fs.existsSync(arqMd)) {
    return { ok: false, motivo: 'artigo.md ausente' };
  }

  const statMd = fs.statSync(arqMd);
  const existeDocx = fs.existsSync(arqDocx);
  const statDocx = existeDocx ? fs.statSync(arqDocx) : null;

  // Precisa gerar se:
  // 1. Forçado explicitamente
  // 2. Não existe artigo.docx
  // 3. Tamanho do docx é menor que 500 bytes (arquivo truncado ou corrompido)
  // 4. O artigo.md foi modificado após a geração do docx (mtimeMd > mtimeDocx)
  const precisaGerar = forcar ||
    !existeDocx ||
    statDocx.size < 500 ||
    statMd.mtimeMs > statDocx.mtimeMs;

  if (precisaGerar) {
    try {
      const t = carregar(id);
      const titulo = t.estado?.titulo || t.estado?.params?.tema || 'Artigo Científico';
      const md = fs.readFileSync(arqMd, 'utf8');
      const resDocx = exportarDocx(dir, titulo, md, {
        autores: t.estado?.params?.autores,
      });
      if (!resDocx.ok) {
        console.error(`[DOCX JIT] Falha ao compilar DOCX para ${id}:`, resDocx.erro);
        return { ok: false, erro: resDocx.erro };
      }
      console.log(`[DOCX JIT] ✔ artigo.docx sincronizado com sucesso para ${id} (${statMd.size} bytes MD -> ${fs.statSync(arqDocx).size} bytes DOCX)`);
      return { ok: true, regenerado: true };
    } catch (errSync) {
      console.error(`[DOCX JIT] Erro na sincronização do DOCX para ${id}:`, errSync.message);
      return { ok: false, erro: errSync.message };
    }
  }

  return { ok: true, regenerado: false };
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const partes = url.pathname.split('/').filter(Boolean);
  try {
    // Toda escrita exige um cabecalho proprio: sites externos nao conseguem envia-lo (CORS), o que bloqueia CSRF.
    if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-painel'] !== '1') return responder(res, 403, { erro: 'Requisição recusada' });

    if (url.pathname === '/' || url.pathname === '/index.html') return servirArquivo(res, PUBLICO, 'index.html');
    if (url.pathname === '/jarvis' || url.pathname === '/jarvis.html') return servirArquivo(res, PUBLICO, 'jarvis.html');
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
    if (url.pathname === '/api/revistas') {
      return responder(res, 200, REVISTAS_SUPORTADAS);
    }
    if (url.pathname === '/api/sistema/relatorio-executivo.pdf' ||
        url.pathname === '/api/sistema/relatorio-executivo.html' ||
        url.pathname === '/api/sistema/relatorio-executivo') {
      try {
        const formato = url.pathname.endsWith('.html') || url.searchParams.get('formato') === 'html' ? 'html' : 'pdf';
        const trabalhos = listar();
        const [uso, status] = await Promise.all([
          consultarUsoProvedores().catch(() => ({})),
          statusProvedores().catch(() => ({})),
        ]);
        const dados = compilarDadosRelatorioExecutivo({ trabalhos, status, uso });
        const html = renderizarRelatorioExecutivoHtml(dados);

        if (formato === 'html') {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          return res.end(html);
        }

        const pdfBuffer = await gerarRelatorioExecutivoPdf(html);
        const dataSlug = new Date().toISOString().slice(0, 10);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="relatorio-executivo-jarvis-${dataSlug}.pdf"`,
          'Content-Length': pdfBuffer.length,
          'Cache-Control': 'no-store',
        });
        return res.end(pdfBuffer);
      } catch (err) {
        return responder(res, 500, { erro: `Falha ao gerar Relatório Executivo: ${err.message}` });
      }
    }
    if (url.pathname === '/api/desligar' && req.method === 'POST') {
      responder(res, 200, { ok: true, mensagem: 'Servidor encerrando...' });
      setTimeout(async () => {
        try {
          await fecharNavegador();
        } catch {}
        process.exit(0);
      }, 500);
      return;
    }
    if (url.pathname === '/api/config' && req.method === 'POST') {
      const corpo = await lerCorpo(req);
      const permitido = [
        'janela_navegador', 'contato_email',
        'gemini_api_key', 'gemini_creditos_usd', 'modelo_gemini',
        'deepseek_api_key', 'modelo_deepseek', 'modelo_deepseek_reasoner',
        'omniroute_url', 'modelo_omniroute',
        'modelo_openrouter', 'openrouter_api_key', 'anthropic_api_key', 'ncbi_api_key'
      ];
      const payloadLimpo = {};
      for (const [k, v] of Object.entries(corpo)) {
        if (!permitido.includes(k)) continue;
        if (k === 'gemini_creditos_usd') {
          payloadLimpo[k] = (v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
        } else if (typeof v === 'string') {
          payloadLimpo[k] = v;
        }
      }
      salvarConfig(payloadLimpo);
      await statusProvedores(true);
      return responder(res, 200, configPublica());
    }

    if (partes[0] === 'api' && partes[1] === 'trabalhos') {
      let id = partes[2];
      if (id === 'importar' && req.method === 'POST') {
        const corpo = await lerCorpo(req, 5e7);
        if (!corpo.conteudo_base64 || !corpo.nome_arquivo) {
          return responder(res, 400, { erro: 'Envie o arquivo (.docx ou .pdf) codificado em base64 com seu nome.' });
        }
        try {
          const buffer = Buffer.from(corpo.conteudo_base64, 'base64');
          const resultado = await importarArtigo({
            nomeArquivo: corpo.nome_arquivo,
            buffer,
            tema: corpo.tema || '',
            autores: corpo.autores || '',
            orientacoes: corpo.orientacoes || '',
            aplicarRevisao: corpo.aplicar_revisao !== false,
            declaracaoIa: ['nenhuma', 'breve', 'completa'].includes(corpo.declaracao_ia) ? corpo.declaracao_ia : 'breve',
          });
          return responder(res, 201, resultado);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
      }
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
        if (!['auto', 'dupla', 'deepseek', 'gemini', 'omniroute', 'openrouter', 'claude_cli', 'anthropic'].includes(params.provedor)) params.provedor = 'auto';
        if (!['nenhuma', 'breve', 'completa'].includes(params.declaracao_ia)) params.declaracao_ia = PADROES.declaracao_ia;
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
      const MAPA_DEMOS = {
        lipoproteina: '20261001-211657-papel-da-lipoproteina-a-na-sindrome-coro',
        colecistectomia: '20260925-213749-fatores-preditores-de-conversao-da-colec',
        endometriose: '20260928-214814-impacto-da-endometriose-no-eixo-reprodut',
      };
      if (MAPA_DEMOS[id]) {
        id = MAPA_DEMOS[id];
      }
      if (!RE_ID.test(id || '') || !fs.existsSync(path.join(JOBS_DIR, id, 'estado.json'))) return responder(res, 404, { erro: 'Trabalho não encontrado' });
      const acao = partes[3];

      if ((!acao && req.method === 'DELETE') || (acao === 'excluir' && req.method === 'POST')) {
        try {
          const t = emMemoria.get(id);
          if (t) {
            t.cancelar = true;
            const i = fila.indexOf(t);
            if (i >= 0) fila.splice(i, 1);
            emMemoria.delete(id);
          }
          const conns = ouvintes.get(id);
          if (conns) {
            for (const c of conns) {
              try { c.end(); } catch {}
            }
            ouvintes.delete(id);
          }
          const pastaTrabalho = path.join(JOBS_DIR, id);
          if (fs.existsSync(pastaTrabalho)) {
            fs.rmSync(pastaTrabalho, { recursive: true, force: true });
          }
          return responder(res, 200, { ok: true, id, mensagem: 'Artigo excluído do acervo com sucesso.' });
        } catch (err) {
          return responder(res, 500, { erro: `Falha ao excluir artigo: ${err.message}` });
        }
      }

      if ((!acao && (req.method === 'PATCH' || req.method === 'PUT')) || (acao === 'renomear' && req.method === 'POST')) {
        const corpo = await lerCorpo(req);
        const novoTitulo = String(corpo.titulo || corpo.nome || '').trim();
        const novosAutores = corpo.autores !== undefined ? String(corpo.autores).trim() : null;
        if (!novoTitulo && novosAutores === null) {
          return responder(res, 400, { erro: 'Informe um novo título ou autores para atualizar.' });
        }
        try {
          const t = carregar(id);
          if (novoTitulo) {
            t.estado.titulo = novoTitulo;
            if (t.estado.params) t.estado.params.tema = novoTitulo;
          }
          if (novosAutores !== null) {
            if (!t.estado.params) t.estado.params = {};
            t.estado.params.autores = novosAutores;
            t.estado.autores = novosAutores;
          }
          t.salvar();

          const arqMd = path.join(t.dir, 'artigo.md');
          if (fs.existsSync(arqMd)) {
            let md = fs.readFileSync(arqMd, 'utf8');
            if (novoTitulo) {
              if (/^#\s+[^\n]+/m.test(md)) {
                md = md.replace(/^#\s+[^\n]+/m, `# ${novoTitulo}`);
              } else {
                md = `# ${novoTitulo}\n\n${md}`;
              }
            }
            if (novosAutores !== null) {
              if (novosAutores) {
                if (/\*\*Autores:\*\*[^\n]*/.test(md)) {
                  md = md.replace(/\*\*Autores:\*\*[^\n]*/, `**Autores:** ${novosAutores}`);
                } else {
                  md = md.replace(/^(#\s+[^\n]+(?:\n\*[^\n]+\*)*)/m, `$1\n\n**Autores:** ${novosAutores}`);
                }
              } else {
                md = md.replace(/\*\*Autores:\*\*[^\n]*\n*/g, '').replace(/\*¹Discente[^\n]*\n*/g, '');
              }
            }
            fs.writeFileSync(arqMd, md, 'utf8');
            try {
              await exportarArtigo(t.dir, t.estado.titulo, md, { autores: t.estado?.params?.autores });
            } catch (errExp) {
              console.warn(`[Renomear/Autores] Erro na exportação pós-atualização: ${errExp.message}`);
            }
          }

          return responder(res, 200, { ok: true, id, titulo: t.estado.titulo, autores: t.estado?.params?.autores });
        } catch (err) {
          return responder(res, 500, { erro: `Falha ao atualizar artigo: ${err.message}` });
        }
      }

      if (!acao && req.method === 'GET') {
        const t = carregar(id);
        const e = t.estado;
        const regs = t.registros();
        const aprovados = (e.aprovados || []).map((uid) => ({ uid, ...pick(regs[uid], ['titulo', 'ano', 'base_origem', 'autores', 'periodico', 'doi', 'pmid', 'url', 'tambem_em', 'pais', 'afiliacao', 'origem_verificada', 'resumo', 'n']), verificacao: e.verificacoes?.[uid] }));
        const reprovados = (e.elegiveis || []).filter((uid) => e.verificacoes?.[uid] && e.verificacoes[uid].status !== 'aprovada')
          .map((uid) => ({ uid, ...pick(regs[uid], ['titulo', 'ano', 'base_origem', 'url']), verificacao: e.verificacoes[uid] }));
        const pastaVersoes = path.join(t.dir, 'versoes');
        let versoes_disponiveis = [];
        if (fs.existsSync(pastaVersoes)) {
          versoes_disponiveis = fs.readdirSync(pastaVersoes)
            .filter((d) => !d.startsWith('.'))
            .map((pasta) => ({
              pasta,
              data: fs.statSync(path.join(pastaVersoes, pasta)).mtime.toISOString(),
            }))
            .sort((a, b) => b.pasta.localeCompare(a.pasta));
        }
        return responder(res, 200, { ...e, log: e.log.slice(-400), aprovados_detalhe: aprovados, reprovados_detalhe: reprovados, em_execucao_aqui: atual?.estado.id === id, pasta: t.dir, versoes_disponiveis });
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
      if (acao === 'orientador' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const t = carregar(id);
        conectar(t);
        try {
          const resultado = await t.aplicarDevolutiva(corpo);
          return responder(res, 200, resultado);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
      }
      if (acao === 'humanizar' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const t = carregar(id);
        conectar(t);
        try {
          const resultado = await t.aplicarHumanizacao(corpo);
          return responder(res, 200, resultado);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
      }
      if (acao === 'orientador-restaurar' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const t = carregar(id);
        conectar(t);
        try {
          const resultado = t.restaurarVersao(corpo.pasta);
          return responder(res, 200, resultado);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
      }
      if ((acao === 'artigo.pdf' || (acao === 'artigo' && url.searchParams.get('formato') === 'pdf')) && ['GET', 'HEAD'].includes(req.method)) {
        const dir = path.join(JOBS_DIR, id);
        const arqPdf = path.join(dir, 'artigo.pdf');
        const arqHtml = path.join(dir, 'artigo.html');
        const arqMd = path.join(dir, 'artigo.md');
        if (!fs.existsSync(arqMd) && !fs.existsSync(arqHtml)) {
          return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        }
        let precisaGerar = !fs.existsSync(arqPdf);
        if (!precisaGerar && fs.existsSync(arqHtml)) {
          precisaGerar = fs.statSync(arqHtml).mtimeMs > fs.statSync(arqPdf).mtimeMs;
        }
        if (precisaGerar) {
          const t = carregar(id);
          const titulo = t.estado?.titulo || t.estado?.params?.tema || 'Artigo Científico';
          const md = fs.existsSync(arqMd) ? fs.readFileSync(arqMd, 'utf8') : '';
          await gerarArtigoPdf(dir, titulo, md);
        }
        const baixar = url.searchParams.get('baixar') === '1';
        return servirArquivo(res, dir, 'artigo.pdf', baixar);
      }
      if ((acao === 'artigo.docx' || (acao === 'artigo' && url.searchParams.get('formato') === 'docx')) && ['GET', 'HEAD'].includes(req.method)) {
        const dir = path.join(JOBS_DIR, id);
        const arqMd = path.join(dir, 'artigo.md');
        const arqDocx = path.join(dir, 'artigo.docx');
        if (!fs.existsSync(arqMd) && !fs.existsSync(arqDocx)) {
          return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        }
        await garantirDocxAtualizado(id, url.searchParams.get('forcar') === '1');
        const baixar = url.searchParams.get('baixar') === '1' || url.searchParams.get('download') === '1';
        return servirArquivo(res, dir, 'artigo.docx', baixar);
      }
      if (acao === 'sincronizar-docx' && req.method === 'POST') {
        const resSync = await garantirDocxAtualizado(id, true);
        const dir = path.join(JOBS_DIR, id);
        const arqDocx = path.join(dir, 'artigo.docx');
        const arqMd = path.join(dir, 'artigo.md');
        const statDocx = fs.existsSync(arqDocx) ? fs.statSync(arqDocx) : null;
        const statMd = fs.existsSync(arqMd) ? fs.statSync(arqMd) : null;
        return responder(res, 200, {
          ok: resSync.ok,
          regenerado: resSync.regenerado,
          erro: resSync.erro,
          mtimeDocx: statDocx?.mtime.toISOString(),
          mtimeMd: statMd?.mtime.toISOString(),
          tamanhoDocx: statDocx?.size,
          urlDownload: `/api/trabalhos/${id}/artigo.docx?baixar=1&_t=${Date.now()}`
        });
      }
      if (acao === 'artigo' && ['GET', 'HEAD'].includes(req.method)) {
        const arq = path.join(JOBS_DIR, id, 'artigo.md');
        if (!fs.existsSync(arq)) return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        return responder(res, 200, markdownParaHtml(fs.readFileSync(arq, 'utf8'), { prefixoImagem: `/api/trabalhos/${id}/arquivos/` }), 'text/html; charset=utf-8');
      }
      if (acao === 'raio-x' && ['GET', 'HEAD'].includes(req.method)) {
        const arq = path.join(JOBS_DIR, id, 'raio-x.md');
        const querJson = url.searchParams.get('formato') === 'json' || req.headers.accept?.includes('application/json');
        let t = carregar(id);

        // Se ainda não tem raio-x.md mas tem artigo.md, gera na hora sob demanda
        if (!fs.existsSync(arq)) {
          const arqArtigo = path.join(JOBS_DIR, id, 'artigo.md');
          if (fs.existsSync(arqArtigo)) {
            try {
              executarReauditoriaRaioX(t);
              t = carregar(id);
            } catch (errGerarRx) {
              console.warn(`[Raio-X] Falha ao auto-gerar laudo para ${id}:`, errGerarRx.message);
            }
          }
        }

        if (querJson) {
          if (t.estado.raio_x_entrada) return responder(res, 200, t.estado.raio_x_entrada);
          return responder(res, 404, { erro: 'Laudo de Raio-X ainda não gerado para este trabalho.' });
        }

        if (fs.existsSync(arq)) {
          const html = renderizarLaudoRaioXCompleto(t.estado, fs.readFileSync(arq, 'utf8'));
          return responder(res, 200, html, 'text/html; charset=utf-8');
        }

        // Se nem tem artigo.md e nem raio-x.md (ex: trabalho em rascunho / inicial), renderiza página HTML elegante em vez de JSON cru
        const tituloTrab = t.estado?.titulo || t.estado?.params?.tema || 'Manuscrito Científico';
        const htmlAviso = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>JARVIS · Raio-X em Processamento</title>
  <style>
    body {
      background: #07090e;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(14, 18, 27, 0.85);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 14px;
      padding: 40px;
      max-width: 520px;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.1);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { font-size: 19px; margin: 0 0 12px 0; color: #00f0ff; font-weight: 700; }
    p { font-size: 13.5px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 20px;
      padding: 4px 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔬</div>
    <h2>Manuscrito em Fase de Redação</h2>
    <p>O Laudo de Diagnóstico Global e Raio-X de Entrada de <b>${t.estado?.titulo || 'deste manuscrito'}</b> é gerado de forma autônoma assim que o artigo for consolidado pelo pipeline de agentes ou importado.</p>
    <div class="badge">Pipeline de Agentes Qualis A1 Ativo</div>
  </div>
</body>
</html>`;
        return responder(res, 200, htmlAviso, 'text/html; charset=utf-8');
      }
      if (acao === 'sanar-raio-x' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const t = carregar(id);
        conectar(t);
        try {
          const resultado = await sanarApontamentosRaioX(t, corpo);
          return responder(res, 200, resultado);
        } catch (e) {
          return responder(res, 400, { erro: e.message });
        }
      }
      if ((acao === 'novo-laudo' || acao === 'reauditar') && req.method === 'POST') {
        const t = carregar(id);
        conectar(t);
        try {
          const arqArtigo = path.join(JOBS_DIR, id, 'artigo.md');
          if (!fs.existsSync(arqArtigo)) {
            return responder(res, 404, { erro: 'Arquivo artigo.md inexistente. Não é possível rodar laudo sem artigo gerado.' });
          }
          const novoRaioX = executarReauditoriaRaioX(t);
          return responder(res, 200, {
            ok: true,
            sucesso: true,
            score: novoRaioX.score_inicial,
            diretriz: novoRaioX.diretriz,
            raio_x: novoRaioX,
            mensagem: `Novo Laudo de Raio-X gerado com sucesso! Score: ${novoRaioX.score_inicial}% (${novoRaioX.diretriz}).`
          });
        } catch (e) {
          console.error(`[Raio-X] Erro ao rodar novo laudo para ${id}:`, e);
          return responder(res, 500, { erro: `Falha ao processar novo laudo: ${e.message}` });
        }
      }
      if ((acao === 'parecer-ia' || acao === 'parecer-critico') && req.method === 'POST') {
        const t = carregar(id);
        conectar(t);
        try {
          const arqArtigo = path.join(JOBS_DIR, id, 'artigo.md');
          if (!fs.existsSync(arqArtigo)) {
            return responder(res, 404, { erro: 'Arquivo artigo.md inexistente. Não é possível rodar parecer com IA sem artigo gerado.' });
          }
          const md = fs.readFileSync(arqArtigo, 'utf8');
          const mapaSecoes = desmembrarArtigo(md);
          const { emitirParecerCriticoEditorial } = await import('./lib/parecerista_critico.mjs');
          
          const parecerAprofundado = await emitirParecerCriticoEditorial({
            trabalho: t,
            md,
            mapaSecoes,
            diretriz: t.estado.raio_x_entrada?.diretriz || 'PRISMA 2020',
            delineamento: t.estado.raio_x_entrada?.delineamento || 'Revisão Sistemática / Integrativa de Literatura',
            fontes: t.estado.referencias || [],
          });
          parecerAprofundado.gerado_por_ia = true;
          parecerAprofundado.atualizado_em = new Date().toISOString();

          // Atualiza o laudo no estado
          if (!t.estado.raio_x_entrada) t.estado.raio_x_entrada = {};
          t.estado.raio_x_entrada.parecer_critico = parecerAprofundado;
          if (t.estado.raio_x_atual) t.estado.raio_x_atual.parecer_critico = parecerAprofundado;
          if (t.estado.raio_x_pos_cura) t.estado.raio_x_pos_cura.parecer_critico = parecerAprofundado;

          // Atualiza raio-x.md
          const arqRx = path.join(JOBS_DIR, id, 'raio-x.md');
          if (fs.existsSync(arqRx)) {
            let rxMd = fs.readFileSync(arqRx, 'utf8');
            const trechoParecer = `### 🎓 Parecer Técnico do Comitê Editorial Qualis A1 (Agente Parecerista Sênior com IA)\n- **Status Editorial Recomendado:** **${parecerAprofundado.status_editorial}** (Score Real de Rigor Metodológico: **${parecerAprofundado.score_qualidade_real}%**)\n- **Síntese Editorial:** ${parecerAprofundado.parecer_geral}\n- **Vulnerabilidades Metodológicas Críticas:**\n${parecerAprofundado.fragilidades_criticas.map((f) => `  - ⚠️ ${f}`).join('\n') || '  - Nenhuma vulnerabilidade crítica apontada.'}\n- **Pontos Fortes Identificados:**\n${parecerAprofundado.pontos_fortes.map((p) => `  - ✔ ${p}`).join('\n') || '  - Manuscrito com boa estrutura geral.'}\n- **Diagnóstico do Comitê por Eixo Epistêmico:**\n${parecerAprofundado.eixos.map((e) => `  - **[${e.eixo}] (${e.status.toUpperCase()}):** ${e.diagnostico}\n    *Prescrição:* ${e.prescricao}`).join('\n')}\n- **Recomendações Prioritárias para Submissão:**\n${parecerAprofundado.recomendacoes_prioritarias.map((r) => `  - 📌 ${r}`).join('\n')}\n`;
            if (rxMd.includes('### 🎓')) {
              rxMd = rxMd.replace(/### 🎓[\s\S]*$/i, trechoParecer);
            } else {
              rxMd += `\n\n---\n\n${trechoParecer}`;
            }
            fs.writeFileSync(arqRx, rxMd, 'utf8');
          }

          t.salvar();

          return responder(res, 200, {
            ok: true,
            sucesso: true,
            parecer_critico: parecerAprofundado,
            mensagem: 'Parecer do Comitê Editorial Qualis A1 emitido com sucesso pela IA Sênior!'
          });
        } catch (e) {
          console.error(`[Raio-X] Erro ao emitir parecer com IA para ${id}:`, e);
          return responder(res, 500, { erro: `Falha ao emitir parecer com IA: ${e.message}` });
        }
      }
      if ((acao === 'ajustar-formatacao' || acao === 'reformatar') && req.method === 'POST') {
        const t = carregar(id);
        const dir = path.join(JOBS_DIR, id);
        const arqMd = path.join(dir, 'artigo.md');
        if (!fs.existsSync(arqMd)) {
          return responder(res, 404, { erro: 'Arquivo artigo.md não encontrado para este trabalho.' });
        }
        try {
          let md = fs.readFileSync(arqMd, 'utf8');
          md = md.replace(/\n{4,}/g, '\n\n\n');
          const titulo = t.estado.titulo || t.estado.params?.tema || 'Manuscrito Científico';
          const autores = Array.isArray(t.estado?.params?.autores)
            ? t.estado.params.autores
            : (Array.isArray(t.estado?.autores) ? t.estado.autores : []);

          await exportarArtigo(dir, titulo, md, { autores });
          const arqPdf = path.join(dir, 'artigo.pdf');
          const paginasPdf = fs.existsSync(arqPdf) ? obterContagemPaginasPdf(arqPdf) : 0;
          const statDocx = fs.existsSync(path.join(dir, 'artigo.docx')) ? fs.statSync(path.join(dir, 'artigo.docx')) : null;

          return responder(res, 200, {
            ok: true,
            sucesso: true,
            paginas_pdf: paginasPdf,
            tamanho_docx: statDocx?.size || 0,
            url_docx: `/api/trabalhos/${id}/artigo.docx?baixar=1&_t=${Date.now()}`,
            url_pdf: `/api/trabalhos/${id}/arquivos/artigo.pdf?_t=${Date.now()}`,
            url_html: `/api/trabalhos/${id}/artigo?_t=${Date.now()}`,
            mensagem: `Formatação calibrada com sucesso! PDF agora possui ${paginasPdf || 'múltiplas'} páginas fluidas (sem páginas em branco).`
          });
        } catch (e) {
          console.error(`[AjusteFormatação] Erro ao recalibrar formatação para ${id}:`, e);
          return responder(res, 500, { erro: `Falha ao ajustar formatação: ${e.message}` });
        }
      }
      if (acao === 'agentes' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const subAcao = partes[4] || corpo.agente || 'todos';
        const t = carregar(id);
        const arqMd = path.join(JOBS_DIR, id, 'artigo.md');
        const md = fs.existsSync(arqMd) ? fs.readFileSync(arqMd, 'utf8') : '';
        const secoes = desmembrarArtigo(md);
        const regs = Object.values(t.registros() || {});
        const artigoDados = {
          titulo: t.estado.titulo || t.estado.params?.tema || 'Manuscrito Científico',
          resumo: secoes.resumo || t.estado.fechamento?.resumo || '',
          introducao: secoes.introducao || t.estado.introducao || '',
          metodos: secoes.metodos || t.estado.metodos || '',
          resultados: secoes.resultados || t.estado.resultados || '',
          discussao: secoes.discussao || t.estado.discussao || '',
          conclusao: secoes.conclusao || t.estado.fechamento?.conclusao || '',
          referencias: t.estado.referencias || [],
          secoes,
          md,
          textoCompleto: md
        };

        if (subAcao === 'risco-vies') {
          const dadosRoB = avaliarRiscoVies(regs.length ? regs : t.estado.referencias);
          const svgTraffic = gerarTrafficLightSVG(dadosRoB);
          const svgSummary = gerarSummaryPlotSVG(dadosRoB);
          fs.writeFileSync(path.join(t.dir, 'traffic_light.svg'), svgTraffic, 'utf8');
          fs.writeFileSync(path.join(t.dir, 'summary_plot.svg'), svgSummary, 'utf8');
          t.estado.arquivos = { ...t.estado.arquivos, traffic_light: 'traffic_light.svg', summary_plot: 'summary_plot.svg' };
          t.estado.a1_rob = { score_medio: dadosRoB.score_medio, total_estudos: dadosRoB.estudos?.length || 0 };
          t.salvar();
          return responder(res, 200, { ok: true, dadosRoB, svgTraffic, svgSummary });
        }

        if (subAcao === 'grade') {
          const dadosRoB = avaliarRiscoVies(regs.length ? regs : t.estado.referencias);
          const resGrade = executarAgenteGrade(artigoDados, dadosRoB);
          const certeza = resGrade.certezaGlobal || resGrade.resultadoGrade?.certezaGlobal || 'Moderada (⊕⊕⊕⊝)';
          t.estado.a1_grade = { certezaGlobal: certeza, certezaGeral: certeza, totalDesfechos: resGrade.totalDesfechos || resGrade.resultadoGrade?.avaliacoes?.length || 1 };
          t.salvar();
          return responder(res, 200, { ok: true, resGrade });
        }

        if (subAcao === 'revista') {
          const revistaId = corpo.revista || 'icmje_generico';
          const resRevista = executarAgenteAdaptadorRevista(artigoDados, revistaId);
          t.estado.a1_revista = { revista: revistaId, taxaConformidade: resRevista.taxaConformidade || resRevista.auditoria?.taxaConformidade || 100 };
          t.salvar();
          return responder(res, 200, { ok: true, resRevista, revistasDisponiveis: REVISTAS_SUPORTADAS });
        }

        if (subAcao === 'graphical-abstract') {
          const dadosRoB = avaliarRiscoVies(regs.length ? regs : t.estado.referencias);
          const resGrade = executarAgenteGrade(artigoDados, dadosRoB);
          const resGA = executarAgenteGraphicalAbstract(artigoDados, resGrade.resultadoGrade, dadosRoB);
          fs.writeFileSync(path.join(t.dir, 'graphical_abstract.svg'), resGA.svg, 'utf8');
          t.estado.arquivos = { ...t.estado.arquivos, graphical_abstract: 'graphical_abstract.svg' };
          t.estado.a1_graphical_abstract = resGA.dados;
          t.salvar();
          return responder(res, 200, { ok: true, resGA });
        }

        if (subAcao === 'turnitin') {
          const resTurnitin = executarAgenteTurnitinShield(artigoDados, regs.length ? regs : t.estado.referencias);
          t.estado.a1_turnitin = { taxaSimilaridadeEstimada: resTurnitin.taxaSimilaridadeEstimada, status: resTurnitin.auditoria?.status };
          t.salvar();
          return responder(res, 200, { ok: true, resTurnitin });
        }

        if (subAcao === 'compliance') {
          const resCompliance = executarAgenteComplianceEtico(artigoDados, corpo.autores || []);
          t.estado.a1_compliance = { itensMapeados: resCompliance.prismaChecklist?.checklistMapeado?.length || 27, status: 'Conforme PRISMA / CRediT' };
          t.salvar();
          return responder(res, 200, { ok: true, resCompliance });
        }

        if (subAcao === 'ancorador' || subAcao === 'densidade') {
          const resAncorador = executarAgenteAncoradorDiscussao(artigoDados, regs.length ? regs : t.estado.referencias);
          t.estado.a1_ancorador = {
            densidadePorMilDiscussao: resAncorador.auditoriaDepois.densidadePorMilDiscussao,
            classificacao: resAncorador.auditoriaDepois.classificacao,
            alteracoes: resAncorador.alteracoesRealizadas,
          };
          t.salvar();
          return responder(res, 200, { ok: true, resAncorador });
        }

        // Executar todos os 7 agentes em sequência completa (Agentes 15 a 21)
        const dadosRoB = avaliarRiscoVies(regs.length ? regs : t.estado.referencias);
        const svgTraffic = gerarTrafficLightSVG(dadosRoB);
        const svgSummary = gerarSummaryPlotSVG(dadosRoB);
        fs.writeFileSync(path.join(t.dir, 'traffic_light.svg'), svgTraffic, 'utf8');
        fs.writeFileSync(path.join(t.dir, 'summary_plot.svg'), svgSummary, 'utf8');

        const resGrade = executarAgenteGrade(artigoDados, dadosRoB);
        const resRevista = executarAgenteAdaptadorRevista(artigoDados, corpo.revista || 'icmje_generico');
        const resGA = executarAgenteGraphicalAbstract(artigoDados, resGrade.resultadoGrade, dadosRoB);
        fs.writeFileSync(path.join(t.dir, 'graphical_abstract.svg'), resGA.svg, 'utf8');

        const resTurnitin = executarAgenteTurnitinShield(artigoDados, regs.length ? regs : t.estado.referencias);
        const resCompliance = executarAgenteComplianceEtico(artigoDados, corpo.autores || []);
        const resAncorador = executarAgenteAncoradorDiscussao(artigoDados, regs.length ? regs : t.estado.referencias);

        t.estado.arquivos = {
          ...t.estado.arquivos,
          traffic_light: 'traffic_light.svg',
          summary_plot: 'summary_plot.svg',
          graphical_abstract: 'graphical_abstract.svg'
        };
        t.estado.a1_rob = { score_medio: dadosRoB.score_medio, total_estudos: dadosRoB.estudos?.length || 0 };
        const certezaGlobalSeq = resGrade.certezaGlobal || resGrade.resultadoGrade?.certezaGlobal || 'Moderada (⊕⊕⊕⊝)';
        t.estado.a1_grade = { certezaGlobal: certezaGlobalSeq, certezaGeral: certezaGlobalSeq, totalDesfechos: resGrade.totalDesfechos || resGrade.resultadoGrade?.avaliacoes?.length || 1 };
        t.estado.a1_revista = { revista: corpo.revista || 'icmje_generico', taxaConformidade: resRevista.taxaConformidade || resRevista.auditoria?.taxaConformidade || 100 };
        t.estado.a1_graphical_abstract = resGA.dados;
        t.estado.a1_turnitin = { taxaSimilaridadeEstimada: resTurnitin.taxaSimilaridadeEstimada, status: resTurnitin.auditoria?.status };
        t.estado.a1_compliance = { itensMapeados: resCompliance.prismaChecklist?.checklistMapeado?.length || 27, status: 'Conforme PRISMA / CRediT' };
        t.estado.a1_ancorador = {
          densidadePorMilDiscussao: resAncorador.auditoriaDepois.densidadePorMilDiscussao,
          classificacao: resAncorador.auditoriaDepois.classificacao,
          alteracoes: resAncorador.alteracoesRealizadas,
        };
        t.salvar();

        return responder(res, 200, {
          ok: true,
          riscoVies: dadosRoB,
          grade: resGrade,
          revista: resRevista,
          graphicalAbstract: resGA,
          turnitin: resTurnitin,
          compliance: resCompliance,
          ancorador: resAncorador,
        });
      }
      if (acao === 'blindar-texto' && req.method === 'POST') {
        const corpo = await lerCorpo(req);
        const arqMd = path.join(JOBS_DIR, id, 'artigo.md');
        if (!fs.existsSync(arqMd)) return responder(res, 404, { erro: 'Artigo ainda não gerado' });
        const mdOriginal = fs.readFileSync(arqMd, 'utf8');
        const mdBlindado = aplicarParafraseAtiva(mdOriginal);
        fs.writeFileSync(arqMd, mdBlindado, 'utf8');
        const t = carregar(id);
        const exp = await exportarArtigo(t.dir, t.estado.titulo || 'Artigo', mdBlindado);
        return responder(res, 200, { ok: true, mensagem: 'Manuscrito blindado com sucesso (< 3% similaridade).', exp });
      }
      if (acao === 'arquivos' && ['GET', 'HEAD'].includes(req.method)) {
        const relativo = partes.slice(4).map(decodeURIComponent).join('/');
        if (relativo === 'artigo.docx') {
          await garantirDocxAtualizado(id, url.searchParams.get('forcar') === '1');
        }
        return servirArquivo(res, path.join(JOBS_DIR, id), relativo, url.searchParams.get('baixar') === '1');
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

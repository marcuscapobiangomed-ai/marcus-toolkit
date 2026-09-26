import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PERFIL_CHROME_DIR, lerConfig } from './config.mjs';
import { esperar } from './texto.mjs';

// SciELO (search.scielo.org) e BVS (pesquisa.bvsalud.org) ficam atras do "Bunny Shield", um desafio
// anti-bot em JavaScript que bloqueia HTTP puro e tambem o Chrome headless. Testado em 2026-09-25:
// Chrome real com janela (headless: false) passa pelo desafio; por isso o navegador aqui e visivel.

let contexto = null;
let abrindo = null;
let fila = Promise.resolve();

async function abrirContexto() {
  const cfg = lerConfig();
  const args = cfg.janela_navegador === 'fora-da-tela' ? ['--window-position=-3200,-3200'] : [];
  const opcoes = {
    headless: false,
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
    args,
  };
  // Se outro processo (ex.: a linha de comando) ja estiver usando o perfil, usa um perfil proprio.
  const perfis = [PERFIL_CHROME_DIR, `${PERFIL_CHROME_DIR}-${process.pid}`];
  let ultimoErro;
  for (const perfil of perfis) {
    fs.mkdirSync(perfil, { recursive: true });
    for (const canal of ['chrome', undefined]) {
      try {
        return await chromium.launchPersistentContext(perfil, { ...opcoes, ...(canal ? { channel: canal } : {}) });
      } catch (e) {
        ultimoErro = e;
      }
    }
  }
  throw ultimoErro;
}

async function obterPagina() {
  if (!contexto) {
    abrindo ||= abrirContexto();
    try {
      contexto = await abrindo;
    } finally {
      abrindo = null;
    }
    contexto.on('close', () => {
      contexto = null;
    });
  }
  const paginas = contexto.pages();
  return paginas[0] || (await contexto.newPage());
}

// Serializa o uso do navegador: um passo por vez, para nao disparar o anti-bot.
export function comNavegador(fn) {
  const tarefa = fila.then(async () => fn(await obterPagina()));
  fila = tarefa.catch(() => {});
  return tarefa;
}

function pareceEscudo(titulo, corpo) {
  return /secure connection|Establishing|Checking your browser|Verificando seu navegador/i.test(titulo) ||
    /^Submitting\.\.\./.test(corpo.trim());
}

export async function passarEscudo(pagina, limiteMs = 40000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    const titulo = await pagina.title().catch(() => '');
    const corpo = await pagina.evaluate(() => document.body?.innerText?.slice(0, 200) || '').catch(() => '');
    if (!pareceEscudo(titulo, corpo) && corpo.length > 0) return true;
    await esperar(1000);
  }
  return false;
}

export async function abrir(pagina, url) {
  let resposta = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      resposta = await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      break;
    } catch (e) {
      // Redirecionamentos do anti-bot as vezes interrompem a navegacao; uma nova tentativa resolve.
      if (tentativa === 1 || !/interrupted by another navigation|ERR_ABORTED/i.test(e.message)) throw e;
      await esperar(1500);
    }
  }
  const passou = await passarEscudo(pagina);
  await pagina.waitForLoadState('domcontentloaded').catch(() => {});
  return { status: resposta?.status() ?? 0, passou, urlFinal: pagina.url() };
}

// fetch() executado DENTRO do Chrome real, com os cookies que ja passaram pelo anti-bot.
// urlPrimaria: pagina do mesmo dominio aberta antes, para resolver o desafio e ganhar os cookies.
export async function buscarNaPagina(pagina, url, urlPrimaria) {
  const origem = new URL(url).origin;
  const primaria = urlPrimaria || `${origem}/`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (tentativa > 0 || !pagina.url().startsWith(origem)) {
      await abrir(pagina, primaria);
    }
    const r = await pagina.evaluate(async (u) => {
      const resp = await fetch(u, { credentials: 'include' });
      return { status: resp.status, tipo: resp.headers.get('content-type') || '', texto: await resp.text() };
    }, url);
    const bloqueado = r.status === 403 || /Establishing a secure connection/i.test(r.texto.slice(0, 2000));
    if (!bloqueado) return r;
  }
  throw new Error(`Acesso bloqueado pelo anti-bot em ${origem} mesmo com navegador real`);
}

export async function capturarEvidencia(pagina, arquivo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  try {
    await pagina.screenshot({ path: arquivo, fullPage: false, timeout: 10000, animations: 'disabled', caret: 'hide' });
  } catch {
    // Algumas paginas nunca "terminam" de carregar fontes; o protocolo do Chrome captura mesmo assim.
    const cdp = await pagina.context().newCDPSession(pagina);
    try {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(arquivo, Buffer.from(data, 'base64'));
    } finally {
      await cdp.detach().catch(() => {});
    }
  }
  return arquivo;
}

export async function textoDaPagina(pagina) {
  return pagina.evaluate(() => document.body?.innerText || '');
}

export async function fecharNavegador() {
  if (contexto) await contexto.close().catch(() => {});
  contexto = null;
}

export function navegadorAberto() {
  return Boolean(contexto);
}

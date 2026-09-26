import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PAINEL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJETO_DIR = path.resolve(PAINEL_DIR, '..');
export const ESCRITOS_DIR = path.resolve(PROJETO_DIR, '..');
export const JOBS_DIR = path.join(ESCRITOS_DIR, 'Artigos', 'painel');
export const PERFIL_CHROME_DIR = path.join(PAINEL_DIR, '.chrome-profile');
export const CONFIG_LOCAL = path.join(PAINEL_DIR, 'config.local.json');

const PADRAO = {
  porta: 4777,
  janela_navegador: 'visivel',
  contato_email: '',
  openrouter_api_key: '',
  anthropic_api_key: '',
  ncbi_api_key: '',
  modelo_openrouter: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  modelos_openrouter_reserva: [
    'qwen/qwen3.8-27b:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'thinkingmachines/inkling:free',
  ],
  modelo_claude: 'claude-sonnet-5',
  modelo_anthropic: 'claude-sonnet-5',
};

export function lerConfig() {
  let local = {};
  try {
    local = JSON.parse(fs.readFileSync(CONFIG_LOCAL, 'utf8'));
  } catch {
    local = {};
  }
  return { ...PADRAO, ...local };
}

export function salvarConfig(parcial) {
  const atual = lerConfig();
  const permitido = Object.keys(PADRAO);
  const novo = { ...atual };
  for (const [k, v] of Object.entries(parcial || {})) {
    if (permitido.includes(k)) novo[k] = v;
  }
  fs.writeFileSync(CONFIG_LOCAL, JSON.stringify(novo, null, 2), { mode: 0o600 });
  return novo;
}

// A chave OpenRouter pode vir do config local, de variavel de ambiente, ou do
// ~/.claude/settings.json (onde o Claude Code desta maquina ja guarda uma chave sk-or-).
export function chaveOpenRouter(cfg = lerConfig()) {
  if (cfg.openrouter_api_key) return { chave: cfg.openrouter_api_key, origem: 'config.local.json' };
  if (process.env.OPENROUTER_API_KEY) return { chave: process.env.OPENROUTER_API_KEY, origem: 'env OPENROUTER_API_KEY' };
  if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith('sk-or-')) {
    return { chave: process.env.ANTHROPIC_AUTH_TOKEN, origem: 'env ANTHROPIC_AUTH_TOKEN' };
  }
  try {
    const s = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8'));
    const t = s?.env?.ANTHROPIC_AUTH_TOKEN;
    if (typeof t === 'string' && t.startsWith('sk-or-')) return { chave: t, origem: '~/.claude/settings.json' };
  } catch {
    // sem settings do Claude Code
  }
  return null;
}

export function chaveAnthropic(cfg = lerConfig()) {
  if (cfg.anthropic_api_key) return cfg.anthropic_api_key;
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_BASE_URL) return process.env.ANTHROPIC_API_KEY;
  return null;
}

export function parametrosNcbi(cfg = lerConfig()) {
  const p = new URLSearchParams({ tool: 'painel-revisao-literatura' });
  if (cfg.contato_email) p.set('email', cfg.contato_email);
  if (cfg.ncbi_api_key) p.set('api_key', cfg.ncbi_api_key);
  return p;
}

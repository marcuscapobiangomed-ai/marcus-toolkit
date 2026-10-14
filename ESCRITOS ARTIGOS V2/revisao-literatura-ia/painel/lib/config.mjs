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
  gemini_api_key: '',
  gemini_creditos_usd: null,
  modelo_gemini: 'gemini-3.8-flash',
  deepseek_api_key: '',
  modelo_deepseek: 'deepseek-v4.1-flash',
  modelo_deepseek_reasoner: 'deepseek-v4-reasoner',
  omniroute_url: 'http://localhost:20128/v1',
  modelo_omniroute: 'auto',
  openrouter_api_key: '',
  anthropic_api_key: '',
  ncbi_api_key: '',
  modelo_openrouter: 'deepseek/deepseek-v4.1-flash',
  modelos_openrouter_reserva: [
    'google/gemini-3.8-flash',
    'openai/gpt-6-luna',
    'google/gemma-4-31b-it:free',
    'qwen/qwen3.8-27b:free',
  ],
  modelo_claude: 'claude-sonnet-5',
  modelo_anthropic: 'claude-sonnet-5',
  escada_agentes: {
    busca: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash'],
    triagem: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash', 'google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free'],
    extracao: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash', 'qwen/qwen3.8-27b:free'],
    redacao_intro: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash', 'anthropic/claude-sonnet-5'],
    redacao_discussao: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash', 'anthropic/claude-sonnet-5'],
    redacao: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash', 'anthropic/claude-sonnet-5'],
    auditoria: ['deepseek/deepseek-v4.1-flash', 'deepseek/deepseek-v4-pro', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
    estilo: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash', 'google/gemma-4-31b-it:free'],
    fechamento: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash', 'google/gemma-4-31b-it:free'],
    limitacoes: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash'],
    tabelas: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash'],
    orientador: ['deepseek/deepseek-v4.1-flash', 'google/gemini-3.8-flash'],
    revisao_orientador: ['google/gemini-3.8-flash', 'deepseek/deepseek-v4.1-flash', 'anthropic/claude-sonnet-5'],
  },
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

export function chaveGemini(cfg = lerConfig()) {
  if (cfg.gemini_api_key) return { chave: cfg.gemini_api_key, origem: 'config.local.json' };
  if (process.env.GEMINI_API_KEY) return { chave: process.env.GEMINI_API_KEY, origem: 'env GEMINI_API_KEY' };
  return null;
}

export function chaveDeepSeek(cfg = lerConfig()) {
  if (cfg.deepseek_api_key) return { chave: cfg.deepseek_api_key, origem: 'config.local.json' };
  if (process.env.DEEPSEEK_API_KEY) return { chave: process.env.DEEPSEEK_API_KEY, origem: 'env DEEPSEEK_API_KEY' };
  return null;
}

export function omnirouteConfig(cfg = lerConfig()) {
  const url = cfg.omniroute_url || process.env.OMNIROUTE_URL || 'http://localhost:20128/v1';
  return { url: url.replace(/\/+$/, '') };
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

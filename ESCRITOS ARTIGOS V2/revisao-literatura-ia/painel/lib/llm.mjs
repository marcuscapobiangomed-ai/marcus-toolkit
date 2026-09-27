import { spawn } from 'node:child_process';
import os from 'node:os';
import { chaveAnthropic, chaveOpenRouter, lerConfig } from './config.mjs';
import { esperar } from './texto.mjs';

// Modelos gratuitos podem demorar varios minutos em lotes grandes, mas nunca indefinidamente.
const LIMITE_CHAMADA_MS = 8 * 60 * 1000;

// Tres motores possiveis, escolhidos automaticamente na ordem de qualidade:
// 1) Claude Code CLI logado (assinatura Claude)  2) chave Anthropic  3) OpenRouter (inclui modelos gratuitos).

// O processo filho deve se comportar como um terminal comum: sem credenciais do OpenRouter e sem
// as variaveis de sessao do app desktop (cuja autenticacao so vale para a propria sessao do app).
function envSemCredenciaisExternas() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(ANTHROPIC_|CLAUDE_CODE_|CLAUDECODE$|CLAUDE_AGENT_SDK|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_PREVIEW|USE_(STAGING|LOCAL)_OAUTH)/.test(k)) continue;
    env[k] = v;
  }
  return env;
}

function rodar(cmd, args, { entrada = '', limiteMs = 600000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: os.tmpdir(), env: envSemCredenciaisExternas(), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      p.kill('SIGTERM');
      reject(new Error(`${cmd} excedeu ${limiteMs / 1000}s`));
    }, limiteMs);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
    p.stdin.end(entrada);
  });
}

let cacheStatus = null;
export async function statusProvedores(forcar = false) {
  if (cacheStatus && !forcar && Date.now() - cacheStatus.em < 60000) return cacheStatus.valor;
  const cfg = lerConfig();
  const valor = {
    claude_cli: { disponivel: false, modelo: cfg.modelo_claude, detalhe: '' },
    anthropic: { disponivel: Boolean(chaveAnthropic(cfg)), modelo: cfg.modelo_anthropic, detalhe: '' },
    openrouter: { disponivel: false, modelo: cfg.modelo_openrouter, detalhe: '' },
  };
  try {
    const r = await rodar('claude', ['auth', 'status'], { limiteMs: 20000 });
    const j = JSON.parse(r.out);
    if (!j.loggedIn) {
      valor.claude_cli.detalhe = 'CLI instalado, mas sem login — rode "claude auth login" no Terminal';
    } else {
      // "logado" nao basta: confirma com uma chamada minima real.
      try {
        await viaClaudeCli({ sistema: 'Responda apenas OK.', prompt: 'OK?', modelo: cfg.modelo_claude, limiteMs: 60000 });
        valor.claude_cli.disponivel = true;
        valor.claude_cli.detalhe = `logado (${j.authMethod}) e respondendo`;
      } catch (e) {
        valor.claude_cli.detalhe = `login encontrado, mas a chamada falhou: ${e.message.slice(0, 120)}`;
      }
    }
  } catch {
    valor.claude_cli.detalhe = 'Claude Code CLI nao encontrado';
  }
  const or = chaveOpenRouter(cfg);
  if (or) {
    valor.openrouter.disponivel = true;
    valor.openrouter.detalhe = `chave de ${or.origem}`;
    try {
      const r = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${or.chave}` } });
      const d = (await r.json())?.data;
      if (d) valor.openrouter.detalhe += d.is_free_tier ? ' — nivel gratuito (so modelos :free)' : ' — com creditos';
      if (!r.ok) valor.openrouter.disponivel = false;
    } catch {
      // mantem disponivel; a chamada real dira se falhar
    }
  } else {
    valor.openrouter.detalhe = 'sem chave OpenRouter configurada';
  }
  valor.anthropic.detalhe = valor.anthropic.disponivel ? 'chave configurada' : 'sem ANTHROPIC_API_KEY';
  valor.escolhido = valor.claude_cli.disponivel ? 'claude_cli' : valor.anthropic.disponivel ? 'anthropic' : valor.openrouter.disponivel ? 'openrouter' : null;
  cacheStatus = { em: Date.now(), valor };
  return valor;
}

export function estimarCusto({ provedor, modelo, prompt_tokens = 0, completion_tokens = 0 }) {
  if (modelo?.endsWith(':free')) return 0;
  if (provedor === 'anthropic' || provedor === 'claude_cli' || modelo?.includes('claude')) {
    if (modelo?.includes('opus')) {
      return Number(((prompt_tokens * 15 + completion_tokens * 75) / 1_000_000).toFixed(6));
    }
    if (modelo?.includes('haiku')) {
      return Number(((prompt_tokens * 0.25 + completion_tokens * 1.25) / 1_000_000).toFixed(6));
    }
    return Number(((prompt_tokens * 3 + completion_tokens * 15) / 1_000_000).toFixed(6));
  }
  if (modelo?.includes('glm')) {
    return Number(((prompt_tokens * 0.5 + completion_tokens * 1.0) / 1_000_000).toFixed(6));
  }
  if (modelo?.includes('deepseek')) {
    return Number(((prompt_tokens * 0.14 + completion_tokens * 0.28) / 1_000_000).toFixed(6));
  }
  return Number(((prompt_tokens * 1.0 + completion_tokens * 2.0) / 1_000_000).toFixed(6));
}

export async function consultarUsoProvedores() {
  const cfg = lerConfig();
  const or = chaveOpenRouter(cfg);
  const resultado = {
    openrouter: null,
  };
  if (or) {
    try {
      const [rCred, rKey] = await Promise.all([
        fetch('https://openrouter.ai/api/v1/credits', {
          headers: { Authorization: `Bearer ${or.chave}` },
          signal: AbortSignal.timeout(8000),
        }).then((res) => (res.ok ? res.json() : null)).catch(() => null),
        fetch('https://openrouter.ai/api/v1/key', {
          headers: { Authorization: `Bearer ${or.chave}` },
          signal: AbortSignal.timeout(8000),
        }).then((res) => (res.ok ? res.json() : null)).catch(() => null),
      ]);
      const credData = rCred?.data || {};
      const keyData = rKey?.data || {};
      const totalCredits = Number(credData.total_credits || 0);
      const totalUsage = Number(credData.total_usage || 0);
      const freeReq = keyData.free_model_daily_requests || {};
      resultado.openrouter = {
        ativo: true,
        origem: or.origem,
        total_creditos_usd: totalCredits,
        total_gasto_usd: totalUsage,
        saldo_restante_usd: Math.max(0, totalCredits - totalUsage),
        is_free_tier: Boolean(keyData.is_free_tier),
        gratis_usadas: freeReq.used ?? null,
        gratis_limite: freeReq.limit ?? null,
        gratis_restantes: freeReq.remaining ?? null,
      };
    } catch {
      // falha de rede silenciosa
    }
  }
  return resultado;
}

async function viaClaudeCli({ sistema, prompt, modelo, limiteMs = 900000 }) {
  const args = [
    '-p', '--output-format', 'json', '--model', modelo,
    '--tools', '', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    '--setting-sources', 'local', '--settings', '{"disableAllHooks": true}',
    '--system-prompt', sistema,
  ];
  const r = await rodar('claude', args, { entrada: prompt, limiteMs });
  let j;
  try {
    j = JSON.parse(r.out);
  } catch {
    throw new Error(`Claude CLI falhou (codigo ${r.code}): ${(r.err || r.out).slice(0, 300)}`);
  }
  if (j.is_error) throw new Error(`Claude CLI: ${j.result}`);
  const prompt_tokens = j.usage?.input_tokens || 0;
  const completion_tokens = j.usage?.output_tokens || 0;
  const total_tokens = prompt_tokens + completion_tokens;
  const custo = typeof j.total_cost_usd === 'number' ? j.total_cost_usd : estimarCusto({ provedor: 'claude_cli', modelo, prompt_tokens, completion_tokens });
  return {
    texto: j.result,
    modelo,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    custo_usd: Number(custo.toFixed(6)),
  };
}

async function viaAnthropic({ sistema, prompt, modelo, maxTokens, temperatura }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
    headers: { 'x-api-key': chaveAnthropic(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: maxTokens, temperature: temperatura, system: sistema, messages: [{ role: 'user', content: prompt }] }),
  });
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(`Anthropic HTTP ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`), { status: r.status });
  const prompt_tokens = j.usage?.input_tokens || 0;
  const completion_tokens = j.usage?.output_tokens || 0;
  const total_tokens = prompt_tokens + completion_tokens;
  const custo = estimarCusto({ provedor: 'anthropic', modelo, prompt_tokens, completion_tokens });
  return {
    texto: j.content.filter((c) => c.type === 'text').map((c) => c.text).join(''),
    modelo,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    custo_usd: custo,
  };
}

async function viaOpenRouter({ sistema, prompt, modelo, maxTokens, temperatura }) {
  const { chave } = chaveOpenRouter() || {};
  if (!chave) throw new Error('Sem chave OpenRouter');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      'X-Title': 'Painel Revisao de Literatura',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      temperature: temperatura,
      messages: [{ role: 'system', content: sistema }, { role: 'user', content: prompt }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    throw Object.assign(new Error(`OpenRouter ${modelo} HTTP ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`), { status: r.status || j.error?.code });
  }
  const texto = j.choices?.[0]?.message?.content || '';
  if (!texto.trim()) throw Object.assign(new Error(`OpenRouter ${modelo} devolveu resposta vazia`), { status: 502 });
  const prompt_tokens = j.usage?.prompt_tokens || 0;
  const completion_tokens = j.usage?.completion_tokens || 0;
  const total_tokens = j.usage?.total_tokens || (prompt_tokens + completion_tokens);
  const custo = typeof j.usage?.total_cost === 'number' ? j.usage.total_cost :
                typeof j.usage?.cost === 'number' ? j.usage.cost :
                estimarCusto({ provedor: 'openrouter', modelo, prompt_tokens, completion_tokens });
  return {
    texto,
    modelo: j.model || modelo,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    custo_usd: Number(custo.toFixed(6)),
  };
}

// Chamada unica com re-tentativas e troca de modelo (so no OpenRouter, onde modelos gratuitos oscilam).
export async function gerar({ sistema, prompt, provedor = 'auto', maxTokens = 8000, temperatura = 0.3, aoTentar }) {
  const cfg = lerConfig();
  const status = await statusProvedores();
  const qual = provedor === 'auto' ? status.escolhido : provedor;
  if (!qual) throw new Error('Nenhum motor de IA disponivel. Configure OpenRouter, Anthropic ou faca login no Claude CLI.');

  if (qual === 'claude_cli') return { ...(await viaClaudeCli({ sistema, prompt, modelo: cfg.modelo_claude })), provedor: qual };
  if (qual === 'anthropic') {
    for (let t = 0; ; t++) {
      try {
        return { ...(await viaAnthropic({ sistema, prompt, modelo: cfg.modelo_anthropic, maxTokens, temperatura })), provedor: qual };
      } catch (e) {
        if (t >= 2 || ![429, 500, 529].includes(e.status)) throw e;
        await esperar(5000 * (t + 1));
      }
    }
  }

  const modelos = [cfg.modelo_openrouter, ...cfg.modelos_openrouter_reserva];
  const erros = [];
  for (const modelo of modelos) {
    for (let t = 0; t < 2; t++) {
      try {
        aoTentar?.(modelo, t);
        return { ...(await viaOpenRouter({ sistema, prompt, modelo, maxTokens, temperatura })), provedor: qual };
      } catch (e) {
        erros.push(e.message);
        if (e.status === 401 || e.status === 402) throw e;
        await esperar(t === 0 ? 4000 : 8000);
      }
    }
  }
  throw new Error(`Todos os modelos OpenRouter falharam: ${erros.slice(-3).join(' || ')}`);
}

export function extrairJson(texto) {
  const limpo = String(texto || '').replace(/```(?:json)?/gi, '').trim();
  const inicio = limpo.search(/[[{]/);
  if (inicio < 0) throw new Error('Resposta sem JSON');
  const abre = limpo[inicio];
  const fecha = abre === '{' ? '}' : ']';
  let nivel = 0;
  let emString = false;
  for (let i = inicio; i < limpo.length; i++) {
    const c = limpo[i];
    if (emString) {
      if (c === '\\') i++;
      else if (c === '"') emString = false;
      continue;
    }
    if (c === '"') emString = true;
    else if (c === abre) nivel++;
    else if (c === fecha && --nivel === 0) return JSON.parse(limpo.slice(inicio, i + 1));
  }
  throw new Error('JSON incompleto na resposta');
}

// Recupera os objetos completos de uma lista JSON truncada, ex.: {"estudos": [{...}, {...}, {"n": 3, "pa
export function extrairJsonParcial(texto, chave) {
  const limpo = String(texto || '').replace(/```(?:json)?/gi, '');
  const inicioChave = limpo.indexOf(`"${chave}"`);
  if (inicioChave < 0) return null;
  const inicioLista = limpo.indexOf('[', inicioChave);
  if (inicioLista < 0) return null;
  const itens = [];
  let nivel = 0;
  let inicioObj = -1;
  let emString = false;
  for (let i = inicioLista + 1; i < limpo.length; i++) {
    const c = limpo[i];
    if (emString) {
      if (c === '\\') i++;
      else if (c === '"') emString = false;
      continue;
    }
    if (c === '"') emString = true;
    else if (c === '{') {
      if (nivel === 0) inicioObj = i;
      nivel++;
    } else if (c === '}') {
      nivel--;
      if (nivel === 0 && inicioObj >= 0) {
        try {
          itens.push(JSON.parse(limpo.slice(inicioObj, i + 1)));
        } catch {
          // objeto malformado: ignora
        }
        inicioObj = -1;
      }
    } else if (c === ']' && nivel === 0) break;
  }
  return itens.length ? { [chave]: itens } : null;
}

// chaveLista: nome da lista principal esperada; permite aproveitar respostas truncadas.
export async function gerarJson({ chaveLista, ...opcoes }) {
  let ultimoErro;
  let parcial = null;
  for (let t = 0; t < 3; t++) {
    const r = await gerar(opcoes);
    try {
      const dados = extrairJson(r.texto);
      return { ...r, dados: chaveLista && Array.isArray(dados) ? { [chaveLista]: dados } : dados };
    } catch (e) {
      ultimoErro = Object.assign(e, { bruto: r.texto?.slice(-4000) });
      const salvo = chaveLista ? extrairJsonParcial(r.texto, chaveLista) : null;
      if (salvo && (!parcial || salvo[chaveLista].length > parcial.dados[chaveLista].length)) parcial = { ...r, dados: salvo, parcial: true };
      if (parcial) return parcial;
      opcoes = { ...opcoes, prompt: `${opcoes.prompt}\n\nIMPORTANTE: responda SOMENTE com JSON valido, sem texto antes ou depois, e seja conciso para caber na resposta.` };
    }
  }
  throw ultimoErro;
}

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { chaveAnthropic, chaveDeepSeek, chaveGemini, chaveOpenRouter, lerConfig, omnirouteConfig, JOBS_DIR } from './config.mjs';
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
    deepseek: { disponivel: false, modelo: cfg.modelo_deepseek || 'deepseek-v4.1-flash', detalhe: '' },
    gemini: { disponivel: false, modelo: cfg.modelo_gemini || 'gemini-3.8-flash', detalhe: '' },
    omniroute: { disponivel: false, modelo: cfg.modelo_omniroute || 'auto', detalhe: '' },
    openrouter: { disponivel: false, modelo: cfg.modelo_openrouter, detalhe: '' },
    claude_cli: { disponivel: false, modelo: cfg.modelo_claude, detalhe: '' },
    anthropic: { disponivel: Boolean(chaveAnthropic(cfg)), modelo: cfg.modelo_anthropic, detalhe: '' },
  };

  const ds = chaveDeepSeek(cfg);
  if (ds) {
    valor.deepseek.disponivel = true;
    valor.deepseek.detalhe = `chave de ${ds.origem}`;
  } else {
    valor.deepseek.detalhe = 'sem DEEPSEEK_API_KEY configurada';
  }

  const gem = chaveGemini(cfg);
  if (gem) {
    valor.gemini.disponivel = true;
    valor.gemini.detalhe = `chave de ${gem.origem}`;
  } else {
    valor.gemini.detalhe = 'sem GEMINI_API_KEY configurada';
  }

  const omni = omnirouteConfig(cfg);
  try {
    const resOmni = await fetch(`${omni.url}/models`, { signal: AbortSignal.timeout(1200) });
    if (resOmni.ok) {
      valor.omniroute.disponivel = true;
      valor.omniroute.detalhe = `gateway ativo em ${omni.url}`;
    } else {
      valor.omniroute.detalhe = `gateway respondeu status ${resOmni.status}`;
    }
  } catch {
    valor.omniroute.detalhe = `gateway não detectado em ${omni.url}`;
  }

  try {
    const r = await rodar('claude', ['auth', 'status'], { limiteMs: 20000 });
    const j = JSON.parse(r.out);
    if (!j.loggedIn) {
      valor.claude_cli.detalhe = 'CLI instalado, mas sem login — rode "claude auth login" no Terminal';
    } else {
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
      // mantem disponivel
    }
  } else {
    valor.openrouter.detalhe = 'sem chave OpenRouter configurada';
  }

  valor.anthropic.detalhe = valor.anthropic.disponivel ? 'chave configurada' : 'sem ANTHROPIC_API_KEY';
  valor.dupla_ativa = valor.deepseek.disponivel && valor.gemini.disponivel;
  valor.escolhido = (valor.deepseek.disponivel && valor.gemini.disponivel) ? 'dupla' :
                    valor.deepseek.disponivel ? 'deepseek' :
                    valor.gemini.disponivel ? 'gemini' :
                    valor.omniroute.disponivel ? 'omniroute' :
                    valor.openrouter.disponivel ? 'openrouter' :
                    valor.claude_cli.disponivel ? 'claude_cli' :
                    valor.anthropic.disponivel ? 'anthropic' : null;
  cacheStatus = { em: Date.now(), valor };
  return valor;
}

export function estimarCusto({ provedor, modelo, prompt_tokens = 0, completion_tokens = 0, cache_hit = 0, cache_miss = 0 }) {
  if (modelo?.endsWith(':free')) return 0;
  if (provedor === 'omniroute') return 0;
  if (provedor === 'gemini' || modelo?.includes('gemini')) {
    return Number(((prompt_tokens * 0.10 + completion_tokens * 0.40) / 1_000_000).toFixed(6));
  }
  if (provedor === 'deepseek' || modelo?.includes('deepseek')) {
    const isReasoner = (modelo || '').includes('reasoner');
    if (cache_hit > 0 || cache_miss > 0) {
      const hitPrice = isReasoner ? 0.14 : 0.014;
      const missPrice = isReasoner ? 0.55 : 0.14;
      const cPrice = isReasoner ? 2.19 : 0.28;
      return Number(((cache_hit * hitPrice + cache_miss * missPrice + completion_tokens * cPrice) / 1_000_000).toFixed(6));
    }
    const pPrice = isReasoner ? 0.55 : 0.14;
    const cPrice = isReasoner ? 2.19 : 0.28;
    return Number(((prompt_tokens * pPrice + completion_tokens * cPrice) / 1_000_000).toFixed(6));
  }
  if (provedor === 'anthropic' || provedor === 'claude_cli' || modelo?.includes('claude')) {
    if (modelo?.includes('opus')) {
      return Number(((prompt_tokens * 15 + completion_tokens * 75) / 1_000_000).toFixed(6));
    }
    if (modelo?.includes('haiku')) {
      return Number(((prompt_tokens * 0.25 + completion_tokens * 1.25) / 1_000_000).toFixed(6));
    }
    return Number(((prompt_tokens * 2 + completion_tokens * 10) / 1_000_000).toFixed(6));
  }
  return Number(((prompt_tokens * 0.10 + completion_tokens * 0.30) / 1_000_000).toFixed(6));
}

export async function consultarUsoProvedores() {
  const cfg = lerConfig();
  const or = chaveOpenRouter(cfg);
  const ds = chaveDeepSeek(cfg);
  const gem = chaveGemini(cfg);
  const resultado = {
    openrouter: null,
    deepseek: null,
    gemini: null,
  };
  if (ds) {
    try {
      const rBalance = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${ds.chave}` },
        signal: AbortSignal.timeout(6000),
      }).then((res) => (res.ok ? res.json() : null)).catch(() => null);
      if (rBalance?.balance_infos?.length) {
        const info = rBalance.balance_infos[0] || {};
        resultado.deepseek = {
          ativo: true,
          origem: ds.origem,
          is_available: Boolean(rBalance.is_available),
          moeda: info.currency || 'USD',
          saldo_total: Number(info.total_balance || 0),
          saldo_concedido: Number(info.granted_balance || 0),
          saldo_recarregado: Number(info.topped_up_balance || 0),
        };
      } else {
        resultado.deepseek = {
          ativo: true,
          origem: ds.origem,
          saldo_total: null,
        };
      }
    } catch {
      // falha silenciosa
    }
  }
  if (gem) {
    try {
      const pingPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gem.chave}`, {
        signal: AbortSignal.timeout(5000),
      }).then((res) => (res.ok ? res.json() : null)).catch(() => null);

      let chamadas = 0;
      let tokensEntrada = 0;
      let tokensSaida = 0;
      let tokensTotal = 0;
      let custoAcumulado = 0;

      try {
        if (fs.existsSync(JOBS_DIR)) {
          const dirs = fs.readdirSync(JOBS_DIR);
          for (const d of dirs) {
            const stPath = path.join(JOBS_DIR, d, 'estado.json');
            if (fs.existsSync(stPath)) {
              const st = JSON.parse(fs.readFileSync(stPath, 'utf8'));
              const llmObj = (st.llm && (st.llm.tokens_total > 0 || st.llm.custo_usd > 0 || st.llm.chamadas_detalhe?.length > 0))
                ? st.llm
                : (st['vícios estilísticos e construções prolixas'] || st['construções preliminares'] || st.llm || {});
              const detalhes = llmObj.chamadas_detalhe || [];
              for (const ch of detalhes) {
                if (ch.provedor === 'gemini') {
                  chamadas++;
                  tokensEntrada += (ch.tokens_entrada || 0);
                  tokensSaida += (ch.tokens_saida || 0);
                  tokensTotal += (ch.tokens_total || ((ch.tokens_entrada || 0) + (ch.tokens_saida || 0)));
                  custoAcumulado += (ch.custo_usd || 0);
                }
              }
              if (llmObj.provedor === 'gemini' && detalhes.length === 0 && llmObj.custo_usd) {
                chamadas += (llmObj.requisicoes || llmObj.chamadas || 1);
                custoAcumulado += (llmObj.custo_usd || 0);
                tokensTotal += (llmObj.tokens_total || 0);
              }
            }
          }
        }
      } catch {
        // leitura silenciosa
      }

      const rPing = await pingPromise;
      const creditosConfig = (cfg.gemini_creditos_usd !== undefined && cfg.gemini_creditos_usd !== null && cfg.gemini_creditos_usd !== '')
        ? Number(cfg.gemini_creditos_usd)
        : null;
      const temSaldoDefinido = creditosConfig !== null && !isNaN(creditosConfig);
      const saldoRestante = temSaldoDefinido
        ? Math.max(0, Number((creditosConfig - custoAcumulado).toFixed(2)))
        : null;

      resultado.gemini = {
        ativo: true,
        conectado: Boolean(rPing),
        origem: gem.origem,
        tier: temSaldoDefinido ? `Créditos Informados ($${creditosConfig.toFixed(2)})` : 'Standard / Pay-As-You-Go',
        modelo: cfg.modelo_gemini || 'gemini-3.8-flash',
        total_chamadas: chamadas,
        tokens_entrada: tokensEntrada,
        tokens_saida: tokensSaida,
        tokens_total: tokensTotal,
        total_gasto_usd: Number(custoAcumulado.toFixed(4)),
        creditos_iniciais_usd: creditosConfig,
        saldo_restante_usd: saldoRestante,
        tem_saldo_definido: temSaldoDefinido,
        formato_saldo: temSaldoDefinido ? 'pre_pago' : 'pay_as_you_go',
      };
    } catch {
      // falha silenciosa
    }
  }
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

async function viaDeepSeek({ sistema, prompt, modelo, maxTokens, temperatura }) {
  const ds = chaveDeepSeek();
  if (!ds?.chave) throw new Error('Sem chave DeepSeek configurada');
  const mod = modelo || 'deepseek-v4.1-flash';
  const isReasoner = mod.includes('reasoner');
  const messages = [];
  if (sistema && String(sistema).trim()) {
    messages.push({ role: 'system', content: String(sistema) });
  }
  messages.push({ role: 'user', content: String(prompt ?? '') });
  const payload = {
    model: mod,
    messages,
    max_tokens: maxTokens,
  };
  if (!isReasoner && typeof temperatura === 'number') {
    payload.temperature = temperatura;
  }
  let r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
    headers: {
      Authorization: `Bearer ${ds.chave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  let j = await r.json().catch(() => ({}));
  if ((!r.ok || j.error) && (r.status === 400 || r.status === 404)) {
    const altMod = isReasoner ? 'deepseek-reasoner' : 'deepseek-chat';
    if (mod !== altMod) {
      payload.model = altMod;
      const rAlt = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
        headers: { Authorization: `Bearer ${ds.chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const jAlt = await rAlt.json().catch(() => ({}));
      if (rAlt.ok && !jAlt.error) {
        r = rAlt;
        j = jAlt;
      }
    }
  }
  if (!r.ok || j.error) {
    throw Object.assign(new Error(`DeepSeek ${payload.model} HTTP ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`), { status: r.status || j.error?.code });
  }
  const msg = j.choices?.[0]?.message || {};
  const texto = msg.content || '';
  const reasoning = msg.reasoning_content || null;
  if (!texto.trim() && !reasoning) {
    throw Object.assign(new Error(`DeepSeek ${payload.model} devolveu resposta vazia`), { status: 502 });
  }
  const u = j.usage || {};
  const cache_hit = u.prompt_cache_hit_tokens || 0;
  const cache_miss = u.prompt_cache_miss_tokens || u.prompt_tokens || 0;
  const prompt_tokens = u.prompt_tokens || (cache_hit + cache_miss);
  const completion_tokens = u.completion_tokens || 0;
  const total_tokens = u.total_tokens || (prompt_tokens + completion_tokens);
  const custo = estimarCusto({ provedor: 'deepseek', modelo: payload.model, prompt_tokens, completion_tokens, cache_hit, cache_miss });
  return {
    texto: texto || reasoning,
    reasoning,
    modelo: j.model || payload.model,
    usage: { prompt_tokens, completion_tokens, total_tokens, cache_hit, cache_miss },
    custo_usd: custo,
  };
}

async function viaGemini({ sistema, prompt, modelo, maxTokens, temperatura: _temperatura, thinkingLevel }) {
  const gem = chaveGemini();
  if (!gem?.chave) throw new Error('Sem chave Gemini configurada');
  const mod = modelo || 'gemini-3.8-flash';
  const messages = [];
  if (sistema && String(sistema).trim()) {
    messages.push({ role: 'system', content: String(sistema) });
  }
  messages.push({ role: 'user', content: String(prompt ?? '') });
  const payload = {
    model: mod,
    messages,
    max_tokens: Math.max(Number(maxTokens) || 2000, 1000),
  };
  // Os modelos mais recentes do Gemini no Google AI Studio calculam dinamicamente a amostragem
  // ideal e rejeitam temperature/top_p/top_k com HTTP 400 INVALID_ARGUMENT. Omitimos parâmetros legados.
  if (thinkingLevel && ['minimal', 'low', 'medium', 'high'].includes(thinkingLevel)) {
    payload.thinking_level = thinkingLevel;
  }
  let r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
    headers: {
      Authorization: `Bearer ${gem.chave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  let j = await r.json().catch(() => ({}));
  if ((!r.ok || j.error) && (r.status === 400 || r.status === 404)) {
    delete payload.temperature;
    delete payload.top_p;
    delete payload.top_k;
    delete payload.thinking_budget;
    const altMod = 'gemini-flash-latest';
    if (mod !== altMod) {
      payload.model = altMod;
      const rAlt = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
        headers: { Authorization: `Bearer ${gem.chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const jAlt = await rAlt.json().catch(() => ({}));
      if (rAlt.ok && !jAlt.error) {
        r = rAlt;
        j = jAlt;
      }
    }
  }
  if (!r.ok || j.error) {
    throw Object.assign(new Error(`Gemini ${payload.model} HTTP ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`), { status: r.status || j.error?.code });
  }
  const msg = j.choices?.[0]?.message || {};
  const texto = msg.content || '';
  if (!texto.trim()) throw Object.assign(new Error(`Gemini ${payload.model} devolveu resposta vazia`), { status: 502 });
  const prompt_tokens = j.usage?.prompt_tokens || 0;
  const completion_tokens = j.usage?.completion_tokens || 0;
  const total_tokens = j.usage?.total_tokens || (prompt_tokens + completion_tokens);
  const custo = estimarCusto({ provedor: 'gemini', modelo: payload.model, prompt_tokens, completion_tokens });
  return {
    texto,
    modelo: j.model || payload.model,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    custo_usd: custo,
  };
}

async function viaOmniRoute({ sistema, prompt, modelo, maxTokens, temperatura }) {
  const omni = omnirouteConfig();
  const mod = modelo || 'auto';
  const r = await fetch(`${omni.url}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(LIMITE_CHAMADA_MS),
    headers: {
      Authorization: 'Bearer omniroute',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: mod,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: temperatura,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    throw Object.assign(new Error(`OmniRoute ${mod} HTTP ${r.status}: ${JSON.stringify(j.error || j).slice(0, 300)}`), { status: r.status || j.error?.code });
  }
  const texto = j.choices?.[0]?.message?.content || '';
  if (!texto.trim()) throw Object.assign(new Error(`OmniRoute ${mod} devolveu resposta vazia`), { status: 502 });
  const prompt_tokens = j.usage?.prompt_tokens || 0;
  const completion_tokens = j.usage?.completion_tokens || 0;
  const total_tokens = j.usage?.total_tokens || (prompt_tokens + completion_tokens);
  return {
    texto,
    modelo: j.model || mod,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    custo_usd: 0,
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

// Chamada única com re-tentativas, escada por papel e chaveamento de provedores.
export async function gerar({ sistema, prompt, provedor = 'auto', papel = 'redacao', maxTokens = 8000, temperatura = 0.3, aoTentar }) {
  const cfg = lerConfig();
  const status = await statusProvedores();
  const qual = provedor === 'auto' ? status.escolhido : provedor;
  if (!qual) throw new Error('Nenhum motor de IA disponível. Configure Gemini, DeepSeek, OmniRoute, OpenRouter, Anthropic ou faça login no Claude CLI.');

  const papeisGemini = ['busca', 'redacao_intro', 'estilo', 'fechamento', 'limitacoes', 'revisao_orientador', 'humanizacao_qualis_a1'];
  const prefereGemini = papeisGemini.includes(papel);

  // Modo Sinergético Dupla Híbrida (DeepSeek + Gemini)
  if (qual === 'dupla' || (provedor === 'auto' && status.dupla_ativa)) {
    if (prefereGemini) {
      // 1. Tenta Gemini (estilístico/narrativo)
      for (let t = 0; t < 2; t++) {
        try {
          aoTentar?.(cfg.modelo_gemini || 'gemini-3.8-flash', t);
          return { ...(await viaGemini({ sistema, prompt, modelo: cfg.modelo_gemini || 'gemini-3.8-flash', maxTokens, temperatura })), provedor: 'gemini' };
        } catch (e) {
          if (e.status === 401) throw e;
          if (t === 1 && status.deepseek?.disponivel) break;
          await esperar(2000);
        }
      }
      if (status.deepseek?.disponivel) {
        try {
          aoTentar?.(cfg.modelo_deepseek || 'deepseek-v4.1-flash', 0);
          return { ...(await viaDeepSeek({ sistema, prompt, modelo: cfg.modelo_deepseek || 'deepseek-v4.1-flash', maxTokens, temperatura })), provedor: 'deepseek' };
        } catch {}
      }
    } else {
      // 1. Tenta DeepSeek (técnico/dados/auditoria)
      const modDs = (papel === 'auditoria' && cfg.modelo_deepseek_reasoner) ? cfg.modelo_deepseek_reasoner : (cfg.modelo_deepseek || 'deepseek-v4.1-flash');
      for (let t = 0; t < 2; t++) {
        try {
          aoTentar?.(modDs, t);
          return { ...(await viaDeepSeek({ sistema, prompt, modelo: modDs, maxTokens, temperatura })), provedor: 'deepseek' };
        } catch (e) {
          if (e.status === 401) throw e;
          if (t === 1 && status.gemini?.disponivel) break;
          await esperar(2000);
        }
      }
      if (status.gemini?.disponivel) {
        try {
          aoTentar?.(cfg.modelo_gemini || 'gemini-3.8-flash', 0);
          return { ...(await viaGemini({ sistema, prompt, modelo: cfg.modelo_gemini || 'gemini-3.8-flash', maxTokens, temperatura })), provedor: 'gemini' };
        } catch {}
      }
    }
  }

  if (qual === 'gemini') {
    const modelo = cfg.modelo_gemini || 'gemini-3.8-flash';
    for (let t = 0; t < 3; t++) {
      try {
        aoTentar?.(modelo, t);
        return { ...(await viaGemini({ sistema, prompt, modelo, maxTokens, temperatura })), provedor: 'gemini' };
      } catch (e) {
        if (e.status === 401) throw e;
        if (t === 2) {
          if (status.deepseek?.disponivel) {
            return { ...(await viaDeepSeek({ sistema, prompt, modelo: cfg.modelo_deepseek || 'deepseek-v4.1-flash', maxTokens, temperatura })), provedor: 'deepseek' };
          }
          if (status.openrouter?.disponivel) break;
          throw e;
        }
        await esperar(2000 * (t + 1));
      }
    }
  }

  if (qual === 'deepseek') {
    const modelo = (papel === 'auditoria' && cfg.modelo_deepseek_reasoner) ? cfg.modelo_deepseek_reasoner : (cfg.modelo_deepseek || 'deepseek-v4.1-flash');
    for (let t = 0; t < 3; t++) {
      try {
        aoTentar?.(modelo, t);
        return { ...(await viaDeepSeek({ sistema, prompt, modelo, maxTokens, temperatura })), provedor: 'deepseek' };
      } catch (e) {
        if (e.status === 401) throw e;
        if (t === 2) {
          if (status.gemini?.disponivel) {
            return { ...(await viaGemini({ sistema, prompt, modelo: cfg.modelo_gemini || 'gemini-3.8-flash', maxTokens, temperatura })), provedor: 'gemini' };
          }
          if (status.omniroute?.disponivel) {
            return { ...(await viaOmniRoute({ sistema, prompt, modelo: cfg.modelo_omniroute || 'auto', maxTokens, temperatura })), provedor: 'omniroute' };
          }
          if (status.openrouter?.disponivel) break;
          throw e;
        }
        await esperar(2000 * (t + 1));
      }
    }
  }

  if (qual === 'omniroute') {
    for (let t = 0; t < 2; t++) {
      try {
        aoTentar?.('omniroute', t);
        return { ...(await viaOmniRoute({ sistema, prompt, modelo: cfg.modelo_omniroute || 'auto', maxTokens, temperatura })), provedor: 'omniroute' };
      } catch (e) {
        if (t === 1) {
          if (status.deepseek?.disponivel) {
            return { ...(await viaDeepSeek({ sistema, prompt, modelo: cfg.modelo_deepseek, maxTokens, temperatura })), provedor: 'deepseek' };
          }
          if (status.gemini?.disponivel) {
            return { ...(await viaGemini({ sistema, prompt, modelo: cfg.modelo_gemini, maxTokens, temperatura })), provedor: 'gemini' };
          }
          if (status.openrouter?.disponivel) break;
          throw e;
        }
        await esperar(3000);
      }
    }
  }

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

  // OpenRouter (ou fallback de DeepSeek/OmniRoute)
  const modelos = (cfg.escada_agentes && cfg.escada_agentes[papel]) || [cfg.modelo_openrouter, ...cfg.modelos_openrouter_reserva];
  const erros = [];
  for (const modelo of modelos) {
    for (let t = 0; t < 2; t++) {
      try {
        aoTentar?.(modelo, t);
        return { ...(await viaOpenRouter({ sistema, prompt, modelo, maxTokens, temperatura })), provedor: 'openrouter' };
      } catch (e) {
        erros.push(e.message);
        if (e.status === 401 || e.status === 402) throw e;
        await esperar(t === 0 ? 3000 : 6000);
      }
    }
  }
  throw new Error(`Todos os modelos OpenRouter falharam para o papel "${papel}": ${erros.slice(-3).join(' || ')}`);
}

/**
 * Reconstrói e repara deterministicamente um JSON truncado por limite de tokens,
 * fechando strings, arrays e objetos pendentes para resgatar dados parciais válidos.
 */
export function repararJsonTruncado(texto) {
  const limpo = String(texto || '').replace(/```(?:json)?/gi, '').trim();
  const inicio = limpo.search(/[[{]/);
  if (inicio < 0) return null;
  const sub = limpo.slice(inicio);

  const pilha = [];
  let emString = false;
  let escape = false;

  for (let i = 0; i < sub.length; i++) {
    const c = sub[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      emString = !emString;
      continue;
    }
    if (emString) continue;

    if (c === '{' || c === '[') {
      pilha.push(c === '{' ? '}' : ']');
    } else if (c === '}' || c === ']') {
      if (pilha.length && pilha[pilha.length - 1] === c) {
        pilha.pop();
      }
    }
  }

  let consertado = sub;
  if (emString) {
    if (consertado.endsWith('\\')) consertado = consertado.slice(0, -1);
    consertado += '"';
  }
  // Remove vírgulas órfãs no final antes do fechamento
  consertado = consertado.replace(/,\s*$/, '');
  while (pilha.length > 0) {
    consertado += pilha.pop();
  }

  try {
    return JSON.parse(consertado);
  } catch {
    // Tenta poda cirúrgica da última chave ou valor quebrado
    const poda = consertado.replace(/,\s*"[^"]*":?\s*[^,}]*$/, '') + '}';
    try {
      return JSON.parse(poda);
    } catch {
      return null;
    }
  }
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

  // Se o JSON foi cortado antes de fechar delimitadores, tenta auto-reparo resiliente
  const reparado = repararJsonTruncado(texto);
  if (reparado && typeof reparado === 'object') {
    return reparado;
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

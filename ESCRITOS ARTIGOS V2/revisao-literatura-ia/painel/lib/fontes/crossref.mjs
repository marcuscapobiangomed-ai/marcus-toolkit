import { lerConfig } from '../config.mjs';
import { similaridade } from '../texto.mjs';

// Checagem cruzada independente pelo DOI (Crossref), incluindo avisos de retratacao
// (o Crossref incorpora a base do Retraction Watch no campo "updated-by").
export async function conferirDoi(doi, titulos) {
  if (!doi) return null;
  const cfg = lerConfig();
  const mailto = cfg.contato_email ? `?mailto=${encodeURIComponent(cfg.contato_email)}` : '';
  try {
    const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}${mailto}`, {
      headers: { 'User-Agent': 'painel-revisao-literatura/1.0' },
      signal: AbortSignal.timeout(45000),
    });
    if (r.status === 404) return { existe: false, motivo: 'DOI nao encontrado no Crossref' };
    if (!r.ok) return { existe: null, motivo: `Crossref HTTP ${r.status}` };
    const m = (await r.json()).message || {};
    const tituloCr = (m.title || [])[0] || '';
    const sim = Math.max(0, ...titulos.filter(Boolean).map((t) => similaridade(t, tituloCr)));
    const atualizacoes = (m['updated-by'] || []).map((u) => u.type);
    return {
      existe: true,
      titulo_crossref: tituloCr,
      similaridade: sim,
      retratado: atualizacoes.some((t) => /retraction|withdrawal/i.test(t)),
      atualizacoes,
    };
  } catch (e) {
    return { existe: null, motivo: `Crossref indisponivel: ${e.message}` };
  }
}

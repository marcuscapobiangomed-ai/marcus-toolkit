import { parametrosNcbi } from '../config.mjs';
import { esperar } from '../texto.mjs';

// Abreviatura de periodicos no padrao NLM (Vancouver), pelo ISSN no NLM Catalog.
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const cache = new Map();

async function chamar(endpoint, params) {
  const p = parametrosNcbi();
  for (const [k, v] of Object.entries(params)) p.set(k, String(v));
  await esperar(400);
  const r = await fetch(`${EUTILS}/${endpoint}?${p}`, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`NLM Catalog HTTP ${r.status}`);
  return r.json();
}

export async function abreviaturaNlm(issn) {
  const chave = String(issn || '').trim().replace(/\s+/, '-');
  if (!/^\d{4}-\d{3}[\dxX]$/.test(chave)) return null;
  if (cache.has(chave)) return cache.get(chave);
  let abrev = null;
  try {
    const busca = await chamar('esearch.fcgi', { db: 'nlmcatalog', retmode: 'json', term: `${chave}[issn]` });
    const id = busca.esearchresult?.idlist?.[0];
    if (id) {
      const res = await chamar('esummary.fcgi', { db: 'nlmcatalog', retmode: 'json', id });
      abrev = res.result?.[id]?.medlineta || res.result?.[id]?.isoabbreviation || null;
    }
  } catch {
    abrev = null;
  }
  cache.set(chave, abrev);
  return abrev;
}

// Fora do NLM Catalog: sem pontos nem acentos, iniciais maiusculas (exceto preposicoes).
export function abreviaturaNormalizada(nome) {
  const menores = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'y', 'del', 'la', 'em', 'en']);
  return String(nome || '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/\./g, ' ')
    .split(/\s+/).filter(Boolean)
    // particula so fica minuscula se ja era minuscula na origem ("La Paz" continua "La Paz")
    .map((p, i) => (i > 0 && menores.has(p) ? p : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

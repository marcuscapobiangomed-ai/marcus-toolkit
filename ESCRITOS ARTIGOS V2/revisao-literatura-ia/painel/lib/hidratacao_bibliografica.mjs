/**
 * Agente de Hidratação Bibliográfica e Resolução Factual de Fontes
 * 
 * Para qualquer trabalho (importado ou gerado do zero):
 * 1. Resolve DOIs e metadados oficiais via Crossref (query.bibliographic e lookup direto de DOI).
 * 2. Recupera o abstract científico completo (resumo real) e afiliações via NCBI PubMed E-utilities.
 * 3. Identifica retratações acadêmicas oficiais (Retraction Watch / Crossref / PubMed).
 * 4. Mantém cache persistente para respostas instantâneas em execuções subsequentes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PAINEL_DIR } from './config.mjs';
import { normalizar, similaridade } from './texto.mjs';
import { paisDaAfiliacao } from './pais_afiliacao.mjs';

const CACHE_PATH = path.join(PAINEL_DIR, '.cache-bibliografia.json');
const TIMEOUT_MS = 5000;
const USER_AGENT = 'RevisaoLiteraturaIA/2.0 (mailto:artigos@pesquisa.med.br)';
const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

let cacheMemoria = null;

function carregarCache() {
  if (cacheMemoria) return cacheMemoria;
  try {
    if (fs.existsSync(CACHE_PATH)) {
      cacheMemoria = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } else {
      cacheMemoria = {};
    }
  } catch {
    cacheMemoria = {};
  }
  return cacheMemoria;
}

function salvarCache() {
  if (!cacheMemoria) return;
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheMemoria, null, 2), 'utf8');
  } catch {}
}

const semTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/**
 * Consulta o PubMed usando DOI ou PMID para recuperar o abstract científico oficial.
 */
async function consultarPubMedPorDoiOuPmid(doi = '', pmid = '') {
  let idAlvo = pmid;

  if (!idAlvo && doi) {
    try {
      const urlSearch = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(doi + '[doi]')}`;
      const res = await fetch(urlSearch, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) {
        const j = await res.json();
        idAlvo = j.esearchresult?.idlist?.[0] || '';
      }
    } catch {}
  }

  if (!idAlvo) return null;

  try {
    const urlFetch = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&retmode=xml&id=${encodeURIComponent(idAlvo)}`;
    const res = await fetch(urlFetch, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS + 2000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const titulo = semTags((xml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) || [])[1]);
    const partesAbstract = [...xml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(([, attrs, txt]) => {
      const rotulo = (attrs.match(/Label="([^"]+)"/) || [])[1];
      return rotulo ? `${rotulo}: ${semTags(txt)}` : semTags(txt);
    });
    const resumo = partesAbstract.join(' ').trim();

    const autores = [...xml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g)].map(([, a]) => {
      const coletivo = (a.match(/<CollectiveName>([\s\S]*?)<\/CollectiveName>/) || [])[1];
      if (coletivo) return semTags(coletivo);
      const sobrenome = (a.match(/<LastName>([\s\S]*?)<\/LastName>/) || [])[1];
      const iniciais = (a.match(/<Initials>([\s\S]*?)<\/Initials>/) || [])[1];
      return sobrenome ? `${semTags(sobrenome)} ${semTags(iniciais || '')}`.trim() : '';
    }).filter(Boolean);

    const afiliacao = semTags((xml.match(/<AffiliationInfo>\s*<Affiliation>([\s\S]*?)<\/Affiliation>/) || [])[1]);
    const tipos = [...xml.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map(([, t]) => semTags(t));
    const retratado = tipos.includes('Retracted Publication') || /RefType="RetractionIn"/.test(xml);

    return {
      pmid: idAlvo,
      titulo,
      resumo,
      autores,
      afiliacao,
      retratado,
    };
  } catch {
    return null;
  }
}

/**
 * Consulta a Crossref para validar DOI, metadados e retratações.
 */
async function consultarCrossrefItem(doi = '', textoRef = '') {
  let url = '';
  if (doi) {
    url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  } else if (textoRef && textoRef.length > 20) {
    const limpo = textoRef.replace(/^\[\d+\]\s*|\d+\.\s*/, '').slice(0, 200);
    url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(limpo)}&rows=1`;
  } else {
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const item = doi ? (json.message || {}) : (json.message?.items?.[0] || null);
    if (!item) return null;

    // Se a busca foi por texto, verifica se o score ou similaridade são razoáveis
    if (!doi && item.title?.[0]) {
      const normItem = normalizar(item.title[0]);
      const normRef = normalizar(textoRef);
      const palavrasComuns = normItem.split(' ').filter((w) => w.length > 4 && normRef.includes(w)).length;
      if (palavrasComuns < 2 && (item.score || 0) < 40) {
        return null;
      }
    }

    const isRetracted = (item.relation?.['is-supplemented-by'] || []).some((r) => /retract/i.test(r['id-type'])) ||
      (item.update_to || []).some((u) => /retract/i.test(u.type || u.label)) ||
      (item['updated-by'] || []).some((u) => /retract/i.test(u.type || u.label)) ||
      Boolean(item['is-retracted']);

    const autores = (item.author || []).map((a) => `${a.family || ''} ${a.given || ''}`.trim()).filter(Boolean);
    const ano = item.issued?.['date-parts']?.[0]?.[0] || '';
    const periodico = item['container-title']?.[0] || '';
    const titulo = item.title?.[0] || '';

    let resumoJats = '';
    if (item.abstract) {
      resumoJats = semTags(item.abstract);
    }

    return {
      doi: item.DOI || doi,
      titulo,
      autores,
      ano: String(ano),
      periodico,
      resumo: resumoJats,
      retratado: Boolean(isRetracted),
    };
  } catch {
    return null;
  }
}

/**
 * Hidrata uma única referência bibliográfica, recuperando abstract, autores e status de retratação.
 */
export async function hidratarReferencia(ref, indice = 0) {
  const textoOriginal = typeof ref === 'string' ? ref : (ref.texto || ref.titulo || '');
  const mDoi = textoOriginal.match(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/);
  const doiOriginal = mDoi ? mDoi[0].toLowerCase() : (typeof ref === 'object' && ref.doi ? ref.doi.toLowerCase() : '');

  const mPmid = textoOriginal.match(/\b(?:PMID:?\s*|pmid\s*)(\d{6,9})\b/i);
  const pmidOriginal = mPmid ? mPmid[1] : (typeof ref === 'object' && ref.pmid ? ref.pmid : '');

  const cache = carregarCache();
  const chaveCache = doiOriginal || (pmidOriginal ? `pmid:${pmidOriginal}` : `txt:${normalizar(textoOriginal).slice(0, 100)}`);

  if (cache[chaveCache]) {
    const c = cache[chaveCache];
    return {
      ...c,
      n: indice + 1,
      uid: `ref-hid-${indice + 1}`,
      texto: textoOriginal,
    };
  }

  let dadosCrossref = null;
  let dadosPubmed = null;

  // 1. Consulta Crossref
  dadosCrossref = await consultarCrossrefItem(doiOriginal, textoOriginal);

  const doiEfetivo = dadosCrossref?.doi || doiOriginal;

  // 2. Consulta PubMed para obter abstract científico aprofundado
  dadosPubmed = await consultarPubMedPorDoiOuPmid(doiEfetivo, pmidOriginal);

  // Consolidação dos dados
  const tituloFinal = dadosPubmed?.titulo || dadosCrossref?.titulo || (typeof ref === 'object' ? ref.titulo : '') || textoOriginal.slice(0, 120);
  const autoresFinais = (dadosPubmed?.autores?.length ? dadosPubmed.autores : (dadosCrossref?.autores || []));
  const anoFinal = dadosCrossref?.ano || (typeof ref === 'object' ? ref.ano : '') || '';
  const periodicoFinal = dadosCrossref?.periodico || (typeof ref === 'object' ? ref.periodico : '') || '';
  const resumoFinal = dadosPubmed?.resumo || dadosCrossref?.resumo || '';
  const retratadoFinal = Boolean(dadosCrossref?.retratado || dadosPubmed?.retratado);

  const sobrenomePrimeiro = autoresFinais[0] ? autoresFinais[0].split(' ')[0] : 'Autor NI';
  const autorCurto = autoresFinais.length > 1 ? `${sobrenomePrimeiro} et al.` : sobrenomePrimeiro;

  const resultado = {
    n: indice + 1,
    uid: `ref-hid-${indice + 1}`,
    texto: textoOriginal,
    titulo: tituloFinal,
    autores: autoresFinais,
    autorCurto,
    ano: anoFinal,
    periodico: periodicoFinal,
    doi: doiEfetivo,
    pmid: dadosPubmed?.pmid || pmidOriginal,
    resumo: resumoFinal || textoOriginal, // fallback seguro
    tem_abstract_real: Boolean(resumoFinal && resumoFinal.length > 50),
    retratado: retratadoFinal,
    afiliacao: dadosPubmed?.afiliacao || '',
    pais: paisDaAfiliacao(dadosPubmed?.afiliacao || ''),
  };

  cache[chaveCache] = resultado;
  return resultado;
}

/**
 * Hidrata em lote todas as referências com concorrência controlada e retorno progressivo.
 */
export async function hidratarReferenciasEmLote(referencias = [], { progressoCb = null, concorrencia = 4 } = {}) {
  const log = (msg) => {
    if (typeof progressoCb === 'function') progressoCb(msg);
  };

  log(`▶ Iniciando hidratação bibliográfica para ${referencias.length} referência(s)...`);
  const hidratadas = new Array(referencias.length);

  for (let i = 0; i < referencias.length; i += concorrencia) {
    const lote = referencias.slice(i, i + concorrencia);
    const promessas = lote.map((ref, idxLocal) => {
      const idxGlobal = i + idxLocal;
      return hidratarReferencia(ref, idxGlobal).then((r) => {
        hidratadas[idxGlobal] = r;
      });
    });

    await Promise.all(promessas);
    log(`  Hidratadas: ${Math.min(i + concorrencia, referencias.length)}/${referencias.length} fontes.`);
  }

  salvarCache();

  const totalComAbstract = hidratadas.filter((r) => r.tem_abstract_real).length;
  const totalComDoi = hidratadas.filter((r) => Boolean(r.doi)).length;
  const totalRetratadas = hidratadas.filter((r) => r.retratado).length;

  log(`✔ Hidratação concluída: ${totalComDoi} DOIs validados, ${totalComAbstract} resumos reais obtidos, ${totalRetratadas} retratação(ões) detectada(s).`);

  return {
    referencias: hidratadas,
    estatisticas: {
      total: referencias.length,
      com_doi: totalComDoi,
      com_abstract_real: totalComAbstract,
      retratadas: totalRetratadas,
    },
  };
}

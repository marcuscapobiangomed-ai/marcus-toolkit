import { parametrosNcbi } from '../config.mjs';
import { decodificarEntidades, esperar } from '../texto.mjs';

// PubMed usa a API oficial E-utilities: e o unico acesso automatizado permitido pelo NCBI
// (o site pubmed.ncbi.nlm.nih.gov tem reCAPTCHA e a politica proibe raspagem).
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PAUSA_MS = 400; // < 3 req/s sem chave de API

async function chamar(endpoint, params) {
  const p = parametrosNcbi();
  for (const [k, v] of Object.entries(params)) p.set(k, String(v));
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    await esperar(PAUSA_MS);
    const r = await fetch(`${EUTILS}/${endpoint}?${p}`, { signal: AbortSignal.timeout(90000) });
    if (r.status === 429 || r.status >= 500) {
      await esperar(1500 * (tentativa + 1));
      continue;
    }
    if (!r.ok) throw new Error(`PubMed ${endpoint} HTTP ${r.status}`);
    return r;
  }
  throw new Error(`PubMed ${endpoint} indisponivel apos 3 tentativas`);
}

const semTags = (s) => decodificarEntidades(String(s || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const primeiro = (xml, re) => (xml.match(re) || [])[1];

function extrairArtigo(xml) {
  const pmid = primeiro(xml, /<PMID[^>]*>(\d+)<\/PMID>/);
  const titulo = semTags(primeiro(xml, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) ||
    primeiro(xml, /<VernacularTitle[^>]*>([\s\S]*?)<\/VernacularTitle>/));
  const partes = [...xml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(([, attrs, txt]) => {
    const rotulo = (attrs.match(/Label="([^"]+)"/) || [])[1];
    return rotulo ? `${rotulo}: ${semTags(txt)}` : semTags(txt);
  });
  const autores = [...xml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g)].map(([, a]) => {
    const coletivo = primeiro(a, /<CollectiveName>([\s\S]*?)<\/CollectiveName>/);
    if (coletivo) return semTags(coletivo);
    const sobrenome = semTags(primeiro(a, /<LastName>([\s\S]*?)<\/LastName>/));
    const iniciais = semTags(primeiro(a, /<Initials>([\s\S]*?)<\/Initials>/));
    return `${sobrenome} ${iniciais}`.trim();
  }).filter(Boolean);
  const tipos = [...xml.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map(([, t]) => semTags(t));
  const pubDate = primeiro(xml, /<PubDate>([\s\S]*?)<\/PubDate>/) || '';
  const ano = primeiro(pubDate, /<Year>(\d{4})<\/Year>/) || primeiro(pubDate, /<MedlineDate>(\d{4})/) ||
    primeiro(xml, /<ArticleDate[^>]*>\s*<Year>(\d{4})<\/Year>/);
  const doi = primeiro(xml, /<ArticleId IdType="doi">([^<]+)<\/ArticleId>/) ||
    primeiro(xml, /<ELocationID EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/);
  const retratado = tipos.includes('Retracted Publication') || /RefType="RetractionIn"/.test(xml);
  const pmc = primeiro(xml, /<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/);
  return {
    afiliacao: semTags(primeiro(xml, /<AffiliationInfo>\s*<Affiliation>([\s\S]*?)<\/Affiliation>/)).slice(0, 300),
    pmc: pmc || '',
    texto_completo: pmc ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/` : '',
    uid: `pubmed:${pmid}`,
    origem: 'pubmed',
    base: 'PubMed/MEDLINE',
    id: pmid,
    pmid,
    titulo,
    autores,
    ano: ano || '',
    periodico: semTags(primeiro(xml, /<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/)) ||
      semTags(primeiro(xml, /<MedlineTA>([\s\S]*?)<\/MedlineTA>/)),
    periodico_nlm: semTags(primeiro(xml, /<MedlineTA>([\s\S]*?)<\/MedlineTA>/)),
    periodico_completo: semTags(primeiro(xml, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/)),
    volume: semTags(primeiro(xml, /<Volume>([\s\S]*?)<\/Volume>/)),
    numero: semTags(primeiro(xml, /<Issue>([\s\S]*?)<\/Issue>/)),
    paginas: semTags(primeiro(xml, /<MedlinePgn>([\s\S]*?)<\/MedlinePgn>/)),
    eloc: semTags(primeiro(xml, /<ELocationID EIdType="pii"[^>]*>([^<]+)<\/ELocationID>/)),
    doi: doi ? doi.trim() : '',
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    resumo: partes.join(' '),
    tipos,
    idiomas: [...xml.matchAll(/<Language>([\s\S]*?)<\/Language>/g)].map(([, l]) => l),
    descritores: [...xml.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g)].map(([, d]) => semTags(d)),
    retratado,
  };
}

export async function detalhes(pmids) {
  const registros = [];
  for (let i = 0; i < pmids.length; i += 100) {
    const r = await chamar('efetch.fcgi', { db: 'pubmed', retmode: 'xml', id: pmids.slice(i, i + 100).join(',') });
    const xml = await r.text();
    registros.push(...[...xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)].map(([, a]) => extrairArtigo(a)));
  }
  return registros;
}

// Filtros escritos DENTRO da string, para que a estrategia relatada no artigo seja exatamente a executada.
export function montarEstrategia(consulta, { anoInicial, idiomas = ['pt', 'en', 'es'], textoCompleto = true, excluirNaoPrimarios = true, excluirRelatos = true } = {}) {
  const nomes = { pt: 'portuguese', en: 'english', es: 'spanish' };
  const partes = [`(${consulta})`];
  if (anoInicial) partes.push(`("${anoInicial}/01/01"[dp] : "3000"[dp])`);
  if (idiomas?.length) partes.push(`(${idiomas.map((l) => `${nomes[l] || l}[la]`).join(' OR ')})`);
  if (textoCompleto) partes.push('"free full text"[Filter]');
  let estrategia = partes.join(' AND ');
  const tipos = [];
  if (excluirNaoPrimarios) tipos.push('review[pt]', '"systematic review"[pt]', '"meta-analysis"[pt]', 'editorial[pt]', 'letter[pt]', 'comment[pt]', '"practice guideline"[pt]');
  if (excluirRelatos) tipos.push('"case reports"[pt]');
  if (tipos.length) estrategia += ` NOT (${tipos.join(' OR ')})`;
  return estrategia;
}

// Confere no vocabulario MeSH cada termo marcado como [MeSH Terms]/[mh]; o que nao existe como
// descritor vira busca em titulo/resumo ([tiab]), para que o artigo so chame de MeSH o que e MeSH.
export async function validarMesh(consulta, descritores = []) {
  const re = /"([^"]+)"\s*\[(?:MeSH Terms|MeSH|mh)(?::noexp)?\]/gi;
  const termos = [...new Set([...consulta.matchAll(re)].map((m) => m[1]))];
  const validos = new Map();
  for (const termo of new Set([...termos, ...descritores])) {
    try {
      const r = await chamar('esearch.fcgi', { db: 'mesh', retmode: 'json', retmax: 0, term: `"${termo}"[MeSH Terms]` });
      const j = await r.json();
      validos.set(termo, Number(j.esearchresult?.count || 0) > 0);
    } catch {
      validos.set(termo, true); // sem resposta: nao altera a estrategia
    }
  }
  const trocados = termos.filter((t) => !validos.get(t));
  const nova = consulta.replace(re, (m, termo) => (validos.get(termo) ? m : `"${termo}"[tiab]`));
  return { consulta: nova, trocados, descritores: descritores.filter((d) => validos.get(d)) };
}

export async function contar(estrategia) {
  const r = await chamar('esearch.fcgi', { db: 'pubmed', retmode: 'json', retmax: 0, term: estrategia });
  const j = await r.json();
  if (j.esearchresult?.ERROR || j.error) throw new Error(`PubMed recusou a estrategia: ${j.esearchresult?.ERROR || j.error}`);
  return { total: Number(j.esearchresult?.count || 0), traducao: j.esearchresult?.querytranslation || '', avisos: j.esearchresult?.warninglist || null };
}

export async function buscar(estrategia, { max = 300 } = {}) {
  const r = await chamar('esearch.fcgi', { db: 'pubmed', retmode: 'json', sort: 'relevance', retmax: max, term: estrategia });
  const j = await r.json();
  if (j.esearchresult?.ERROR || j.error) throw new Error(`PubMed recusou a estrategia: ${j.esearchresult?.ERROR || j.error}`);
  const ids = j.esearchresult?.idlist || [];
  return {
    total: Number(j.esearchresult?.count || 0),
    traducao: j.esearchresult?.querytranslation || estrategia,
    consulta: estrategia,
    url_publica: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(estrategia)}`,
    registros: await detalhes(ids),
  };
}

// Verificacao independente: nova chamada (esummary) diferente da usada na busca (efetch).
export async function conferir(pmid) {
  const r = await chamar('esummary.fcgi', { db: 'pubmed', retmode: 'json', id: pmid });
  const j = await r.json();
  const d = j.result?.[pmid];
  if (!d || d.error) return { existe: false, motivo: d?.error || 'PMID nao encontrado no PubMed' };
  return {
    existe: true,
    titulo: d.title,
    ano: (d.pubdate || '').slice(0, 4),
    retratado: (d.pubtype || []).includes('Retracted Publication'),
    doi: (d.articleids || []).find((a) => a.idtype === 'doi')?.value || '',
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}

import { abrir, buscarNaPagina, capturarEvidencia, comNavegador, textoDaPagina } from '../navegador.mjs';
import { autorVancouver, paginaContemTitulo, similaridade } from '../texto.mjs';

// Busca por tema: search.scielo.org (so via navegador real — anti-bot).
// Confirmacao por ID: ArticleMeta API oficial (sem anti-bot, sem chave).
const BUSCA = 'https://search.scielo.org/';
const ARTICLEMETA = 'https://articlemeta.scielo.org/api/v1';
const dominios = new Map();

// Abreviatura ISO do periodico registrada no SciELO (campo v151 do ArticleMeta), usada quando o
// periodico nao esta no NLM Catalog.
export async function abreviaturaScielo(issn) {
  if (!/^\d{4}-\d{3}[\dxX]$/.test(String(issn || ''))) return null;
  try {
    const r = await fetch(`${ARTICLEMETA}/journal/?issn=${encodeURIComponent(issn)}`, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const j = await r.json();
    const d = Array.isArray(j) ? j[0] : j;
    return (d?.v151?.[0]?._ || d?.v150?.[0]?._ || '').trim() || null;
  } catch {
    return null;
  }
}

export function parseRis(texto) {
  const registros = [];
  let atual = null;
  let ultimaTag = null;
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z][A-Z0-9])  - ?(.*)$/);
    if (m) {
      const [, tag, valor] = m;
      if (tag === 'TY') {
        atual = {};
        registros.push(atual);
      }
      if (!atual) continue;
      if (tag === 'ER') {
        atual = null;
        continue;
      }
      (atual[tag] ||= []).push(valor.trim());
      ultimaTag = tag;
    } else if (atual && ultimaTag && linha.trim()) {
      const lista = atual[ultimaTag];
      lista[lista.length - 1] += ` ${linha.trim()}`;
    }
  }
  return registros;
}

function escolherResumo(resumos, idioma) {
  const limpos = (resumos || []).map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const marcador = { pt: /^Resumo\b/i, en: /^Abstract\b/i, es: /^Resumen\b/i };
  const ordem = [idioma, 'pt', 'en', 'es'];
  for (const lang of ordem) {
    const achado = limpos.find((r) => marcador[lang]?.test(r));
    if (achado) return achado.replace(/^(Resumo|Abstract|Resumen)\s*/i, '');
  }
  return limpos[0] || '';
}

async function dominioColecao(codigo) {
  if (dominios.has(codigo)) return dominios.get(codigo);
  let dominio = 'www.scielo.br';
  try {
    const j = await (await fetch(`${ARTICLEMETA}/collection/?code=${encodeURIComponent(codigo)}`, { signal: AbortSignal.timeout(30000) })).json();
    if (j?.domain) dominio = j.domain;
  } catch {
    // mantem o padrao
  }
  dominios.set(codigo, dominio);
  return dominio;
}

function registroDeRis(r, idioma) {
  // ID vem como "S2237-96222026000102629-scl": PID (que ja tem um hifen) + codigo da colecao.
  const idBruto = r.ID?.[0] || '';
  const corte = idBruto.lastIndexOf('-');
  const pid = corte > 5 ? idBruto.slice(0, corte) : idBruto;
  const colecao = corte > 5 ? idBruto.slice(corte + 1) : '';
  return {
    uid: `scielo:${pid}`,
    origem: 'scielo',
    base: `SciELO${r.DB?.[0] ? ` (${r.DB[0].replace(/^SciELO\s*/i, '') || 'rede'})` : ''}`,
    id: pid,
    pid,
    colecao,
    titulo: r.TI?.[0] || '',
    titulos_alternativos: r.TT || [],
    autores: (r.AU || []).map(autorVancouver),
    ano: r.PY?.[0] || r.DA?.[0] || '',
    periodico: r.J2?.[0] || r.JO?.[0] || '',
    periodico_completo: r.JO?.[0] || '',
    issn: r.SN?.[0] || '',
    volume: r.VL?.[0] || '',
    numero: r.IS?.[0] || '',
    paginas: [r.SP?.[0], r.EP?.[0]].filter(Boolean).join('-'),
    doi: (r.DO?.[0] || '').trim(),
    url: '',
    resumo: escolherResumo(r.AB, idioma),
    tipos: [r.TY?.[0] === 'JOUR' ? 'Artigo de periódico' : r.TY?.[0]].filter(Boolean),
    idiomas: r.LA || [],
    descritores: r.KW || [],
    retratado: false,
  };
}

export function montarUrl(consulta, { anoInicial, idiomas = ['pt', 'en', 'es'], idiomaInterface = 'pt', inicio = 0, porPagina = 100 } = {}) {
  const params = new URLSearchParams({ q: consulta, lang: idiomaInterface, count: String(porPagina), from: String(inicio), sort: 'RELEVANCE' });
  if (anoInicial) {
    for (let a = anoInicial; a <= new Date().getFullYear(); a++) params.append('filter[year_cluster][]', String(a));
  }
  for (const l of idiomas || []) params.append('filter[la][]', l);
  return `${BUSCA}?${params}`;
}

export async function buscar(consulta, { anoInicial, idiomas = ['pt', 'en', 'es'], idioma = 'pt', max = 300 } = {}) {
  const urlBusca = montarUrl(consulta, { anoInicial, idiomas, idiomaInterface: idioma, inicio: 0 });

  const { ris, links, total } = await comNavegador(async (pagina) => {
    let risTotal = '';
    const itens = {};
    let totalHits = 0;
    for (let inicio = 0; inicio < max; inicio += 100) {
      const url = montarUrl(consulta, { anoInicial, idiomas, idiomaInterface: idioma, inicio: inicio ? inicio + 1 : 0 });
      const html = await buscarNaPagina(pagina, url, BUSCA);
      const extraido = await pagina.evaluate((h) => {
        const d = new DOMParser().parseFromString(h, 'text/html');
        const mapa = {};
        for (const n of d.querySelectorAll('div.item')) {
          const a = n.querySelector('a[href*="pid="]');
          if (a) mapa[n.id] = a.getAttribute('href');
        }
        const totalTxt = (d.body.innerText.match(/Resultados:\s*([\d.]+)/) || [])[1] || '';
        return { mapa, total: Number(totalTxt.replace(/\./g, '')) || 0, n: Object.keys(mapa).length };
      }, html.texto);
      Object.assign(itens, extraido.mapa);
      totalHits = totalHits || extraido.total;
      if (!extraido.n) break;
      risTotal += `\n${(await buscarNaPagina(pagina, `${url}&output=ris`, BUSCA)).texto}`;
      if (inicio + 100 >= totalHits) break;
    }
    return { ris: risTotal, links: itens, total: totalHits };
  });

  const vistos = new Map();
  const brutos = parseRis(ris);
  for (const bruto of brutos) {
    const reg = registroDeRis(bruto, idioma);
    if (!reg.pid || !reg.titulo) continue;
    const idCompleto = `${reg.pid}-${reg.colecao}`;
    let href = links[idCompleto] || '';
    if (href.startsWith('/')) href = `https://${await dominioColecao(reg.colecao)}${href}`;
    // Mantem o esquema original: alguns sites legados da rede SciELO nao respondem em https.
    reg.url = (href || `https://${await dominioColecao(reg.colecao || 'scl')}/scielo.php?script=sci_arttext&pid=${reg.pid}`)
      .replace(/&lang=\w+$/, '');
    reg.texto_completo = reg.url;
    reg.afiliacao = (bruto.AD || []).join('; ').slice(0, 300);
    const existente = vistos.get(reg.pid);
    if (!existente || (reg.colecao === 'scl' && existente.colecao !== 'scl')) vistos.set(reg.pid, reg);
  }
  // total = registros no site (inclui a mesma publicacao repetida em colecoes tematicas, ex. -scl e -spa)
  return { total, recuperados: brutos.length, consulta, url_publica: urlBusca, registros: [...vistos.values()] };
}

// Confirmacao em duas vias: API ArticleMeta (dados oficiais) + abertura real da pagina do artigo.
export async function conferir(reg, arquivoEvidencia) {
  const resultado = { existe: false, titulo_api: '', similaridade_api: 0, pagina_ok: false, evidencia: '' };
  try {
    const url = `${ARTICLEMETA}/article/?code=${encodeURIComponent(reg.pid)}&collection=${encodeURIComponent(reg.colecao || 'scl')}&format=json`;
    const j = await (await fetch(url, { signal: AbortSignal.timeout(45000) })).json();
    const titulos = (j?.article?.v12 || []).map((t) => t._).filter(Boolean);
    if (titulos.length) {
      resultado.existe = true;
      const candidatos = [reg.titulo, ...(reg.titulos_alternativos || [])];
      const melhor = titulos
        .map((t) => ({ t, s: Math.max(...candidatos.map((c) => similaridade(t, c))) }))
        .sort((a, b) => b.s - a.s)[0];
      resultado.titulo_api = melhor.t;
      resultado.similaridade_api = melhor.s;
      resultado.doi_api = j.doi || '';
      resultado.ano_api = j.publication_year || '';
      resultado.url_api = j.fulltexts?.html?.pt || j.fulltexts?.html?.en || Object.values(j.fulltexts?.html || {})[0] || '';
    }
  } catch (e) {
    resultado.erro_api = e.message;
  }

  const alternativas = [
    reg.url,
    reg.url?.startsWith('http:') ? reg.url.replace(/^http:/, 'https:') : '',
    resultado.url_api,
    reg.doi ? `https://doi.org/${reg.doi}` : '',
  ].filter(Boolean);
  const candidatos = [reg.titulo, ...(reg.titulos_alternativos || []), resultado.titulo_api].filter(Boolean);
  const erros = [];
  for (const alvo of [...new Set(alternativas)]) {
    try {
      const ok = await comNavegador(async (pagina) => {
        const r = await abrir(pagina, alvo);
        const texto = (await textoDaPagina(pagina)).slice(0, 30000);
        if (!r.passou || !candidatos.some((c) => paginaContemTitulo(texto, c))) return false;
        resultado.url_confirmada = pagina.url();
        if (arquivoEvidencia) resultado.evidencia = await capturarEvidencia(pagina, arquivoEvidencia);
        return true;
      });
      if (ok) {
        resultado.pagina_ok = true;
        break;
      }
      erros.push(`${alvo}: titulo nao encontrado na pagina`);
    } catch (e) {
      erros.push(`${alvo}: ${e.message.split('\n')[0]}`);
    }
  }
  if (!resultado.pagina_ok) resultado.erro_pagina = erros.join(' | ');
  return resultado;
}

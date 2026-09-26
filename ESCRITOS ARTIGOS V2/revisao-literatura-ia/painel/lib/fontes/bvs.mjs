import { abrir, buscarNaPagina, capturarEvidencia, comNavegador, textoDaPagina } from '../navegador.mjs';
import { autorVancouver, paginaContemTitulo } from '../texto.mjs';

// A BIREME declara oficialmente que NAO existe API publica de busca bibliografica da BVS/LILACS.
// O caminho real e o proprio Portal Regional (pesquisa.bvsalud.org), que devolve JSON (Solr) com
// output=json — mas so para um navegador real, por causa do anti-bot.
const PORTAL = 'https://pesquisa.bvsalud.org/portal/';

const primeiro = (v) => (Array.isArray(v) ? v[0] : v) || '';

// Alguns registros trazem o autor sem iniciais em "au" ("Altamirano,") mas completo em
// "afiliacao_autor" ("Altamirano, E; Universidade..."); usa essa segunda forma quando existir.
function completarIniciais(autores, afiliacoes) {
  return autores.map((a) => {
    const nome = String(a).trim();
    if (!/^[^,]+,?\s*$/.test(nome)) return nome;
    const sobrenome = nome.replace(/,\s*$/, '');
    const achado = afiliacoes.join('; ').match(new RegExp(`${sobrenome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*([^;]+)`));
    return achado ? `${sobrenome}, ${achado[1].trim()}` : sobrenome;
  });
}

function escolherPorIdioma(doc, campo, idioma) {
  const porIdioma = doc[`${campo}_${idioma}`];
  if (porIdioma) return primeiro(porIdioma);
  for (const lang of ['pt', 'en', 'es']) if (doc[`${campo}_${lang}`]) return primeiro(doc[`${campo}_${lang}`]);
  return primeiro(doc[campo]);
}

function limparResumo(s) {
  return String(s || '').replace(/^\[?(RESUMO|RESUMEN|ABSTRACT)\]?\.?\s*/i, '').replace(/\s+/g, ' ').trim();
}

function registroDeDoc(doc, idioma) {
  const bases = doc.db || [];
  const ano = String(doc.da || '').slice(0, 4);
  const doi = primeiro(doc.aid).startsWith('10.') ? primeiro(doc.aid) : '';
  return {
    uid: `bvs:${doc.id}`,
    origem: 'bvs',
    base: bases.includes('LILACS') ? 'LILACS' : `BVS (${bases.join(', ') || 'regional'})`,
    id: doc.id,
    bases,
    titulo: escolherPorIdioma(doc, 'ti', idioma),
    titulos_alternativos: (doc.ti || []).filter(Boolean),
    autores: completarIniciais(doc.au || [], doc.afiliacao_autor || []).map(autorVancouver),
    ano,
    periodico: primeiro(doc.ta),
    periodico_completo: primeiro(doc.ta),
    fonte_texto: primeiro(doc.fo),
    issn: primeiro(doc.is).replace(' ', '-'),
    volume: primeiro(doc.vi),
    numero: primeiro(doc.ip),
    paginas: primeiro(doc.pg),
    doi,
    url: `${PORTAL}resource/pt/${encodeURIComponent(doc.id)}`,
    url_texto: primeiro(doc.ur),
    texto_completo: primeiro(doc.ur),
    afiliacao: [
      ...(doc.pais_afiliacao || []).map((p) => (String(p).match(/\^p([^^]+)/) || [])[1] || p),
      ...(doc.afiliacao_autor || []).slice(0, 1),
    ].filter(Boolean).join('; ').slice(0, 300),
    resumo: limparResumo(escolherPorIdioma(doc, 'ab', idioma)),
    tipos: doc.pt || doc.type || [],
    idiomas: doc.la || [],
    descritores: doc.mh || [],
    retratado: false,
  };
}

export function montarUrl(consulta, { anoInicial, idiomas = ['pt', 'en', 'es'], idiomaInterface = 'pt', base = 'LILACS', textoCompleto = true, inicio = 0, porPagina = 100, json = true } = {}) {
  const params = new URLSearchParams({ q: consulta, lang: idiomaInterface });
  if (json) {
    params.set('output', 'json');
    params.set('count', String(porPagina));
    if (inicio) params.set('from', String(inicio + 1));
  }
  if (base) params.append('filter[db][]', base);
  if (anoInicial) {
    for (let a = anoInicial; a <= new Date().getFullYear(); a++) params.append('filter[year_cluster][]', String(a));
  }
  for (const l of idiomas || []) params.append('filter[la][]', l);
  if (textoCompleto) params.append('filter[fulltext][]', '1');
  return `${PORTAL}?${params}`;
}

// base = 'LILACS' filtra so o LILACS; base = null busca toda a BVS.
export async function buscar(consulta, { anoInicial, idiomas = ['pt', 'en', 'es'], idioma = 'pt', base = 'LILACS', textoCompleto = true, max = 300 } = {}) {
  return comNavegador(async (pagina) => {
    const docs = [];
    let total = 0;
    let filtros = null;
    for (let inicio = 0; inicio < max; inicio += 100) {
      const url = montarUrl(consulta, { anoInicial, idiomas, idiomaInterface: idioma, base, textoCompleto, inicio });
      const r = await buscarNaPagina(pagina, url, PORTAL);
      let j;
      try {
        j = JSON.parse(r.texto);
      } catch {
        throw new Error(`BVS devolveu algo que nao e JSON (HTTP ${r.status})`);
      }
      const resp = j?.diaServerResponse?.[0];
      total = resp?.response?.numFound || 0;
      filtros ||= resp?.responseHeader?.params?.fq;
      const pagDocs = resp?.response?.docs || [];
      docs.push(...pagDocs);
      if (!pagDocs.length || docs.length >= total) break;
    }
    const vistos = new Map();
    for (const doc of docs) {
      const reg = registroDeDoc(doc, idioma);
      if (reg.titulo && !vistos.has(reg.uid)) vistos.set(reg.uid, reg);
    }
    return {
      total,
      recuperados: docs.length,
      consulta,
      filtros_aplicados: filtros,
      url_publica: montarUrl(consulta, { anoInicial, idiomas, idiomaInterface: idioma, base, textoCompleto, json: false }),
      registros: [...vistos.values()],
    };
  });
}

// Reabre a pagina do registro no portal, confere o titulo na tela e salva captura como evidencia.
export async function conferir(reg, arquivoEvidencia) {
  const resultado = { existe: false, pagina_ok: false, evidencia: '' };
  try {
    await comNavegador(async (pagina) => {
      const r = await abrir(pagina, reg.url);
      const texto = await textoDaPagina(pagina);
      const candidatos = [reg.titulo, ...(reg.titulos_alternativos || [])];
      resultado.pagina_ok = r.passou && candidatos.some((c) => paginaContemTitulo(texto, c));
      resultado.existe = resultado.pagina_ok;
      resultado.url_confirmada = pagina.url();
      if (arquivoEvidencia) resultado.evidencia = await capturarEvidencia(pagina, arquivoEvidencia);
    });
  } catch (e) {
    resultado.erro_pagina = e.message;
  }
  return resultado;
}

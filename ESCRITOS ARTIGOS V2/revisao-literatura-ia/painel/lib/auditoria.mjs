import { citacoesDoTexto, expandirCitacao } from './referencias.mjs';
import { normalizar } from './texto.mjs';

const TAMANHO_NGRAMA = 8;
function ngramas(texto) {
  const p = normalizar(texto).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i + TAMANHO_NGRAMA <= p.length; i++) out.push(p.slice(i, i + TAMANHO_NGRAMA).join(' '));
  return out;
}

// Protocolo de parafrase ativa: 8 palavras seguidas identicas a um resumo = copia provavel.
export function trechosCopiados(md, fontes) {
  const conjunto = new Set(fontes.flatMap((f) => ngramas(`${f.titulo} ${f.resumo}`)));
  const achados = [];
  for (const { texto } of paragrafos(md)) {
    for (const frase of dividirFrases(texto)) {
      const iguais = ngramas(frase).filter((g) => conjunto.has(g));
      if (iguais.length) achados.push({ tipo: 'copia_de_resumo', gravidade: 'alta', trecho: frase, detalhe: `Trecho idêntico a um resumo de fonte: "${iguais[0]}…". Reescrever com paráfrase ativa.` });
    }
  }
  return achados;
}

const MANEIRISMOS = [
  /é importante (ressaltar|destacar|salientar|mencionar)/i, /vale (ressaltar|destacar|salientar|mencionar)/i,
  /cabe (ressaltar|destacar|salientar)/i, /no cenário atual/i, /desempenha um papel (crucial|fundamental|essencial)/i,
  /em suma/i, /em última análise/i, /nesse sentido, é/i, /torna-se (imprescindível|fundamental)/i, /\bfaz-se necessário\b/i,
];
export function maneirismos(md) {
  const achados = [];
  for (const { texto } of paragrafos(md)) {
    for (const frase of dividirFrases(texto)) {
      const re = MANEIRISMOS.find((r) => r.test(frase));
      if (re) achados.push({ tipo: 'maneirismo_ia', gravidade: 'baixa', trecho: frase, detalhe: `Expressão típica de texto gerado por IA (${frase.match(re)[0]}). Reescrever de forma direta.` });
    }
  }
  return achados;
}

// Checagens deterministicas (sem IA) sobre o texto gerado, rodadas a cada rodada de revisao.

export function dividirFrases(paragrafo) {
  return paragrafo
    .replace(/\b(et al|p\. ex|e\.g|i\.e|vs|Dr|Dra|Sr|Sra|n)\.\s/gi, (m) => m.replace('. ', '.\u0000'))
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/)
    .map((f) => f.replace(/\u0000/g, ' ').trim())
    .filter(Boolean);
}

export function paragrafos(md) {
  const blocos = [];
  let secao = '';
  for (const bloco of md.split(/\n\s*\n/)) {
    const t = bloco.trim();
    if (!t) continue;
    const titulo = t.match(/^#{1,6}\s+(.*)$/m);
    if (titulo && t.split('\n').length === 1) {
      secao = titulo[1].trim();
      continue;
    }
    blocos.push({ secao, texto: t });
  }
  return blocos;
}

// Numeros sao comparados por VALOR. Um token como "4.013" ou "0,964" e ambiguo entre pt-BR e ingles
// (milhar x decimal), entao cada token gera todas as leituras possiveis; "79,7" confere com "79.71"
// (arredondamento para as mesmas casas decimais). Anos (19xx/20xx) nao sao checados.
const RE_TOKEN = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;

export function leiturasNumero(token) {
  const t = token.replace(/\s/g, '');
  const leituras = [];
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) leituras.push({ v: parseFloat(t.replace(/\./g, '').replace(',', '.')), casas: t.split(',')[1].length });
  else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(t)) leituras.push({ v: parseFloat(t.replace(/,/g, '')), casas: t.split('.')[1].length });
  else {
    if (/^\d{1,3}([.,]\d{3})+$/.test(t)) leituras.push({ v: parseFloat(t.replace(/[.,]/g, '')), casas: 0 });
    if (/^\d+[.,]\d+$/.test(t)) leituras.push({ v: parseFloat(t.replace(',', '.')), casas: t.split(/[.,]/)[1].length });
    if (/^\d+$/.test(t)) leituras.push({ v: parseFloat(t), casas: 0 });
  }
  return leituras;
}

const cacheValores = new Map();
function valoresDoTexto(texto) {
  if (cacheValores.has(texto)) return cacheValores.get(texto);
  const vals = [];
  for (const m of texto.matchAll(RE_TOKEN)) for (const l of leiturasNumero(m[0])) vals.push(l.v);
  if (cacheValores.size > 500) cacheValores.clear();
  cacheValores.set(texto, vals);
  return vals;
}

export function numeroNoResumo(token, texto) {
  const vals = valoresDoTexto(texto);
  return leiturasNumero(token).some(({ v, casas }) => vals.some((x) =>
    Math.abs(x - v) < 1e-9 || (casas > 0 && Math.abs(Math.round(x * 10 ** casas) / 10 ** casas - v) < 1e-9)));
}

// Numeros "de resultado" (percentuais, decimais, amostras de 3+ digitos) que precisam existir no resumo citado.
export function numerosRelevantes(frase) {
  const semCitacao = frase.replace(/\[[\d,\s–-]+\]/g, ' ');
  const achados = new Set();
  for (const m of semCitacao.matchAll(/(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?![\d])/g)) {
    const token = m[1];
    const ehPercentual = /^\s?%/.test(semCitacao.slice(m.index + token.length));
    const ehDecimal = /[.,]/.test(token);
    const inteiro = token.replace(/[.,]/g, '');
    if (!ehPercentual && !ehDecimal && inteiro.length < 3) continue;
    if (!ehDecimal && /^(19|20)\d{2}$/.test(token)) continue;
    achados.add(token);
  }
  return [...achados];
}

const numeroNoTexto = numeroNoResumo;

export function checarTexto(md, fontes) {
  const problemas = [];
  const total = fontes.length;
  for (const n of citacoesDoTexto(md)) {
    if (n < 1 || n > total) problemas.push({ tipo: 'citacao_inexistente', gravidade: 'alta', trecho: `[${n}]`, detalhe: `Citação [${n}] não corresponde a nenhuma fonte verificada.` });
  }
  const secoesSemExigencia = /resumo|abstract|considera|conclus|palavras|metodolog|nota/i;
  for (const { secao, texto } of paragrafos(md)) {
    if (texto.startsWith('#')) continue;
    const temCitacao = /\[\d/.test(texto);
    if (!temCitacao && !secoesSemExigencia.test(secao) && texto.length > 250) {
      problemas.push({ tipo: 'paragrafo_sem_citacao', gravidade: 'media', trecho: texto.slice(0, 160), detalhe: `Parágrafo sem nenhuma citação na seção "${secao}".` });
    }
    for (const frase of dividirFrases(texto)) {
      const cits = [...new Set([...frase.matchAll(/\[(\d+(?:\s*[-–,]\s*\d+)*)\]/g)].flatMap((m) => expandirCitacao(m[1])))];
      if (!cits.length) continue;
      const resumos = cits.filter((n) => n >= 1 && n <= total).map((n) => `${fontes[n - 1].titulo} ${fontes[n - 1].resumo}`).join(' ');
      for (const num of numerosRelevantes(frase)) {
        if (!numeroNoTexto(num, resumos)) {
          problemas.push({ tipo: 'numero_sem_fonte', gravidade: 'alta', trecho: frase, detalhe: `O número "${num}" não aparece no título/resumo da(s) fonte(s) citada(s) ${cits.map((c) => `[${c}]`).join('')}.` });
        }
      }
    }
  }
  const citadas = new Set(citacoesDoTexto(md));
  const naoCitadas = fontes.map((_, i) => i + 1).filter((n) => !citadas.has(n));
  return { problemas, naoCitadas };
}

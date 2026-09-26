// As referencias sao montadas por codigo a partir dos metadados conferidos — o modelo de IA
// nunca escreve a lista de referencias, entao nao tem como inventar uma.

const semPontoFinal = (s) => String(s || '').trim().replace(/[.\s]+$/, '');
// Nao duplica pontuacao: titulos que terminam em "?" ou "!" nao recebem ponto final.
const comPonto = (s) => (/[?!]$/.test(semPontoFinal(s)) ? semPontoFinal(s) : `${semPontoFinal(s)}.`);
const MESES = ['jan', 'fev', 'mar', 'abr', 'maio', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const limparUrl = (u) => String(u || '').replace(/([^:])\/{2,}/g, '$1/');

function autores(lista) {
  const a = (lista || []).filter(Boolean);
  if (!a.length) return '';
  const nomes = a.length > 6 ? [...a.slice(0, 6), 'et al'] : a;
  return `${nomes.join(', ')}.`;
}

function ehMonografia(reg) {
  return (reg.tipos || []).some((t) => /monogra|livro|book|tese|thesis|dissert|manual|guia/i.test(t));
}

export function referenciaVancouver(reg, { doi = reg.doi, url = reg.url_confirmada || reg.url, acesso = null } = {}) {
  const partes = [];
  const au = autores(reg.autores);
  if (au) partes.push(au);
  partes.push(comPonto(reg.titulo));

  if (reg.origem === 'bvs' && (ehMonografia(reg) || !reg.volume) && reg.fonte_texto) {
    partes.push(`${semPontoFinal(reg.fonte_texto)}.`);
  } else {
    let fonte = semPontoFinal(reg.periodico_nlm || reg.periodico || reg.periodico_completo);
    if (fonte) fonte += '.';
    let dados = reg.ano || '';
    if (reg.volume) dados += `;${reg.volume}`;
    if (reg.numero) dados += `(${reg.numero})`;
    if (reg.paginas || reg.eloc) dados += `:${reg.paginas || reg.eloc}`;
    partes.push(`${fonte} ${dados}.`.trim());
  }
  if (doi) partes.push(`doi:${doi}.`);
  if (reg.pmid) partes.push(`PMID: ${reg.pmid}.`);
  // URL so quando nao ha identificador persistente (DOI/PMID), com data de acesso (Vancouver).
  if (url && !doi && !reg.pmid) {
    const d = acesso ? new Date(acesso) : null;
    const citado = d ? ` [citado ${d.getFullYear()} ${MESES[d.getMonth()]} ${d.getDate()}]` : '';
    partes.push(`Disponível em: ${limparUrl(url)}${citado}`);
  }
  return partes.join(' ').replace(/\s+/g, ' ').replace(/\.\./g, '.');
}

const RE_CITACAO = /\[(\d+(?:\s*[-–,]\s*\d+)*)\]/g;

export function expandirCitacao(conteudo) {
  const nums = [];
  for (const parte of conteudo.split(',')) {
    const [a, b] = parte.split(/[-–]/).map((x) => Number(x.trim()));
    if (b && b > a && b - a < 50) for (let n = a; n <= b; n++) nums.push(n);
    else nums.push(a);
  }
  return nums;
}

function comprimir(nums) {
  const ord = [...new Set(nums)].sort((x, y) => x - y);
  const blocos = [];
  for (let i = 0; i < ord.length; i++) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1] === ord[j] + 1) j++;
    blocos.push(j - i >= 2 ? `${ord[i]}-${ord[j]}` : ord.slice(i, j + 1).join(','));
    i = j;
  }
  return `[${blocos.join(',')}]`;
}

// Renumera por ordem de primeira citacao (regra de Vancouver) e descarta numeros inexistentes.
export function renumerar(texto, totalFontes) {
  const mapa = new Map();
  const invalidas = [];
  const saida = texto.replace(RE_CITACAO, (m, conteudo) => {
    const novos = [];
    for (const n of expandirCitacao(conteudo)) {
      if (!Number.isInteger(n) || n < 1 || n > totalFontes) {
        invalidas.push(n);
        continue;
      }
      if (!mapa.has(n)) mapa.set(n, mapa.size + 1);
      novos.push(mapa.get(n));
    }
    return novos.length ? comprimir(novos) : '';
  });
  // mapa: numero original -> numero final; ordem: indices originais na ordem final
  const ordem = [...mapa.entries()].sort((a, b) => a[1] - b[1]).map(([orig]) => orig);
  return { texto: saida.replace(/ +([.,;:])/g, '$1'), ordem, invalidas };
}

export function citacoesDoTexto(texto) {
  const nums = [];
  for (const m of texto.matchAll(RE_CITACAO)) nums.push(...expandirCitacao(m[1]));
  return nums;
}

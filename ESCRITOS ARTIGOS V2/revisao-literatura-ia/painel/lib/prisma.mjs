import fs from 'node:fs';
import { chromium } from 'playwright';
import { escaparHtml } from './texto.mjs';

export const ROTULOS_MOTIVO = {
  fora_do_tema: 'fora do tema',
  nao_primario: 'estudo não primário',
  populacao_inadequada: 'população inadequada',
  resumo_congresso: 'resumo de congresso',
  relato_de_caso: 'relato de caso',
  sem_desfecho: 'sem dados de desfecho',
  sem_decisao: 'sem decisão na triagem',
  limite_escopo: 'menor relevância (limite de síntese)',
  nao_confirmado: 'não confirmados na fonte original',
  retratado: 'publicação retratada',
};

export const NOMES_BASE = { pubmed: 'PubMed/MEDLINE', scielo: 'SciELO', lilacs: 'LILACS' };

const soma = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
const n = (v) => `(n = ${v ?? 0})`;

function motivos(obj, excluir = []) {
  return Object.entries(obj || {})
    .filter(([k, v]) => v > 0 && !excluir.includes(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${ROTULOS_MOTIVO[k] || k} ${n(v)}`);
}

// Numeros derivados do estado da busca, no formato das caixas do PRISMA 2020.
export function numerosFluxo(p) {
  const exclTriagem = Object.fromEntries(Object.entries(p.excluidos_triagem || {}).filter(([k]) => k !== 'limite_escopo'));
  const limite = p.excluidos_triagem?.limite_escopo || 0;
  return {
    bases: Object.entries(p.bases).map(([k, b]) => `${NOMES_BASE[k]} ${n(b.total)}`),
    identificados: p.identificados,
    removidos: [
      `duplicados ${n(p.duplicatas)}`,
      p.retratados ? `publicações retratadas ${n(p.retratados)}` : '',
      p.sem_resumo ? `sem resumo disponível ${n(p.sem_resumo)}` : '',
      p.nao_recuperados ? `não recuperados (limite da busca) ${n(p.nao_recuperados)}` : '',
    ].filter(Boolean),
    totalRemovidos: p.identificados - p.triados,
    triados: p.triados,
    excluidosTriagem: soma(exclTriagem),
    motivosTriagem: motivos(exclTriagem),
    elegiveis: p.triados - soma(exclTriagem),
    limite,
    verificados: p.verificados,
    excluidosVerificacao: soma(p.falha_verificacao),
    motivosVerificacao: motivos(p.falha_verificacao),
    incluidos: p.incluidos,
  };
}

// Layout no padrao PRISMA 2020 (Page MJ et al., BMJ 2021), em tons de cinza, como SVG vetorial.
// Fonte grande o bastante para continuar legivel quando a figura e reduzida a largura da pagina
// (~16 cm no Word): 20 px numa figura de ~990 px equivalem a ~9 pt impressos.
const FS = 20;
const LH = 25;
const PAD = 14;
const RECUO = 20;
const CHAR = FS * 0.52;

// Quebra cada item em linhas que cabem na caixa; itens com recuo ficam deslocados em x (sem espacos).
function quebrar(itens, largura) {
  const saida = [];
  for (const item of itens) {
    const { t, recuo = 0, negrito = false, italico = false } = typeof item === 'string' ? { t: item } : item;
    // "(n = 60)" nunca e partido entre linhas; so subitens recuados ganham recuo extra na continuacao.
    const palavras = String(t).replace(/\(n = (\d+)\)/g, '(n\u0001=\u0001$1)').split(/\s+/).filter(Boolean);
    const continuacao = recuo ? recuo + 0.6 : 0;
    let atual = '';
    let r = recuo;
    const cabe = (s, rr) => s.length * CHAR <= largura - 2 * PAD - rr * RECUO;
    const fechar = () => saida.push({ t: atual.replace(/\u0001/g, ' '), recuo: r, negrito, italico });
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (!atual || cabe(teste, r)) atual = teste;
      else {
        fechar();
        atual = palavra;
        r = continuacao;
      }
    }
    if (atual) fechar();
  }
  return saida;
}

export function svgFluxograma(p) {
  const f = numerosFluxo(p);
  const so = p.segunda_opiniao;
  const reincluidos = so?.reincluidos?.length || 0;
  const xFase = 16;
  const larguraFase = 44;
  const larguraCaixa = 420;
  const larguraLado = 420;
  const xE = xFase + larguraFase + 18;
  const xD = xE + larguraCaixa + 56;
  const largura = xD + larguraLado + 16;
  const GAP = 44;
  const partes = [];
  let y = 76;

  const escreve = (linhas, x, y0) => linhas.map((l, i) =>
    `<text x="${x + PAD + l.recuo * RECUO}" y="${y0 + PAD + FS * 0.85 + i * LH}"${l.negrito ? ' font-weight="700"' : ''}${l.italico ? ' font-style="italic"' : ''}>${escaparHtml(l.t)}</text>`).join('');
  const alturaDe = (linhas) => 2 * PAD + (linhas.length - 1) * LH + FS;
  const caixa = (x, y0, w, h, linhas, destaque) => {
    partes.push(`<rect x="${x}" y="${y0}" width="${w}" height="${h}" fill="${destaque ? '#eeeeee' : '#ffffff'}" stroke="#000" stroke-width="1.5"/>`);
    partes.push(escreve(linhas, x, y0 + (h - alturaDe(linhas)) / 2));
  };
  const seta = (x1, y1, x2, y2) => partes.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1.5" marker-end="url(#seta)"/>`);
  const fase = (rotulo, y0, h) => partes.push(`<rect x="${xFase}" y="${y0}" width="${larguraFase}" height="${h}" rx="8" fill="#d9d9d9" stroke="#000" stroke-width="1.2"/><text transform="translate(${xFase + larguraFase / 2 + FS * 0.35},${y0 + h / 2}) rotate(-90)" text-anchor="middle" font-weight="700">${rotulo}</text>`);
  const minimoFase = (rotulo) => Math.ceil(rotulo.length * FS * 0.62 + 24);

  // Uma linha do fluxograma: caixa principal (esquerda) e, opcionalmente, caixa de exclusao (direita),
  // com a mesma altura. A seta vertical sai da base da caixa da esquerda e toca o topo da seguinte.
  let baseAnterior = null;
  const linha = (esq, dir, { destaque = false, alturaMin = 0 } = {}) => {
    const le = quebrar(esq, larguraCaixa);
    const ld = dir ? quebrar(dir, larguraLado) : [];
    const h = Math.max(alturaDe(le), dir ? alturaDe(ld) : 0, alturaMin);
    if (baseAnterior !== null) seta(xE + larguraCaixa / 2, baseAnterior, xE + larguraCaixa / 2, y);
    caixa(xE, y, larguraCaixa, h, le, destaque);
    if (dir) {
      caixa(xD, y, larguraLado, h, ld, false);
      seta(xE + larguraCaixa, y + h / 2, xD, y + h / 2);
    }
    const topo = y;
    baseAnterior = y + h;
    y += h + GAP;
    return { topo, fim: topo + h };
  };

  const larguraTopo = largura - xE - 16;
  partes.push(`<rect x="${xE}" y="16" width="${larguraTopo}" height="40" fill="#d9d9d9" stroke="#000" stroke-width="1.2"/><text x="${xE + larguraTopo / 2}" y="${16 + 20 + FS * 0.35}" text-anchor="middle" font-weight="700">Identificação de estudos por meio de bases de dados</text>`);

  const id = linha(
    [{ t: `Registros identificados ${n(f.identificados)}:`, negrito: true }, ...f.bases.map((b) => ({ t: b, recuo: 1 }))],
    [{ t: `Registros removidos antes da triagem ${n(f.totalRemovidos)}:`, negrito: true }, ...f.removidos.map((r) => ({ t: r, recuo: 1 }))],
    { alturaMin: minimoFase('Identificação') },
  );
  fase('Identificação', id.topo, id.fim - id.topo);

  const tri = linha(
    [{ t: `Registros triados por título e resumo ${n(f.triados)}`, negrito: true },
      ...(reincluidos ? [{ t: `${reincluidos} reincluídos após segunda avaliação de ${so.avaliados} registros regionais`, recuo: 1, italico: true }] : [])],
    [{ t: `Registros excluídos ${n(f.excluidosTriagem)}:`, negrito: true }, ...f.motivosTriagem.map((m) => ({ t: m, recuo: 1 }))],
  );
  if (f.limite) {
    linha([{ t: `Registros elegíveis ${n(f.elegiveis)}`, negrito: true }],
      [{ t: `Não incluídos por limite de síntese ${n(f.limite)}:`, negrito: true }, { t: 'menor relevância para a pergunta', recuo: 1 }]);
  }
  const ver = linha(
    [{ t: `Registros com existência e metadados verificados na fonte original ${n(f.verificados)}`, negrito: true }],
    [{ t: `Registros excluídos na verificação ${n(f.excluidosVerificacao)}${f.motivosVerificacao.length ? ':' : ''}`, negrito: true }, ...f.motivosVerificacao.map((m) => ({ t: m, recuo: 1 }))],
  );
  fase('Triagem', tri.topo, ver.fim - tri.topo);

  const inc = linha([{ t: `Estudos incluídos na revisão ${n(f.incluidos)}`, negrito: true }], null, { destaque: true, alturaMin: minimoFase('Inclusão') });
  fase('Inclusão', inc.topo, inc.fim - inc.topo);
  const altura = inc.fim + 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="Arial, Helvetica, sans-serif" font-size="${FS}" fill="#000">
<defs><marker id="seta" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#000"/></marker></defs>
<rect width="100%" height="100%" fill="#fff"/>
${partes.join('\n')}
</svg>`;
}

export async function renderizarFluxograma(p, arquivoPng, arquivoSvg) {
  const svg = svgFluxograma(p);
  fs.writeFileSync(arquivoSvg, svg);
  let navegador;
  try {
    navegador = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    navegador = await chromium.launch({ headless: true });
  }
  try {
    const pagina = await navegador.newPage({ deviceScaleFactor: 3 });
    await pagina.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
    await pagina.locator('svg').screenshot({ path: arquivoPng });
  } finally {
    await navegador.close();
  }
  return arquivoPng;
}

export function textoFluxo(p) {
  const f = numerosFluxo(p);
  const bases = Object.entries(p.bases).map(([k, b]) => `${NOMES_BASE[k]}: ${b.total}`).join('; ');
  let t = `A busca nas bases de dados resultou em ${f.identificados} registros (${bases}).`;
  if (p.nao_recuperados) t += ` Desses, ${p.nao_recuperados} registros de menor relevância, segundo a ordenação da própria base, não foram recuperados para triagem.`;
  const listaPt = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}` : xs[0] || '');
  const semN = (xs) => xs.map((x) => x.replace(/ \(n = (\d+)\)/, ' ($1)'));
  t += ` Após a remoção de ${listaPt(semN(f.removidos))}, ${f.triados} registros foram triados por título e resumo, e ${f.excluidosTriagem} foram excluídos: ${listaPt(semN(f.motivosTriagem))}.`;
  const so = p.segunda_opiniao;
  if (so?.reincluidos?.length) t += ` Na segunda avaliação dos ${so.avaliados} registros regionais excluídos, ${so.reincluidos.length} foram reincluídos.`;
  if (f.limite) t += ` Dos ${f.elegiveis} registros elegíveis, ${f.limite} de menor relevância para a pergunta não foram incluídos, por viabilidade de síntese.`;
  t += ` Os ${f.verificados} registros restantes tiveram existência e metadados verificados na fonte original${f.excluidosVerificacao ? `, com exclusão de ${f.excluidosVerificacao} (${listaPt(semN(f.motivosVerificacao))})` : ', sem exclusões nessa etapa'}. Ao final, ${f.incluidos} estudos foram incluídos nesta revisão (Figura 1).`;
  return t;
}

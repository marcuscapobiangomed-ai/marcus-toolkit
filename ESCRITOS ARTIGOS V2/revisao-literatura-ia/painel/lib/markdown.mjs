import { escaparHtml } from './texto.mjs';

// Renderizador Markdown minimo e seguro: escapa todo HTML antes de aplicar a formatacao.
function inline(s) {
  // "\\*" e asterisco literal (ex.: truncagem "predictor*" nas estrategias de busca)
  let t = escaparHtml(s).replace(/\\\*/g, '\u0003');
  t = t.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;])/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\[(\d+(?:[,-]\d+)*)\]/g, '<sup class="cit">[$1]</sup>');
  return t.replace(/\u0003/g, '*');
}

export function markdownParaHtml(md, opcoes = {}) {
  const html = [];
  const linhas = String(md || '').split('\n');
  let lista = null;
  let paragrafo = [];
  let tabelaAtual = null;

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      const texto = paragrafo.join(' ');
      if (/^\*\*(RESUMO|ABSTRACT|RESUMEN):/i.test(texto)) {
        html.push(`<p class="resumo-bloco">${inline(texto)}</p>`);
      } else if (/^\*\*(Palavras-chave|Keywords|Palabras clave):/i.test(texto)) {
        html.push(`<p class="palavras-chave">${inline(texto)}</p>`);
      } else if (/^\*\*(Autores|Tipo de estudo|Revista-alvo)/.test(texto) || /^\*[¹²³\*]/.test(texto)) {
        html.push(`<p class="frontal">${inline(texto)}</p>`);
      } else if (/^\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕ]/.test(texto)) {
        html.push(`<p class="referencia">${inline(texto)}</p>`);
      } else if (/^\*\*(Tabela|Quadro|Figura)\s+\d+/.test(texto)) {
        html.push(`<p class="legenda">${inline(texto)}</p>`);
      } else if (/^(Fonte|Notas?):/.test(texto)) {
        html.push(`<p class="fonte">${inline(texto)}</p>`);
      } else {
        html.push(`<p>${inline(texto)}</p>`);
      }
    }
    paragrafo = [];
  };

  const fecharLista = () => {
    if (lista) html.push(`</${lista}>`);
    lista = null;
  };

  const fecharTabela = () => {
    if (!tabelaAtual || !tabelaAtual.length) return;
    const n = tabelaAtual[0].length;
    const cabs = tabelaAtual[0].map((h) => h.toLowerCase().trim().replace(/[*_]/g, ''));
    let larguras = [];
    let alinhamentos = [];

    if (cabs.some((h) => h.includes('eixo')) && cabs.some((h) => h.includes('referência') || h.includes('referencia'))) {
      larguras = ['50%', '12%', '13%', '25%'];
      alinhamentos = ['left', 'center', 'center', 'center'];
    } else if (cabs.includes('base') && cabs.some((h) => h.includes('estratégia') || h.includes('estrategia'))) {
      larguras = ['16%', '46%', '28%', '10%'];
      alinhamentos = ['left', 'left', 'left', 'center'];
    } else if (cabs.some((h) => h.includes('autor')) && cabs.some((h) => h.includes('achados'))) {
      if (n === 7) {
        larguras = ['13%', '8%', '17%', '9%', '16%', '16%', '21%'];
        alinhamentos = ['left', 'center', 'left', 'center', 'left', 'left', 'left'];
      } else {
        larguras = ['15%', '9%', '20%', '18%', '15%', '23%'];
        alinhamentos = ['left', 'center', 'left', 'left', 'left', 'left'];
      }
    } else {
      const eq = (100 / n).toFixed(1) + '%';
      larguras = Array(n).fill(eq);
      alinhamentos = Array(n).fill('left');
    }

    const colgroup = larguras.length
      ? `<colgroup>${larguras.map((w) => `<col style="width:${w}">`).join('')}</colgroup>`
      : '';

    const trsCab = tabelaAtual.slice(0, 1).map((linha) => {
      const celulas = linha.map((c, colIdx) => {
        const align = alinhamentos[colIdx] || 'left';
        const style = align === 'center' ? ' style="text-align:center;"' : '';
        return `<th${style}>${inline(c)}</th>`;
      }).join('');
      return `<tr>${celulas}</tr>`;
    }).join('');

    const trsCorpo = tabelaAtual.slice(1).map((linha) => {
      const celulas = linha.map((c, colIdx) => {
        const align = alinhamentos[colIdx] || 'left';
        const style = align === 'center' ? ' style="text-align:center;"' : '';
        return `<td${style}>${inline(c)}</td>`;
      }).join('');
      return `<tr>${celulas}</tr>`;
    }).join('');

    html.push(`<table class="tabela-ibge">${colgroup}<thead>${trsCab}</thead><tbody>${trsCorpo}</tbody></table>`);
    tabelaAtual = null;
  };

  let secaoAtual = '';

  for (const linha of linhas) {
    const ltrim = linha.trim();
    if (ltrim.startsWith('|')) {
      fecharParagrafo();
      fecharLista();
      if (/^\|[\s:|-]+\|$/.test(ltrim)) continue;
      const celulas = ltrim.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      (tabelaAtual ||= []).push(celulas);
      continue;
    }
    if (tabelaAtual) fecharTabela();

    const img = ltrim.match(/^!\[([^\]]*)\]\(([\w./-]+\.(?:png|jpg|jpeg|svg))\)$/i);
    if (img) {
      fecharParagrafo();
      fecharLista();
      html.push(`<figure><img src="${opcoes.prefixoImagem || ''}${img[2]}" alt="${escaparHtml(img[1])}" style="max-width:100%">${img[1] && !/^Figura \d+$/.test(img[1]) ? `<figcaption>${inline(img[1])}</figcaption>` : ''}</figure>`);
      continue;
    }
    const h = linha.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      fecharParagrafo();
      fecharLista();
      const nivel = h[1].length;
      const tit = inline(h[2]);
      secaoAtual = h[2].toLowerCase().trim();
      html.push(`<h${nivel} class="${nivel === 1 ? 'titulo-principal' : nivel === 2 ? 'secao-primaria' : 'secao-secundaria'}">${tit}</h${nivel}>`);
      continue;
    }

    // Se estamos na seção de referências ou a linha é uma referência bibliográfica Vancouver (1. Autor...)
    const ehSecaoRefs = /(?:^|\s)(?:refer[eê]ncias|references)\b/i.test(secaoAtual);
    const mRefItem = linha.match(/^\s*(\d+)\.\s+([\s\S]+)$/);
    if ((ehSecaoRefs && mRefItem) || (/^\s*\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕ]/.test(linha) && !lista)) {
      fecharParagrafo();
      fecharLista();
      html.push(`<p class="referencia">${inline(linha.trim())}</p>`);
      continue;
    }

    const ul = linha.match(/^\s*[-*]\s+(.*)$/);
    const ol = linha.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ul || ol) {
      fecharParagrafo();
      const tipo = ul ? 'ul' : 'ol';
      if (lista !== tipo) {
        fecharLista();
        lista = tipo;
        const startAttr = ol && ol[1] !== '1' ? ` start="${ol[1]}"` : '';
        html.push(`<${tipo}${startAttr}>`);
      }
      const valAttr = ol ? ` value="${ol[1]}"` : '';
      html.push(`<li${valAttr}>${inline(ul ? ul[1] : ol[2])}</li>`);
    } else if (!linha.trim()) {
      fecharParagrafo();
      fecharLista();
    } else {
      fecharLista();
      paragrafo.push(linha.trim());
    }
  }
  fecharParagrafo();
  fecharLista();
  if (tabelaAtual) fecharTabela();

  return html.join('\n');
}

export function documentoHtml(titulo, corpoHtml) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
body{font-family:"Times New Roman",Georgia,serif;font-size:12pt;line-height:1.5;max-width:800px;margin:40px auto;padding:0 30px;color:#111;background:#fff}
@page{size:A4;margin:30mm 20mm 20mm 30mm}
@media print{
  body{max-width:none!important;margin:0!important;padding:0!important}
  h1.titulo-principal,h2.secao-primaria,h3.secao-secundaria{page-break-after:avoid;break-after:avoid}
  p.legenda{page-break-after:avoid;break-after:avoid}
  table.tabela-ibge{page-break-inside:auto;break-inside:auto}
  table.tabela-ibge tr{page-break-inside:avoid;break-inside:avoid}
  table.tabela-ibge thead{display:table-header-group}
  figure{page-break-inside:avoid;break-inside:avoid}
  figure img{max-height:175mm;object-fit:contain}
  .resumo-bloco,.palavras-chave{page-break-inside:avoid;break-inside:avoid}
}
h1.titulo-principal{font-size:15pt;text-align:center;text-transform:uppercase;font-weight:bold;margin-bottom:0.6em;line-height:1.35}
h2.secao-primaria{font-size:12pt;text-transform:uppercase;margin-top:2em;margin-bottom:0.8em;font-weight:bold}
h3.secao-secundaria{font-size:12pt;margin-top:1.5em;margin-bottom:0.6em;font-weight:bold}
p{text-align:justify;text-indent:1.25cm;margin:0 0 0.8em 0}
p.frontal{text-align:center;text-indent:0;font-size:11pt;line-height:1.3;margin:0.4em 0}
p.resumo-bloco{text-align:justify;text-indent:0;font-size:10pt;line-height:1.25;margin:0.8em 0 0.4em 0}
p.palavras-chave{text-align:justify;text-indent:0;font-size:10pt;line-height:1.25;margin:0 0 1.2em 0}
p.legenda{text-align:left;text-indent:0;font-size:10pt;font-weight:bold;margin:1.5em 0 0.3em 0;page-break-after:avoid;break-after:avoid}
p.fonte{text-align:justify;text-indent:0;font-size:9.5pt;margin:0.3em 0 1.5em 0;page-break-before:avoid;break-before:avoid}
p.referencia{text-align:left;text-indent:-1.5em;padding-left:1.5em;font-size:10.5pt;line-height:1.3;margin:0 0 0.6em 0}
sup.cit{font-size:0.75em}
a{color:#1a4e8a;word-break:break-all}
ol li,ul li{margin-bottom:.4em}
table.tabela-ibge{border-collapse:collapse;width:100%;font-size:8.5pt;line-height:1.25;margin:0.8em 0 0.3em 0;border-top:2px solid #000;border-bottom:2px solid #000;word-wrap:break-word;overflow-wrap:break-word}
table.tabela-ibge thead th{border-bottom:1px solid #000;font-weight:bold;padding:4px 5px;vertical-align:bottom;text-align:left}
table.tabela-ibge tr:first-child td{border-bottom:1px solid #000;font-weight:bold}
table.tabela-ibge td{border-left:none;border-right:none;border-top:none;border-bottom:none;padding:4px 5px;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word}
figure{margin:1.5em auto;text-align:center;page-break-inside:avoid;break-inside:avoid}
figure img{max-width:100%;max-height:180mm;width:auto;height:auto;object-fit:contain}
figcaption{font-size:10pt;font-weight:bold;margin-top:0.4em}
</style></head><body>
${corpoHtml}
</body></html>`;
}

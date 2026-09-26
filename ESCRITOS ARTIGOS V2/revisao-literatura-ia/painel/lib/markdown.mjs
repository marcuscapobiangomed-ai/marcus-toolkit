import { escaparHtml } from './texto.mjs';

// Renderizador Markdown minimo e seguro: escapa todo HTML antes de aplicar a formatacao.
function inline(s) {
  // "\\*" e asterisco literal (ex.: truncagem "predictor*" nas estrategias de busca)
  let t = escaparHtml(s).replace(/\\\*/g, '\u0003');
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
  const fecharParagrafo = () => {
    if (paragrafo.length) html.push(`<p>${inline(paragrafo.join(' '))}</p>`);
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista) html.push(`</${lista}>`);
    lista = null;
  };
  for (const linha of linhas) {
    const img = linha.trim().match(/^!\[([^\]]*)\]\(([\w./-]+\.(?:png|jpg|jpeg|svg))\)$/i);
    if (img) {
      fecharParagrafo();
      fecharLista();
      html.push(`<figure><img src="${opcoes.prefixoImagem || ''}${img[2]}" alt="${escaparHtml(img[1])}" style="max-width:100%">${img[1] && !/^Figura \d+$/.test(img[1]) ? `<figcaption>${inline(img[1])}</figcaption>` : ''}</figure>`);
      continue;
    }
    const h = linha.match(/^(#{1,6})\s+(.*)$/);
    const ul = linha.match(/^\s*[-*]\s+(.*)$/);
    const ol = linha.match(/^\s*(\d+)\.\s+(.*)$/);
    if (h) {
      fecharParagrafo();
      fecharLista();
      html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    } else if (ul || ol) {
      fecharParagrafo();
      const tipo = ul ? 'ul' : 'ol';
      if (lista !== tipo) {
        fecharLista();
        lista = tipo;
        html.push(`<${tipo}>`);
      }
      html.push(`<li>${inline(ul ? ul[1] : ol[2])}</li>`);
    } else if (!linha.trim()) {
      fecharParagrafo();
      fecharLista();
    } else if (/^\|/.test(linha.trim())) {
      fecharParagrafo();
      fecharLista();
      if (/^\|[\s:|-]+\|$/.test(linha.trim())) continue;
      const celulas = linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => `<td>${inline(c.trim())}</td>`);
      html.push(`<table border="1" cellpadding="4" cellspacing="0"><tr>${celulas.join('')}</tr></table>`);
    } else {
      fecharLista();
      paragrafo.push(linha.trim());
    }
  }
  fecharParagrafo();
  fecharLista();
  return html.join('\n').replace(/<\/table>\n<table[^>]*>/g, '');
}

export function documentoHtml(titulo, corpoHtml) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
body{font-family:"Times New Roman",Georgia,serif;font-size:12pt;line-height:1.5;max-width:760px;margin:40px auto;padding:0 24px;color:#111}
h1{font-size:16pt;text-align:center}h2{font-size:13pt;margin-top:1.6em}h3{font-size:12pt}
p{text-align:justify}sup.cit{font-size:0.75em}a{color:#1a4e8a;word-break:break-all}
ol li,ul li{margin-bottom:.4em}table{border-collapse:collapse;width:100%;font-size:10pt}td{border:1px solid #999;padding:4px;vertical-align:top}
</style></head><body>
${corpoHtml}
</body></html>`;
}

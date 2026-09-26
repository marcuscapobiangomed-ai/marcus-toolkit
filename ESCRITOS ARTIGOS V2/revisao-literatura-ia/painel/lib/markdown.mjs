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
      const nivel = h[1].length;
      const tit = inline(h[2]);
      html.push(`<h${nivel} class="${nivel === 1 ? 'titulo-principal' : nivel === 2 ? 'secao-primaria' : 'secao-secundaria'}">${tit}</h${nivel}>`);
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
      html.push(`<table class="tabela-ibge"><tr>${celulas.join('')}</tr></table>`);
    } else {
      fecharLista();
      paragrafo.push(linha.trim());
    }
  }
  fecharParagrafo();
  fecharLista();
  return html.join('\n').replace(/<\/table>\n<table class="tabela-ibge">/g, '');
}

export function documentoHtml(titulo, corpoHtml) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
body{font-family:"Times New Roman",Georgia,serif;font-size:12pt;line-height:1.5;max-width:800px;margin:40px auto;padding:0 30px;color:#111;background:#fff}
h1.titulo-principal{font-size:15pt;text-align:center;text-transform:uppercase;margin-bottom:0.5em;line-height:1.3}
h2.secao-primaria{font-size:12pt;text-transform:uppercase;margin-top:2em;margin-bottom:0.8em;font-weight:bold}
h3.secao-secundaria{font-size:12pt;margin-top:1.5em;margin-bottom:0.6em;font-weight:bold}
p{text-align:justify;text-indent:1.25cm;margin:0 0 0.8em 0}
p.frontal{text-align:center;text-indent:0;font-size:11pt;line-height:1.3;margin:0.4em 0}
p.resumo-bloco{text-align:justify;text-indent:0;font-size:10pt;line-height:1.25;margin:0.8em 0 0.4em 0}
p.palavras-chave{text-align:justify;text-indent:0;font-size:10pt;line-height:1.25;margin:0 0 1.2em 0}
p.legenda{text-align:left;text-indent:0;font-size:10pt;font-weight:bold;margin:1.5em 0 0.3em 0}
p.fonte{text-align:justify;text-indent:0;font-size:9.5pt;margin:0.3em 0 1.5em 0}
p.referencia{text-align:left;text-indent:-1.5em;padding-left:1.5em;font-size:10.5pt;line-height:1.3;margin:0 0 0.6em 0}
sup.cit{font-size:0.75em}
a{color:#1a4e8a;word-break:break-all}
ol li,ul li{margin-bottom:.4em}
table.tabela-ibge{border-collapse:collapse;width:100%;font-size:9.5pt;margin:0.8em 0 0.3em 0;border-top:2px solid #000;border-bottom:2px solid #000}
table.tabela-ibge tr:first-child td{border-bottom:1px solid #000;font-weight:bold}
table.tabela-ibge td{border-left:none;border-right:none;border-top:none;border-bottom:none;padding:5px 6px;vertical-align:top}
figure{margin:1.8em 0;text-align:center}
figure img{max-width:100%;height:auto}
figcaption{font-size:10pt;font-weight:bold;margin-top:0.4em}
</style></head><body>
${corpoHtml}
</body></html>`;
}

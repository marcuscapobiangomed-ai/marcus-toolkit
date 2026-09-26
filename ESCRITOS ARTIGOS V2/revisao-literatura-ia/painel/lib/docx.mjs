import fs from 'node:fs';
import path from 'node:path';
import { criarZip } from './zip.mjs';

// Agente de Diagramacao: gera o .docx diretamente em OOXML, com estilos nas normas ABNT
// (Times 12, entrelinha 1,5, recuo 1,25 cm, margens 3/2 cm, numero de pagina no canto superior
// direito), tabelas no padrao IBGE (sem bordas laterais), quadros fechados e tabelas largas em
// pagina paisagem.

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PAGINA = { largura: 11906, altura: 16838, sup: 1701, esq: 1701, dir: 1134, inf: 1134 };
const LARGURA_RETRATO = PAGINA.largura - PAGINA.esq - PAGINA.dir;
const LARGURA_PAISAGEM = PAGINA.altura - PAGINA.esq - PAGINA.dir;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function runs(texto, { tamanho, negrito = false } = {}) {
  // "\\*" e asterisco literal (ex.: truncagem "predictor*" nas estrategias de busca)
  texto = String(texto).replace(/\\\*/g, '\u0003');
  const partes = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push({ t: texto.slice(ultimo, m.index) });
    partes.push(m[1] !== undefined ? { t: m[1], b: true } : { t: m[2], i: true });
    ultimo = re.lastIndex;
  }
  if (ultimo < texto.length) partes.push({ t: texto.slice(ultimo) });
  return partes.map((p) => {
    const rpr = [p.b || negrito ? '<w:b/>' : '', p.i ? '<w:i/>' : '', tamanho ? `<w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/>` : ''].join('');
    return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(p.t.replace(/\u0003/g, '*'))}</w:t></w:r>`;
  }).join('');
}

const paragrafo = (estilo, texto, extra = '') => `<w:p><w:pPr><w:pStyle w:val="${estilo}"/>${extra}</w:pPr>${runs(texto)}</w:p>`;

function secao({ paisagem = false, primeira = false }) {
  const pg = paisagem
    ? `<w:pgSz w:w="${PAGINA.altura}" w:h="${PAGINA.largura}" w:orient="landscape"/>`
    : `<w:pgSz w:w="${PAGINA.largura}" w:h="${PAGINA.altura}"/>`;
  return `<w:sectPr><w:headerReference w:type="default" r:id="rIdCabecalho"/>${pg}<w:pgMar w:top="${PAGINA.sup}" w:right="${PAGINA.dir}" w:bottom="${PAGINA.inf}" w:left="${PAGINA.esq}" w:header="709" w:footer="709" w:gutter="0"/>${primeira ? '<w:titlePg/>' : ''}</w:sectPr>`;
}
const quebraSecao = (opcoes) => `<w:p><w:pPr>${secao(opcoes)}</w:pPr></w:p>`;

function larguras(linhas, total) {
  const n = linhas[0].length;
  const medias = Array.from({ length: n }, (_, c) => {
    const tamanhos = linhas.map((l) => (l[c] || '').length);
    return Math.max(...tamanhos.slice(0, 1), tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length);
  });
  const pesos = medias.map((m) => Math.min(Math.max(Math.sqrt(m), 3), 14));
  const soma = pesos.reduce((a, b) => a + b, 0);
  const propostas = pesos.map((p) => (p / soma) * total);
  // Minimo: a palavra mais longa da coluna cabe inteira (fonte 9 pt, ~95 twips por caractere + margens).
  const minimos = Array.from({ length: n }, (_, c) => {
    const maior = Math.max(...linhas.map((l) => Math.max(0, ...String(l[c] || '').replace(/\*/g, '').split(/\s+/).map((w) => w.length))));
    return Math.min(maior * 95 + 180, total * 0.3);
  });
  const fixas = propostas.map((w, c) => Math.max(w, minimos[c]));
  const excesso = fixas.reduce((a, b) => a + b, 0) - total;
  if (excesso > 0) {
    const folga = fixas.map((w, c) => w - minimos[c]);
    const somaFolga = folga.reduce((a, b) => a + b, 0) || 1;
    return fixas.map((w, c) => Math.round(w - (folga[c] / somaFolga) * excesso));
  }
  return fixas.map(Math.round);
}

function tabela(linhas, { tipo, paisagem }) {
  const total = paisagem ? LARGURA_PAISAGEM : LARGURA_RETRATO;
  const cols = larguras(linhas, total);
  const quadro = tipo === 'quadro';
  const bordaExterna = quadro
    ? '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
    : '<w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>';
  const xml = [`<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${bordaExterna}</w:tblBorders><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols.map((c) => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`];
  linhas.forEach((linha, i) => {
    const cab = i === 0;
    xml.push(`<w:tr><w:trPr><w:cantSplit/>${cab ? '<w:tblHeader/>' : ''}</w:trPr>`);
    linha.forEach((celula, c) => {
      const bordaCab = cab && !quadro ? '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>' : '';
      xml.push(`<w:tc><w:tcPr><w:tcW w:w="${cols[c]}" w:type="dxa"/>${bordaCab}</w:tcPr><w:p><w:pPr><w:pStyle w:val="${cab ? 'TabelaCabecalho' : 'TabelaTexto'}"/></w:pPr>${runs(celula)}</w:p></w:tc>`);
    });
    xml.push('</w:tr>');
  });
  xml.push('</w:tbl>');
  return xml.join('');
}

function imagem(arquivo, id, larguraMax) {
  const png = fs.readFileSync(arquivo);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const emuPorTwip = 635;
  const cx = Math.round(larguraMax * emuPorTwip);
  const cy = Math.round((cx * h) / w);
  return {
    png,
    xml: `<w:p><w:pPr><w:pStyle w:val="Figura"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Figura ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(path.basename(arquivo))}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
  };
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR" w:eastAsia="pt-BR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="709"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Titulo"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitulo"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="40" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Frontal"><w:name w:val="Frontal"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="60" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Afiliacao"><w:name w:val="Afiliacao"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="40" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Titulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:jc w:val="left"/><w:ind w:firstLine="0"/><w:spacing w:before="360" w:after="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Titulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:jc w:val="left"/><w:ind w:firstLine="0"/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Resumo"><w:name w:val="Resumo"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="0"/><w:spacing w:before="80" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="PalavrasChave"><w:name w:val="PalavrasChave"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="0"/><w:spacing w:before="40" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Legenda"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:jc w:val="left"/><w:ind w:firstLine="0"/><w:spacing w:before="240" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Fonte"><w:name w:val="Fonte"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="0"/><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TabelaTexto"><w:name w:val="Tabela texto"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="left"/><w:ind w:firstLine="0"/><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TabelaCabecalho"><w:name w:val="Tabela cabecalho"/><w:basedOn w:val="TabelaTexto"/><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Figura"><w:name w:val="Figura"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Referencia"><w:name w:val="Referencia"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="left"/><w:ind w:left="425" w:hanging="425"/><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
</w:styles>`;

const CONFIGURACOES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W}"><w:autoHyphenation/><w:consecutiveHyphenLimit w:val="2"/><w:hyphenationZone w:val="357"/><w:defaultTabStop w:val="709"/><w:characterSpacingControl w:val="doNotCompress"/><w:themeFontLang w:val="pt-BR"/></w:settings>`;

const CABECALHO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="${W}"><w:p><w:pPr><w:jc w:val="right"/><w:ind w:firstLine="0"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:hdr>`;

const RE_RODAPE = /^(Fonte|Notas?):/;

// Converte o Markdown do artigo em document.xml.
function corpoDocumento(md, dir) {
  const linhas = md.replace(/\r/g, '').split('\n');
  const blocos = [];
  const imagens = [];
  let secaoAtual = '';
  let legendaPendente = null;
  let tabelaAtual = null;
  let paisagemAberta = false;
  let primeiraSecaoFechada = false;

  const fecharTabela = () => {
    if (!tabelaAtual) return;
    const paisagem = tabelaAtual[0].length > 4;
    if (paisagem && !paisagemAberta) {
      // encerra a secao em retrato antes da legenda/tabela
      const legendaXml = legendaPendente ? blocos.pop() : null;
      blocos.push(quebraSecao({ primeira: !primeiraSecaoFechada }));
      primeiraSecaoFechada = true;
      if (legendaXml) blocos.push(legendaXml);
      paisagemAberta = true;
    }
    blocos.push(tabela(tabelaAtual, { tipo: legendaPendente?.tipo || 'tabela', paisagem }));
    tabelaAtual = null;
    legendaPendente = null;
  };
  const fecharPaisagem = () => {
    if (!paisagemAberta) return;
    blocos.push(quebraSecao({ paisagem: true }));
    paisagemAberta = false;
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (linha.startsWith('|')) {
      if (/^\|[\s:|-]+\|$/.test(linha)) continue;
      const celulas = linha.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      (tabelaAtual ||= []).push(celulas);
      continue;
    }
    if (tabelaAtual) fecharTabela();
    if (!linha) continue;
    if (paisagemAberta && !RE_RODAPE.test(linha)) fecharPaisagem();

    let m;
    if ((m = linha.match(/^#\s+(.*)$/))) blocos.push(paragrafo('Titulo', m[1]));
    else if ((m = linha.match(/^##\s+(.*)$/))) {
      const tit = m[1].trim();
      secaoAtual = tit.toLowerCase();
      if (/^(resumo|abstract|resumen)$/i.test(tit)) {
        // Se vier como subtitulo isolado sem corpo em paragrafo unico, centraliza
        blocos.push(paragrafo('Titulo1', tit, '<w:jc w:val="center"/>'));
      } else {
        // ABNT: titulos com indicativo numerico alinhados a esquerda; sem numero (Referencias) centralizados
        const isNum = /^\d/.test(tit);
        blocos.push(paragrafo('Titulo1', tit, isNum ? '' : '<w:jc w:val="center"/>'));
      }
    } else if ((m = linha.match(/^###\s+(.*)$/))) blocos.push(paragrafo('Titulo2', m[1]));
    else if ((m = linha.match(/^!\[[^\]]*\]\(([\w./-]+\.png)\)$/))) {
      const arq = path.join(dir, m[1]);
      if (fs.existsSync(arq)) {
        const id = imagens.length + 1;
        const img = imagem(arq, id, LARGURA_RETRATO);
        imagens.push({ id, png: img.png });
        blocos.push(img.xml);
      }
    } else if ((m = linha.match(/^\*\*(Tabela|Quadro)\s+\d+\s*[–-]\*\*/))) {
      legendaPendente = { tipo: m[1].toLowerCase() };
      blocos.push(paragrafo('Legenda', linha));
    } else if (/^\*\*Figura\s+\d+\s*[–-]\*\*/.test(linha)) blocos.push(paragrafo('Legenda', linha));
    else if (RE_RODAPE.test(linha)) {
      // o ultimo paragrafo de Fonte/Notas separa a ilustracao do texto seguinte
      const proxima = linhas.slice(i + 1).find((l) => l.trim());
      blocos.push(paragrafo('Fonte', linha, proxima && RE_RODAPE.test(proxima.trim()) ? '' : '<w:spacing w:after="240"/>'));
    } else if (/^\*[^*].*\*$/.test(linha) && blocos.length <= 5 && !secaoAtual) {
      if (/¹|²|³|\b(discente|docente|orientador|faculdade|universidade|hospital|e-mail|departamento)\b/i.test(linha)) {
        blocos.push(paragrafo('Afiliacao', linha));
      } else {
        blocos.push(paragrafo('Subtitulo', linha));
      }
    } else if (/^\*\*(Autores|Tipo de estudo|Revista-alvo)/.test(linha) || (!secaoAtual && /¹|²|³|\bautores\b/i.test(linha))) {
      blocos.push(paragrafo('Frontal', linha));
    } else if (/^\*{0,2}(Palavras-chave|Keywords|Palabras clave):?\*{0,2}/i.test(linha)) {
      blocos.push(paragrafo('PalavrasChave', linha));
    } else if (/^\*{0,2}(RESUMO|ABSTRACT|RESUMEN):?\*{0,2}/i.test(linha)) {
      blocos.push(paragrafo('Resumo', linha));
    } else if (/^refer[eê]ncias/.test(secaoAtual) && /^\d+\.\s/.test(linha)) {
      blocos.push(paragrafo('Referencia', linha));
    } else if (/^(resumo|abstract|resumen)/.test(secaoAtual)) {
      blocos.push(paragrafo('Resumo', linha));
    } else {
      blocos.push(paragrafo('Normal', linha));
    }
  }
  if (tabelaAtual) fecharTabela();
  fecharPaisagem();
  const corpo = `${blocos.join('')}${secao({ primeira: !primeiraSecaoFechada })}`;
  return { corpo, imagens };
}

export function gerarDocx(md, { dir, saida, titulo = '' }) {
  const { corpo, imagens } = corpoDocumento(md, dir);
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${corpo}</w:body></w:document>`;
  const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdEstilos" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdCabecalho" Type="${R}/header" Target="header1.xml"/><Relationship Id="rIdConfig" Type="${R}/settings" Target="settings.xml"/>${imagens.map((im) => `<Relationship Id="rIdImg${im.id}" Type="${R}/image" Target="media/figura${im.id}.png"/>`).join('')}</Relationships>`;
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const relsRaiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const agora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(titulo)}</dc:title><dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"/>`;
  const zip = criarZip([
    ['[Content_Types].xml', tipos],
    ['_rels/.rels', relsRaiz],
    ['word/document.xml', documento],
    ['word/styles.xml', ESTILOS],
    ['word/header1.xml', CABECALHO],
    ['word/settings.xml', CONFIGURACOES],
    ['word/_rels/document.xml.rels', relsDoc],
    ['docProps/core.xml', core],
    ['docProps/app.xml', app],
    ...imagens.map((im) => [`word/media/figura${im.id}.png`, im.png]),
  ]);
  fs.writeFileSync(saida, zip);
  return { saida, imagens: imagens.length };
}

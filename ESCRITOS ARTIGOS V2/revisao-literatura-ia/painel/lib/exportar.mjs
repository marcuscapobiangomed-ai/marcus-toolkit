import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { gerarDocx } from './docx.mjs';
import { documentoHtml, markdownParaHtml } from './markdown.mjs';
import { sanitizarBlocoReferencias } from './orientador.mjs';
import { expurgarRastrosIA } from './blindagem_autoria.mjs';

/**
 * Cerca de contenção terminal & Firewall Anti-Vazamento: assegura que nenhum resíduo de IA
 * (<think>, saudações, despedidas) ou texto órfão vaze ao compilar Word, HTML e PDF.
 */
export function sanitizarMarkdownTerminal(md) {
  if (!md) return md;

  // 1. Firewall Terminal: Expurgar tags de raciocínio (<think>) e saudações conversacionais
  const { texto: mdSemRastros } = expurgarRastrosIA(md);

  // 2. Cerca de contenção pós-referências
  const idxRefs = mdSemRastros.search(/^##\s*(?:Referências|Referencias|References)/mi);
  if (idxRefs === -1) return mdSemRastros;

  const anterior = mdSemRastros.slice(0, idxRefs);
  const secaoRefsCru = mdSemRastros.slice(idxRefs);
  const mTituloRefs = secaoRefsCru.match(/^(##\s*(?:Referências|Referencias|References)[^\n]*\n)/i);
  if (!mTituloRefs) return mdSemRastros;

  const tituloRefs = mTituloRefs[1];
  const conteudoRefs = secaoRefsCru.slice(tituloRefs.length).trim();
  const refsLimpas = sanitizarBlocoReferencias(conteudoRefs);

  return `${anterior.trimEnd()}\n\n${tituloRefs.trim()}\n\n${refsLimpas}\n`;
}

/**
 * Obtém o número de páginas de um arquivo PDF gerado
 */
export function obterContagemPaginasPdf(caminhoPdf) {
  if (!caminhoPdf || !fs.existsSync(caminhoPdf)) return 0;
  try {
    if (process.platform === 'darwin') {
      const out = execSync(`mdls -name kMDItemNumberOfPages -raw "${caminhoPdf}"`, { encoding: 'utf8', timeout: 3000 }).trim();
      const n = parseInt(out, 10);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  try {
    const buf = fs.readFileSync(caminhoPdf);
    const str = buf.toString('latin1');
    const m = str.match(/\/Count\s+(\d+)/);
    if (m && m[1]) return parseInt(m[1], 10);
    const pags = (str.match(/\/Type\s*\/Page\b/g) || []).length;
    if (pags > 0) return pags;
  } catch {}
  return 0;
}

/**
 * Higieniza os metadados binários do PDF mantendo offsets exatos do xref
 * e eliminando qualquer menção ao Chromium ou Skia/PDF.
 */
export function higienizarMetadadosPdf(pdfBuffer) {
  let str = pdfBuffer.toString('latin1');
  str = str.replace(/\/Creator\s*\([^)]*\)/g, (m) => {
    const prefixo = '/Creator (';
    const sufixo = ')';
    const espacoInterno = m.length - prefixo.length - sufixo.length;
    const nome = 'Word 365'.slice(0, espacoInterno).padEnd(espacoInterno, ' ');
    return `${prefixo}${nome}${sufixo}`;
  });
  str = str.replace(/\/Producer\s*\([^)]*\)/g, (m) => {
    const prefixo = '/Producer (';
    const sufixo = ')';
    const espacoInterno = m.length - prefixo.length - sufixo.length;
    const nome = 'Microsoft PDF'.slice(0, espacoInterno).padEnd(espacoInterno, ' ');
    return `${prefixo}${nome}${sufixo}`;
  });
  return Buffer.from(str, 'latin1');
}

/**
 * Gera um PDF A4 vetorial diagramado com normas ABNT e Vancouver usando Playwright Chromium.
 */
export async function gerarArtigoPdf(dir, titulo, md) {
  const mdLimpo = sanitizarMarkdownTerminal(md);
  const arquivoHtml = path.join(dir, 'artigo.html');
  let html = '';
  if (mdLimpo) {
    html = documentoHtml(titulo, markdownParaHtml(mdLimpo, { prefixoImagem: '' }));
    fs.writeFileSync(arquivoHtml, html, 'utf8');
  } else if (fs.existsSync(arquivoHtml)) {
    html = fs.readFileSync(arquivoHtml, 'utf8');
  } else {
    throw new Error('Artigo não encontrado para gerar PDF');
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(arquivoHtml), { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="width:100%; text-align:right; font-size:10pt; font-family:Times New Roman, serif; padding-right:20mm; color:#333;"><span class="pageNumber"></span></div>',
      footerTemplate: '<div></div>',
      margin: { top: '30mm', bottom: '20mm', left: '30mm', right: '20mm' },
    });
    const pdfLimpo = higienizarMetadadosPdf(pdfBuffer);
    const arquivoPdf = path.join(dir, 'artigo.pdf');
    fs.writeFileSync(arquivoPdf, pdfLimpo);
    return arquivoPdf;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Exporta apenas o artigo.docx (ultra-rápido, sem depender do Chromium/Playwright)
export function exportarDocx(dir, titulo, md, opcoes = {}) {
  const mdLimpo = sanitizarMarkdownTerminal(md);
  const arquivoDocx = path.join(dir, 'artigo.docx');
  try {
    gerarDocx(mdLimpo, { dir, saida: arquivoDocx, titulo, ...opcoes });
    return { ok: true, docx: arquivoDocx, erro: null };
  } catch (e) {
    return { ok: false, docx: null, erro: e.message };
  }
}

// Gera artigo.html (leitura/impressao), artigo.docx (Word) e artigo.pdf (visualização com paginação real).
export async function exportarArtigo(dir, titulo, md, opcoes = {}) {
  const mdLimpo = sanitizarMarkdownTerminal(md);
  const arquivoHtml = path.join(dir, 'artigo.html');
  fs.writeFileSync(arquivoHtml, documentoHtml(titulo, markdownParaHtml(mdLimpo)));
  const arquivoDocx = path.join(dir, 'artigo.docx');
  let rDocx = null;
  let erroDocx = null;
  try {
    const r = gerarDocx(mdLimpo, { dir, saida: arquivoDocx, titulo, ...opcoes });
    rDocx = arquivoDocx;
  } catch (e) {
    erroDocx = e.message;
  }

  let arquivoPdf = null;
  try {
    arquivoPdf = await gerarArtigoPdf(dir, titulo, mdLimpo);
  } catch (e) {
    console.warn('Aviso: Falha ao gerar PDF de visualização:', e.message);
  }

  return { html: arquivoHtml, docx: rDocx, pdf: arquivoPdf, figuras: [], erro_docx: erroDocx };
}


import fs from 'node:fs';
import path from 'node:path';
import { gerarDocx } from './docx.mjs';
import { documentoHtml, markdownParaHtml } from './markdown.mjs';

// Gera artigo.html (leitura/impressao) e artigo.docx (Word, diagramado pelo Agente de Diagramacao).
export async function exportarArtigo(dir, titulo, md) {
  const arquivoHtml = path.join(dir, 'artigo.html');
  fs.writeFileSync(arquivoHtml, documentoHtml(titulo, markdownParaHtml(md)));
  const arquivoDocx = path.join(dir, 'artigo.docx');
  try {
    const r = gerarDocx(md, { dir, saida: arquivoDocx, titulo });
    return { html: arquivoHtml, docx: arquivoDocx, figuras: r.imagens, erro_docx: null };
  } catch (e) {
    return { html: arquivoHtml, docx: null, erro_docx: e.message };
  }
}

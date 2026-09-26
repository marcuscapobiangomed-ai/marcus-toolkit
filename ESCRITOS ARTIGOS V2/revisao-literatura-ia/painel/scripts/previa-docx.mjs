// Previa do DOCX pagina a pagina (docx-preview no Chrome headless), para conferencia visual.
// Uso: node scripts/previa-docx.mjs caminho/artigo.docx prefixo-saida
import fs from 'node:fs';
import { chromium } from 'playwright';
const [,, docx, saida] = process.argv;
const b64 = fs.readFileSync(docx).toString('base64');
const nav = await chromium.launch({ headless: true });
const p = await nav.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 1 });
await p.setContent(`<!doctype html><html><head>
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js"></script></head>
<body style="background:#888"><div id="c"></div></body></html>`, { waitUntil: 'networkidle' });
await p.evaluate(async (b64) => {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  await docx.renderAsync(bin, document.getElementById('c'), null, { breakPages: true, ignoreLastRenderedPageBreak: false });
}, b64);
await p.waitForTimeout(1500);
const secoes = await p.$$('section.docx');
console.log('paginas renderizadas:', secoes.length);
for (let i = 0; i < secoes.length; i++) await secoes[i].screenshot({ path: `${saida}-${String(i + 1).padStart(2, '0')}.png` });
// Recortes: cada tabela e cada figura com a legenda acima e a fonte/notas abaixo.
const alvos = await p.$$('table, img');
for (let i = 0; i < alvos.length; i++) {
  const c = await alvos[i].evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  if (!c.width) continue;
  const y = Math.max(0, c.y - 70);
  await p.screenshot({ path: `${saida}-item${i + 1}.png`, fullPage: true, clip: { x: Math.max(0, c.x - 30), y, width: Math.min(c.width + 60, 1300), height: Math.min(c.height + 230, 2400) } });
}
await nav.close();

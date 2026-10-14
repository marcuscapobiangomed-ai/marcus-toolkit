import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = '/Users/user/.gemini/antigravity-ide/brain/cfbd1a81-cbd3-4730-b7a8-6d9190bb6d79';

async function main() {
  console.log('🚀 Iniciando validação completa da solução...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
  const page = await context.newPage();

  // 1. Acessa o painel JARVIS
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 2. Abre o workspace do artigo específico e vai para tela de Leitor Qualis A1 (screen-redacao)
  const projId = '20260930-180844-telemonitoramento-de-hipertensao-arteria';
  await page.evaluate((id) => {
    window.abrirWorkspaceArtigo(id, 'screen-redacao');
  }, projId);
  await page.waitForTimeout(2500);

  // Validação 1: PDF Viewer
  console.log('📄 Validando Visualizador de PDF A4...');
  const iframeSrc = await page.getAttribute('#iframe-leitor-artigo-pdf', 'src');
  console.log('  PDF Iframe SRC:', iframeSrc);

  const screenshotPdf = path.join(ARTIFACTS_DIR, 'evidencia_pdf_titulo_correto.png');
  await page.screenshot({ path: screenshotPdf, fullPage: false });
  console.log('  ✔ Screenshot do Leitor PDF salvo em:', screenshotPdf);

  // Validação 2: Modo Texto
  console.log('📝 Alternando para Modo Texto...');
  await page.click('#btn-toggle-leitor-texto');
  await page.waitForTimeout(1500);

  // Inspeciona integridade do Modo Texto
  const inspecaoTexto = await page.evaluate(() => {
    const paper = document.getElementById('reader-paper-content');
    const body = paper ? paper.querySelector('.paper-rendered-body') : null;
    const h1 = body ? body.querySelector('h1.titulo-principal') : null;
    const chips = body ? body.querySelectorAll('.cite-chip') : [];
    const firstP = body ? body.querySelector('p:not(.frontal)') : null;
    const htmlSnippet = paper ? paper.innerHTML.slice(0, 1000) : '';

    return {
      paperVisivel: paper && window.getComputedStyle(paper).display !== 'none',
      temH1: Boolean(h1),
      h1Texto: h1 ? h1.textContent.trim() : null,
      h1FontWeight: h1 ? window.getComputedStyle(h1).fontWeight : null,
      h1TextAlign: h1 ? window.getComputedStyle(h1).textAlign : null,
      totalChips: chips.length,
      primeiroChipTexto: chips[0] ? chips[0].textContent : null,
      vazamentoHtmlTag: /<h&nbsp;|class="titulo-principal">/i.test(paper.innerText),
      firstPWidth: firstP ? firstP.offsetWidth : null,
      firstPTextSnippet: firstP ? firstP.textContent.slice(0, 80) : null,
      htmlSnippet
    };
  });

  console.log('🔎 Diagnóstico do Modo Texto:', JSON.stringify(inspecaoTexto, null, 2));

  // Tira screenshot focado no leitor de texto
  const readerEl = page.locator('#reader-paper-content');
  const screenshotTexto = path.join(ARTIFACTS_DIR, 'evidencia_modo_texto_corrigido.png');
  await readerEl.screenshot({ path: screenshotTexto });
  console.log('  ✔ Screenshot do Modo Texto salvo em:', screenshotTexto);

  // Tira screenshot da tela inteira com o Modo Texto aberto
  const screenshotTelaTexto = path.join(ARTIFACTS_DIR, 'evidencia_tela_modo_texto_completa.png');
  await page.screenshot({ path: screenshotTelaTexto });
  console.log('  ✔ Screenshot da tela completa salva em:', screenshotTelaTexto);

  // Asserções críticas
  if (inspecaoTexto.vazamentoHtmlTag) {
    throw new Error('FALHA: Ainda há vazamento de tags HTML cruas no Modo Texto!');
  }
  if (inspecaoTexto.firstPWidth < 300) {
    throw new Error(`FALHA: Largura do parágrafo está colapsada (${inspecaoTexto.firstPWidth}px)!`);
  }
  if (!inspecaoTexto.h1Texto?.includes('Telemonitoramento')) {
    throw new Error(`FALHA: Título incorreto no H1: "${inspecaoTexto.h1Texto}"!`);
  }

  console.log('\n🎉 TODAS AS VALIDAÇÕES FORAM APROVADAS COM SUCESSO ABSOLUTO!');
  await browser.close();
}

main().catch(err => {
  console.error('❌ ERRO:', err);
  process.exit(1);
});

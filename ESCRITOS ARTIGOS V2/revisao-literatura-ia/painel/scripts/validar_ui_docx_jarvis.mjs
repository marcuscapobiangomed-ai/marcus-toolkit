import { chromium } from 'playwright';

async function testarUIDocxJarvis() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  console.log('1. Acessando painel JARVIS...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const testId = '20260925-213749-fatores-preditores-de-conversao-da-colec';
  console.log(`2. Abrindo workspace para o artigo [${testId}]...`);
  await page.evaluate((id) => {
    window.abrirWorkspaceArtigo(id, 'screen-redacao');
  }, testId);
  await page.waitForTimeout(1500);

  // Inspeciona botão do Top HUD
  const hudHref = await page.$eval('#btn-hud-quick-docx', el => el.getAttribute('href'));
  console.log('   HUD Quick DOCX href:', hudHref);
  if (!hudHref.includes('/artigo.docx?baixar=1')) {
    throw new Error(`HUD href incorreto: ${hudHref}`);
  }

  // Inspeciona botão do Leitor de Artigo
  const leitorHref = await page.$eval('#btn-download-docx-paper', el => el.getAttribute('href'));
  console.log('   Leitor DOCX href:', leitorHref);
  if (!leitorHref.includes('/artigo.docx?baixar=1')) {
    throw new Error(`Leitor href incorreto: ${leitorHref}`);
  }

  console.log('3. Navegando para a tela do Orientador...');
  await page.evaluate(() => {
    window.switchScreen('screen-orientador');
  });
  await page.waitForTimeout(1500);

  // Inspeciona barra de download principal do Orientador
  const orientadorBarHref = await page.$eval('#btn-download-orientador-docx', el => el.getAttribute('href'));
  console.log('   Orientador Barra Principal href:', orientadorBarHref);
  if (!orientadorBarHref.includes('/artigo.docx?baixar=1')) {
    throw new Error(`Orientador barra href incorreto: ${orientadorBarHref}`);
  }

  // Inspeciona botão da Rodada 1
  const rodadaDocxHref = await page.$eval('.hud-rodada-card a.hud-btn.primary', el => el.getAttribute('href'));
  const rodadaDocxText = await page.$eval('.hud-rodada-card a.hud-btn.primary', el => el.textContent.trim());
  console.log('   Card da Rodada 1 href:', rodadaDocxHref);
  console.log('   Card da Rodada 1 texto:', rodadaDocxText);

  if (rodadaDocxHref.includes('rodada-0-inicial')) {
    throw new Error(`FALHA CRÍTICA: O card da Rodada 1 ainda aponta para o backup pré-revisão (${rodadaDocxHref})!`);
  }
  if (!rodadaDocxHref.includes('/artigo.docx?baixar=1')) {
    throw new Error(`Card da rodada href incorreto: ${rodadaDocxHref}`);
  }

  console.log('4. Capturando screenshot da Tela do Orientador com botões de download...');
  const artifactDir = '/Users/user/.gemini/antigravity-ide/brain/cfbd1a81-cbd3-4730-b7a8-6d9190bb6d79';
  await page.screenshot({
    path: `${artifactDir}/evidencia_tela_orientador_docx_atualizado.png`,
    fullPage: false
  });

  console.log('✔ Validação visual e funcional na UI concluída com 100% de sucesso!');
  await browser.close();
}

testarUIDocxJarvis().catch(err => {
  console.error('❌ Erro na validação da UI:', err);
  process.exit(1);
});

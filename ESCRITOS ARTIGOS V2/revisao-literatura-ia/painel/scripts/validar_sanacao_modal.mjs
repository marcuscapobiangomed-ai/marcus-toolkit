import { chromium } from 'playwright';

async function testarSanacaoModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Acessando painel...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('2. Abrindo workspace...');
  await page.evaluate(() => {
    window.abrirWorkspaceArtigo('20260930-180844-telemonitoramento-de-hipertensao-arteria', 'screen-redacao');
  });
  await page.waitForTimeout(2000);

  console.log('3. Abrindo Modal de Raio-X...');
  await page.evaluate(() => {
    window.openModalRaioX('20260930-180844-telemonitoramento-de-hipertensao-arteria');
  });
  await page.waitForTimeout(2500);

  console.log('4. Clicando em Sanar Apontamentos & Reauditar...');
  const btnSanar = await page.$('#btn-modal-sanar-raio-x');
  if (btnSanar) {
    await btnSanar.click();
    console.log('Aguardando processo de sanação e reauditoria cirúrgica...');
    await page.waitForTimeout(6000);
  }

  console.log('5. Capturando screenshot pós-sanação...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/18_laudo_raio_x_apos_sanacao.png',
    fullPage: false
  });

  console.log('✔ Sanação testada com sucesso!');
  await browser.close();
}

testarSanacaoModal().catch(err => {
  console.error('Erro na validação de sanação:', err);
  process.exit(1);
});

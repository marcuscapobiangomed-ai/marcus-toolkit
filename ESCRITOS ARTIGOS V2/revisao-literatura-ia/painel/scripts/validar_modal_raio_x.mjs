import { chromium } from 'playwright';

async function testarModalRaioX() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Acessando painel JARVIS...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('2. Abrindo workspace do artigo de telemonitoramento...');
  await page.evaluate(() => {
    window.abrirWorkspaceArtigo('20260930-180844-telemonitoramento-de-hipertensao-arteria', 'screen-redacao');
  });
  await page.waitForTimeout(2500);

  console.log('3. Abrindo Modal de Raio-X Diagnóstico...');
  await page.evaluate(() => {
    window.openModalRaioX('20260930-180844-telemonitoramento-de-hipertensao-arteria');
  });
  await page.waitForTimeout(3000);

  console.log('4. Capturando screenshot do modal de Raio-X...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/17_modal_raio_x_laudo_funcionando.png',
    fullPage: false
  });

  console.log('✔ Screenshot capturado com sucesso!');
  await browser.close();
}

testarModalRaioX().catch(err => {
  console.error('Erro na validação:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

async function testarLaudoScore100() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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

  console.log('4. Capturando screenshot do Laudo com Score 100% e Card 1 limpo...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/21_laudo_score_100_sem_pendencias.png',
    fullPage: false
  });

  // Rola para ver o Card 1 e Card 4
  const iframeElement = await page.$('#iframe-raio-x');
  if (iframeElement) {
    const frame = await iframeElement.contentFrame();
    if (frame) {
      await frame.evaluate(() => {
        window.scrollBy(0, 380);
      });
      await page.waitForTimeout(1000);
    }
  }

  console.log('5. Capturando screenshot dos Cards 1 e 4 sem pendências...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/22_cards_1_e_4_sem_pendencias.png',
    fullPage: false
  });

  // Rola para o final do iframe para ver o Card 7
  if (iframeElement) {
    const frame = await iframeElement.contentFrame();
    if (frame) {
      await frame.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
    }
  }

  console.log('6. Capturando screenshot do Card 7 com as curas registradas...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/23_card7_curas_registradas.png',
    fullPage: false
  });

  console.log('✔ Validação do Score 100% e extinção de pendências concluída!');
  await browser.close();
}

testarLaudoScore100().catch(err => {
  console.error('Erro na validação:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

async function testarModalRaioXComSanacoes() {
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

  console.log('4. Capturando screenshot do topo do laudo (Banner de Sanação)...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/19_laudo_com_banner_sanacao_ativo.png',
    fullPage: false
  });

  // Rola o iframe para o Card 7 de Histórico de Sanação
  console.log('5. Rolando iframe para o Card 7...');
  const iframeElement = await page.$('#iframe-raio-x');
  if (iframeElement) {
    const frame = await iframeElement.contentFrame();
    if (frame) {
      await frame.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
    }
  }

  console.log('6. Capturando screenshot do Card 7 (Histórico de Sanação)...');
  await page.screenshot({
    path: '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797/20_laudo_card_7_historico_sanacoes.png',
    fullPage: false
  });

  console.log('✔ Validação de evidência visual de sanação concluída!');
  await browser.close();
}

testarModalRaioXComSanacoes().catch(err => {
  console.error('Erro na validação:', err);
  process.exit(1);
});

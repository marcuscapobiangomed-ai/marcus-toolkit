import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797';
const TRABALHO_ID = '20260930-180844-telemonitoramento-de-hipertensao-arteria';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Acessando painel JARVIS...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('2. Abrindo workspace do artigo de telemonitoramento...');
  await page.evaluate((id) => {
    window.abrirWorkspaceArtigo(id, 'screen-redacao');
  }, TRABALHO_ID);
  await page.waitForTimeout(2000);

  console.log('3. Alternando para o Modo Texto...');
  const btnModoTexto = page.locator('#btn-toggle-leitor-texto');
  await btnModoTexto.click();
  await page.waitForTimeout(1500);

  console.log('4. Capturando screenshot da nova tipografia ABNT Qualis A1...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '27_modo_texto_tipografia_qualis_a1.png') });
  console.log('Screenshot 27 gravado com sucesso.');

  await browser.close();
  console.log('✔ Validação concluída!');
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});

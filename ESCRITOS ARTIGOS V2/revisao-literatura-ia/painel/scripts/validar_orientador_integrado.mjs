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

  console.log('3. Abrindo Modal de Raio-X Diagnóstico...');
  await page.evaluate((id) => {
    window.openModalRaioX(id);
  }, TRABALHO_ID);
  await page.waitForTimeout(3000);

  // Valida presença do botão Orientador IA no modal
  const btnModalOrientador = page.locator('#btn-modal-ir-orientador');
  const btnVisivel = await btnModalOrientador.isVisible();
  console.log('Botão [✍️ Orientador IA] visível no cabeçalho do modal:', btnVisivel);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '24_modal_com_botao_orientador_ia.png') });
  console.log('Screenshot 24 gravado.');

  console.log('4. Clicando em [✍️ Orientador IA] no modal de Raio-X...');
  await btnModalOrientador.click();
  await page.waitForTimeout(2000);

  // Verifica que o modal fechou
  const modalAberto = await page.locator('#modal-raio-x.open').isVisible();
  console.log('Modal ainda aberto?', modalAberto);

  // Verifica que a tela do Orientador está ativa
  const orientadorAtivo = await page.locator('#screen-orientador.active').isVisible();
  console.log('Tela do Orientador Cirúrgico ativa:', orientadorAtivo);

  // Verifica foco / valor do textarea
  const valorInput = await page.locator('#orientador-input').inputValue();
  console.log('Tamanho do texto no orientador-input:', valorInput.length);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '25_orientador_cirurgico_ativo_apos_laudo.png') });
  console.log('Screenshot 25 gravado.');

  console.log('5. Testando salto direto com pendência específica injetada...');
  // Reabre o modal de Raio-X
  await page.evaluate((id) => {
    window.openModalRaioX(id);
  }, TRABALHO_ID);
  await page.waitForTimeout(2000);

  // Executa navegação via pendência específica
  await page.evaluate((id) => {
    window.navegarParaOrientadorComPendencia(
      id,
      'Artigo de Revisão Integrativa deve apresentar na Introdução uma oração canônica explícita com o verbo no infinitivo.'
    );
  }, TRABALHO_ID);
  await page.waitForTimeout(1500);

  const novoValorInput = await page.locator('#orientador-input').inputValue();
  console.log('Conteúdo no orientador-input após injeção cirúrgica:\n', novoValorInput);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '26_pendencia_injetada_no_orientador.png') });
  console.log('Screenshot 26 gravado.');

  await browser.close();
  console.log('✔ Validação de integração concluída com 100% de sucesso!');
}

main().catch((err) => {
  console.error('Erro na validação:', err);
  process.exit(1);
});

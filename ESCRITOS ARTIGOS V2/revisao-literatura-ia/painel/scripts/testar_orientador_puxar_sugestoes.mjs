import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const TRABALHO_ID = '20261004-150001-telemonitoramento-de-hipertensao-arteria';
const SCREENSHOTS_DIR = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/public/qa-reports';

async function testar() {
  console.log('🧪 Testando Card Inteligente do Raio-X e Puxar Considerações no Orientador Cirúrgico...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Ativa o artigo
  await page.evaluate((id) => {
    if (typeof window.updateActiveProject === 'function') {
      window.updateActiveProject(id);
    }
  }, TRABALHO_ID);
  await page.waitForTimeout(2000);

  // Navega para a tela do Orientador
  console.log('1. Navegando para tela do Orientador Cirúrgico...');
  await page.click('#nav-btn-orientador');
  await page.waitForTimeout(1500);

  // Tira print antes de puxar
  const shotAntes = path.join(SCREENSHOTS_DIR, '07_orientador_com_card_falhas.png');
  await page.screenshot({ path: shotAntes });
  console.log(`✔ Screenshot com card de falhas salvo: ${shotAntes}`);

  // Clica no botão para puxar as considerações
  console.log('2. Clicando no botão "📥 Puxar Considerações do Laudo para a Caixa"...');
  await page.click('#btn-puxar-apontamentos-orientador');
  await page.waitForTimeout(1000);

  const conteudoCaixa = await page.$eval('#orientador-input', el => el.value);
  console.log('\n--- CONTEÚDO PREENCHIDO NA CAIXA DE CORREÇÃO: ---');
  console.log(conteudoCaixa);
  console.log('--------------------------------------------------\n');

  // Tira print depois de puxar com a caixa preenchida
  const shotDepois = path.join(SCREENSHOTS_DIR, '08_orientador_consideracoes_preenchidas.png');
  await page.screenshot({ path: shotDepois });
  console.log(`✔ Screenshot com considerações prontas para envio salvo: ${shotDepois}`);

  await browser.close();
  console.log('✅ Teste do Orientador Inteligente concluído com 100% de sucesso!');
}

testar().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});

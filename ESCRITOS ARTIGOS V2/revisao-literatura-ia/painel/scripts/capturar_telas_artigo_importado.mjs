import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const TRABALHO_ID = '20261004-150001-telemonitoramento-de-hipertensao-arteria';
const SCREENSHOTS_DIR = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/public/qa-reports';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log(`📸 Capturando evidências visuais no JARVIS para o trabalho: ${TRABALHO_ID}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  console.log('1. Acessando painel JARVIS...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Seleciona o projeto importado no select de projetos
  console.log(`2. Ativando workspace do artigo ${TRABALHO_ID}...`);
  await page.evaluate((id) => {
    if (typeof window.updateActiveProject === 'function') {
      window.updateActiveProject(id);
    }
  }, TRABALHO_ID);
  await page.waitForTimeout(2500);

  // Screenshot 1: Overview com Métricas do Artigo
  const shot1 = path.join(SCREENSHOTS_DIR, '01_artigo_overview.png');
  await page.screenshot({ path: shot1 });
  console.log(`✔ Screenshot 1 salvo: ${shot1}`);

  // Screenshot 2: Leitor Qualis A1 / Redação
  console.log('3. Navegando para o Leitor Qualis A1...');
  const abaRedacao = await page.$('#nav-btn-redacao');
  if (abaRedacao) {
    await abaRedacao.click();
    await page.waitForTimeout(1500);
    const shot2 = path.join(SCREENSHOTS_DIR, '02_artigo_leitor_a1.png');
    await page.screenshot({ path: shot2 });
    console.log(`✔ Screenshot 2 salvo: ${shot2}`);
  }

  // Screenshot 3: Modal de Laudo de Raio-X
  console.log('4. Abrindo Laudo de Raio-X Diagnóstico...');
  const btnRaioX = await page.$('#btn-ver-raio-x-modal') || await page.$('.btn-acao-raiox') || await page.$('#btn-abrir-laudo-modal');
  if (btnRaioX) {
    await btnRaioX.click();
    await page.waitForTimeout(1200);
    const shot3 = path.join(SCREENSHOTS_DIR, '03_modal_laudo_raio_x.png');
    await page.screenshot({ path: shot3 });
    console.log(`✔ Screenshot 3 salvo: ${shot3}`);
    
    // Fecha o modal de Raio-X
    const btnFechar = await page.$('#btn-fechar-raio-x') || await page.$('#btn-fechar-modal-raio-x');
    if (btnFechar) await btnFechar.click();
    await page.waitForTimeout(500);
  }

  // Screenshot 4: Mesa de Triagem e Evidências com Países Reais
  console.log('5. Navegando para Mesa de Triagem e Evidências...');
  const abaTriagem = await page.$('#nav-btn-triagem');
  if (abaTriagem) {
    await abaTriagem.click();
    await page.waitForTimeout(1500);
    const shot4 = path.join(SCREENSHOTS_DIR, '04_mesa_evidencias_paises.png');
    await page.screenshot({ path: shot4 });
    console.log(`✔ Screenshot 4 salvo: ${shot4}`);
  }

  // Screenshot 5: Agentes Qualis A1 (Risco de Viés Cochrane, GRADE e Turnitin)
  console.log('6. Navegando para Agentes Especialistas Qualis A1...');
  const abaAgentes = await page.$('#nav-btn-agentes-a1');
  if (abaAgentes) {
    await abaAgentes.click();
    await page.waitForTimeout(1500);
    const shot5 = path.join(SCREENSHOTS_DIR, '05_agentes_especialistas_a1.png');
    await page.screenshot({ path: shot5 });
    console.log(`✔ Screenshot 5 salvo: ${shot5}`);
  }

  await browser.close();
  console.log('🎉 TODAS AS CAPTURAS DE TELA FORAM REGISTRADAS COM SUCESSO!');
}

run().catch(err => {
  console.error('❌ ERRO NA CAPTURA:', err);
  process.exit(1);
});

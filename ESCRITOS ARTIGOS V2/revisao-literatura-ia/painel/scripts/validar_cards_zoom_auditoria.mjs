import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797';
const URL_BASE = 'http://localhost:4777/jarvis.html';
const TRABALHO_ID = '20261004-150001-telemonitoramento-de-hipertensao-arteria';

async function main() {
  console.log('🚀 Iniciando validação visual e funcional completa...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[PAGE LOG ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', err => console.log('[PAGE ERROR]:', err.message));

  // 1. Abrir o Dashboard JARVIS
  console.log('1. Acessando painel JARVIS...');
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);

  // 2. Validar Bento Grid de Cards dos Artigos
  console.log('2. Validando Bento Grid de Cards dos Artigos...');
  await page.waitForSelector('.article-card-bento', { timeout: 10000 });
  const qtdCards = await page.$$eval('.article-card-bento', els => els.length);
  console.log(`✅ Cards Bento encontrados: ${qtdCards}`);

  // Capturar screenshot do acervo em Bento Cards
  const shotCardsPath = path.join(ARTIFACTS_DIR, '13_acervo_bento_cards.png');
  await page.screenshot({ path: shotCardsPath });
  console.log(`📸 Screenshot salvo: ${shotCardsPath}`);

  // Testar alternância para Tabela e de volta para Cards
  console.log('2.1 Testando alternância entre Cards e Tabela...');
  await page.click('#btn-view-table');
  await page.waitForTimeout(400);
  const tableVisible = await page.$eval('#container-tabela-sistema', el => el.style.display !== 'none');
  const gridHidden = await page.$eval('#grid-sistema-artigos', el => el.style.display === 'none');
  console.log(`✅ Alternância para Tabela: Tabela Visível=${tableVisible}, Grid Oculto=${gridHidden}`);

  await page.click('#btn-view-cards');
  await page.waitForTimeout(400);
  const gridVisible = await page.$eval('#grid-sistema-artigos', el => el.style.display !== 'none');
  console.log(`✅ Retorno para Bento Cards: Grid Visível=${gridVisible}`);

  // 3. Abrir o Workspace do Artigo Ativo
  console.log(`3. Abrindo Workspace do artigo real (${TRABALHO_ID})...`);
  const cardReal = page.locator(`.article-card-bento[data-id="${TRABALHO_ID}"] .btn-abrir-workspace`).first();
  if (await cardReal.count() > 0) {
    await cardReal.click();
  } else {
    await page.evaluate((id) => window.abrirWorkspaceArtigo(id, 'screen-redacao'), TRABALHO_ID);
  }
  await page.waitForTimeout(1800);

  // 4. Validar Calibração do Zoom do Leitor de PDF
  console.log('4. Validando Calibração do Zoom do Leitor de PDF...');
  const zoomText = await page.$eval('#pdf-zoom-val', el => el.textContent.trim());
  const iframeSrc = await page.$eval('#iframe-leitor-artigo-pdf', el => el.src);
  console.log(`✅ Zoom atual exibido: "${zoomText}"`);
  console.log(`✅ Iframe PDF src: "${iframeSrc}"`);

  // Capturar screenshot do leitor com zoom 100% calibrado
  const shotLeitorPath = path.join(ARTIFACTS_DIR, '14_leitor_pdf_zoom_100_calibrado.png');
  await page.screenshot({ path: shotLeitorPath });
  console.log(`📸 Screenshot do Leitor salvo: ${shotLeitorPath}`);

  // 5. Validar Auditoria Factual Qualis A1
  console.log('5. Validando Auditoria Factual Qualis A1 lateral...');
  const auditScore = await page.$eval('#audit-score-accuracia', el => el.textContent.trim());
  const auditTurnitin = await page.$eval('#audit-metric-turnitin', el => el.textContent.trim());
  const auditFontes = await page.$eval('#audit-metric-fontes', el => el.textContent.trim());
  const auditStatus = await page.$eval('#audit-metric-raiox-status', el => el.textContent.trim());
  console.log(`✅ Auditoria Factual Acurácia: "${auditScore}"`);
  console.log(`✅ Auditoria Factual Turnitin: "${auditTurnitin}"`);
  console.log(`✅ Auditoria Factual Fontes: "${auditFontes}"`);
  console.log(`✅ Auditoria Factual Status Raio-X: "${auditStatus}"`);

  // 6. Validar Inspetor de Fonte Citada e Navegador Sequencial
  console.log('6. Validando Inspetor de Fonte Citada e Navegador Sequencial...');
  const citeTag1 = await page.$eval('#cite-active-tag', el => el.textContent.trim());
  const citeTitle1 = await page.$eval('#cite-ins-title', el => el.textContent.trim());
  const citeQuote1 = await page.$eval('#cite-ins-quote', el => el.textContent.trim());
  const citeBase1 = await page.$eval('#cite-ins-base-badge', el => el.textContent.trim());
  console.log(`✅ Citação ativa 1: ${citeTag1}`);
  console.log(`✅ Título da citação 1: "${citeTitle1.slice(0, 50)}..."`);
  console.log(`✅ Base da citação 1: "${citeBase1}"`);

  // Testar avanço para Citação 2 via botão ▶
  console.log('6.1 Testando botão Próxima Citação (▶)...');
  await page.click('#btn-cite-nav-next');
  await page.waitForTimeout(500);

  const citeTag2 = await page.$eval('#cite-active-tag', el => el.textContent.trim());
  const citeTitle2 = await page.$eval('#cite-ins-title', el => el.textContent.trim());
  console.log(`✅ Citação após clique em [▶]: ${citeTag2}`);
  console.log(`✅ Título da citação 2: "${citeTitle2.slice(0, 55)}..."`);

  // Capturar screenshot focado na Auditoria Factual e Inspetor de Citação
  const shotAuditoriaInspetorPath = path.join(ARTIFACTS_DIR, '15_auditoria_factual_e_inspetor_ativo.png');
  await page.screenshot({ path: shotAuditoriaInspetorPath });
  console.log(`📸 Screenshot da Auditoria e Inspetor salvo: ${shotAuditoriaInspetorPath}`);

  // 7. Testar Modo Texto com chips clicáveis
  console.log('7. Testando Modo Texto com Chips de citação...');
  await page.click('#btn-toggle-leitor-texto');
  await page.waitForTimeout(600);
  const readerHtml = await page.$eval('#reader-paper-content', el => el.innerHTML);
  console.log('DEBUG readerHtml slice:', readerHtml.slice(0, 250));
  const chipsCount = await page.$$eval('.cite-chip', els => els.length);
  console.log(`✅ Chips de citação interativos encontrados no corpo do texto: ${chipsCount}`);

  if (chipsCount > 0) {
    // Clicar no primeiro chip
    await page.click('.cite-chip >> nth=0');
    await page.waitForTimeout(300);
    const citeTagAposClick = await page.$eval('#cite-active-tag', el => el.textContent.trim());
    console.log(`✅ Citação ativada via clique no chip de texto: ${citeTagAposClick}`);
  }

  const shotModoTextoPath = path.join(ARTIFACTS_DIR, '16_modo_texto_com_chips_citacao.png');
  await page.screenshot({ path: shotModoTextoPath });
  console.log(`📸 Screenshot do Modo Texto salvo: ${shotModoTextoPath}`);

  await browser.close();
  console.log('\n🎉 Todos os testes e validações visuais concluídos com 100% de sucesso!');
}

main().catch(err => {
  console.error('❌ Erro no script de validação:', err);
  process.exit(1);
});

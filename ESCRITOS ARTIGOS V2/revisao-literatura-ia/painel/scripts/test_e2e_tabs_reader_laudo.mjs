import { chromium } from 'playwright';

async function run() {
  console.log('--- TESTE E2E: NAVEGAÇÃO DE TODAS AS ABAS, LEITOR QUALIS A1 E BOTÃO DO LAUDO ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('1. Acessando http://localhost:4777/jarvis.html...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Testa todas as abas de navegação
  const abas = [
    { id: 'nav-btn-overview', screen: 'screen-overview', nome: '1. Overview / Centro de Comando' },
    { id: 'nav-btn-pipeline', screen: 'screen-pipeline', nome: '2. Pipeline Neural 3D' },
    { id: 'nav-btn-redacao', screen: 'screen-redacao', nome: '3. Leitor Qualis A1' },
    { id: 'nav-btn-extracao', screen: 'screen-extracao', nome: '4. Tabela 1 ABNT' },
    { id: 'nav-btn-triagem', screen: 'screen-triagem', nome: '5. Mesa de Triagem' },
    { id: 'nav-btn-prisma', screen: 'screen-prisma', nome: '6. PRISMA 2020' },
    { id: 'nav-btn-orientador', screen: 'screen-orientador', nome: '7. Orientador Cirúrgico' },
    { id: 'nav-btn-agentes-a1', screen: 'screen-agentes-a1', nome: '8. Agentes Qualis A1' },
  ];

  console.log('2. Testando alternância entre todas as 8 abas...');
  for (const aba of abas) {
    const el = await page.$(`#${aba.id}`);
    if (!el) {
      console.error(`ERRO: Aba #${aba.id} não encontrada!`);
      continue;
    }
    await el.click();
    await page.waitForTimeout(400);
    const screenVisible = await page.isVisible(`#${aba.screen}`);
    console.log(` - Aba "${aba.nome}" -> Tela #${aba.screen} visível: ${screenVisible}`);
    if (!screenVisible) {
      throw new Error(`Falha: Tela #${aba.screen} não ficou visível ao clicar na aba #${aba.id}`);
    }
  }

  // Volta para a tela do Leitor (screen-redacao)
  console.log('3. Validando layout da tela do Leitor (screen-redacao)...');
  await page.click('#nav-btn-redacao');
  await page.waitForTimeout(500);

  // Verifica se .reader-split-layout existe e se ambas as colunas estão presentes
  const mainColExists = await page.isVisible('.reader-main-column');
  const auditPanelExists = await page.isVisible('.audit-inspector-panel');
  console.log(` - Coluna Principal do Leitor visível: ${mainColExists}`);
  console.log(` - Painel Lateral de Auditoria visível: ${auditPanelExists}`);

  // Verifica dimensões das colunas
  const splitBox = await page.$eval('.reader-split-layout', el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return { width: rect.width, gridTemplateColumns: style.gridTemplateColumns };
  });
  console.log(` - Grid template columns apurado: ${splitBox.gridTemplateColumns}`);

  // Verifica botões de zoom do PDF
  const zoomVal = await page.$eval('#pdf-zoom-val', el => el.textContent);
  console.log(` - Nível de zoom inicial do leitor: ${zoomVal}`);
  await page.click('#btn-pdf-zoom-in');
  await page.waitForTimeout(200);
  const zoomAposIn = await page.$eval('#pdf-zoom-val', el => el.textContent);
  console.log(` - Zoom após clicar Zoom In: ${zoomAposIn}`);

  // Verifica botão Tela Cheia (expansão)
  await page.click('#btn-toggle-expand-reader');
  await page.waitForTimeout(300);
  const isExpanded = await page.$eval('.reader-split-layout', el => el.classList.contains('reader-expanded'));
  const btnExpandText = await page.$eval('#btn-toggle-expand-reader', el => el.textContent);
  console.log(` - Leitor expandido para largura total: ${isExpanded}, texto do botão: "${btnExpandText}"`);
  
  // Tira screenshot do leitor expandido
  await page.screenshot({ path: '/Users/user/.gemini/antigravity-ide/brain/3939d8de-3074-46e2-bcf4-94dd9e8a3aaf/.tempmediaStorage/leitor_expandido_teste.png' });

  // Restaura leitor
  await page.click('#btn-toggle-expand-reader');
  await page.waitForTimeout(300);
  console.log(' - Layout normal do leitor restaurado.');

  // Tira screenshot do leitor lado a lado (sem espaço em branco)
  await page.screenshot({ path: '/Users/user/.gemini/antigravity-ide/brain/3939d8de-3074-46e2-bcf4-94dd9e8a3aaf/.tempmediaStorage/leitor_lado_a_lado_teste.png' });

  // Verifica se o botão "Aplicar Alterações do Laudo" existe no Leitor e no Orientador
  const btnAuditSanarExists = await page.isVisible('#btn-audit-sanar-raiox');
  console.log(` - Botão "⚡ Aplicar Alterações do Laudo" no painel de auditoria: ${btnAuditSanarExists}`);

  await page.click('#nav-btn-orientador');
  await page.waitForTimeout(500);
  const btnOrientadorSanarExists = await page.isVisible('#btn-sanar-apontamentos-laudo');
  console.log(` - Botão "⚡ Aplicar Alterações do Laudo" na tela do Orientador: ${btnOrientadorSanarExists}`);

  // Verifica se Carta ao Editor NÃO existe em lugar nenhum
  const cartaAoEditorButtons = await page.$$eval('a, button', els => els.filter(e => e.textContent.includes('Carta ao Editor')).map(e => e.outerHTML));
  console.log(` - Ocorrências de botão "Carta ao Editor": ${cartaAoEditorButtons.length} (esperado: 0)`);
  if (cartaAoEditorButtons.length > 0) {
    console.error('AVISO: Encontrado botão de Carta ao Editor:', cartaAoEditorButtons);
  }

  // Tira screenshot da tela do Orientador
  await page.screenshot({ path: '/Users/user/.gemini/antigravity-ide/brain/3939d8de-3074-46e2-bcf4-94dd9e8a3aaf/.tempmediaStorage/orientador_pos_ajustes_teste.png' });

  console.log('Erros no console do navegador:', consoleErrors.length ? consoleErrors : 'NENHUM (limpo)');
  await browser.close();
  console.log('--- TESTE E2E CONCLUÍDO COM SUCESSO ---');
}

run().catch(err => {
  console.error('Falha no teste E2E:', err);
  process.exit(1);
});

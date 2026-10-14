import { chromium } from 'playwright';

async function testUtilidadeUI() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  console.log('🚀 Iniciando Teste de Validação das Novas Ferramentas Úteis...');
  await page.goto('http://localhost:4777/jarvis', { waitUntil: 'domcontentloaded' });

  // 1. Aguardar hidratação do acervo de artigos
  console.log('1. Aguardando cards do acervo de artigos...');
  await page.waitForSelector('.system-article-card, .btn-abrir-workspace', { timeout: 10000 });

  const btnWorkspace = page.locator('.btn-abrir-workspace').first();
  await btnWorkspace.click();
  await page.waitForTimeout(1000);

  // 2. Verificar que o Stepper está visível e recolhível
  console.log('2. Testando toggle do stepper (Modo Foco)...');
  const toggleBtn = page.locator('#btn-toggle-stepper');
  const collapsibleArea = page.locator('#stepper-collapsible-area');
  
  // Deve estar expandido inicialmente
  let isCollapsed = await collapsibleArea.evaluate(el => el.classList.contains('collapsed'));
  console.log(' - Inicialmente colapsado?', isCollapsed);

  // Clicar para recolher
  await toggleBtn.click();
  await page.waitForTimeout(400);
  isCollapsed = await collapsibleArea.evaluate(el => el.classList.contains('collapsed'));
  console.log(' - Após clique para recolher, colapsado?', isCollapsed);
  if (!isCollapsed) throw new Error('Falha: Stepper deveria estar colapsado!');

  // Clicar para expandir novamente
  await toggleBtn.click();
  await page.waitForTimeout(400);
  isCollapsed = await collapsibleArea.evaluate(el => el.classList.contains('collapsed'));
  console.log(' - Após clique para expandir, colapsado?', isCollapsed);
  if (isCollapsed) throw new Error('Falha: Stepper deveria estar expandido!');

  // 3. Verificar o Top HUD limpo no Modo Artigo
  console.log('3. Validando HUD focado (sem FinOps irrelevante)...');
  const balancePillVisible = await page.locator('#hud-balance-pill').isVisible();
  const btnDocxVisible = await page.locator('#btn-hud-quick-docx').isVisible();
  const btnSanarHudVisible = await page.locator('#btn-hud-sanar-raio-x').isVisible();
  console.log(' - FinOps Balance Pill visível?', balancePillVisible);
  console.log(' - Botão Baixar DOCX visível?', btnDocxVisible);
  console.log(' - Botão Sanar HUD visível?', btnSanarHudVisible);
  if (balancePillVisible) throw new Error('Falha: Saldo FinOps não deveria poluir o modo artigo!');

  // 4. Testar o Card de Auditoria Factual dinâmico e seus botões de ação
  console.log('4. Testando botões úteis do Card de Auditoria Factual...');
  const turnitinMetric = await page.locator('#audit-metric-turnitin').textContent();
  const fontesMetric = await page.locator('#audit-metric-fontes').textContent();
  console.log(` - Métrica Turnitin: ${turnitinMetric}`);
  console.log(` - Métrica Fontes: ${fontesMetric}`);

  // Testar clique em Checador Turnitin -> screen-agentes-a1
  await page.locator('#btn-audit-goto-turnitin').click();
  await page.waitForTimeout(500);
  let activeScreen = await page.locator('.screen-pane.active').getAttribute('id');
  console.log(' - Tela ativa após [Turnitin ➔]:', activeScreen);
  if (activeScreen !== 'screen-agentes-a1') throw new Error('Falha ao navegar para Agentes A1!');

  // Voltar para o Leitor e testar navegação para Mesa de Triagem
  await page.locator('#nav-btn-redacao').click();
  await page.waitForTimeout(500);
  await page.locator('#btn-audit-goto-triagem').click();
  await page.waitForTimeout(500);
  activeScreen = await page.locator('.screen-pane.active').getAttribute('id');
  console.log(' - Tela ativa após [Mesa de Triagem ➔]:', activeScreen);
  if (activeScreen !== 'screen-triagem') throw new Error('Falha ao navegar para Mesa de Triagem!');

  // 5. Testar o modal do perfil do pesquisador
  console.log('5. Testando modal de perfil acadêmico do pesquisador...');
  await page.locator('#btn-perfil-pesquisador').click();
  await page.waitForTimeout(500);
  const modalPerfilVisible = await page.locator('#modal-perfil-pesquisador').isVisible();
  console.log(' - Modal de perfil visível?', modalPerfilVisible);
  if (!modalPerfilVisible) throw new Error('Falha: Modal de perfil deveria estar aberto!');
  await page.locator('#btn-close-modal-perfil').click();
  await page.waitForTimeout(300);

  // Capturar screenshot final do leitor limpo
  await page.locator('#nav-btn-redacao').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'public/qa-reports/screenshots/workspace_utilidade_validada.png', fullPage: false });
  console.log('📸 Screenshot salvo: workspace_utilidade_validada.png');

  console.log('✅ TODOS OS TESTES DE UTILIDADE REAL FORAM APROVADOS COM SUCESSO!');
  await browser.close();
}

testUtilidadeUI().catch((err) => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});

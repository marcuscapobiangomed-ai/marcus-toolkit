import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER PAGEERROR:', err.message));

  console.log('1. Navegando para http://localhost:4777/jarvis.html...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });

  // Aguarda sincronização dos projetos reais
  await page.waitForSelector('#tbody-sistema-artigos tr', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(500);

  // 2. Verificar o seletor de projetos
  const options = await page.$$eval('#select-active-project option', (opts) =>
    opts.map((o) => ({ value: o.value, text: o.textContent.trim(), disabled: o.disabled }))
  );

  console.log('\n2. Opções no seletor de projetos (#select-active-project):');
  console.log(options);

  const hasDemoOption = options.some(
    (o) =>
      o.value === 'lipoproteina' ||
      o.value === 'colecistectomia' ||
      o.value === 'endometriose' ||
      o.text.includes('DEMONSTRAÇÕES') ||
      o.text.includes('(Demo)')
  );

  if (hasDemoOption) {
    console.error('❌ ERRO: Ainda existem opções de demonstração/mock no seletor!');
  } else {
    console.log('✅ SUCESSO: Zero opções mock no seletor. Apenas projetos científicos reais!');
  }

  // 3. Verificar os KPIs Globais
  const kpis = await page.evaluate(() => {
    return {
      totalArtigos: document.getElementById('kpi-global-total-artigos')?.textContent.trim(),
      fontes: document.getElementById('kpi-global-fontes-mineradas')?.textContent.trim(),
      incluidos: document.getElementById('kpi-global-total-incluidos')?.textContent.trim(),
      custo: document.getElementById('kpi-global-custo-total')?.textContent.trim(),
      tokens: document.getElementById('kpi-global-tokens-total')?.textContent.trim(),
      tempo: document.getElementById('kpi-global-tempo-economizado')?.textContent.trim(),
      subArtigos: document.getElementById('kpi-global-subtext-artigos')?.textContent.trim(),
      subFontes: document.getElementById('kpi-global-subtext-fontes')?.textContent.trim(),
    };
  });

  console.log('\n3. KPIs do Sistema Global:');
  console.log(kpis);

  // 4. Verificar Badges do Cabeçalho e Painel de Auditoria no Leitor
  console.log('\n4. Verificando Badges e Painel Lateral de Auditoria...');
  await page.evaluate(() => window.switchScreen('screen-redacao'));
  await page.waitForTimeout(1000);

  const auditPanel = await page.evaluate(() => {
    return {
      badgeOrigem: document.getElementById('badge-top-origem')?.textContent.trim(),
      badgeFontes: document.getElementById('badge-top-fontes')?.textContent.trim(),
      auditStatus: document.getElementById('audit-badge-global-status')?.textContent.trim(),
      auditAccuracia: document.getElementById('audit-score-accuracia')?.textContent.trim(),
      auditTurnitin: document.getElementById('audit-metric-turnitin')?.textContent.trim(),
      auditFontes: document.getElementById('audit-metric-fontes')?.textContent.trim(),
    };
  });
  console.log('Painel de Auditoria no Leitor:', auditPanel);

  // 5. Navegar para a tela dos Agentes A1
  console.log('\n5. Navegando para screen-agentes-a1...');
  await page.evaluate(() => window.switchScreen('screen-agentes-a1'));
  await page.waitForTimeout(1000);

  const a1BadgesAntes = await page.evaluate(() => {
    return {
      grade: document.getElementById('tag-grade-certeza')?.textContent.trim(),
      revista: document.getElementById('tag-revista-conformidade')?.textContent.trim(),
      turnitinScore: document.getElementById('tag-turnitin-score')?.textContent.trim(),
      turnitinStatus: document.getElementById('tag-turnitin-status')?.textContent.trim(),
      compliance: document.getElementById('tag-compliance-status')?.textContent.trim(),
    };
  });
  console.log('Badges da Suíte A1 antes da execução:');
  console.log(a1BadgesAntes);

  // 6. Testar execução de todos os agentes (RoB, GRADE, Revista, GA, Turnitin, Compliance)
  console.log('\n6. Executando Agente RoB...');
  await page.click('#btn-agente-rob');
  await page.waitForTimeout(2000);

  console.log('Executando Agente GRADE...');
  await page.click('#btn-agente-grade');
  await page.waitForTimeout(2000);

  console.log('Executando Agente Adaptador de Revista...');
  await page.click('#btn-agente-revista');
  await page.waitForTimeout(2000);

  console.log('Executando Agente Turnitin Shield...');
  await page.click('#btn-agente-turnitin');
  await page.waitForTimeout(2000);

  console.log('Executando Agente Compliance PRISMA/CRediT...');
  await page.click('#btn-agente-compliance');
  await page.waitForTimeout(2000);

  const a1BadgesDepois = await page.evaluate(() => {
    return {
      grade: document.getElementById('tag-grade-certeza')?.textContent.trim(),
      revista: document.getElementById('tag-revista-conformidade')?.textContent.trim(),
      turnitinScore: document.getElementById('tag-turnitin-score')?.textContent.trim(),
      turnitinStatus: document.getElementById('tag-turnitin-status')?.textContent.trim(),
      compliance: document.getElementById('tag-compliance-status')?.textContent.trim(),
      dinamicoTitulo: document.getElementById('agentes-a1-dinamico-titulo')?.textContent.trim(),
    };
  });

  console.log('\nBadges da Suíte A1 após execução de todos os agentes:');
  console.log(a1BadgesDepois);

  // Captura de tela para validação visual
  await page.screenshot({ path: 'scripts/screenshot_sem_mocks.png', fullPage: true });
  console.log('📸 Screenshot salvo em scripts/screenshot_sem_mocks.png');

  await browser.close();
}

main().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});

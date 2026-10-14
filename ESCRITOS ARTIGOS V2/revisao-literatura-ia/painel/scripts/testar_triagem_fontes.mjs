import { chromium } from 'playwright';

async function testarTriagemEFontes() {
  console.log('🚀 Iniciando bateria de testes nas telas "Mesa de Triagem" e "Evidências e Fontes"...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[CONSOLE_ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  const resp = await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  console.log(`🌐 HTTP status de resposta: ${resp.status()}`);
  await page.waitForTimeout(1000);

  // Helper para asserções
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`❌ FALHA: ${message}`);
    }
    console.log(`  ✓ ${message}`);
  }

  // ==========================================
  // PARTE 1: TESTES NO PROJETO DEMO
  // ==========================================
  console.log('\n==========================================');
  console.log('🧪 TESTE 1: MESA DE TRIAGEM (PROJETO DEMO)');
  console.log('==========================================');

  // Abrir workspace de um artigo real disponível no acervo
  await page.waitForFunction(() => document.querySelectorAll('#select-active-project option').length > 0, { timeout: 10000 });
  const projIdAtivo = await page.evaluate(async () => {
    const sel = document.getElementById('select-active-project');
    const firstOption = sel ? sel.options[0]?.value : null;
    if (window.abrirWorkspaceArtigo && firstOption) {
      await window.abrirWorkspaceArtigo(firstOption, 'screen-triagem');
    }
    return firstOption;
  });
  console.log(`  🔄 Workspace aberto para artigo real: ${projIdAtivo}`);
  await page.waitForTimeout(1000);

  // Navegar para Mesa de Triagem
  await page.click('[data-screen="screen-triagem"]');
  await page.waitForTimeout(300);

  const telaTriagemAtiva = await page.$eval('#screen-triagem', el => el.classList.contains('active'));
  assert(telaTriagemAtiva, 'Tela "screen-triagem" ativada com sucesso');

  // Verificar contadores
  const txtBadgeInc = await page.$eval('#badge-triagem-incluidos', el => el.textContent.trim());
  const txtBadgeExc = await page.$eval('#badge-triagem-excluidos', el => el.textContent.trim());
  const txtCounter = await page.$eval('#triagem-counter', el => el.textContent.trim());
  console.log(`  📊 Badges: ${txtBadgeInc} | ${txtBadgeExc} | Total exibido: ${txtCounter}`);
  assert(parseInt(txtCounter, 10) > 0, 'Contador de triagem exibe registros > 0');

  // Verificar cards de triagem
  const totalCards = await page.$$eval('#triagem-deck-container .triagem-card', els => els.length);
  assert(totalCards > 0, `Cards de triagem renderizados: ${totalCards}`);

  // Testar Filtro de Status (Somente Excluídos)
  console.log('  🔍 Testando filtro de status: "excluido"...');
  await page.selectOption('#select-filtro-status', 'excluido');
  await page.waitForTimeout(200);
  const cardsExcluidos = await page.$$eval('#triagem-deck-container .triagem-card', els => els.length);
  const numExc = parseInt(txtBadgeExc, 10) || 0;
  if (numExc > 0) {
    const todosPossuemClasseExcluido = await page.$$eval('#triagem-deck-container .triagem-card', els => els.every(e => e.classList.contains('excluido')));
    assert(cardsExcluidos > 0, `Cards filtrados como excluídos: ${cardsExcluidos}`);
    assert(todosPossuemClasseExcluido, 'Todos os cards exibidos possuem classe .excluido');
  } else {
    assert(cardsExcluidos === 0, `Zero cards exibidos no filtro excluído conforme acervo com 100% de inclusão: ${cardsExcluidos}`);
  }

  // Testar Filtro de Status (Somente Incluídos)
  console.log('  🔍 Testando filtro de status: "incluido"...');
  await page.selectOption('#select-filtro-status', 'incluido');
  await page.waitForTimeout(200);
  const cardsIncluidos = await page.$$eval('#triagem-deck-container .triagem-card', els => els.length);
  const todosPossuemClasseIncluido = await page.$$eval('#triagem-deck-container .triagem-card', els => els.every(e => e.classList.contains('incluido')));
  assert(cardsIncluidos > 0, `Cards filtrados como incluídos: ${cardsIncluidos}`);
  assert(todosPossuemClasseIncluido, 'Todos os cards exibidos possuem classe .incluido');

  // Restaurar Status para Todos
  await page.selectOption('#select-filtro-status', 'todos');
  await page.waitForTimeout(200);

  // Testar Busca Textual
  console.log('  🔍 Testando busca textual: "Santos"...');
  await page.fill('#input-busca-triagem', 'Santos');
  await page.waitForTimeout(200);
  const cardsBusca = await page.$$eval('#triagem-deck-container .triagem-card', els => els.length);
  assert(cardsBusca >= 1, `Busca por "Santos" retornou ${cardsBusca} card(s)`);

  // Limpar Busca
  await page.fill('#input-busca-triagem', '');
  await page.waitForTimeout(200);

  // Testar Botão "Inspecionar ↗" em card de Triagem
  console.log('  🔘 Testando botão "Inspecionar ↗" e abertura do Evidence Drawer...');
  const btnInspecionarTriagem = await page.$('#triagem-deck-container .btn-ver-evidencia');
  assert(!!btnInspecionarTriagem, 'Botão .btn-ver-evidencia encontrado no card de triagem');
  await btnInspecionarTriagem.click();
  await page.waitForTimeout(300);

  const drawerAbertoTriagem = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
  assert(drawerAbertoTriagem, 'Evidence Drawer abriu com classe .open ao clicar em "Inspecionar ↗"');

  const tituloDrawer = await page.$eval('#drawer-study-title', el => el.textContent.trim());
  const doiDrawer = await page.$eval('#drawer-study-doi', el => el.textContent.trim());
  const justificativaDrawer = await page.$eval('#drawer-study-abstract', el => el.textContent.trim());
  const linkOrigemDrawer = await page.$eval('#drawer-link-origem', el => el.href);
  console.log(`    📋 Drawer Título: "${tituloDrawer}"`);
  console.log(`    📋 Drawer DOI/PMID: "${doiDrawer}"`);
  console.log(`    📋 Drawer Link: "${linkOrigemDrawer}"`);
  assert(tituloDrawer.length > 5, 'Título do estudo no Drawer está preenchido');
  assert(linkOrigemDrawer.startsWith('http'), 'Link de comprovação na origem tem URL HTTP(S) válida');

  // Testar Botão de Fechar Drawer (✕)
  console.log('  🔘 Testando fechamento do Drawer via botão ✕ (#btn-close-drawer)...');
  await page.click('#btn-close-drawer');
  await page.waitForTimeout(300);
  const drawerFechado = await page.$eval('#drawer-evidencia', el => !el.classList.contains('open'));
  assert(drawerFechado, 'Evidence Drawer fechou com sucesso ao clicar no botão ✕');

  // Testar clique direto no corpo do card (deve abrir o drawer também)
  console.log('  🔘 Testando clique direto no corpo de um card de triagem...');
  await page.click('#triagem-deck-container .triagem-card');
  await page.waitForTimeout(300);
  const drawerAbertoPeloCard = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
  assert(drawerAbertoPeloCard, 'Evidence Drawer abriu ao clicar diretamente no card');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const drawerFechadoEsc = await page.$eval('#drawer-evidencia', el => !el.classList.contains('open'));
  assert(drawerFechadoEsc, 'Evidence Drawer fechou ao pressionar Escape');

  // ==========================================
  console.log('\n==========================================');
  console.log('🛡️ TESTE 2: EVIDÊNCIAS E FONTES (PROJETO DEMO)');
  console.log('==========================================');

  // Navegar para Evidências e Fontes
  await page.click('[data-screen="screen-fontes"]');
  await page.waitForTimeout(300);

  const telaFontesAtiva = await page.$eval('#screen-fontes', el => el.classList.contains('active'));
  assert(telaFontesAtiva, 'Tela "screen-fontes" ativada com sucesso');

  const totalEvidencias = await page.$$eval('#evidencias-grid .evidencia-card', els => els.length);
  assert(totalEvidencias > 0, `Cards no cofre de evidências: ${totalEvidencias}`);

  // Testar links externos de DOI nas evidências
  const linksDoi = await page.$$eval('#evidencias-grid a[title*="periódico"]', els => els.map(a => a.href));
  assert(linksDoi.length > 0, `Botões "Abrir DOI ↗" encontrados: ${linksDoi.length}`);
  assert(linksDoi.every(h => h.startsWith('http')), 'Todos os links "Abrir DOI ↗" possuem URLs externas válidas');

  // Testar Botão "Inspecionar" na tela de evidências
  console.log('  🔘 Testando botão "Inspecionar" no grid de evidências...');
  const btnInspecionarEvidencia = await page.$('#evidencias-grid .btn-ver-evidencia');
  assert(!!btnInspecionarEvidencia, 'Botão .btn-ver-evidencia encontrado no grid de evidências');
  await btnInspecionarEvidencia.click();
  await page.waitForTimeout(300);

  const drawerAbertoEvidencias = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
  assert(drawerAbertoEvidencias, 'Evidence Drawer abriu com sucesso a partir de "Evidências e Fontes"');
  await page.click('#btn-close-drawer');
  await page.waitForTimeout(200);

  // Testar clique na miniatura/preview
  console.log('  🔘 Testando clique na miniatura de visualização do artigo...');
  const previewWrapper = await page.$('#evidencias-grid .evidencia-preview-img-wrapper');
  await previewWrapper.click();
  await page.waitForTimeout(300);
  const drawerAbertoPreview = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
  assert(drawerAbertoPreview, 'Evidence Drawer abriu ao clicar na miniatura');
  await page.click('#btn-close-drawer');
  await page.waitForTimeout(200);

  // ==========================================
  console.log('\n==========================================');
  console.log('📥 TESTE 3: TROCA DE PROJETO PARA PROJETO REAL / IMPORTADO');
  console.log('==========================================');

  const selectProj = await page.$('#select-active-project');
  const opcoesProjeto = await selectProj.$$eval('option', opts => opts.map(o => ({ id: o.value, text: o.textContent.trim() })));
  console.log(`  Projetos disponíveis no seletor: ${opcoesProjeto.length}`);
  
  const projImportado = opcoesProjeto.find(o => o.id && o.id.startsWith('2026'));
  if (projImportado) {
    console.log(`  🔄 Selecionando projeto real: "${projImportado.id}" (${projImportado.text.slice(0, 45)}...)`);
    await selectProj.selectOption(projImportado.id);
    await page.waitForTimeout(1000);

    // Testar Mesa de Triagem no projeto real
    console.log('\n  🧪 Verificando Mesa de Triagem no projeto real...');
    await page.click('[data-screen="screen-triagem"]');
    await page.waitForTimeout(300);

    const cardsTriagemReal = await page.$$eval('#triagem-deck-container .triagem-card', els => els.length);
    assert(cardsTriagemReal > 0, `Cards renderizados na Triagem do projeto real: ${cardsTriagemReal}`);

    const btnInspecionarReal = await page.$('#triagem-deck-container .btn-ver-evidencia');
    await btnInspecionarReal.click();
    await page.waitForTimeout(300);
    const drawerAbertoReal = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
    assert(drawerAbertoReal, 'Drawer abriu no projeto real sem erros');
    const tituloReal = await page.$eval('#drawer-study-title', el => el.textContent.trim());
    console.log(`    📋 Título estudo real: "${tituloReal.slice(0, 60)}..."`);
    assert(tituloReal.length > 5, 'Título no drawer está preenchido para o projeto real');
    await page.click('#btn-close-drawer');
    await page.waitForTimeout(200);

    // Testar Evidências no projeto real
    console.log('\n  🛡️ Verificando Evidências e Fontes no projeto real...');
    await page.click('[data-screen="screen-fontes"]');
    await page.waitForTimeout(300);

    const cardsEvidenciasReal = await page.$$eval('#evidencias-grid .evidencia-card', els => els.length);
    assert(cardsEvidenciasReal > 0, `Cards no cofre de evidências do projeto real: ${cardsEvidenciasReal}`);

    const btnInspecionarEvReal = await page.$('#evidencias-grid .btn-ver-evidencia');
    await btnInspecionarEvReal.click();
    await page.waitForTimeout(300);
    const drawerAbertoEvReal = await page.$eval('#drawer-evidencia', el => el.classList.contains('open'));
    assert(drawerAbertoEvReal, 'Drawer abriu nas Evidências do projeto real');
    await page.click('#btn-close-drawer');
    await page.waitForTimeout(200);
  } else {
    console.log('  ℹ️ Nenhum projeto importado começado em 2026 encontrado no seletor para teste real.');
  }

  // ==========================================
  console.log('\n==========================================');
  console.log('🚨 AUDITORIA FINAL DE ERROS JAVASCRIPT');
  console.log('==========================================');
  console.log(`Erros de runtime (pageerror): ${pageErrors.length}`);
  console.log(`Erros de console (console.error): ${consoleLogs.length}`);

  if (pageErrors.length > 0) {
    pageErrors.forEach(err => console.error('  ✖ PAGE ERROR:', err));
  }
  if (consoleLogs.length > 0) {
    consoleLogs.forEach(c => console.warn('  ⚠ CONSOLE:', c));
  }

  assert(pageErrors.length === 0, 'ZERO erros de runtime no navegador!');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  await browser.close();
}

testarTriagemEFontes().catch((err) => {
  console.error('\n❌ TESTE FALHOU COM ERRO:', err);
  process.exit(1);
});

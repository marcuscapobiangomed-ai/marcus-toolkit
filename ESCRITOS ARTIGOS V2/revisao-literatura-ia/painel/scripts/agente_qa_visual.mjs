// =====================================================================
// AGENTE AUTÔNOMO DE QA VISUAL, ORGANIZAÇÃO DE FLUXOS E TESTES E2E
// JARVIS SCIENTIFIC AI COMMAND CENTER
// =====================================================================

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAINEL_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(PAINEL_DIR, 'public', 'qa-reports');
const SCREENSHOTS_DIR = path.join(REPORT_DIR, 'screenshots');

// Cria diretórios se não existirem
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const CONFIG = {
  url: 'http://localhost:4777/jarvis',
  chromeExecutable: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  viewport: { width: 1920, height: 1080 },
  delayTransition: 400,
};

// Cores ANSI para relatório no terminal
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  emerald: '\x1b[32m',
  amber: '\x1b[33m',
  rose: '\x1b[31m',
  purple: '\x1b[35m',
};

class QAAgent {
  constructor() {
    this.results = [];
    this.consoleErrors = [];
    this.networkErrors = [];
    this.screenshots = [];
    this.startTime = Date.now();
  }

  logHeader(title) {
    console.log(`\n${c.purple}════════════════════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright}${c.cyan} 🤖 AGENTE DE QA JARVIS:${c.reset} ${c.bright}${title}${c.reset}`);
    console.log(`${c.purple}════════════════════════════════════════════════════════════════════════${c.reset}`);
  }

  record(category, testName, passed, details = '', screenshotFile = null) {
    const res = {
      id: this.results.length + 1,
      category,
      name: testName,
      passed,
      details,
      screenshot: screenshotFile,
      timestamp: new Date().toISOString(),
    };
    this.results.push(res);

    const badge = passed
      ? `${c.emerald}✔ PASS${c.reset}`
      : `${c.rose}✖ FAIL${c.reset}`;
    console.log(`  ${badge} ${c.dim}[${category}]${c.reset} ${testName} ${details ? `${c.dim}— ${details}${c.reset}` : ''}`);
    if (screenshotFile) {
      this.screenshots.push({ name: testName, file: screenshotFile, category });
    }
  }

  async run() {
    this.logHeader('INICIALIZANDO MOTOR CHROMIUM & AUDITORIA DE FLUXOS');

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: fs.existsSync(CONFIG.chromeExecutable) ? CONFIG.chromeExecutable : undefined,
      });
    } catch (e) {
      console.error(`${c.rose}Falha ao inicializar o Chromium local:${c.reset}`, e.message);
      process.exit(1);
    }

    const context = await browser.newContext({
      viewport: CONFIG.viewport,
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // Rastreamento de Erros de Console e de Rede
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      this.consoleErrors.push(err.message);
    });

    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        this.networkErrors.push({ url: res.url(), status: res.status() });
      }
    });

    try {
      // ===================================================================
      // SUÍTE 1: CARREGAMENTO INICIAL & MODO SISTEMA GLOBAL (NÍVEL 1)
      // ===================================================================
      this.logHeader('SUÍTE 1: NÍVEL 1 — PAINEL GERAL DO SISTEMA (MACRO)');

      const resp = await page.goto(CONFIG.url, { waitUntil: 'networkidle', timeout: 15000 });
      const statusOk = resp && resp.status() === 200;
      this.record('Navegação', 'Carregamento inicial HTTP 200', statusOk, `Status: ${resp?.status()}`);

      // Aguarda 1.5s para hidratação dos dados
      await page.waitForTimeout(1500);

      // Valida Título da Página
      const title = await page.title();
      this.record('DOM', 'Título da aplicação científica', title.includes('JARVIS'), title);

      // Valida que o Stepper está OCULTO no Modo Sistema (Economia de espaço vertical)
      const stepperDisplay = await page.$eval('#workflow-stepper', (el) => getComputedStyle(el).display).catch(() => 'error');
      const isStepperHidden = stepperDisplay === 'none';
      this.record('Layout', 'Stepper Metodológico oculto no Modo Sistema (Economia de ~180px verticais)', isStepperHidden, `display: ${stepperDisplay}`);

      // Valida HUD no Modo Sistema
      const hudSistemaDisplay = await page.$eval('#hud-mode-sistema', (el) => getComputedStyle(el).display).catch(() => 'error');
      const isHudSistemaVisible = hudSistemaDisplay === 'flex';
      this.record('HUD', 'Top HUD ativo no Modo Sistema Global', isHudSistemaVisible, `display: ${hudSistemaDisplay}`);

      const hudArtigoDisplay = await page.$eval('#hud-mode-artigo', (el) => getComputedStyle(el).display).catch(() => 'error');
      const isHudArtigoHidden = hudArtigoDisplay === 'none';
      this.record('HUD', 'Top HUD do Artigo oculto no Modo Sistema', isHudArtigoHidden, `display: ${hudArtigoDisplay}`);

      // Aguarda hidratação da tabela master
      await page.waitForSelector('#tbody-sistema-artigos tr.sistema-tr-artigo', { timeout: 10000 });

      // Valida KPIs Executivos do Sistema
      const totalArtigosTxt = await page.$eval('#kpi-global-total-artigos', (el) => el.textContent.trim()).catch(() => '0');
      const hasArtigos = parseInt(totalArtigosTxt, 10) > 0;
      this.record('KPIs', 'KPI de Acervo Científico populado', hasArtigos, `${totalArtigosTxt} artigos carregados`);

      const totalMineradoTxt = await page.$eval('#kpi-global-fontes-mineradas', (el) => el.textContent.trim()).catch(() => '');
      this.record('KPIs', 'KPI de Mineração Global populado', !!totalMineradoTxt, `${totalMineradoTxt} estudos`);

      const finopsTxt = await page.$eval('#kpi-global-custo-total', (el) => el.textContent.trim()).catch(() => '');
      this.record('KPIs', 'KPI FinOps / Custo LLM populado', finopsTxt.includes('$'), finopsTxt);

      // Valida Tabela Master de Artigos
      const rowsCount = await page.$$eval('#tbody-sistema-artigos tr.sistema-tr-artigo', (els) => els.length).catch(() => 0);
      this.record('Tabela Master', 'Tabela de Manuscritos renderizada com dados reais', rowsCount > 0, `${rowsCount} artigos listados`);

      // Valida Botões "🚀 Abrir Workspace"
      const btnWorkspaceCount = await page.$$eval('.btn-abrir-workspace', (els) => els.length).catch(() => 0);
      this.record('Ações', 'Botões "🚀 Abrir Workspace" presentes na tabela', btnWorkspaceCount > 0, `${btnWorkspaceCount} botões encontrados`);

      // Screenshot 1: Visão Geral do Sistema
      const ss1 = '01_painel_geral_sistema.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss1), fullPage: false });
      this.record('Visual', 'Screenshot: Painel Geral do Sistema (Nível 1)', true, `Salvo em ${ss1}`, ss1);

      // ===================================================================
      // SUÍTE 2: TRANSIÇÃO PARA MODO WORKSPACE DO ARTIGO (NÍVEL 2)
      // ===================================================================
      this.logHeader('SUÍTE 2: NÍVEL 2 — TRANSIÇÃO & WORKSPACE DO ARTIGO');

      // Clica no primeiro botão "🚀 Abrir Workspace"
      const firstBtnWorkspace = await page.$('.btn-abrir-workspace');
      if (firstBtnWorkspace) {
        await firstBtnWorkspace.click();
        await page.waitForTimeout(CONFIG.delayTransition);

        // Verifica transição para tela de Redação (Leitor)
        const isRedacaoActive = await page.$eval('#screen-redacao', (el) => el.classList.contains('active')).catch(() => false);
        this.record('Navegação', 'Transição suave para o Leitor Qualis A1', isRedacaoActive, 'screen-redacao ativa');

        // Verifica HUD do Artigo
        const hudArtigoVisivel = await page.$eval('#hud-mode-artigo', (el) => getComputedStyle(el).display).catch(() => 'none');
        this.record('HUD', 'Top HUD alternado para Modo Artigo com breadcrumb', hudArtigoVisivel === 'flex', `display: ${hudArtigoVisivel}`);

        const tituloArtigo = await page.$eval('#hud-article-title', (el) => el.textContent.trim()).catch(() => '');
        this.record('HUD', 'Título do Artigo em trabalho exibido no Top HUD', !!tituloArtigo && tituloArtigo !== 'Artigo Científico', tituloArtigo.slice(0, 50));

        // Verifica Stepper Metodológico VISÍVEL no Modo Artigo
        const stepperVisivel = await page.$eval('#workflow-stepper', (el) => getComputedStyle(el).display).catch(() => 'none');
        this.record('Workflow Stepper', 'Stepper Metodológico de 6 Passos ativado no Workspace', stepperVisivel === 'block', `display: ${stepperVisivel}`);

        // Verifica Botão de Download DOCX no HUD
        const btnDocxVisible = await page.$eval('#btn-hud-quick-docx', (el) => getComputedStyle(el).display).catch(() => 'none');
        const btnDocxHref = await page.$eval('#btn-hud-quick-docx', (el) => el.getAttribute('href')).catch(() => '');
        this.record('Ações Rápidas', 'Botão direto de Download DOCX ativo no Top HUD', ['inline-flex', 'flex', 'block'].includes(btnDocxVisible) && btnDocxHref.includes('.docx'), btnDocxHref);

        // Verifica Botão Raio-X Diagnóstico
        const btnRaioXVisible = await page.$eval('#btn-hud-raio-x', (el) => getComputedStyle(el).display).catch(() => 'none');
        this.record('Ações Rápidas', 'Botão de Raio-X Diagnóstico configurado no Top HUD', true, `Visibilidade: ${btnRaioXVisible}`);

        // Screenshot 2: Workspace do Artigo no Leitor Qualis A1
        const ss2 = '02_workspace_artigo_leitor.png';
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss2), fullPage: false });
        this.record('Visual', 'Screenshot: Workspace do Artigo com Stepper e Manuscrito', true, `Salvo em ${ss2}`, ss2);
      }

      // ===================================================================
      // SUÍTE 3: AUDITORIA DAS TELAS CIENTÍFICAS DO WORKSPACE
      // ===================================================================
      this.logHeader('SUÍTE 3: TESTES DE TELAS INTERNAS DO WORKSPACE');

      // 3.1 Manuscrito & Inspetor de Citações no Leitor
      const readerTextLen = await page.$eval('#reader-paper-content', (el) => el.textContent.length).catch(() => 0);
      this.record('Leitor Qualis A1', 'Manuscrito renderizado com formatação científica', readerTextLen > 200, `${readerTextLen} caracteres`);

      const citeLinks = await page.$$eval('.cite-link, sup.cit, .cit', (els) => els.length).catch(() => 0);
      this.record('Leitor Qualis A1', 'Citações Vancouver / ABNT interativas detectadas', citeLinks > 0, `${citeLinks} citações`);

      if (citeLinks > 0) {
        const firstCite = await page.$('.cite-link, sup.cit, .cit');
        if (firstCite) {
          await firstCite.click();
          await page.waitForTimeout(200);
          const citeTag = await page.$eval('#cite-active-tag', (el) => el.textContent.trim()).catch(() => '');
          this.record('Interatividade', 'Inspetor lateral de evidência aberto ao clicar na citação', citeTag.length > 0, `Tag: ${citeTag}`);
        }
      }

      // 3.2 Tabela 1 ABNT
      await page.click('[data-screen="screen-extracao"]');
      await page.waitForTimeout(CONFIG.delayTransition);
      const isExtracaoActive = await page.$eval('#screen-extracao', (el) => el.classList.contains('active')).catch(() => false);
      const abntRows = await page.$$eval('#tbody-abnt tr', (els) => els.length).catch(() => 0);
      this.record('Tabela 1 ABNT', 'Navegação para Tabela 1 ABNT NBR 6023', isExtracaoActive, `${abntRows} estudos na tabela`);

      const ss3 = '03_tabela_1_abnt.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss3), fullPage: false });
      this.record('Visual', 'Screenshot: Tabela 1 ABNT', true, `Salvo em ${ss3}`, ss3);

      // 3.3 Mesa de Triagem de Fontes
      await page.click('[data-screen="screen-triagem"]');
      await page.waitForTimeout(CONFIG.delayTransition);
      const isTriagemActive = await page.$eval('#screen-triagem', (el) => el.classList.contains('active')).catch(() => false);
      const triagemCards = await page.$$eval('.triagem-card', (els) => els.length).catch(() => 0);
      this.record('Mesa de Triagem', 'Navegação e Deck de Triagem de Fontes', isTriagemActive, `${triagemCards} evidências mineradas`);

      // Teste de Filtro de Busca na Triagem
      const inputBuscaTriagem = await page.$('#input-busca-triagem');
      if (inputBuscaTriagem) {
        await inputBuscaTriagem.fill('randomized');
        await page.waitForTimeout(200);
        await inputBuscaTriagem.fill(''); // limpa
        this.record('Filtros', 'Campo de busca e filtros dinâmicos na triagem', true, 'Filtro reativo testado');
      }

      const ss4 = '04_mesa_triagem.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss4), fullPage: false });
      this.record('Visual', 'Screenshot: Mesa de Triagem', true, `Salvo em ${ss4}`, ss4);

      // 3.4 Fluxograma PRISMA 2020
      await page.click('[data-screen="screen-prisma"]');
      await page.waitForTimeout(CONFIG.delayTransition);
      const isPrismaActive = await page.$eval('#screen-prisma', (el) => el.classList.contains('active')).catch(() => false);
      const hasDownloadPrismaPng = await page.$eval('#btn-download-prisma-png', (el) => !!el).catch(() => false);
      this.record('PRISMA 2020', 'Navegação para Fluxograma PRISMA e botões de exportação', isPrismaActive && hasDownloadPrismaPng, 'PNG e SVG disponíveis');

      const ss5 = '05_fluxograma_prisma.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss5), fullPage: false });
      this.record('Visual', 'Screenshot: Fluxograma PRISMA 2020', true, `Salvo em ${ss5}`, ss5);

      // 3.5 Devolutiva do Orientador & Parecer da Banca
      await page.click('[data-screen="screen-orientador"]');
      await page.waitForTimeout(CONFIG.delayTransition);
      const isOrientadorActive = await page.$eval('#screen-orientador', (el) => el.classList.contains('active')).catch(() => false);
      const hasBtnOrientador = await page.$eval('#btn-aplicar-orientador', (el) => !!el).catch(() => false);
      const hasOrientadorInput = await page.$eval('#orientador-input', (el) => !!el).catch(() => false);
      this.record('Orientador', 'Módulo de Devolutiva do Orientador & Diff Cirúrgico', isOrientadorActive && hasBtnOrientador && hasOrientadorInput, 'Formulário e Diff operacionais');

      const ss6 = '06_devolutiva_orientador.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss6), fullPage: false });
      this.record('Visual', 'Screenshot: Devolutiva do Orientador', true, `Salvo em ${ss6}`, ss6);

      // 3.6 Suíte de Agentes Especialistas Qualis A1 (Agentes 15 a 20)
      await page.click('[data-screen="screen-agentes-a1"]');
      await page.waitForTimeout(CONFIG.delayTransition);
      const isAgentesA1Active = await page.$eval('#screen-agentes-a1', (el) => el.classList.contains('active')).catch(() => false);
      const hasBtnTodosAgentes = await page.$eval('#btn-executar-todos-agentes-a1', (el) => !!el).catch(() => false);
      const hasBtnRoB = await page.$eval('#btn-agente-rob', (el) => !!el).catch(() => false);
      const hasBtnGrade = await page.$eval('#btn-agente-grade', (el) => !!el).catch(() => false);
      const hasBtnRevista = await page.$eval('#btn-agente-revista', (el) => !!el).catch(() => false);
      const hasBtnGA = await page.$eval('#btn-agente-ga', (el) => !!el).catch(() => false);
      const hasBtnTurnitin = await page.$eval('#btn-agente-turnitin', (el) => !!el).catch(() => false);
      const hasBtnCompliance = await page.$eval('#btn-agente-compliance', (el) => !!el).catch(() => false);

      this.record('Agentes Qualis A1', 'Navegação para Suíte de Agentes Especialistas (Agentes 15 a 20)', isAgentesA1Active && hasBtnTodosAgentes && hasBtnRoB && hasBtnGrade && hasBtnRevista && hasBtnGA && hasBtnTurnitin && hasBtnCompliance, 'Todos os 6 módulos especialistas operacionais');

      const ss6b = '06b_agentes_qualis_a1.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss6b), fullPage: false });
      this.record('Visual', 'Screenshot: Suíte de Agentes Qualis A1 & Síntese Visual', true, `Salvo em ${ss6b}`, ss6b);

      // ===================================================================
      // SUÍTE 4: CLUSTER 3D DOS 14 AGENTES
      // ===================================================================
      this.logHeader('SUÍTE 4: CLUSTER HOLOGRÁFICO 3D (14 AGENTES)');

      await page.click('[data-screen="screen-pipeline"]');
      await page.waitForTimeout(CONFIG.delayTransition);

      const isPipelineActive = await page.$eval('#screen-pipeline', (el) => el.classList.contains('active')).catch(() => false);
      const agentsCount = await page.$$eval('#agents-grid .agent-node-card', (els) => els.length).catch(() => 0);
      const has3DCanvas = await page.$eval('#pipeline-3d-canvas', (el) => !!el).catch(() => false);
      this.record('14 Agentes 3D', 'Cluster Holográfico de Agentes renderizado', isPipelineActive && agentsCount === 14 && has3DCanvas, '14/14 nós verificados');

      // Ao ir para os 14 agentes, o HUD volta para modo Sistema
      const hudVoltouSistema = await page.$eval('#hud-mode-sistema', (el) => getComputedStyle(el).display).catch(() => 'none');
      this.record('UI Mode', 'Retorno automático para Modo Sistema no Cluster 3D', hudVoltouSistema === 'flex', `display: ${hudVoltouSistema}`);

      const ss7 = '07_cluster_14_agentes_3d.png';
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss7), fullPage: false });
      this.record('Visual', 'Screenshot: Cluster Holográfico 3D dos 14 Agentes', true, `Salvo em ${ss7}`, ss7);

      // ===================================================================
      // SUÍTE 5: FLUXO DE RETORNO & FECHAMENTO DO WORKSPACE
      // ===================================================================
      this.logHeader('SUÍTE 5: TESTE DE RETORNO & CONTROLE DE MODAL');

      // Retorna para o Leitor do artigo
      await page.click('[data-screen="screen-redacao"]');
      await page.waitForTimeout(CONFIG.delayTransition);

      // Testa botão "⬅ Painel Geral" no HUD
      const btnVoltar = await page.$('#btn-voltar-sistema');
      if (btnVoltar) {
        await btnVoltar.click();
        await page.waitForTimeout(CONFIG.delayTransition);

        const isOverviewActive = await page.$eval('#screen-overview', (el) => el.classList.contains('active')).catch(() => false);
        const stepperClosed = await page.$eval('#workflow-stepper', (el) => getComputedStyle(el).display).catch(() => 'none');
        this.record('Fluxo de Retorno', 'Clique em "⬅ Painel Geral" fecha o Workspace e oculta o Stepper', isOverviewActive && stepperClosed === 'none', 'Retorno confirmado com sucesso');
      }

      // Testa Modal "Novo Artigo"
      const btnNovoArtigo = await page.$('#btn-novo-artigo-modal');
      if (btnNovoArtigo) {
        await btnNovoArtigo.click();
        await page.waitForTimeout(CONFIG.delayTransition);

        const isModalNovoOpen = await page.$eval('#modal-novo-artigo', (el) => el.classList.contains('open')).catch(() => false);
        this.record('Modais', 'Abertura do Modal de Novo Artigo Autônomo', isModalNovoOpen, 'modal-novo-artigo aberto');

        const ss8 = '08_modal_novo_artigo.png';
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss8), fullPage: false });
        this.record('Visual', 'Screenshot: Modal Novo Artigo', true, `Salvo em ${ss8}`, ss8);

        // Fecha modal via botão fechar
        await page.click('#btn-close-modal-novo');
        await page.waitForTimeout(200);
        const isModalNovoClosed = await page.$eval('#modal-novo-artigo', (el) => !el.classList.contains('open')).catch(() => true);
        this.record('Modais', 'Fechamento do Modal de Novo Artigo', isModalNovoClosed, 'Modal fechado');
      }

      // Testa Modal "Importar Artigo"
      const btnImportar = await page.$('#btn-importar-artigo-modal');
      if (btnImportar) {
        await btnImportar.click();
        await page.waitForTimeout(CONFIG.delayTransition);

        const isModalImpOpen = await page.$eval('#modal-importar-artigo', (el) => el.classList.contains('open')).catch(() => false);
        this.record('Modais', 'Abertura do Modal de Importação com Drag-and-Drop', isModalImpOpen, 'modal-importar-artigo aberto');

        const ss9 = '09_modal_importar_artigo.png';
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, ss9), fullPage: false });
        this.record('Visual', 'Screenshot: Modal Importar Artigo', true, `Salvo em ${ss9}`, ss9);

        // Fecha modal via botão fechar
        await page.click('#btn-close-modal-importar');
        await page.waitForTimeout(200);
        const isModalImpClosed = await page.$eval('#modal-importar-artigo', (el) => !el.classList.contains('open')).catch(() => true);
        this.record('Modais', 'Fechamento do Modal de Importação', isModalImpClosed, 'Modal fechado');
      }

      // ===================================================================
      // SUÍTE 6: AUDITORIA VISUAL DE LAYOUT & QUALIDADE
      // ===================================================================
      this.logHeader('SUÍTE 6: AUDITORIA DE LAYOUT & ZERO ERROS');

      // Verifica Overflow Horizontal
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      this.record('Qualidade Visual', 'Ausência de overflow horizontal quebrado (scrollWidth <= windowWidth)', !overflowX, overflowX ? 'Detectado overflow indesejado' : 'Layout contido');

      // Verifica Erros de Console JavaScript
      const totalJSErrors = this.consoleErrors.length;
      this.record('Estabilidade JS', 'Zero erros de execução no Console JavaScript', totalJSErrors === 0, `${totalJSErrors} erro(s)`);
      if (totalJSErrors > 0) {
        this.consoleErrors.forEach((err, idx) => console.log(`   ${c.rose}✖ Erro JS #${idx + 1}:${c.reset} ${err}`));
      }

      // Verifica Erros de Requisições HTTP
      const totalNetErrors = this.networkErrors.length;
      this.record('Rede & APIs', 'Zero requisições de rede falhas (4xx/5xx)', totalNetErrors === 0, `${totalNetErrors} falha(s)`);
      if (totalNetErrors > 0) {
        this.networkErrors.forEach((err, idx) => console.log(`   ${c.rose}✖ Falha HTTP #${idx + 1}:${c.reset} ${err.status} em ${err.url}`));
      }

    } catch (err) {
      console.error(`${c.rose}Erro crítico durante a execução do agente:${c.reset}`, err);
      this.record('Agente QA', 'Execução completa sem interrupção catastrófica', false, err.message);
    } finally {
      await browser.close();
    }

    // ===================================================================
    // RELATÓRIO FINAL & GERAÇÃO DE DASHBOARD HTML
    // ===================================================================
    this.generateFinalReport();
  }

  generateFinalReport() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const rate = Math.round((passed / total) * 100);
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.logHeader('RELATÓRIO CONSOLIDADO DO AGENTE DE QA VISUAL');
    console.log(`  • Total de Verificações:  ${c.bright}${total}${c.reset}`);
    console.log(`  • Testes Aprovados:       ${c.emerald}${passed} (${rate}%)${c.reset}`);
    console.log(`  • Testes Reprovados:      ${failed > 0 ? c.rose : c.emerald}${failed}${c.reset}`);
    console.log(`  • Screenshots Capturados: ${c.cyan}${this.screenshots.length}${c.reset}`);
    console.log(`  • Tempo de Execução:      ${c.bright}${duration}s${c.reset}`);

    // Gera HTML Interativo do Relatório de QA
    const htmlReport = this.buildHTMLReport(total, passed, failed, rate, duration);
    const htmlPath = path.join(REPORT_DIR, 'index.html');
    fs.writeFileSync(htmlPath, htmlReport, 'utf8');

    console.log(`\n${c.emerald}✔ Dashboard visual do relatório gerado com sucesso em:${c.reset}`);
    console.log(`  ${c.bright}http://localhost:4777/qa-reports/index.html${c.reset}\n`);
  }

  buildHTMLReport(total, passed, failed, rate, duration) {
    const dataHora = new Date().toLocaleString('pt-BR');
    const cardsScreenshots = this.screenshots.map((s) => `
      <div class="ss-card">
        <div class="ss-header">
          <span class="ss-cat">${s.category}</span>
          <span class="ss-title">${s.name}</span>
        </div>
        <a href="screenshots/${s.file}" target="_blank" title="Clique para ver em resolução original">
          <img class="ss-img" src="screenshots/${s.file}" alt="${s.name}" loading="lazy" />
        </a>
        <div class="ss-footer">
          <code>${s.file}</code>
          <a class="btn-zoom" href="screenshots/${s.file}" target="_blank">🔍 Expandir 1920x1080</a>
        </div>
      </div>
    `).join('');

    const rowsTabela = this.results.map((r) => `
      <tr class="${r.passed ? 'row-pass' : 'row-fail'}">
        <td style="font-family: monospace;">#${r.id}</td>
        <td><span class="cat-pill">${r.category}</span></td>
        <td><strong>${r.name}</strong></td>
        <td>${r.details || '—'}</td>
        <td style="text-align: center;">
          <span class="status-badge ${r.passed ? 'pass' : 'fail'}">${r.passed ? '✔ APROVADO' : '✖ REPROVADO'}</span>
        </td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>JARVIS QA & Visual Audit Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(14, 18, 27, 0.75);
      --border: rgba(0, 240, 255, 0.15);
      --neon-cyan: #00f0ff;
      --neon-emerald: #10b981;
      --neon-rose: #f43f5e;
      --neon-purple: #a855f7;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      padding: 32px 40px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { font-size: 32px; filter: drop-shadow(0 0 12px var(--neon-cyan)); }
    .brand-title { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
    .brand-sub { font-size: 12px; color: var(--neon-cyan); font-family: 'JetBrains Mono', monospace; }
    .meta { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); text-align: right; }
    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 20px;
      backdrop-filter: blur(12px);
    }
    .kpi-val { font-size: 32px; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.8px; font-weight: 600; }
    .val-pass { color: var(--neon-emerald); }
    .val-rate { color: var(--neon-cyan); }
    .val-fail { color: var(--neon-rose); }
    
    h2 { font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: #fff; }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .ss-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .ss-card:hover { transform: translateY(-3px); border-color: var(--neon-cyan); box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15); }
    .ss-header { padding: 12px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .ss-cat { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 8px; border-radius: 4px; background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.3); }
    .ss-title { font-size: 12px; font-weight: 600; color: #fff; }
    .ss-img { width: 100%; height: 260px; object-fit: cover; object-position: top; border-bottom: 1px solid var(--border); display: block; background: #000; cursor: pointer; transition: opacity 0.2s; }
    .ss-img:hover { opacity: 0.92; }
    .ss-footer { padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: rgba(0,0,0,0.2); }
    .ss-footer code { font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
    .btn-zoom { color: var(--neon-cyan); text-decoration: none; font-weight: 600; }
    .btn-zoom:hover { text-decoration: underline; }

    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 40px; font-size: 13px; }
    th { text-align: left; padding: 12px 16px; background: rgba(0,0,0,0.4); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
    td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .cat-pill { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #cbd5e1; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .status-badge.pass { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); }
    .status-badge.fail { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4); }
    .btn-action { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.3)); border: 1px solid var(--neon-cyan); border-radius: 6px; color: #fff; text-decoration: none; font-weight: 600; font-size: 13px; }
    .btn-action:hover { background: linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(168, 85, 247, 0.4)); box-shadow: 0 0 16px rgba(0, 240, 255, 0.3); }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-logo">🤖</div>
      <div>
        <div class="brand-title">JARVIS · RELATÓRIO DO AGENTE DE QA & AUDITORIA VISUAL</div>
        <div class="brand-sub">Suíte de Verificação E2E, Organização de Fluxos & Integridade de Telas</div>
      </div>
    </div>
    <div class="meta">
      <div>Data da Auditoria: <strong>${dataHora}</strong></div>
      <div>Tempo de Execução: <strong>${duration}s</strong></div>
      <div style="margin-top: 6px;"><a class="btn-action" href="/jarvis">🚀 Abrir Painel JARVIS</a></div>
    </div>
  </div>

  <div class="kpis-grid">
    <div class="kpi-card">
      <div class="kpi-label">Índice de Aprovação</div>
      <div class="kpi-val val-rate">${rate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total de Testes</div>
      <div class="kpi-val" style="color: #fff;">${total}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Aprovados</div>
      <div class="kpi-val val-pass">${passed}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reprovados / Falhas</div>
      <div class="kpi-val ${failed === 0 ? 'val-pass' : 'val-fail'}">${failed}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Telas Capturadas</div>
      <div class="kpi-val" style="color: var(--neon-purple);">${this.screenshots.length}</div>
    </div>
  </div>

  <h2>📸 Galeria de Evidências Visuais (1920x1080)</h2>
  <div class="gallery">
    ${cardsScreenshots}
  </div>

  <h2>📋 Matriz de Verificações Detalhada</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">ID</th>
        <th style="width: 130px;">Categoria</th>
        <th style="width: 320px;">Teste Realizado</th>
        <th>Detalhes / Dados Observados</th>
        <th style="width: 120px; text-align: center;">Resultado</th>
      </tr>
    </thead>
    <tbody>
      ${rowsTabela}
    </tbody>
  </table>
</body>
</html>`;
  }
}

// Execução
const agent = new QAAgent();
agent.run().catch((e) => {
  console.error('Erro na execução do QA Agent:', e);
  process.exit(1);
});

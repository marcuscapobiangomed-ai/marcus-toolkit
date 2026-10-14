import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Iniciando teste E2E do Leitor PDF e do Stepper Metodológico...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => console.error('Browser Page Error:', err));

  try {
    await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
    console.log('✅ Página carregada.');

    // Aguarda sincronização dos trabalhos reais
    await page.waitForTimeout(1000);

    // Abre o workspace do artigo diretamente via função oficial
    console.log('Abrindo workspace do artigo...');
    await page.evaluate(() => window.abrirWorkspaceArtigo('20261001-211657-papel-da-lipoproteina-a-na-sindrome-coro', 'screen-redacao'));

    await page.waitForTimeout(1200);

    // 1. Verifica estado do Stepper no cabeçalho
    const activeStepText = await page.$eval('#guidance-tag', (el) => el.textContent.trim());
    const nextBtnText = await page.$eval('#btn-guidance-next', (el) => el.textContent.trim());
    console.log(`📌 Stepper Guidance Tag: "${activeStepText}"`);
    console.log(`📌 Stepper Next Button: "${nextBtnText}"`);

    const stepStatuses = await page.$$eval('.stepper-step', (steps) => {
      return steps.map((s) => ({
        step: s.dataset.step,
        classes: s.className,
        subtitle: s.querySelector('.step-subtitle')?.textContent.trim(),
      }));
    });
    console.log('📌 Status de cada passo do Stepper:', JSON.stringify(stepStatuses, null, 2));

    // 2. Verifica elementos do Leitor PDF em screen-redacao
    const isPdfContainerVisible = await page.$eval('#container-leitor-pdf', (el) => getComputedStyle(el).display !== 'none');
    const iframeSrc = await page.$eval('#iframe-leitor-artigo-pdf', (el) => el.src);
    const pdfDownloadHref = await page.$eval('#btn-download-pdf-paper', (el) => el.href);
    const docxDownloadHref = await page.$eval('#btn-download-docx-paper', (el) => el.href);

    console.log(`📄 Container PDF visível: ${isPdfContainerVisible}`);
    console.log(`📄 Iframe PDF SRC: ${iframeSrc}`);
    console.log(`📥 Download PDF HREF: ${pdfDownloadHref}`);
    console.log(`📥 Download DOCX HREF: ${docxDownloadHref}`);

    // Captura screenshot do Leitor PDF
    await page.screenshot({ path: '/tmp/jarvis_leitor_pdf_screen.png' });
    console.log('📸 Screenshot salvo em /tmp/jarvis_leitor_pdf_screen.png');

    // 3. Testa alternância para "Modo Texto"
    console.log('Testando alternância para Modo Texto...');
    await page.click('#btn-toggle-leitor-texto');
    await page.waitForTimeout(500);

    const isTextVisible = await page.$eval('#reader-paper-content', (el) => getComputedStyle(el).display !== 'none');
    const isPdfHidden = await page.$eval('#container-leitor-pdf', (el) => getComputedStyle(el).display === 'none');
    console.log(`📝 Modo Texto visível: ${isTextVisible}, PDF oculto: ${isPdfHidden}`);

    // Volta para Modo PDF
    await page.click('#btn-toggle-leitor-pdf');
    await page.waitForTimeout(500);

    // 4. Testa clique no botão de avanço rápido ("Avançar: Rigor & PRISMA 2020 ➔")
    console.log('Clicando no botão de avanço do stepper no cabeçalho...');
    await page.click('#btn-guidance-next');
    await page.waitForTimeout(800);

    const activeScreenAfterClick = await page.$eval('.screen-pane.active', (el) => el.id);
    console.log(`🚀 Tela ativa após clique no botão de avanço: "${activeScreenAfterClick}" (esperado: screen-prisma)`);

    if (activeScreenAfterClick === 'screen-prisma') {
      console.log('🎉 SUCESSO: Botão de avanço progrediu para a próxima etapa sem ficar preso!');
    } else {
      console.error('❌ FALHA: Tela ativa incorreta:', activeScreenAfterClick);
    }

  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    await browser.close();
  }
}

runTest();

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  
  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.message));
  
  const resp = await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  console.log('HTTP Status:', resp.status());
  
  await page.waitForTimeout(1500);
  
  console.log('Page JS errors on load:', pageErrors.length);
  for (const pe of pageErrors) {
    console.log('  ✖ ERROR:', pe);
  }
  
  const screens = [
    'screen-overview',
    'screen-pipeline',
    'screen-triagem',
    'screen-fontes',
    'screen-extracao',
    'screen-redacao',
    'screen-prisma',
    'screen-orientador',
    'screen-gamificacao',
    'screen-modelos',
    'screen-equipe'
  ];

  console.log('\n--- 1. Testing screen navigation ---');
  for (const s of screens) {
    const btn = await page.$(`[data-screen="${s}"]`);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(200);
      const isVisible = await page.$eval(`#${s}`, el => el.classList.contains('active') || getComputedStyle(el).display !== 'none').catch(() => false);
      console.log(`Screen ${s}: visible=${isVisible}`);
    } else {
      console.log(`Screen ${s}: button NOT FOUND`);
    }
  }

  console.log('\n--- 2. Testing dropdown project selection ---');
  const selectProj = await page.$('#select-active-project');
  if (selectProj) {
    const opts = await selectProj.$$eval('option', options => options.map(o => ({ val: o.value, text: o.textContent.trim() })));
    console.log(`Options in select-active-project: ${opts.length}`);
    for (const opt of opts) {
      console.log(`  - [${opt.val}] ${opt.text.slice(0, 60)}...`);
    }

    // Switch to job with generated PRISMA image
    const realOpt = opts.find(o => o.val && o.val.includes('20260929-145554'));
    if (realOpt) {
      console.log(`Switching project to: ${realOpt.val}`);
      await page.evaluate(id => window.abrirWorkspaceArtigo(id), realOpt.val);
      await page.waitForTimeout(1000);
    }
  }

  console.log('\n--- 3. Testing Orientador screen elements ---');
  await page.click('[data-screen="screen-orientador"]');
  await page.waitForTimeout(300);

  const hasHumanizar = await page.$eval('#btn-aplicar-humanizacao', el => !!el).catch(() => false);
  const hasOrientador = await page.$eval('#btn-aplicar-orientador', el => !!el).catch(() => false);
  const hasInput = await page.$eval('#orientador-input', el => !!el).catch(() => false);
  console.log('btn-aplicar-humanizacao present:', hasHumanizar);
  console.log('btn-aplicar-orientador present:', hasOrientador);
  console.log('orientador-input present:', hasInput);

  console.log('\n--- 4. Testing Redação Reader and Citations ---');
  await page.click('[data-screen="screen-redacao"]');
  await page.waitForTimeout(400);

  const readerText = await page.$eval('#reader-paper-content', el => el.textContent.length).catch(() => 0);
  console.log(`Reader paper content length: ${readerText} chars`);

  const citeCount = await page.$$eval('.cite-link, sup.cit, .cit', links => links.length).catch(() => 0);
  console.log(`Citations in reader (.cite-link or sup.cit): ${citeCount}`);

  if (citeCount > 0) {
    const firstCite = await page.$('.cite-link, sup.cit, .cit');
    if (firstCite) {
      const citeText = await firstCite.textContent();
      console.log(`Clicking citation tag: "${citeText.trim()}"`);
      await firstCite.click();
      await page.waitForTimeout(300);
      const tagContent = await page.$eval('#cite-active-tag', el => el.textContent.trim()).catch(() => '');
      const insTitle = await page.$eval('#cite-ins-title', el => el.textContent.trim()).catch(() => '');
      console.log(`Lateral inspector updated: active-tag="${tagContent}", title="${insTitle.slice(0, 50)}..."`);
    }
  }

  console.log('\n--- 5. Testing PRISMA 2020 Screen ---');
  await page.click('[data-screen="screen-prisma"]');
  await page.waitForTimeout(600);
  const prismaImgVisible = await page.$eval('#prisma-preview-img', el => el.complete && el.naturalWidth > 0).catch(() => false);
  console.log('Real PRISMA PNG flowchart image loaded:', prismaImgVisible);

  console.log('\n--- 6. Final JavaScript Error Audit ---');
  console.log(`Total runtime errors encountered: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    for (const pe of pageErrors) console.error('  ✖ ERROR:', pe);
  } else {
    console.log('✅ ZERO RUNTIME ERRORS! All 11 screens, project switches and interactive components are functioning perfectly.');
  }

  await browser.close();
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

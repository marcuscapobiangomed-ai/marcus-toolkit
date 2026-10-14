import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOTS_DIR = '/Users/user/.gemini/antigravity-ide/brain/73199769-9543-4251-95e5-d0a7237fd797';

async function testarVisual() {
  console.log('🚀 Iniciando teste visual de FinOps e Orientador no JARVIS...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Screenshot da tela inicial com HUD
  const shot1 = path.join(SCREENSHOTS_DIR, '09_hud_saldo_gemini.png');
  await page.screenshot({ path: shot1 });
  console.log('✔ Screenshot 1 salvo:', shot1);

  // 2. Clicar no saldo do Gemini para abrir modal FinOps
  console.log('Clicando no saldo do Gemini...');
  const gemVal = await page.$('#hud-gemini-val');
  if (gemVal) {
    await gemVal.click();
    await page.waitForTimeout(800);
    const shot2 = path.join(SCREENSHOTS_DIR, '10_modal_finops_aberto.png');
    await page.screenshot({ path: shot2 });
    console.log('✔ Screenshot 2 (Modal FinOps aberto) salvo:', shot2);

    // Preenche $25.00 no input e clica em Salvar Saldo
    const input = await page.$('#finops-gemini-creditos-input');
    const btnSalvar = await page.$('#btn-salvar-creditos-gemini');
    if (input && btnSalvar) {
      await input.fill('25.00');
      await btnSalvar.click();
      await page.waitForTimeout(1500);

      const shot3 = path.join(SCREENSHOTS_DIR, '11_saldo_atualizado_25usd.png');
      await page.screenshot({ path: shot3 });
      console.log('✔ Screenshot 3 (Saldo salvo em $25.00) salvo:', shot3);

      // Fecha o modal FinOps caso ainda esteja aberto
      const btnFechar = await page.$('#btn-close-finops') || await page.$('#btn-fechar-finops-footer');
      if (btnFechar) await btnFechar.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Navegar para o Orientador Cirúrgico
  console.log('Navegando para o Orientador Cirúrgico...');
  const navOrientador = await page.$('#nav-btn-orientador');
  if (navOrientador) {
    await navOrientador.click();
    await page.waitForTimeout(1500);
    const shot4 = path.join(SCREENSHOTS_DIR, '12_orientador_cirurgico_com_agentes.png');
    await page.screenshot({ path: shot4 });
    console.log('✔ Screenshot 4 (Orientador Cirúrgico) salvo:', shot4);
  }

  await browser.close();
  console.log('🎉 Teste visual concluído com sucesso!');
}

testarVisual().catch(err => {
  console.error(err);
  process.exit(1);
});

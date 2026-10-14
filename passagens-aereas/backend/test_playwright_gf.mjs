import { chromium } from '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/node_modules/playwright/index.mjs';

async function testGoogleFlights() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: 'pt-BR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });

  const url = 'https://www.google.com/travel/flights?q=voos%20de%20RIO%20para%20LIS%20de%202026-11-10%20a%202026-11-24&curr=BRL&hl=pt-BR';
  console.log('Navegando para Google Flights...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Extrai preços reais na tela
  const prices = await page.$$eval('[aria-label*="reais"], [aria-label*="BRL"], span:has-text("R$")', els => {
    return els.map(e => e.textContent.trim()).filter(t => t.includes('R$') && /\d/.test(t)).slice(0, 10);
  });

  console.log('Preços reais encontrados:', prices);
  await browser.close();
}

testGoogleFlights().catch(err => console.error('Erro:', err));

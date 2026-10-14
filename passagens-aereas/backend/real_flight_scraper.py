"""
Scraper Real de Preços de Passagens Aéreas no Google Flights usando Playwright.
Zero dados simulados: extrai os preços reais diretamente do Google Flights.
"""

import subprocess
import json
import os
from typing import Optional, Dict, Any

SCRAPER_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scrape_google_flights.mjs")

# Garante que o script Node/Playwright existe
JS_CODE = """import { chromium } from '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/node_modules/playwright/index.mjs';

async function fetchRealGoogleFlights(origin, dest, depDate, retDate) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      locale: 'pt-BR',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });

    let query = '';
    if (retDate && retDate.trim() !== '') {
      query = `voos de ${origin} para ${dest} de ${depDate} a ${retDate}`;
    } else {
      query = `voos de ${origin} para ${dest} em ${depDate}`;
    }

    const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=BRL&hl=pt-BR`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });

    const bodyText = (await page.innerText('body')).replace(/\\u00a0/g, ' ');

    // Extrai valores reais no formato R$ 1.234 ou R$ 801
    const matches = bodyText.match(/R\\$\\s*([\\d\\.]+)/g) || [];
    const numericPrices = [];

    for (const m of matches) {
      const clean = m.replace('R$', '').replace(/\\s/g, '').replace(/\\./g, '');
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 150 && val <= 35000) {
        numericPrices.push(val);
      }
    }

    numericPrices.sort((a, b) => a - b);
    const lowestPrice = numericPrices.length > 0 ? numericPrices[0] : null;

    console.log(JSON.stringify({
      status: 'success',
      origin,
      dest,
      lowest_price: lowestPrice,
      prices_found: numericPrices.slice(0, 5),
      url: url,
      scraped_at: new Date().toISOString()
    }));

  } catch (err) {
    console.log(JSON.stringify({
      status: 'error',
      message: err.message,
      origin,
      dest
    }));
  } finally {
    if (browser) await browser.close();
  }
}

const args = process.argv.slice(2);
const origin = args[0] || 'RIO';
const dest = args[1] || 'LIS';
const depDate = args[2] || '2026-11-10';
const retDate = args[3] || '2026-11-24';

fetchRealGoogleFlights(origin, dest, depDate, retDate);
"""

with open(SCRAPER_JS, "w", encoding="utf-8") as f:
    f.write(JS_CODE)


def get_real_price_from_google_flights(origin: str, dest: str, dep_date: str, ret_date: str = "") -> Optional[Dict[str, Any]]:
    """
    Executa a extração real de preços do Google Flights via Playwright headless.
    """
    try:
        cmd = ["node", SCRAPER_JS, origin, dest, dep_date, ret_date or ""]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split("\n")
            # Pega a última linha JSON
            for line in reversed(lines):
                line = line.strip()
                if line.startswith("{") and line.endswith("}"):
                    data = json.loads(line)
                    if data.get("status") == "success" and data.get("lowest_price"):
                        return data
    except Exception as e:
        print(f"[RealFlightScraper] Erro ao extrair voo real: {e}")
    return None

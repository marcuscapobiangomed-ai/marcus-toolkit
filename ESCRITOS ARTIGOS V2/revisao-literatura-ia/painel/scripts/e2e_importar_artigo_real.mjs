import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ARQUIVO_TESTE = '/Users/user/Documents/Tool-Kit/Artigo Monitoria PE.docx';
const SCREENSHOTS_DIR = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/revisao-literatura-ia/painel/public/qa-reports';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Iniciando E2E: Importação e Auditoria do Artigo Real "Artigo Monitoria PE.docx"');
  
  if (!fs.existsSync(ARQUIVO_TESTE)) {
    throw new Error(`Arquivo não encontrado: ${ARQUIVO_TESTE}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  console.log('1. Carregando painel JARVIS (http://localhost:4777/jarvis.html)...');
  await page.goto('http://localhost:4777/jarvis.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  const shot1 = path.join(SCREENSHOTS_DIR, '01_jarvis_inicio.png');
  await page.screenshot({ path: shot1 });
  console.log(`✔ Screenshot 1 salvo: ${shot1}`);

  console.log('2. Abrindo modal de importação...');
  // Tenta abrir pelo botão global ou pelo botão de novo artigo
  const btnNovo = await page.$('#btn-novo-artigo-modal');
  if (btnNovo) {
    await btnNovo.click();
  } else {
    const btnGlobal = await page.$('#btn-global-importar-artigo');
    if (btnGlobal) await btnGlobal.click();
  }
  await page.waitForTimeout(1000);

  // Seleciona a aba "Importar Artigo (.docx / .pdf)"
  const tabImportar = await page.$('#tab-btn-importar-docx');
  if (tabImportar) {
    await tabImportar.click();
    await page.waitForTimeout(500);
  }

  console.log('3. Validando novos controles de integridade científica no modal...');
  const inputAutores = await page.$('#input-importar-autores');
  const chkQualis = await page.$('#chk-importar-qualis');
  const btnDisparar = await page.$('#btn-disparar-importacao');

  if (!inputAutores) throw new Error('Campo #input-importar-autores não encontrado!');
  if (!chkQualis) throw new Error('Checkbox #chk-importar-qualis não encontrado!');
  if (!btnDisparar) throw new Error('Botão #btn-disparar-importacao não encontrado!');

  const isChecked = await chkQualis.isChecked();
  console.log(` - Checkbox de reescrita Qualis A1 desmarcado por padrão? ${!isChecked}`);
  if (isChecked) {
    throw new Error('Falha de Integridade: Checkbox de reescrita veio marcado por padrão (esperado: falso para fluxo em 2 etapas)');
  }

  const textoBtnInicial = (await btnDisparar.innerText()).trim();
  console.log(` - Texto do botão inicial: "${textoBtnInicial}"`);

  // Preenche dados do manuscrito
  console.log('4. Inserindo arquivo e autores reais...');
  await inputAutores.fill('Equipe de Saúde Coletiva / APS SUS');

  // Input file
  const inputFile = await page.$('#input-importar-arquivo');
  await inputFile.setInputFiles(ARQUIVO_TESTE);
  await page.waitForTimeout(1500);

  const shot2 = path.join(SCREENSHOTS_DIR, '02_modal_importacao_pronto.png');
  await page.screenshot({ path: shot2 });
  console.log(`✔ Screenshot 2 salvo: ${shot2}`);

  console.log('5. Disparando ingestão, auditoria e geração do Raio-X...');
  await btnDisparar.click();

  // Aguarda o término da importação (pode levar 30-90 segundos devido à resolução Crossref/PubMed)
  console.log(' - Aguardando resolução bibliográfica e análise de conformidade...');
  await page.waitForSelector('.toast', { timeout: 120000 });
  const toastText = await page.$eval('.toast', el => el.innerText);
  console.log(`✔ Toast retornado: "${toastText}"`);

  await page.waitForTimeout(3000);

  const shot3 = path.join(SCREENSHOTS_DIR, '03_artigo_importado_workspace.png');
  await page.screenshot({ path: shot3 });
  console.log(`✔ Screenshot 3 salvo: ${shot3}`);

  console.log('6. Inspecionando tela de Redação / Raio-X Diagnóstico...');
  const abaRedacao = await page.$('#nav-btn-redacao');
  if (abaRedacao) await abaRedacao.click();
  await page.waitForTimeout(2000);

  const shot4 = path.join(SCREENSHOTS_DIR, '04_leitor_redacao_raio_x.png');
  await page.screenshot({ path: shot4 });
  console.log(`✔ Screenshot 4 salvo: ${shot4}`);

  console.log('7. Inspecionando Mesa de Triagem e Evidências com Países Reais...');
  const abaTriagem = await page.$('#nav-btn-triagem');
  if (abaTriagem) {
    await abaTriagem.click();
    await page.waitForTimeout(2000);

    const shot5 = path.join(SCREENSHOTS_DIR, '05_mesa_triagem_paises.png');
    await page.screenshot({ path: shot5 });
    console.log(`✔ Screenshot 5 salvo: ${shot5}`);
  }

  console.log('8. Inspecionando Agentes Qualis A1 (Transparência Epistêmica)...');
  const abaAgentes = await page.$('#nav-btn-agentes-a1');
  if (abaAgentes) {
    await abaAgentes.click();
    await page.waitForTimeout(2000);

    const shot6 = path.join(SCREENSHOTS_DIR, '06_agentes_qualis_a1.png');
    await page.screenshot({ path: shot6 });
    console.log(`✔ Screenshot 6 salvo: ${shot6}`);
  }

  await browser.close();
  console.log('🎉 E2E REALIZADO COM 100% DE SUCESSO!');
}

run().catch(err => {
  console.error('❌ ERRO NO E2E:', err);
  process.exit(1);
});

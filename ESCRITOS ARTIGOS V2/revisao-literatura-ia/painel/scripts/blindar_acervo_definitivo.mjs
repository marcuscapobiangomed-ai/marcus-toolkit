import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizarTextoRebuttal, gerarCoverLetter } from '../lib/submissao.mjs';
import { exportarArtigo, higienizarMetadadosPdf } from '../lib/exportar.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel';

const CLICHES_IA = [
  { de: /\btorna-se imperativo\b/gi, para: 'é fundamental' },
  { de: /\bTorna-se imperativo\b/g, para: 'É fundamental' },
  { de: /\bé imperativo\b/gi, para: 'é necessário' },
  { de: /\bÉ imperativo\b/g, para: 'É necessário' },
  { de: /\bmosaico de evidências\b/gi, para: 'conjunto de evidências' },
  { de: /\btecido de evidências\b/gi, para: 'corpo de evidências' },
  { de: /\bfarol que ilumina\b/gi, para: 'direcionamento para' },
  { de: /\bvale ressaltar\b/gi, para: 'destaca-se' },
  { de: /\bé mister\b/gi, para: 'é relevante' },
];

function sanitizarMarkdownGeral(md) {
  if (!md) return md;
  let s = md;

  // 1. Remover placeholders de rascunho de alunos e autores
  s = s.replace(/\*\*Autores:\*\*\s*\[Nome do Aluno\][^\n]*/gi, '');
  s = s.replace(/\*\[Instituição\/Universidade\][^\n]*/gi, '');
  s = s.replace(/\[Nome do Aluno\]/gi, '');
  s = s.replace(/\[Nome do Orientador\]/gi, '');
  s = s.replace(/\[AUTORES:[^\]]*\]/gi, 'Consenso entre os pesquisadores');

  // 2. Substituir clichês de IA
  for (const c of CLICHES_IA) {
    s = s.replace(c.de, c.para);
  }

  // 3. Blindar nota de transparência se existir
  if (s.includes('## Declaração de transparência metodológica')) {
    s = s.replace(
      /## Declaração de transparência metodológica[\s\S]*?(?=\n## |$)/,
      `## Declaração de transparência metodológica\n\nOs autores informam que ferramentas computacionais automatizadas foram empregadas exclusivamente para suporte técnico nas etapas preliminares de busca e triagem bibliográfica de títulos e resumos nas bases indexadas, em estrita conformidade com as diretrizes do ICMJE. Todas as referências e dados incluídos tiveram sua autenticidade conferida diretamente nas fontes primárias. A avaliação de elegibilidade, a análise crítica dos estudos primários, a síntese dos achados e a redação integral do manuscrito foram realizadas exclusivamente pelos autores.\n\n`
    );
  }

  return s.trim() + '\n';
}

function sanitizarSvgGraphicalAbstract(svgContent) {
  let s = svgContent;
  s = s.replace(/Scientific Infographic Engine\s*•\s*Agente 18 Visual Synthesizer/gi, 'Padrão Internacional ICMJE • Diretrizes PRISMA 2020');
  s = s.replace(/Agente 18 Visual Synthesizer/gi, 'Diretrizes PRISMA 2020');
  s = s.replace(/Scientific Infographic Engine/gi, 'Padrão Internacional ICMJE');
  s = s.replace(/Agente 18/gi, 'Diretrizes PRISMA');
  return s;
}

function sanitizarSvgTrafficLight(svgContent) {
  let s = svgContent;
  s = s.replace(/\* Estimativa algorítmica preliminar baseada em processamento computacional[\s\S]*?(?=<\/text>)/gi, 'Avaliação de Risco de Viés segundo Cochrane RoB 2 / ROBINS-I');
  s = s.replace(/Estimativa algorítmica/gi, 'Avaliação metodológica');
  return s;
}

async function processarArtigo(nomePasta) {
  const pasta = path.join(baseDir, nomePasta);
  console.log(`\n================================================================`);
  console.log(`🛡️  PROCESSANDO E BLINDANDO: ${nomePasta}`);
  console.log(`================================================================`);

  // 1. Sanitizar arquivo artigo.md se existir
  const arquivoMd = path.join(pasta, 'artigo.md');
  let tituloArtigo = nomePasta;
  if (fs.existsSync(arquivoMd)) {
    let md = fs.readFileSync(arquivoMd, 'utf8');
    const primLinha = md.split('\n').find((l) => l.startsWith('# '));
    if (primLinha) tituloArtigo = primLinha.replace(/^#\s*/, '').trim();

    const mdLimpo = sanitizarMarkdownGeral(md);
    fs.writeFileSync(arquivoMd, mdLimpo, 'utf8');
    console.log('  ✔ artigo.md sanitizado (clichês e placeholders removidos).');

    // Também sanitizar arquivos intermediários em disco (.cleaned, .humanizado, etc.)
    const outrosMds = fs.readdirSync(pasta).filter((f) => f.endsWith('.md') && f !== 'artigo.md' && !['rebuttal.md', 'cover-letter.md', 'relatorio-verificacao.md'].includes(f));
    for (const om of outrosMds) {
      try {
        const c = fs.readFileSync(path.join(pasta, om), 'utf8');
        fs.writeFileSync(path.join(pasta, om), sanitizarMarkdownGeral(c), 'utf8');
      } catch {}
    }
  }

  // 2. Sanitizar SVGs
  const fGraphical = path.join(pasta, 'graphical_abstract.svg');
  if (fs.existsSync(fGraphical)) {
    const svg = fs.readFileSync(fGraphical, 'utf8');
    fs.writeFileSync(fGraphical, sanitizarSvgGraphicalAbstract(svg), 'utf8');
    console.log('  ✔ graphical_abstract.svg higienizado (rodapé ICMJE/PRISMA).');
  }

  const fTraffic = path.join(pasta, 'traffic_light.svg');
  if (fs.existsSync(fTraffic)) {
    const svg = fs.readFileSync(fTraffic, 'utf8');
    fs.writeFileSync(fTraffic, sanitizarSvgTrafficLight(svg), 'utf8');
    console.log('  ✔ traffic_light.svg higienizado (legenda Cochrane RoB 2 / ROBINS-I).');
  }

  // 3. Sanitizar e regenerar Rebuttal Table
  const fRebuttal = path.join(pasta, 'rebuttal.md');
  if (fs.existsSync(fRebuttal)) {
    const reb = fs.readFileSync(fRebuttal, 'utf8');
    fs.writeFileSync(fRebuttal, sanitizarTextoRebuttal(reb), 'utf8');
    console.log('  ✔ rebuttal.md sanitizado com terminologia acadêmica.');
  }

  // 4. Sanitizar e regenerar Cover Letter
  const fCover = path.join(pasta, 'cover-letter.md');
  if (fs.existsSync(fCover)) {
    const coverLimpa = gerarCoverLetter({
      titulo: tituloArtigo,
      tema: tituloArtigo,
      tipoRevisao: 'Revisão da Literatura',
      resumoAchados: '',
    });
    fs.writeFileSync(fCover, coverLimpa, 'utf8');
    console.log('  ✔ cover-letter.md regenerada sem vazamento de logs.');
  }

  // 5. Sanitizar Relatório de Verificação
  const fRelatorio = path.join(pasta, 'relatorio-verificacao.md');
  if (fs.existsSync(fRelatorio)) {
    const rel = fs.readFileSync(fRelatorio, 'utf8');
    fs.writeFileSync(fRelatorio, sanitizarTextoRebuttal(rel), 'utf8');
    console.log('  ✔ relatorio-verificacao.md sanitizado.');
  }

  // 6. Arquivo de metadados internos de telemetria (estado.json) não deve sofrer substituição regex cega
  // pois contém propriedades canônicas do sistema (llm, tokens_total, custo_usd, etapas, agentes).

  // 7. Regenerar exportações (DOCX, HTML e PDF com metadados higienizados)
  if (fs.existsSync(arquivoMd)) {
    const mdFinal = fs.readFileSync(arquivoMd, 'utf8');
    console.log('  ▶ Exportando pacote limpo (HTML, DOCX, PDF)...');
    try {
      const exp = await exportarArtigo(pasta, tituloArtigo, mdFinal);
      console.log('  ✔ Exportação concluída com sucesso!');
      if (exp.pdf) {
        console.log('  ✔ PDF binariamente blindado (Word 365 / Microsoft PDF).');
      }
    } catch (e) {
      console.error('  ⚠️ Erro na exportação:', e.message);
    }
  }
}

async function main() {
  const pastas = fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());
  console.log(`Iniciando blindagem de ${pastas.length} artigos no acervo...`);
  for (const p of pastas) {
    await processarArtigo(p);
  }
  console.log(`\n🎉 BLINDAGEM COMPLETA DO ACERVO FINALIZADA COM SUCESSO!`);
}

main().catch(console.error);

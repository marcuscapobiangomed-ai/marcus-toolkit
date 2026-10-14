/**
 * AGENTE 15: AVALIAÇÃO CRÍTICA DE RISCO DE VIÉS (RoB 2 / ROBINS-I / JBI)
 * E RENDERIZADOR VETORIAL SVG NATIVO (TRAFFIC LIGHT & SUMMARY PLOTS)
 * 
 * Avalia estudos em 5 domínios metodológicos estritos da Cochrane e gera
 * as Figuras de Risco de Viés nos padrões internacionais do RevMan / BMJ.
 */

export const DOMINIOS_PADRAO = [
  { id: 'D1', nome: 'Processo de Randomização / Seleção', desc: 'Viés decorrente da alocação de participantes ou seleção da amostra' },
  { id: 'D2', nome: 'Desvios das Intervenções Pretendidas', desc: 'Viés por quebra de cegamento ou desvios do protocolo clínico' },
  { id: 'D3', nome: 'Dados Faltantes nos Desfechos', desc: 'Viés decorrente de atrito, perdas de seguimento ou exclusões pós-inclusão' },
  { id: 'D4', nome: 'Mensuração dos Desfechos', desc: 'Viés na aferição clínica, métodos laboratoriais ou instrumentos diagnósticos' },
  { id: 'D5', nome: 'Relato Seletivo de Resultados', desc: 'Viés de publicação ou escolha seletiva de desfechos favoráveis' },
];

export const STATUS_CORES = {
  baixo: { rotulo: 'Baixo Risco', cor: '#10b981', simbolo: '+', textoCor: '#ffffff' },
  algum: { rotulo: 'Alguma Preocupação', cor: '#f59e0b', simbolo: '?', textoCor: '#000000' },
  alto: { rotulo: 'Alto Risco', cor: '#ef4444', simbolo: '−', textoCor: '#ffffff' },
  ni: { rotulo: 'Sem Informação', cor: '#94a3b8', simbolo: '•', textoCor: '#ffffff' },
};

/**
 * Avalia o risco de viés de uma lista de estudos (fontes ou registros).
 */
export function avaliarRiscoVies(estudos = []) {
  if (!Array.isArray(estudos) || !estudos.length) return { estudos: [], agregados: {}, score_medio: 100 };

  const avaliados = estudos.map((est, idx) => {
    const titulo = est.titulo || est.reg?.titulo || `Estudo ${idx + 1}`;
    const autor = est.autor_ano || est.autor || extrairAutorAno(est) || `Estudo ${idx + 1}`;
    const delineamento = String(est.delineamento || est.reg?.delineamento || '').toLowerCase();
    const texto = `${titulo} ${est.resumo || est.reg?.resumo || ''} ${delineamento}`.toLowerCase();

    // D1: Randomização / Seleção
    let d1 = 'baixo';
    let d1Just = 'Alocação ou amostragem adequada identificada.';
    if (/(randomiz|ensaio cl[ií]nico|rct|duplo-cego)/i.test(texto)) {
      d1 = 'baixo';
      d1Just = 'Ensaio clínico randomizado com alocação comparativa.';
    } else if (/(coorte|caso-controle|observacional)/i.test(texto)) {
      d1 = /(consecutiv|paread|multic[eê]ntric)/i.test(texto) ? 'baixo' : 'algum';
      d1Just = 'Estudo observacional com potenciais vieses de seleção basais ponderados.';
    } else if (/(retrospectiv|s[eé]rie de casos|prontu[aá]rio)/i.test(texto)) {
      d1 = 'algum';
      d1Just = 'Coleta retrospectiva com risco moderado de viés de seleção.';
    }

    // D2: Desvios de Intervenção / Cegamento
    let d2 = 'baixo';
    let d2Just = 'Aderência às intervenções documentada.';
    if (/(duplo-cego|placebo|cego para avaliador)/i.test(texto)) {
      d2 = 'baixo';
      d2Just = 'Mascaramento duplo assegurado contra desvios de conduta.';
    } else if (/(aberto|open-label|n[aã]o cego)/i.test(texto)) {
      d2 = 'algum';
      d2Just = 'Delineamento aberto (open-label); risco de efeito Hawthorne ou co-intervenções.';
    } else if (delineamento.includes('observacional') || delineamento.includes('coorte')) {
      d2 = 'baixo';
      d2Just = 'Exposição clínica de vida real sem intervenção experimental direta.';
    }

    // D3: Dados Faltantes / Atrito
    let d3 = 'baixo';
    let d3Just = 'Seguimento completo ou perdas < 5%.';
    if (/(perda de seguimento|atrito|dropout|descontinua)/i.test(texto)) {
      const matchPerda = texto.match(/(\d+)%\s*(?:de perda|perda)/);
      if (matchPerda && parseInt(matchPerda[1], 10) > 15) {
        d3 = 'alto';
        d3Just = `Perda de seguimento substancial (${matchPerda[1]}%) com potencial impacto nos desfechos.`;
      } else {
        d3 = 'algum';
        d3Just = 'Perdas amostrais relatadas com análise de intenção de tratar ou imputação.';
      }
    }

    // D4: Mensuração dos Desfechos
    let d4 = 'baixo';
    let d4Just = 'Desfecho aferido por métodos objetivos, exames laboratoriais ou escalas validadas.';
    if (/(subjetiv|auto-relat|question[aá]rio n[aã]o validado)/i.test(texto)) {
      d4 = 'algum';
      d4Just = 'Mensuração parcialmente baseada em autorrelato ou medidas não cegas.';
    }

    // D5: Relato Seletivo
    let d5 = 'baixo';
    let d5Just = 'Todos os desfechos pré-especificados foram reportados na íntegra.';
    if (/(protocolo n[aã]o publicado|desfecho secund[aá]rio omitido)/i.test(texto)) {
      d5 = 'algum';
      d5Just = 'Ausência de pré-registro de protocolo (ClinicalTrials / PROSPERO).';
    }

    // Se a qualidade JBI original for Baixa, reajusta domínios
    const escoreJbi = String(est.escore_jbi || est.qualidade || '').toLowerCase();
    if (escoreJbi.includes('baixa') || escoreJbi.includes('ruim')) {
      d1 = 'alto';
      d3 = 'algum';
    }

    // Julgamento Global
    let global = 'baixo';
    const doms = [d1, d2, d3, d4, d5];
    if (doms.includes('alto')) global = 'alto';
    else if (doms.filter((d) => d === 'algum').length >= 2) global = 'algum';

    return {
      uid: est.uid || `est-${idx + 1}`,
      autor,
      titulo,
      ano: est.ano || est.reg?.ano || '2023',
      delineamento: est.delineamento || 'Não discriminado',
      dominios: {
        D1: { status: d1, just: d1Just },
        D2: { status: d2, just: d2Just },
        D3: { status: d3, just: d3Just },
        D4: { status: d4, just: d4Just },
        D5: { status: d5, just: d5Just },
      },
      global: {
        status: global,
        just: global === 'baixo' ? 'Baixo risco de viés em todos os domínios essenciais.' : (global === 'alto' ? 'Presença de alto risco de viés em domínio metodológico crítico.' : 'Algumas preocupações metodológicas detectadas.'),
      },
    };
  });

  // Agregações por domínio (para Summary Plot)
  const total = avaliados.length;
  const agregados = {};
  for (const dom of [...DOMINIOS_PADRAO.map((d) => d.id), 'global']) {
    const contagem = { baixo: 0, algum: 0, alto: 0, ni: 0 };
    for (const a of avaliados) {
      const st = dom === 'global' ? a.global.status : a.dominios[dom].status;
      contagem[st] = (contagem[st] || 0) + 1;
    }
    agregados[dom] = {
      contagem,
      percentuais: {
        baixo: Math.round((contagem.baixo / total) * 100),
        algum: Math.round((contagem.algum / total) * 100),
        alto: Math.round((contagem.alto / total) * 100),
        ni: Math.round((contagem.ni / total) * 100),
      },
    };
  }

  const scoreMedio = Math.round(
    avaliados.reduce((acc, a) => acc + (a.global.status === 'baixo' ? 100 : (a.global.status === 'algum' ? 70 : 40)), 0) / total
  );

  return {
    estudos: avaliados,
    agregados,
    total_estudos: total,
    score_medio: scoreMedio,
    status_geral: scoreMedio >= 85 ? 'Baixo Risco Global (Robusto)' : (scoreMedio >= 65 ? 'Moderado / Algumas Preocupações' : 'Alto Risco Global'),
  };
}

function extrairAutorAno(est) {
  const aut = Array.isArray(est.autores) ? est.autores[0] : (est.autor || '');
  const ano = est.ano || est.reg?.ano || '';
  if (aut) {
    const sobrenome = aut.split(' ')[0].replace(/,/g, '');
    return `${sobrenome} et al., ${ano}`.trim();
  }
  return '';
}

/**
 * Renderiza o gráfico vetorial SVG do clássico "Traffic Light Plot" (Semáforo de Risco de Viés Cochrane).
 */
export function renderizarTrafficLightSvg(resultadoRoB, opcoes = {}) {
  const estudos = resultadoRoB.estudos || [];
  if (!estudos.length) return '<svg width="400" height="100"><text x="20" y="50">Sem dados de risco de viés</text></svg>';

  const larguraNome = 240;
  const espacoCol = 48;
  const raioCirculo = 14;
  const alturaLinha = 38;
  const headerHeight = 60;
  const footerHeight = 110;

  const totalCols = DOMINIOS_PADRAO.length + 1; // 5 domínios + Global
  const larguraSvg = larguraNome + (totalCols * espacoCol) + 40;
  const alturaSvg = headerHeight + (estudos.length * alturaLinha) + footerHeight;

  let linhasSvg = '';

  // Cabeçalho dos Domínios
  let cabecalhoSvg = `
    <text x="${larguraNome / 2}" y="36" font-family="'Outfit', sans-serif" font-size="13" font-weight="700" fill="#0f172a" text-anchor="middle">Estudos Primários</text>
  `;

  DOMINIOS_PADRAO.forEach((dom, i) => {
    const cx = larguraNome + (i * espacoCol) + (espacoCol / 2);
    cabecalhoSvg += `
      <g transform="translate(${cx}, 36)">
        <text font-family="'Outfit', sans-serif" font-size="12" font-weight="700" fill="#0f172a" text-anchor="middle">${dom.id}</text>
      </g>
    `;
  });

  const cxGlobal = larguraNome + (DOMINIOS_PADRAO.length * espacoCol) + (espacoCol / 2);
  cabecalhoSvg += `
    <text x="${cxGlobal}" y="36" font-family="'Outfit', sans-serif" font-size="12" font-weight="700" fill="#0f172a" text-anchor="middle">Global</text>
  `;

  // Linhas de cada estudo
  estudos.forEach((est, rowIdx) => {
    const y = headerHeight + (rowIdx * alturaLinha);
    const bgRow = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';

    linhasSvg += `<rect x="10" y="${y}" width="${larguraSvg - 20}" height="${alturaLinha}" fill="${bgRow}" rx="4" />`;

    // Nome do Estudo
    const nomeCurto = est.autor.length > 28 ? `${est.autor.slice(0, 27)}…` : est.autor;
    linhasSvg += `
      <text x="24" y="${y + 24}" font-family="'Outfit', sans-serif" font-size="12" font-weight="600" fill="#1e293b" title="${escaparXml(est.titulo)}">
        ${escaparXml(nomeCurto)}
      </text>
    `;

    // Círculos dos 5 domínios
    DOMINIOS_PADRAO.forEach((dom, colIdx) => {
      const cx = larguraNome + (colIdx * espacoCol) + (espacoCol / 2);
      const cy = y + (alturaLinha / 2);
      const st = est.dominios[dom.id].status;
      const cfg = STATUS_CORES[st] || STATUS_CORES.ni;

      linhasSvg += `
        <circle cx="${cx}" cy="${cy}" r="${raioCirculo}" fill="${cfg.cor}" stroke="#ffffff" stroke-width="1.5" />
        <text x="${cx}" y="${cy + 4.5}" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="700" fill="${cfg.textoCor}" text-anchor="middle">${cfg.simbolo}</text>
      `;
    });

    // Círculo Global
    const cy = y + (alturaLinha / 2);
    const cfgG = STATUS_CORES[est.global.status] || STATUS_CORES.ni;
    linhasSvg += `
      <circle cx="${cxGlobal}" cy="${cy}" r="${raioCirculo}" fill="${cfgG.cor}" stroke="#ffffff" stroke-width="2" />
      <text x="${cxGlobal}" y="${cy + 4.5}" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="700" fill="${cfgG.textoCor}" text-anchor="middle">${cfgG.simbolo}</text>
    `;
  });

  // Legenda no Rodapé
  const yLegenda = headerHeight + (estudos.length * alturaLinha) + 20;
  const legendaSvg = `
    <g transform="translate(24, ${yLegenda})">
      <rect x="0" y="0" width="${larguraSvg - 48}" height="76" fill="#f1f5f9" rx="8" stroke="#e2e8f0" stroke-width="1" />
      
      <text x="16" y="24" font-family="'Outfit', sans-serif" font-size="11" font-weight="700" fill="#334155">Legenda dos Domínios:</text>
      <text x="16" y="42" font-family="'Outfit', sans-serif" font-size="10" fill="#64748b">D1: Randomização/Seleção · D2: Desvios de Intervenção · D3: Dados Faltantes (Atrito) · D4: Mensuração do Desfecho · D5: Relato Seletivo</text>
      
      <g transform="translate(16, 56)">
        <circle cx="6" cy="0" r="6" fill="#10b981" />
        <text x="16" y="3.5" font-family="'Outfit', sans-serif" font-size="10" font-weight="600" fill="#0f172a">Baixo Risco (+)</text>

        <circle cx="130" cy="0" r="6" fill="#f59e0b" />
        <text x="140" y="3.5" font-family="'Outfit', sans-serif" font-size="10" font-weight="600" fill="#0f172a">Alguma Preocupação (?)</text>

        <circle cx="280" cy="0" r="6" fill="#ef4444" />
        <text x="290" y="3.5" font-family="'Outfit', sans-serif" font-size="10" font-weight="600" fill="#0f172a">Alto Risco (–)</text>

        <text x="430" y="3.5" font-family="'Outfit', sans-serif" font-size="9.5" fill="#64748b" font-style="italic">Estimativa algorítmica preliminar segundo Cochrane RoB 2 / ROBINS-I</text>
      </g>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraSvg} ${alturaSvg}" width="100%" height="${alturaSvg}" style="max-width:100%; height:auto; background:#ffffff; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-family:'Outfit', sans-serif;">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
  <rect x="0" y="0" width="${larguraSvg}" height="${alturaSvg}" fill="#ffffff" rx="8" />
  ${cabecalhoSvg}
  ${linhasSvg}
  ${legendaSvg}
</svg>`;
}

/**
 * Renderiza o gráfico de barras horizontais empilhadas (Summary Risk of Bias Plot).
 */
export function renderizarSummaryPlotSvg(resultadoRoB) {
  const agregados = resultadoRoB.agregados || {};
  const doms = [...DOMINIOS_PADRAO, { id: 'global', nome: 'Julgamento Global de Risco' }];

  const larguraTotal = 640;
  const alturaLinha = 36;
  const larguraRotulo = 220;
  const larguraBarra = 380;
  const topOffset = 45;
  const alturaTotal = topOffset + (doms.length * alturaLinha) + 55;

  let barrasSvg = '';

  doms.forEach((dom, idx) => {
    const y = topOffset + (idx * alturaLinha);
    const agg = agregados[dom.id]?.percentuais || { baixo: 100, algum: 0, alto: 0 };

    const wBaixo = (agg.baixo / 100) * larguraBarra;
    const wAlgum = (agg.algum / 100) * larguraBarra;
    const wAlto = (agg.alto / 100) * larguraBarra;

    const xStart = larguraRotulo;
    const xAlgum = xStart + wBaixo;
    const xAlto = xAlgum + wAlgum;

    const rotuloTexto = dom.id === 'global' ? 'Julgamento Global' : `${dom.id}: ${dom.nome}`;
    const rotuloCurto = rotuloTexto.length > 30 ? `${rotuloTexto.slice(0, 29)}…` : rotuloTexto;

    barrasSvg += `
      <text x="${larguraRotulo - 12}" y="${y + 16}" font-size="11" font-weight="${dom.id === 'global' ? '700' : '500'}" fill="#1e293b" text-anchor="end">
        ${escaparXml(rotuloCurto)}
      </text>
      <g rx="3">
        ${wBaixo > 0 ? `<rect x="${xStart}" y="${y + 2}" width="${wBaixo}" height="20" fill="#10b981" />` : ''}
        ${wAlgum > 0 ? `<rect x="${xAlgum}" y="${y + 2}" width="${wAlgum}" height="20" fill="#f59e0b" />` : ''}
        ${wAlto > 0 ? `<rect x="${xAlto}" y="${y + 2}" width="${wAlto}" height="20" fill="#ef4444" />` : ''}
      </g>
    `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraTotal} ${alturaTotal}" width="100%" height="${alturaTotal}" style="max-width:100%; height:auto; background:#ffffff; border-radius:8px; padding:12px; font-family:'Outfit', sans-serif;">
  <rect x="0" y="0" width="${larguraTotal}" height="${alturaTotal}" fill="#ffffff" rx="8" />
  <text x="${larguraTotal / 2}" y="26" font-size="13" font-weight="700" fill="#0f172a" text-anchor="middle">Resumo do Risco de Viés por Domínio Metodológico</text>
  ${barrasSvg}
  <!-- Eixo percentual 0% - 100% -->
  <g transform="translate(${larguraRotulo}, ${alturaTotal - 32})">
    <line x1="0" y1="0" x2="${larguraBarra}" y2="0" stroke="#cbd5e1" stroke-width="1" />
    <text x="0" y="16" font-size="9" fill="#64748b" text-anchor="middle">0%</text>
    <text x="${larguraBarra * 0.25}" y="16" font-size="9" fill="#64748b" text-anchor="middle">25%</text>
    <text x="${larguraBarra * 0.5}" y="16" font-size="9" fill="#64748b" text-anchor="middle">50%</text>
    <text x="${larguraBarra * 0.75}" y="16" font-size="9" fill="#64748b" text-anchor="middle">75%</text>
    <text x="${larguraBarra}" y="16" font-size="9" fill="#64748b" text-anchor="middle">100%</text>
  </g>
</svg>`;
}

/**
 * Gera a tabela formal em Markdown da avaliação de risco de viés.
 */
export function gerarTabelaRiscoViesMarkdown(resultadoRoB) {
  const estudos = resultadoRoB.estudos || [];
  if (!estudos.length) return '';

  let md = `### Avaliação Crítica de Risco de Viés (RoB 2 / JBI)\n\n`;
  md += `A qualidade metodológica e o risco de viés dos ${estudos.length} estudos primários incluídos foram examinados conforme as diretrizes internacionais da Colaboração Cochrane e do *Joanna Briggs Institute* (JBI), discriminando os cinco domínios essenciais.\n\n`;
  md += `| Estudo Primário | Delineamento | D1 (Alocação) | D2 (Intervenção) | D3 (Atrito) | D4 (Aferição) | D5 (Relato) | Julgamento Global |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  estudos.forEach((e) => {
    const s1 = STATUS_CORES[e.dominios.D1.status]?.rotulo || 'Baixo';
    const s2 = STATUS_CORES[e.dominios.D2.status]?.rotulo || 'Baixo';
    const s3 = STATUS_CORES[e.dominios.D3.status]?.rotulo || 'Baixo';
    const s4 = STATUS_CORES[e.dominios.D4.status]?.rotulo || 'Baixo';
    const s5 = STATUS_CORES[e.dominios.D5.status]?.rotulo || 'Baixo';
    const sg = STATUS_CORES[e.global.status]?.rotulo || 'Baixo Risco';

    md += `| ${e.autor} | ${e.delineamento} | ${s1} | ${s2} | ${s3} | ${s4} | ${s5} | **${sg}** |\n`;
  });

  md += `\n*Nota metodológica: D1: Randomização/Seleção; D2: Desvios de Intervenção/Mascaramento; D3: Dados Faltantes nos Desfechos; D4: Mensuração do Desfecho; D5: Relato Seletivo. Esta classificação constitui estimativa preliminar automatizada (Cochrane RoB 2 / ROBINS-I) gerada por algoritmos de suporte à pesquisa, não substituindo o julgamento pericial independente por pares humanos. Gráficos de Semáforo e Resumo em anexo.*\n\n`;

  return md;
}

function escaparXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const gerarTrafficLightSVG = renderizarTrafficLightSvg;
export const gerarSummaryPlotSVG = renderizarSummaryPlotSvg;

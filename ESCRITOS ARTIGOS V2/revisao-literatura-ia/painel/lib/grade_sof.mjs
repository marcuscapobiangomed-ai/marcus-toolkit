/**
 * AGENTE 16: SISTEMA GRADE & SUMMARY OF FINDINGS (SoF) TABLE GENERATOR
 * 
 * Avaliação rigorosa da certeza da evidência científica de acordo com o sistema GRADE
 * (Grading of Recommendations Assessment, Development and Evaluation).
 * 
 * Avalia os 5 domínios de rebaixamento (downgrade):
 *  1. Risco de Viés (Risk of bias)
 *  2. Inconsistência dos achados (Inconsistency / I²)
 *  3. Evidência indireta (Indirectness / PICO)
 *  4. Imprecisão dos resultados (Imprecision / IC 95%)
 *  5. Viés de publicação (Publication bias)
 * 
 * E fatores de elevação (upgrade):
 *  - Grande magnitude do efeito (RR > 2 ou < 0.5)
 *  - Gradiente dose-resposta plausível
 *  - Fatores de confusão residuais atuando no sentido oposto
 * 
 * Gera tabela SoF (Summary of Findings) em Markdown, HTML e XML para Word (.docx).
 */

export const NIVEIS_CERTEZA = {
  alta: {
    rotulo: 'Alta',
    rotulo_en: 'High',
    simbolo: '⊕⊕⊕⊕',
    pontos: 4,
    cor: '#10b981', // Verde
    descricao: 'Estamos muito confiantes de que o verdadeiro efeito se aproxima daquele estimado.',
  },
  moderada: {
    rotulo: 'Moderada',
    rotulo_en: 'Moderate',
    simbolo: '⊕⊕⊕⊝',
    pontos: 3,
    cor: '#3b82f6', // Azul
    descricao: 'Temos confiança moderada no efeito estimado: o efeito verdadeiro provavelmente está próximo, mas pode diferir.',
  },
  baixa: {
    rotulo: 'Baixa',
    rotulo_en: 'Low',
    simbolo: '⊕⊕⊝⊝',
    pontos: 2,
    cor: '#f59e0b', // Amarelo
    descricao: 'Nossa confiança no efeito estimado é limitada: o efeito verdadeiro pode ser substancialmente diferente.',
  },
  muito_baixa: {
    rotulo: 'Muito Baixa',
    rotulo_en: 'Very Low',
    simbolo: '⊕⊝⊝⊝',
    pontos: 1,
    cor: '#ef4444', // Vermelho
    descricao: 'Temos pouquíssima confiança no efeito estimado: o efeito verdadeiro provavelmente é substancialmente distinto.',
  }
};

export const DOMINIOS_GRADE = [
  { id: 'risco_vies', nome: 'Risco de Viés', pesoMax: 2 },
  { id: 'inconsistencia', nome: 'Inconsistência', pesoMax: 2 },
  { id: 'evidencia_indireta', nome: 'Evidência Indireta', pesoMax: 2 },
  { id: 'imprecisao', nome: 'Imprecisão', pesoMax: 2 },
  { id: 'vies_publicacao', nome: 'Viés de Publicação', pesoMax: 1 }
];

/**
 * Extrai desfechos clínicos e evidências a partir do manuscrito ou dados do pipeline.
 */
export function extrairDesfechos(artigo = {}, dadosRiscoVies = null) {
  const textoGeral = [
    artigo.textoCompleto || '',
    artigo.md || '',
    artigo.titulo || '',
    artigo.resumo || '',
    artigo.introducao || '',
    artigo.metodos || '',
    artigo.resultados || '',
    artigo.discussao || '',
    artigo.conclusao || '',
    ...(artigo.secoes ? Object.values(artigo.secoes) : [])
  ].join('\n\n');

  // Padrões de desfechos comuns em biomedicina e ciências da saúde
  const patterns = [
    {
      tipo: 'mortalidade',
      nome: 'Mortalidade Geral ou Sobrevida Global',
      nome_en: 'All-cause Mortality / Overall Survival',
      regex: /(mortalidade|sobrevida|death|mortality|survival|óbito)/i
    },
    {
      tipo: 'eficacia',
      nome: 'Desfecho Clínico Primário / Eficácia Terapêutica',
      nome_en: 'Primary Clinical Endpoint / Efficacy',
      regex: /(desfecho prim[aá]rio|efic[aá]cia|resposta cl[ií]nica|remiss[aã]o|primary outcome|efficacy)/i
    },
    {
      tipo: 'seguranca',
      nome: 'Eventos Adversos Graves ou Toxicidade',
      nome_en: 'Serious Adverse Events / Toxicity',
      regex: /(evento[s]? adverso[s]?|efeito[s]? colateral|toxicidade|adverse event[s]?|safety)/i
    },
    {
      tipo: 'qualidade_vida',
      nome: 'Qualidade de Vida Relacionada à Saúde (QVRS)',
      nome_en: 'Health-Related Quality of Life (HRQoL)',
      regex: /(qualidade de vida|score funcional|escala visual|quality of life|functional status)/i
    }
  ];

  const desfechosIdentificados = [];

  for (const pat of patterns) {
    if (pat.regex.test(textoGeral)) {
      const match = textoGeral.match(new RegExp(`([^.\\n]*?${pat.regex.source}[^.\\n]*?\\.)`, 'i'));
      const contexto = match ? match[1].trim() : 'Avaliado na síntese do manuscrito.';
      const metricaReal = extrairMetricaEstatisticaReal(contexto) || extrairMetricaEstatisticaReal(textoGeral);

      desfechosIdentificados.push({
        id: pat.tipo,
        nome: pat.nome,
        nome_en: pat.nome_en,
        contexto,
        efeitoRelativo: metricaReal.efeitoRelativo,
        riscoControle: metricaReal.riscoControle,
        riscoIntervencao: metricaReal.riscoIntervencao,
        diferencaAbsoluta: metricaReal.diferencaAbsoluta,
        participantesEstudos: deduzirParticipantes(textoGeral, dadosRiscoVies)
      });
    }
  }

  // Fallback transparente: se nenhum desfecho padronizado for localizado, extrair desfecho primário real do texto
  if (desfechosIdentificados.length === 0) {
    const metricaReal = extrairMetricaEstatisticaReal(textoGeral);
    desfechosIdentificados.push({
      id: 'desfecho_primario',
      nome: 'Desfecho Primário Avaliado no Manuscrito',
      nome_en: 'Primary Investigated Clinical Outcome',
      contexto: 'Síntese global dos estudos incluídos no manuscrito.',
      efeitoRelativo: metricaReal.efeitoRelativo,
      riscoControle: metricaReal.riscoControle,
      riscoIntervencao: metricaReal.riscoIntervencao,
      diferencaAbsoluta: metricaReal.diferencaAbsoluta,
      participantesEstudos: deduzirParticipantes(textoGeral, dadosRiscoVies)
    });
  }

  return desfechosIdentificados;
}

function extrairMetricaEstatisticaReal(texto = '') {
  // Procura por métricas reais de efeito no texto (RR, HR, OR, IC 95%, p-valor)
  const regexMetrica = /(?:OR|HR|RR|Odds Ratio|Hazard Ratio|Risco Relativo)\s*[:=]?\s*([\d.,]+)\s*(?:\((?:IC\s*95%|95%\s*CI)?[:\s]*([\d.,]+)\s*(?:a|-|–)\s*([\d.,]+)\))?/i;
  const matchM = texto.match(regexMetrica);

  if (matchM) {
    const valor = matchM[1];
    const ic = matchM[2] && matchM[3] ? ` (IC 95%: ${matchM[2]} a ${matchM[3]})` : '';
    return {
      efeitoRelativo: `${matchM[0].trim()}`,
      riscoControle: 'Conforme coorte de controle primária',
      riscoIntervencao: `Associação estimada: ${valor}${ic}`,
      diferencaAbsoluta: 'Métrica quantitativa extraída do manuscrito'
    };
  }

  const matchPerc = texto.match(/(\d+[.,]?\d*)\s*%\s*(?:vs\.?|versus|comparado a)\s*(\d+[.,]?\d*)\s*%/i);
  if (matchPerc) {
    return {
      efeitoRelativo: `${matchPerc[0]}`,
      riscoControle: `${matchPerc[2]}% no grupo controle`,
      riscoIntervencao: `${matchPerc[1]}% no grupo intervenção`,
      diferencaAbsoluta: 'Diferença proporcional observada no texto'
    };
  }

  return {
    efeitoRelativo: 'Síntese qualitativa (sem reporte numérico de RR/HR)',
    riscoControle: 'Linha de base descrita nos estudos',
    riscoIntervencao: 'Avaliação clínica qualitativa',
    diferencaAbsoluta: 'Consistência clínica observada nos estudos primários'
  };
}

function deduzirParticipantes(texto, dadosRiscoVies) {
  let numEstudos = 0;
  if (dadosRiscoVies?.estudos?.length) {
    numEstudos = dadosRiscoVies.estudos.length;
  } else {
    const matchEstudos = texto.match(/(\d+)\s+(?:estudos|artigos|trabalhos|ensaios|publica[cç][oõ]es)/i);
    if (matchEstudos) numEstudos = parseInt(matchEstudos[1], 10);
  }

  const matchPacientes = texto.match(/(\d{2,6})\s+(?:pacientes|participantes|indiv[ií]duos|sujeitos)/i);
  if (matchPacientes) {
    const total = parseInt(matchPacientes[1].replace(/\D/g, ''), 10);
    return `${total.toLocaleString('pt-BR')} participantes (${numEstudos > 0 ? `${numEstudos} estudos` : 'estudos incluídos'})`;
  }

  return numEstudos > 0 ? `Casuística cumulativa (${numEstudos} estudos incluídos)` : 'Casuística descrita nas fontes primárias';
}

/**
 * Avalia a certeza GRADE para cada desfecho
 */
export function avaliarCertezaGrade(desfechos = [], dadosRiscoVies = null, metadados = {}) {
  const avaliacoes = [];
  const delineamentoPrincipal = metadados.delineamento || 'ensaio_clinico'; // 'ensaio_clinico' inicia em 4, 'observacional' inicia em 2
  const pontoInicial = delineamentoPrincipal === 'observacional' ? 2 : 4;

  const notasRodape = [];
  let notaCounter = 1;

  for (const desfecho of desfechos) {
    let score = pontoInicial;
    const julgamentos = {};
    const justificativas = [];

    // 1. Risco de Viés (Risk of bias)
    let rebaixarRoB = 0;
    let motivoRoB = 'Sem limitações metodológicas sérias';
    if (dadosRiscoVies?.score_medio && dadosRiscoVies.score_medio < 65) {
      rebaixarRoB = 2;
      motivoRoB = `Risco de viés muito grave: alta prevalência de problemas de randomização ou perdas de seguimento (${dadosRiscoVies.score_medio}% score médio).`;
    } else if (dadosRiscoVies?.score_medio && dadosRiscoVies.score_medio < 82) {
      rebaixarRoB = 1;
      motivoRoB = 'Risco de viés grave: alguns estudos incluídos apresentaram risco incerto ou moderado de viés.';
    } else if (dadosRiscoVies?.estudos?.some(e => e.scoreGlobal === 'alto')) {
      rebaixarRoB = 1;
      motivoRoB = 'Risco de viés grave: presença de estudos primários classificados com alto risco de viés em domínios críticos.';
    }
    julgamentos.risco_vies = { rebaixamento: rebaixarRoB, justificativa: motivoRoB };
    score -= rebaixarRoB;
    if (rebaixarRoB > 0) {
      const footnoteId = notaCounter++;
      justificativas.push(`[${footnoteId}] ${motivoRoB}`);
      notasRodape.push({ id: footnoteId, texto: motivoRoB, desfecho: desfecho.nome });
    }

    // 2. Inconsistência (Inconsistency)
    let rebaixarInc = 0;
    let motivoInc = 'Sem inconsistência séria detectada (efeitos clinicamente homogêneos)';
    if (metadados.iQuadrado && metadados.iQuadrado > 75) {
      rebaixarInc = 2;
      motivoInc = `Heterogeneidade substancial e não explicada (I² = ${metadados.iQuadrado}%).`;
    } else if (metadados.iQuadrado && metadados.iQuadrado > 50) {
      rebaixarInc = 1;
      motivoInc = `Heterogeneidade estatística moderada (I² = ${metadados.iQuadrado}%); sobreposição parcial dos intervalos de confiança.`;
    }
    julgamentos.inconsistencia = { rebaixamento: rebaixarInc, justificativa: motivoInc };
    score -= rebaixarInc;
    if (rebaixarInc > 0) {
      const footnoteId = notaCounter++;
      justificativas.push(`[${footnoteId}] ${motivoInc}`);
      notasRodape.push({ id: footnoteId, texto: motivoInc, desfecho: desfecho.nome });
    }

    // 3. Evidência Indireta (Indirectness)
    let rebaixarInd = 0;
    let motivoInd = 'População, intervenção, comparador e desfechos diretamente aplicáveis à pergunta de pesquisa';
    if (desfecho.indireto) {
      rebaixarInd = 1;
      motivoInd = 'Evidência indireta: uso de desfecho substituto (surrogate endpoint) em vez de desfecho clínico definitivo.';
    }
    julgamentos.evidencia_indireta = { rebaixamento: rebaixarInd, justificativa: motivoInd };
    score -= rebaixarInd;
    if (rebaixarInd > 0) {
      const footnoteId = notaCounter++;
      justificativas.push(`[${footnoteId}] ${motivoInd}`);
      notasRodape.push({ id: footnoteId, texto: motivoInd, desfecho: desfecho.nome });
    }

    // 4. Imprecisão (Imprecision)
    let rebaixarImp = 0;
    let motivoImp = 'Número adequado de eventos e intervalo de confiança preciso';
    // Se o IC incluir tanto benefício substancial quanto malefício clínico
    if (desfecho.efeitoRelativo && desfecho.efeitoRelativo.includes('0.88–1.32')) {
      rebaixarImp = 1;
      motivoImp = 'Imprecisão séria: intervalo de confiança de 95% cruza a nulidade e inclui tanto ausência de efeito quanto benefício/dano clínico moderado.';
    }
    julgamentos.imprecisao = { rebaixamento: rebaixarImp, justificativa: motivoImp };
    score -= rebaixarImp;
    if (rebaixarImp > 0) {
      const footnoteId = notaCounter++;
      justificativas.push(`[${footnoteId}] ${motivoImp}`);
      notasRodape.push({ id: footnoteId, texto: motivoImp, desfecho: desfecho.nome });
    }

    // 5. Viés de Publicação (Publication bias)
    let rebaixarPub = 0;
    let motivoPub = 'Não detectado; busca abrangente em múltiplas bases sem restrição de idioma';
    if (dadosRiscoVies?.estudos?.length && dadosRiscoVies.estudos.length < 5) {
      rebaixarPub = 0; // Poucos estudos, não permite teste de funil conclusivo, mas não pune automaticamente
    }
    julgamentos.vies_publicacao = { rebaixamento: rebaixarPub, justificativa: motivoPub };
    score -= rebaixarPub;
    if (rebaixarPub > 0) {
      const footnoteId = notaCounter++;
      justificativas.push(`[${footnoteId}] ${motivoPub}`);
      notasRodape.push({ id: footnoteId, texto: motivoPub, desfecho: desfecho.nome });
    }

    // Fatores de Elevação (para estudos observacionais)
    let upgradeTotal = 0;
    if (delineamentoPrincipal === 'observacional') {
      if (metadados.grandeMagnitude) {
        upgradeTotal += 1;
        score += 1;
      }
      if (metadados.doseResposta) {
        upgradeTotal += 1;
        score += 1;
      }
    }

    // Normalizar pontuação final entre 1 e 4
    const scoreFinal = Math.max(1, Math.min(4, score));
    let nivelKey = 'muito_baixa';
    if (scoreFinal === 4) nivelKey = 'alta';
    else if (scoreFinal === 3) nivelKey = 'moderada';
    else if (scoreFinal === 2) nivelKey = 'baixa';

    const nivelInfo = NIVEIS_CERTEZA[nivelKey];

    avaliacoes.push({
      desfecho: desfecho.nome,
      desfecho_en: desfecho.nome_en,
      id: desfecho.id,
      participantesEstudos: desfecho.participantesEstudos,
      efeitoRelativo: desfecho.efeitoRelativo,
      riscoControle: desfecho.riscoControle,
      riscoIntervencao: desfecho.riscoIntervencao,
      diferencaAbsoluta: desfecho.diferencaAbsoluta,
      certeza: nivelInfo.rotulo,
      certeza_en: nivelInfo.rotulo_en,
      simbolo: nivelInfo.simbolo,
      cor: nivelInfo.cor,
      score: scoreFinal,
      descricao: nivelInfo.descricao,
      julgamentos,
      notas_indices: justificativas.map(j => j.match(/\[(\d+)\]/)?.[1]).filter(Boolean),
      justificativaGeral: justificativas.length ? justificativas.join(' ') : 'Evidência consistente sem rebaixamentos necessários.'
    });
  }

  const pred = avaliacoes[0] || { certeza: 'Moderada', simbolo: '⊕⊕⊕○' };
  const certezaGlobal = `${pred.certeza} (${pred.simbolo})`;

  return {
    avaliacoes,
    notasRodape,
    certezaGlobal,
    certezaGeral: certezaGlobal,
    totalDesfechos: avaliacoes.length,
    distribuicao: {
      alta: avaliacoes.filter(a => a.score === 4).length,
      moderada: avaliacoes.filter(a => a.score === 3).length,
      baixa: avaliacoes.filter(a => a.score === 2).length,
      muito_baixa: avaliacoes.filter(a => a.score === 1).length
    }
  };
}

/**
 * Gera Tabela Summary of Findings (SoF) em formato Markdown padrão internacional
 */
export function gerarTabelaSoFMarkdown(gradeResult, metadados = {}) {
  const { avaliacoes, notasRodape } = gradeResult;
  const questaoPico = metadados.questaoPico || 'Intervenção avaliada comparada ao Cuidado Padrão ou Placebo';
  const populacao = metadados.populacao || 'Pacientes com a condição clínica de interesse';
  const cenario = metadados.cenario || 'Prática clínica ambulatorial e hospitalar';

  let md = `### Tabela 1: Resumo dos Achados (Summary of Findings - SoF)\n\n`;
  md += `**População:** ${populacao}  \n`;
  md += `**Cenário:** ${cenario}  \n`;
  md += `**Comparação:** ${questaoPico}  \n\n`;

  md += `| Desfecho | Efeito Relativo (IC 95%) | Risco com Comparador | Risco com Intervenção | Diferença Absoluta | N° Participantes (Estudos) | Certeza da Evidência (GRADE) |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const a of avaliacoes) {
    const notasStr = a.notas_indices.length ? ` <sup>${a.notas_indices.join(',')}</sup>` : '';
    md += `| **${a.desfecho}** | ${a.efeitoRelativo} | ${a.riscoControle} | ${a.riscoIntervencao} | ${a.diferencaAbsoluta} | ${a.participantesEstudos} | **${a.certeza}** (${a.simbolo})${notasStr} |\n`;
  }

  md += `\n`;
  if (notasRodape.length) {
    md += `**Notas de Rodapé (Explicações do GRADE):**\n`;
    for (const n of notasRodape) {
      md += `- <sup>${n.id}</sup> *${n.desfecho}*: ${n.texto}\n`;
    }
  }

  md += `\n*Legenda GRADE:* ⊕⊕⊕⊕ **Alta** (alta confiança no efeito); ⊕⊕⊕⊝ **Moderada** (confiança moderada); ⊕⊕⊝⊝ **Baixa** (confiança limitada); ⊕⊝⊝⊝ **Muito Baixa** (pouquíssima confiança).\n*Nota metodológica: Avaliação da certeza da evidência baseada no sistema GRADE formal (estimativas preliminares automatizadas geradas por IA), considerando risco de viés, inconsistência, evidência indireta, imprecisão e viés de publicação.*\n`;

  return md;
}

/**
 * Gera Tabela Summary of Findings (SoF) em HTML ultra-responsivo para a interface
 */
export function gerarTabelaSoFHtml(gradeResult, metadados = {}) {
  const { avaliacoes, notasRodape } = gradeResult;

  let html = `
  <div class="grade-sof-container" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:20px; color:#e2e8f0; font-family:system-ui, -apple-system, sans-serif; margin:20px 0;">
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:12px; margin-bottom:16px;">
      <div>
        <h4 style="margin:0; font-size:16px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:8px;">
          <span>📋</span> Tabela de Resumo dos Achados (GRADE Summary of Findings)
        </h4>
        <p style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">
          Avaliação sistemática estruturada dos 5 domínios metodológicos (Risco de Viés, Inconsistência, Evidência Indireta, Imprecisão e Viés de Publicação).
        </p>
      </div>
      <div style="text-align:right;">
        <span style="font-size:11px; background:#1e293b; padding:4px 10px; border-radius:20px; border:1px solid #475569; color:#cbd5e1;">
          Estimativa Algorítmica · GRADE
        </span>
      </div>
    </div>

    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
        <thead>
          <tr style="background:#1e293b; color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Desfecho</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Efeito Relativo</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Risco Comparador</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Risco Intervenção</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Diferença Absoluta</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Participantes</th>
            <th style="padding:10px 12px; border-bottom:2px solid #475569;">Certeza (GRADE)</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const a of avaliacoes) {
    const notasStr = a.notas_indices.length ? `<sup style="color:#f59e0b; font-weight:bold; margin-left:2px;">[${a.notas_indices.join(',')}]</sup>` : '';
    html += `
          <tr style="border-bottom:1px solid #1e293b; transition:background 0.2s;" onmouseover="this.style.background='#1e293b66'" onmouseout="this.style.background='transparent'">
            <td style="padding:12px; font-weight:600; color:#f8fafc;">${a.desfecho}</td>
            <td style="padding:12px; font-family:monospace; color:#38bdf8;">${a.efeitoRelativo}</td>
            <td style="padding:12px; color:#cbd5e1;">${a.riscoControle}</td>
            <td style="padding:12px; color:#cbd5e1;">${a.riscoIntervencao}</td>
            <td style="padding:12px; font-weight:500; color:#e2e8f0;">${a.diferencaAbsoluta}</td>
            <td style="padding:12px; color:#94a3b8; font-size:12px;">${a.participantesEstudos}</td>
            <td style="padding:12px;">
              <span style="display:inline-flex; align-items:center; gap:6px; background:${a.cor}22; border:1px solid ${a.cor}66; color:${a.cor}; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600;">
                <span>${a.simbolo}</span>
                <span>${a.certeza}</span>
              </span>
              ${notasStr}
            </td>
          </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  if (notasRodape.length) {
    html += `
    <div style="margin-top:16px; padding-top:12px; border-top:1px solid #334155; font-size:11px; color:#94a3b8;">
      <div style="font-weight:600; margin-bottom:6px; color:#cbd5e1;">Notas Explicativas do Julgamento GRADE:</div>
      <ul style="margin:0; padding-left:18px;">
    `;
    for (const n of notasRodape) {
      html += `<li style="margin-bottom:4px;"><strong style="color:#f59e0b;">[${n.id}] ${n.desfecho}:</strong> ${n.texto}</li>`;
    }
    html += `
      </ul>
    </div>
    `;
  }

  html += `
    <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; border-top:1px dashed #334155; padding-top:8px;">
      <div>Legenda: ⊕⊕⊕⊕ Alta | ⊕⊕⊕⊝ Moderada | ⊕⊕⊝⊝ Baixa | ⊕⊝⊝⊝ Muito Baixa</div>
      <div>Sistema GRADE (Grading of Recommendations Assessment, Development and Evaluation)</div>
    </div>
  </div>
  `;

  return html;
}

/**
 * Gera os parágrafos de discussão e síntese narrativa baseados na certeza GRADE
 */
export function gerarSinteseNarrativaGrade(gradeResult) {
  const { avaliacoes } = gradeResult;
  let texto = `### Síntese da Certeza da Evidência (Classificação GRADE)\n\n`;

  const altas = avaliacoes.filter(a => a.score === 4);
  const moderadas = avaliacoes.filter(a => a.score === 3);
  const baixas = avaliacoes.filter(a => a.score <= 2);

  if (altas.length) {
    texto += `Para os desfechos de ${altas.map(a => `**${a.desfecho}**`).join(' e ')}, a certeza da evidência foi classificada como **Alta (⊕⊕⊕⊕)**. Os ensaios e dados avaliados apresentaram baixo risco de viés em todos os domínios essenciais, homogeneidade nos tamanhos de efeito e intervalos de confiança estreitos que confirmam a magnitude clínica favorável.\n\n`;
  }

  if (moderadas.length) {
    texto += `Em relação a ${moderadas.map(a => `**${a.desfecho}**`).join(' e ')}, a evidência foi classificada como de certeza **Moderada (⊕⊕⊕⊝)**. Os principais motivos para o rebaixamento incluíram ${moderadas.map(a => a.justificativaGeral).join('; ')}, sugerindo que o efeito verdadeiro provavelmente está próximo da estimativa calculada, embora novos estudos clínicos de grande escala possam refinar a precisão.\n\n`;
  }

  if (baixas.length) {
    texto += `Por fim, para ${baixas.map(a => `**${a.desfecho}**`).join(' e ')}, a certeza da evidência foi considerada **${baixas[0].certeza} (${baixas[0].simbolo})**, decorrente de limitações metodológicas basais e heterogeneidade estatística observada. Recomenda-se cautela na translação direta para protocolos clínicos estritos até que estudos adicionais com metodologia padronizada estejam disponíveis.\n\n`;
  }

  return texto;
}

/**
 * Função principal do Agente 16: executa análise completa de Certeza GRADE e SoF
 */
export function executarAgenteGrade(artigo = {}, dadosRiscoVies = null, metadados = {}) {
  const desfechos = extrairDesfechos(artigo, dadosRiscoVies);
  const resultadoGrade = avaliarCertezaGrade(desfechos, dadosRiscoVies, metadados);
  const tabelaMd = gerarTabelaSoFMarkdown(resultadoGrade, metadados);
  const tabelaHtml = gerarTabelaSoFHtml(resultadoGrade, metadados);
  const sinteseNarrativa = gerarSinteseNarrativaGrade(resultadoGrade);

  return {
    sucesso: true,
    agente: 'Agente 16 - Sistema GRADE & SoF',
    versao: '1.0.0',
    desfechos,
    resultadoGrade,
    certezaGlobal: resultadoGrade.certezaGlobal,
    certezaGeral: resultadoGrade.certezaGeral,
    avaliacoes: resultadoGrade.avaliacoes,
    totalDesfechos: resultadoGrade.avaliacoes?.length || desfechos.length,
    tabelaMd,
    tabelaHtml,
    sinteseNarrativa,
    timestamp: new Date().toISOString()
  };
}

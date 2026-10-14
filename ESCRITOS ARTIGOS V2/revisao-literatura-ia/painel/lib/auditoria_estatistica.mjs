/**
 * Agente Auditor de Estatística e Biomarcadores
 * 
 * Inspeciona e auto-remedia a coerência matemática e metodológica dos achados científicos:
 * 1. Formatação e limites de p-valor (proíbe p = 0,000; auto-corrige para p < 0,001).
 * 2. Consistência de Intervalos de Confiança (IC95% / 95% CI; auto-corrige limites invertidos).
 * 3. Homogeneidade e conversão de unidades biomédicas e laboratoriais (ex: PCR em mg/L vs mg/dL).
 */

export function auditarEstatisticaEBiomarcadores(md) {
  const texto = String(md || '');
  const alertas = [];
  const achados = {
    p_valores_analisados: 0,
    intervalos_confianca: 0,
    biomarcadores_detectados: [],
  };

  // 1. Auditoria de p-valor
  // Detecta p = 0,000 ou p = 0.00 (erro estatístico crasso comum em saídas de SPSS/R)
  const rePZero = /\bp\s*=\s*0[.,]0{2,}\b/gi;
  let mP;
  while ((mP = rePZero.exec(texto)) !== null) {
    const recomendacao = 'Em periódicos Qualis A1, valores p extremamente baixos não devem ser reportados como "p = 0,000", mas sim como "p < 0,001".';
    alertas.push({
      tipo: 'p_valor_zero',
      gravidade: 'alta',
      trecho: mP[0],
      recomendacao,
      mensagem: recomendacao,
    });
  }

  // Contagem de menções a p-valor
  const rePTotal = /\bp\s*[<>=]\s*\d+[.,]\d+/gi;
  const matchesP = texto.match(rePTotal);
  achados.p_valores_analisados = matchesP ? matchesP.length : 0;

  // 2. Auditoria de Intervalos de Confiança (IC95%)
  // Formatos: (IC95%: 1,2-3,4), (95% CI: 1.2 to 3.4), (IC95%: -2,5 a -0,8)
  const reIC = /(?:IC\s*95%|95%\s*CI)[^:()\-+\d]{0,10}[:=]?\s*(-?\d+(?:[.,]\d+)?)\s*(?:[–—]|(?<=\d)\s*-\s*(?=\d)|a|to|;|\s+-\s+)\s*(-?\d+(?:[.,]\d+)?)/gi;
  let mIC;
  while ((mIC = reIC.exec(texto)) !== null) {
    achados.intervalos_confianca++;
    const v1 = parseFloat(mIC[1].replace(',', '.'));
    const v2 = parseFloat(mIC[2].replace(',', '.'));
    if (!isNaN(v1) && !isNaN(v2) && v1 > v2) {
      const recomendacao = `Limite inferior (${v1}) está superior ao limite máximo (${v2}) no Intervalo de Confiança. Inverter valores.`;
      alertas.push({
        tipo: 'ic_invertido',
        gravidade: 'alta',
        trecho: mIC[0],
        recomendacao,
        mensagem: recomendacao,
      });
    }
  }

  // 3. Auditoria de Unidades de Biomarcadores (ex.: PCR em mg/L vs mg/dL)
  const temMencaoPcr = /\b(?:PCR|prote[ií]na C-reativa|proteina c-reativa)\b/i.test(texto);
  const temMgL = /\b(?:mg\/L)\b/i.test(texto);
  const temMgDl = /\b(?:mg\/dL)\b/i.test(texto);

  if (temMencaoPcr && temMgL) achados.biomarcadores_detectados.push('PCR (mg/L)');
  if (temMencaoPcr && temMgDl) achados.biomarcadores_detectados.push('PCR (mg/dL)');

  const jaExplicouConversao = /\b(?:1\s*mg\/dL\s*=\s*10\s*mg\/L|10\s*mg\/dL\s*(?:corresponde|=)\s*(?:a\s*)?100\s*mg\/L|convers[ãa]o\s+de\s+escala|escala\s+padronizada|calibra[çc][ãa]o\s+proporcional)\b/i.test(texto);
  if (temMencaoPcr && temMgL && temMgDl && !jaExplicouConversao) {
    const recomendacao = 'O manuscrito cita PCR/Proteína C-Reativa em duas unidades distintas (mg/L e mg/dL). Recomenda-se explicitar a conversão (1 mg/dL = 10 mg/L) na Discussão para evitar confusão diagnóstica.';
    alertas.push({
      tipo: 'discrepancia_unidades_pcr',
      gravidade: 'media',
      trecho: 'PCR citado tanto em mg/L quanto em mg/dL',
      recomendacao,
      mensagem: recomendacao,
    });
  }

  // Outros marcadores
  if (/\b(?:troponina|tnt|tni)\b/i.test(texto)) achados.biomarcadores_detectados.push('Troponina');
  if (/\b(?:procalcitonina|pct)\b/i.test(texto)) achados.biomarcadores_detectados.push('Procalcitonina');
  if (/\b(?:leuc[oó]citos|leucocitose)\b/i.test(texto)) achados.biomarcadores_detectados.push('Leucócitos');

  return {
    consistente: alertas.filter((a) => a.gravidade === 'alta').length === 0,
    total_alertas: alertas.length,
    alertas,
    achados,
  };
}

/**
 * Executa a auto-remediação de sintaxe estatística e padronização matemática.
 */
export function autoRemediarEstatistica(md) {
  let texto = String(md || '');
  const alteracoes = [];

  // 1. Corrige p = 0,000 ou p = 0.00 para p < 0,001
  const rePZero = /\bp\s*=\s*0[.,]0{2,}\b/gi;
  if (rePZero.test(texto)) {
    texto = texto.replace(rePZero, 'p < 0,001');
    alteracoes.push({
      tipo: 'p_valor_zero_corrigido',
      descricao: 'Correção automática de "p = 0,000" para "p < 0,001" (norma internacional Qualis A1).',
    });
  }

  // 2. Corrige limites invertidos de Intervalo de Confiança: (IC95%: 4,5-2,1) -> (IC95%: 2,1-4,5)
  const reIC = /((?:IC\s*95%|95%\s*CI)[^:()\-+\d]{0,10}[:=]?\s*)(-?\d+(?:[.,]\d+)?\b)(\s*(?:[–—]|(?<=\d)\s*-\s*(?=\d)|a|to|;|\s+-\s+)\s*)(-?\d+(?:[.,]\d+)?\b)/gi;
  texto = texto.replace(reIC, (match, prefixo, v1Str, sep, v2Str) => {
    const v1 = parseFloat(v1Str.replace(',', '.'));
    const v2 = parseFloat(v2Str.replace(',', '.'));
    if (!isNaN(v1) && !isNaN(v2) && v1 > v2) {
      alteracoes.push({
        tipo: 'ic_invertido_corrigido',
        descricao: `Correção de limites invertidos no IC95%: de ${v1Str}${sep}${v2Str} para ${v2Str}${sep}${v1Str}.`,
      });
      return `${prefixo}${v2Str}${sep}${v1Str}`;
    }
    return match;
  });

  const alterado = alteracoes.length > 0;
  return {
    md: texto,
    texto,
    alterado,
    correcoes: alteracoes,
    alteracoes,
  };
}

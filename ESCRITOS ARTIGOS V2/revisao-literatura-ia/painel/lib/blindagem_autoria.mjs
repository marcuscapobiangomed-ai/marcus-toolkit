/**
 * AGENTE 23: SENTINELA DE BLINDAGEM DE AUTORIA & INTEGRIDADE EPISTÊMICA
 * 
 * Especialista dedicado a auditar minuciosamente o manuscrito acadêmico final
 * contra qualquer rastro, metalinguagem conversacional, resíduos de raciocínio de IA,
 * declarações inadvertidas ou inconsistências conceituais capazes de comprometer
 * a autoria e submissão perante bancas avaliadoras e periódicos de alto impacto.
 * 
 * Eixos de Auditoria:
 *  1. Metalinguagem & Resíduos Conversacionais (<think>, saudações, despedidas, autoidentificações).
 *  2. Declarações Inadvertidas de IA no corpo ou notas do manuscrito.
 *  3. Incongruências Conceituais e Ambiguidade de Biomarcadores (ex: PCR molecular vs inflamatório).
 *  4. Cálculo do Score de Blindagem Editorial e Parecer Oficial para o Laudo de Raio-X.
 */

// Padrões de tags de raciocínio / pensamento emitidas por modelos reasoning (DeepSeek-R1, Gemini Thinking, etc.)
export const PADROES_THINKING = [
  /<think>[\s\S]*?<\/think>/gi,
  /<thought>[\s\S]*?<\/thought>/gi,
  /<\/?think>/gi,
  /<\/?thought>/gi,
];

// Padrões conversacionais de chat / preâmbulos típicos de LLMs
export const PADROES_CONVERSACIONAIS = [
  /^(?:com certeza|certamente|com prazer)[!.,:]?\s+(?:a seguir|abaixo|segue|apresento|trago|encontra-se)/gim,
  /^(?:aqui est[áa]|segue|apresento|abaixo encontra-se)\s+(?:a vers[ãa]o|o texto|a se[çc][ãa]o|o manuscrito|a revis[ãa]o|o artigo)/gim,
  /^(?:espero ter ajudado|se precisar de mais|estou [àa] disposi[çc][ãa]o|qualquer d[úu]vida)/gim,
  /(?:espero ter ajudado|caso precise de mais ajustes|estou [àa] disposi[çc][ãa]o)\.?\s*$/gim,
  /\b(?:como um modelo de linguagem|como uma intelig[êe]ncia artificial|como uma ia|como assistente de ia)\b/gi,
  /\b(?:n[ãa]o tenho sentimentos|n[ãa]o possuo corpo f[íi]sico|meu conhecimento foi atualizado at[é|e])\b/gi,
  /\b(?:desculpe(?:-me)?,? mas n[ãa]o posso|sinto muito,? mas n[ãa]o posso)\b/gi,
  /```(?:markdown|latex|json|text)?\s*$/gim,
];

// Padrões de declaração explícita de IA no corpo do texto
export const PADROES_DECLARACAO_IA = [
  /##\s*Declara[çc][ãa]o de transpar[êe]ncia metodol[óo]gica/i,
  /suporte computacional exclusivamente para etapas t[ée]cnicas de busca/i,
  /ferramentas de intelig[êe]ncia artificial foram empregadas/i,
  /transpar[êe]ncia no uso de ferramentas de intelig[êe]ncia artificial/i,
];

/**
 * Higieniza ativamente qualquer rastro conversacional ou tags de raciocínio do texto.
 */
export function expurgarRastrosIA(texto = '') {
  if (!texto || typeof texto !== 'string') return { texto: '', expurgos: 0 };
  let modificado = texto;
  let expurgos = 0;

  // 1. Remove blocos e tags de pensamento/raciocínio
  for (const re of PADROES_THINKING) {
    if (re.test(modificado)) {
      const ocorrencias = (modificado.match(re) || []).length;
      expurgos += ocorrencias;
      modificado = modificado.replace(re, '');
    }
  }

  // Normaliza o início após remoção de thinking
  modificado = modificado.trimStart();

  // 2. Remove saudações no início de parágrafos / seções
  const reSaudacaoInicio = /^(?:Com certeza|Certamente|Com prazer)[!.,:]?\s*(?:Segue|Abaixo|Aqui|Apresento|Trago)?[^\n]*\n+/gim;
  if (reSaudacaoInicio.test(modificado)) {
    const m = (modificado.match(reSaudacaoInicio) || []).length;
    expurgos += m;
    modificado = modificado.replace(reSaudacaoInicio, '');
  }

  const rePreambuloGeral = /^(?:Aqui est[áa]|Segue|Apresento|Abaixo encontra-se)\s+(?:a vers[ãa]o|o texto|a se[çc][ãa]o|o manuscrito|a revis[ãa]o|o artigo)[^\n]*\n+/gim;
  if (rePreambuloGeral.test(modificado)) {
    const m = (modificado.match(rePreambuloGeral) || []).length;
    expurgos += m;
    modificado = modificado.replace(rePreambuloGeral, '');
  }

  // 3. Remove despedidas conversacionais no fim do texto
  const reDespedidaFim = /\n+(?:Espero ter ajudado|Se precisar de mais[^\n]*|Qualquer d[úu]vida[^\n]*)\s*$/gim;
  if (reDespedidaFim.test(modificado)) {
    const m = (modificado.match(reDespedidaFim) || []).length;
    expurgos += m;
    modificado = modificado.replace(reDespedidaFim, '');
  }

  // 4. Remove blocos espúrios de fechamento de markdown triplo soltos
  modificado = modificado.replace(/^\s*```\s*$/gm, '');

  return { texto: modificado.trim(), expurgos };
}

/**
 * Audita a integridade do manuscrito e emite o Laudo do Agente 23.
 * 
 * @param {string} md - Texto completo do artigo em Markdown
 * @param {Object} opcoes - Parâmetros adicionais (ex: permitirDeclaracaoIa)
 * @returns {Object} Diagnóstico consolidado com score e recomendações
 */
export function auditarBlindagemAutoria(md = '', opcoes = {}) {
  const permitirDeclaracaoIa = Boolean(opcoes.permitirDeclaracaoIa);
  const achados = [];

  if (!md || typeof md !== 'string') {
    return {
      scoreBlindagem: 100,
      status: '100% Blindado',
      aprovado: true,
      achados: [],
      resumo: {
        thinking: 0,
        conversacionais: 0,
        declaracoesIa: 0,
        ambiguidadesConceituais: 0,
      },
      parecer: 'Manuscrito sem conteúdo a auditar.'
    };
  }

  let countThinking = 0;
  let countConversacionais = 0;
  let countDeclaracoesIa = 0;
  let countAmbiguidades = 0;

  // 1. Auditoria de Tags de Raciocínio (Gravidade Crítica)
  for (const re of PADROES_THINKING) {
    const matches = md.match(re);
    if (matches) {
      countThinking += matches.length;
      achados.push({
        tipo: 'tag_raciocinio_ia',
        gravidade: 'critica',
        trecho: matches[0].slice(0, 80),
        detalhe: `Tag de pensamento ou raciocínio não-processada encontrada no manuscrito (${matches.length} ocorrência(s)). Deve ser expurgada imediatamente.`
      });
    }
  }

  // 2. Auditoria de Padrões Conversacionais e Metalinguagem (Gravidade Crítica / Alta)
  for (const re of PADROES_CONVERSACIONAIS) {
    const matches = md.match(re);
    if (matches) {
      countConversacionais += matches.length;
      achados.push({
        tipo: 'metalinguagem_conversacional',
        gravidade: 'alta',
        trecho: matches[0].slice(0, 80),
        detalhe: `Expressão conversacional de chatbot identificada ("${matches[0].trim()}"). Incompatível com o tom acadêmico de um manuscrito submissível.`
      });
    }
  }

  // 3. Auditoria de Declarações de IA no Texto
  if (!permitirDeclaracaoIa) {
    for (const re of PADROES_DECLARACAO_IA) {
      const matches = md.match(re);
      if (matches) {
        countDeclaracoesIa += matches.length;
        achados.push({
          tipo: 'declaracao_ia_presente',
          gravidade: 'media',
          trecho: matches[0].slice(0, 80),
          detalhe: `Declaração explícita de uso de ferramentas de IA presente no corpo/notas. Se o periódico tiver política estrita ou desk review cego, isso pode suscitar questionamentos.`
        });
      }
    }
  }

  // 4. Auditoria de Ambiguidade de PCR (Molecular vs Inflamatório)
  const temPcr = /\b(?:PCR)\b/i.test(md);
  if (temPcr) {
    const ehMolecular = /\b(?:primer|amplifica[çc][ãa]o|genotipagem|rea[çc][ãa]o em cadeia|rt-pcr|dna|rna|polimerase|sequenciamento|gene)\b/i.test(md);
    const foiCalibradoPcrInflamatorio = /calibra[çc][ãa]o proporcional padronizada|10 mg\/dL corresponde a 100 mg\/L|Prote[íi]na C-Reativa/i.test(md);

    if (ehMolecular && foiCalibradoPcrInflamatorio) {
      countAmbiguidades++;
      achados.push({
        tipo: 'ambiguidade_pcr_biomarcador',
        gravidade: 'critica',
        trecho: 'Proteína C-Reativa em estudo de Biologia Molecular',
        detalhe: 'Divergência conceitual grave: O artigo aborda biologia molecular/genética (PCR = Reação em Cadeia da Polimerase), mas contém nota atribuindo a sigla à Proteína C-Reativa. Risco alto de apontamento por parecerista.'
      });
    }
  }

  // 5. Cálculo do Score de Blindagem Editorial (0 a 100%)
  let penalidade = 0;
  penalidade += countThinking * 35;
  penalidade += countConversacionais * 20;
  penalidade += countAmbiguidades * 25;
  penalidade += countDeclaracoesIa * 10;

  const scoreBlindagem = Math.max(0, 100 - penalidade);
  let status = '100% Blindado';
  let aprovado = true;

  if (scoreBlindagem < 70 || countThinking > 0 || countAmbiguidades > 0) {
    status = 'Risco Crítico de Autoria (Intervenção Necessária)';
    aprovado = false;
  } else if (scoreBlindagem < 100) {
    status = 'Atenção Editorial (Achados Menores)';
    aprovado = true;
  }

  let parecer = '';
  if (achados.length === 0) {
    parecer = 'Manuscrito 100% seguro. Nenhum rastro de IA, metalinguagem conversacional ou anomalia conceitual detectado. Pronto para submissão e bancas avaliadoras.';
  } else {
    parecer = `Identificados ${achados.length} ponto(s) de atenção na blindagem editorial. Recomenda-se saneamento terminal antes da submissão formal.`;
  }

  return {
    scoreBlindagem,
    status,
    aprovado,
    achados,
    resumo: {
      thinking: countThinking,
      conversacionais: countConversacionais,
      declaracoesIa: countDeclaracoesIa,
      ambiguidadesConceituais: countAmbiguidades,
    },
    parecer,
  };
}

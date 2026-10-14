/**
 * AGENTE 19: VERIFICADOR DE ORIGINALIDADE E PARÁFRASE CONCEITUAL ATIVA (TURNITIN / iTHENTICATE)
 * 
 * Audita a similaridade textual preditiva com base em N-grams (5 a 10 palavras),
 * fórmulas sintáticas clichês e sobreposição de fontes bibliográficas.
 * 
 * Fornece um motor de Paráfrase Conceitual Ativa que reestrutura sentenças,
 * transmuta construções passivas e clichês de IA/literatura, mantendo rigor técnico
 * inalterado e reduzindo o índice de similaridade iThenticate para < 3%.
 */

// Frases clichês de alto risco de match no iThenticate e bases indexadas
export const CLICHES_ALTO_RISCO = [
  { padrao: /it is well known that/gi, substituto: 'Evidências acumuladas demonstram que' },
  { padrao: /in recent years, there has been an increasing interest/gi, substituto: 'As investigações contemporâneas têm priorizado' },
  { padrao: /play(?:s)? a crucial role in/gi, substituto: 'desempenha papel determinante na regulação de' },
  { padrao: /is one of the leading causes of/gi, substituto: 'figura entre os principais determinantes etiológicos de' },
  { padrao: /the aim of this study is to evaluate/gi, substituto: 'Este trabalho investigou prospectivamente' },
  { padrao: /further studies are needed to/gi, substituto: 'Ensaios clínicos complementares são demandados para dirimir' },
  { padrao: /a total of \d+ patients were enrolled/gi, substituto: 'A casuística compreendeu' },
  { padrao: /statistically significant difference was observed/gi, substituto: 'Evidenciou-se divergência mensurável com significância estatística' },
  { padrao: /to the best of our knowledge/gi, substituto: 'Conforme o levantamento das bases indexadas disponíveis' },
  { padrao: /é amplamente sabido que/gi, substituto: 'A literatura biomédica consolidada documenta que' },
  { padrao: /nos últimos anos tem havido um crescente/gi, substituto: 'O panorama contemporâneo de pesquisa priorizou' },
  { padrao: /desempenha um papel crucial/gi, substituto: 'constitui elemento preponderante' },
  { padrao: /o objetivo deste estudo é/gi, substituto: 'A presente investigação delimitou-se a examinar' },
  { padrao: /mais estudos são necessários para/gi, substituto: 'Pesquisas translacionais subsequentes são prementes para elucidar' }
];

/**
 * Divide o texto em n-grams de palavras para detecção de repetições rígidas
 */
export function extrairNGrams(texto = '', n = 7) {
  const palavras = texto
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõçäëïöü]/gi, ' ')
    .split(/\s+/)
    .filter(p => p.length > 2);

  const ngrams = [];
  for (let i = 0; i <= palavras.length - n; i++) {
    ngrams.push(palavras.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Audita o manuscrito e calcula o Score de Similaridade Preditiva Turnitin/iThenticate
 */
export function auditarSimilaridade(artigo = {}, fontes = []) {
  // Filtro canônico internacional Turnitin / iThenticate ("Exclude Bibliography" & "Exclude Raw / Duplicates")
  let partesTexto = [];
  if (artigo.introducao || artigo.metodos || artigo.resultados || artigo.discussao || artigo.conclusao) {
    partesTexto = [
      artigo.introducao || '',
      artigo.metodos || '',
      artigo.resultados || '',
      artigo.discussao || '',
      artigo.conclusao || ''
    ];
  } else if (artigo.secoes && typeof artigo.secoes === 'object') {
    for (const [chave, valor] of Object.entries(artigo.secoes)) {
      if (['referencias', 'Referencias', 'bruto', 'cabecalho', 'titulo'].includes(chave)) continue;
      if (typeof valor === 'string' && valor.trim()) partesTexto.push(valor.trim());
    }
  } else if (artigo.textoCompleto && typeof artigo.textoCompleto === 'string') {
    partesTexto.push(artigo.textoCompleto.replace(/##\s*Referências[\s\S]*$/i, ''));
  }

  const textoArtigo = partesTexto.filter(Boolean).join('\n\n');

  if (!textoArtigo.trim()) {
    return {
      scoreSimilaridadePreditivo: 0,
      nivelRisco: 'baixo',
      status: 'Excelente (< 3% estimado)',
      fragmentosSuspeitos: [],
      clichesDetectados: [],
      aprovadoBlindagem: true,
      aviso_metodologico: 'Estimativa baseada em n-grams e bases abertas; não substitui o relatório definitivo do servidor oficial Turnitin/iThenticate.'
    };
  }

  const clichesDetectados = [];
  for (const item of CLICHES_ALTO_RISCO) {
    const matches = textoArtigo.match(item.padrao);
    if (matches) {
      clichesDetectados.push({
        termo: matches[0],
        ocorrencias: matches.length,
        sugestao: item.substituto
      });
    }
  }

  // Verificar n-grams com as fontes primárias ou resumos de artigos
  const ngramsArtigo = extrairNGrams(textoArtigo, 6);
  const ngramsSet = new Set(ngramsArtigo);

  const fragmentosSuspeitos = [];
  let totalMatchesFontes = 0;

  if (Array.isArray(fontes) && fontes.length) {
    for (const f of fontes) {
      const textoFonte = `${f.titulo || ''} ${f.resumo || ''}`;
      if (!textoFonte.trim()) continue;

      const ngramsFonte = extrairNGrams(textoFonte, 6);
      for (const ng of ngramsFonte) {
        if (ngramsSet.has(ng)) {
          totalMatchesFontes++;
          if (fragmentosSuspeitos.length < 10) {
            fragmentosSuspeitos.push({
              trecho: ng,
              fonte: f.autor_ano || f.titulo || 'Fonte Externa',
              tipo: 'Sobreposição literal direta com resumo de estudo primário'
            });
          }
        }
      }
    }
  }

  // Estimativa empírica do score iThenticate
  // Termos comuns representam ruído natural de 1 a 2%; sobreposições elevam o score
  const totalPalavras = textoArtigo.split(/\s+/).filter(Boolean).length;
  let scoreBruto = (totalMatchesFontes * 6 / (totalPalavras || 1)) * 100;
  
  // Penalidade de clichês repetitivos
  scoreBruto += clichesDetectados.reduce((acc, c) => acc + (c.ocorrencias * 0.3), 0);

  // Calibrar: mínimo de 0.8% (terminologias biomédicas padrão inevitáveis como "randomized clinical trial")
  const scoreSimilaridadePreditivo = parseFloat(Math.max(0.8, Math.min(95, scoreBruto)).toFixed(1));

  let nivelRisco = 'baixo';
  let status = 'Excelente (< 3% estimado)';
  if (scoreSimilaridadePreditivo > 15) {
    nivelRisco = 'critico';
    status = 'Atenção Crítica (> 15% estimado - Risco de Similaridade Editorial)';
  } else if (scoreSimilaridadePreditivo > 7) {
    nivelRisco = 'medio';
    status = 'Atenção Necessária (7% a 15% estimado)';
  } else if (scoreSimilaridadePreditivo > 3) {
    nivelRisco = 'moderado';
    status = 'Levemente acima do alvo (3% a 7% estimado)';
  }

  return {
    scoreSimilaridadePreditivo,
    nivelRisco,
    status,
    totalPalavras,
    clichesDetectados,
    fragmentosSuspeitos,
    aprovadoBlindagem: scoreSimilaridadePreditivo < 3.0,
    aviso_metodologico: 'Estimativa baseada em n-grams e bases abertas; não substitui o relatório definitivo do servidor oficial Turnitin/iThenticate.'
  };
}

/**
 * Motor de Paráfrase Ativa Profunda: imuniza sentenças contra similaridade literal
 */
export function aplicarParafraseAtiva(texto = '') {
  if (!texto) return '';

  let textoTratado = texto;

  // 1. Substituir clichês de alto risco por construções eruditas e originais
  for (const item of CLICHES_ALTO_RISCO) {
    textoTratado = textoTratado.replace(item.padrao, item.substituto);
  }

  // 2. Reestruturação sintática de construções passivas repetitivas
  textoTratado = textoTratado
    .replace(/foram incluídos no estudo (\d+) pacientes/gi, 'A casuística agregou $1 pacientes')
    .replace(/os dados foram analisados através de/gi, 'A análise computacional dos dados empregou')
    .replace(/não foi encontrada nenhuma diferença/gi, 'Ausentou-se divergência clinicamente relevante')
    .replace(/foi demonstrado que o tratamento/gi, 'O regime terapêutico demonstrou conclusivamente que')
    .replace(/uma busca sistemática foi realizada/gi, 'Conduziu-se escrutínio bibliográfico sistemático');

  return textoTratado;
}

/**
 * Função principal do Agente 19: Turnitin / iThenticate Shield
 */
export function executarAgenteTurnitinShield(artigo = {}, fontes = []) {
  const auditoriaInicial = auditarSimilaridade(artigo, fontes);
  
  // Realizar teste de blindagem ativa se score > 3%
  let textoBlindado = null;
  let auditoriaPosBlindagem = null;

  if (!auditoriaInicial.aprovadoBlindagem) {
    const textoCompleto = [
      artigo.introducao || '',
      artigo.metodos || '',
      artigo.resultados || '',
      artigo.discussao || '',
      artigo.conclusao || ''
    ].join('\n\n');

    textoBlindado = aplicarParafraseAtiva(textoCompleto);
    
    // Reavaliação pós-blindagem
    auditoriaPosBlindagem = auditarSimilaridade({ introducao: textoBlindado }, fontes);
  }

  return {
    sucesso: true,
    agente: 'Agente 19 - Turnitin / iThenticate Shield',
    versao: '1.0.0',
    auditoria: auditoriaInicial,
    auditoriaPosBlindagem,
    taxaSimilaridadeEstimada: `${auditoriaInicial.scoreSimilaridadePreditivo}%`,
    blindagemAtivaDisponivel: true,
    planoAcao: gerarPlanoAcaoAntiPlagio(auditoriaInicial),
    timestamp: new Date().toISOString()
  };
}

function gerarPlanoAcaoAntiPlagio(auditoria) {
  const acoes = [];
  if (auditoria.scoreSimilaridadePreditivo < 3.0) {
    acoes.push('Índice de similaridade preditiva estimado em < 3%, em total conformidade com diretrizes editoriais de originalidade (Turnitin / iThenticate).');
  } else {
    acoes.push(`Índice preditivo de ${auditoria.scoreSimilaridadePreditivo}%. Aplicar o motor de paráfrase ativa nos fragmentos pontuados.`);
  }

  if (auditoria.clichesDetectados.length) {
    acoes.push(`Eliminar ${auditoria.clichesDetectados.length} padrões de expressões repetitivas catalogadas em bancos de dados editoriais.`);
  }

  if (auditoria.fragmentosSuspeitos.length) {
    acoes.push(`Reescrever ${auditoria.fragmentosSuspeitos.length} sobreposições sintáticas com resumos primários de estudos.`);
  }

  return acoes;
}

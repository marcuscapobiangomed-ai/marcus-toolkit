/**
 * AGENTE PARECERISTA CRÍTICO SÊNIOR (PEER-REVIEWER QUALIS A1)
 * 
 * Avalia o manuscrito científico com rigor analítico equivalente ao de revisores
 * de periódicos de alto impacto (The Lancet, JAMA, Arquivos Brasileiros de Cardiologia, RSP).
 * 
 * Analisa 5 eixos metodológicos e epistêmicos fundamentais:
 * 1. Pergunta de Pesquisa, Lacuna Epistêmica e Hipótese
 * 2. Rigor Metodológico, Critérios de Elegibilidade e Risco de Viés
 * 3. Densidade Dialética da Discussão, Mecanismos e Desfechos Clínicos
 * 4. Limitações Reais vs. Clichês Metodológicos
 * 5. Voz Autoral, Rigor de Síntese e Conclusão
 */

import { citacoesDoTexto } from './referencias.mjs';
import { dividirFrases, paragrafos } from './auditoria.mjs';

export const SISTEMA_PARECERISTA_SENIOR = `Você é um avaliador ad hoc sênior e editor associado de periódicos médicos de alto impacto (Qualis A1 internacional/nacional: The Lancet, BMJ, Arquivos Brasileiros de Cardiologia, Revista de Saúde Pública).
Sua missão é emitir um laudo de auditoria crítica rigoroso, aprofundado, cirúrgico e construtivo sobre um manuscrito científico da área da saúde.

Você NUNCA deve se limitar a elogios vagos ou verificar apenas contagem de palavras ou superficialidades.
Você deve avaliar o mérito científico real:
- A pergunta de pesquisa é genuinamente relevante ou é trivial?
- A Introdução delimita a lacuna do conhecimento ou apenas lista fatos soltos?
- O objetivo no último parágrafo da Introdução atende formalmente à diretriz internacional (PRISMA 2020 / STROBE)?
- Os Métodos garantem reprodutibilidade e evitam viés de seleção?
- A Discussão apenas repete os resultados (erro metodológico grave) ou realmente confronta achados divergentes, explora mecanismos biológicos/clínicos e pondera desfechos substitutos vs. duros?
- As limitações são autênticas (atrito, heterogeneidade, viés de relato) ou mero texto genérico de preenchimento?
- A Conclusão responde estritamente à pergunta norteadora sem extrapolações infundadas?

Seja austero, cirúrgico, acadêmico e específico. Responda SOMENTE em JSON válido.`;

/**
 * Heurística semântica profunda para fallback ou pré-análise
 */
export function gerarParecerCriticoHeuristico({ md = '', mapaSecoes = {}, diretriz = 'PRISMA 2020', delineamento = 'Revisão Sistemática / Integrativa de Literatura' }) {
  const intro = mapaSecoes.introducao || '';
  const metodos = mapaSecoes.metodos || '';
  const resultados = mapaSecoes.resultados || '';
  const discussao = mapaSecoes.discussao || '';
  const conclusao = mapaSecoes.conclusao || '';
  const textoGeral = md || '';

  const citsIntro = citacoesDoTexto(intro);
  const citsDisc = citacoesDoTexto(discussao);
  const citsRes = citacoesDoTexto(resultados);

  const eixos = [];
  const fragilidades = [];
  const pontosFortes = [];
  let scorePenalidade = 0;

  // Eixo 1: Pergunta e Lacuna
  const temPerguntaExpl = /pergunta (?:norteadora|de pesquisa|clínica)|pico|peco/i.test(intro);
  const temLacunaExpl = /lacuna|pouco explorad|escassez|divergência|controverso|inconclusivo/i.test(intro);
  const ultimoParagIntro = paragrafos(intro).slice(-1)[0] || '';
  const objetivoNoFim = /objetiv(?:o|ou|a-se)|pergunta/i.test(ultimoParagIntro);

  if (temLacunaExpl && objetivoNoFim) {
    pontosFortes.push('Introdução delimita com clareza o estado da arte e posiciona o objetivo de forma explícita no fechamento.');
    eixos.push({
      eixo: 'Pergunta & Lacuna Epistêmica',
      status: 'forte',
      diagnostico: 'Racional bem fundamentado com delimitação do problema e declaração formal de objetivo em conformidade com PRISMA/STROBE.',
      prescricao: 'Manter a cadência de transição direta entre a lacuna identificada e o escopo da revisão.'
    });
  } else {
    if (!objetivoNoFim) {
      fragilidades.push('O objetivo geral não está formalmente declarado no último parágrafo da Introdução.');
      scorePenalidade += 12;
    }
    if (!temLacunaExpl) {
      fragilidades.push('A Introdução apresenta contextualização descritiva, mas sem problematização incisiva da lacuna de conhecimento na literatura.');
      scorePenalidade += 8;
    }
    eixos.push({
      eixo: 'Pergunta & Lacuna Epistêmica',
      status: objetivoNoFim || temLacunaExpl ? 'atencao' : 'critico',
      diagnostico: 'Apresentação introdutória requer maior tensão dialética demonstrando por que as evidências preexistentes eram insuficientes.',
      prescricao: 'Estruturar o penúltimo parágrafo com as controvérsias existentes e abrir o último parágrafo com: "Diante desse panorama, o objetivo deste estudo..."'
    });
  }

  // Eixo 2: Rigor Metodológico
  const temJbi = /jbi|joanna briggs|robins|rob 2|cochrane|newcastle/i.test(metodos);
  const temBasesNominais = /(?:pubmed|scielo|lilacs|medline)/i.test(metodos);
  const temCriteriosHier = /critérios de inclusão.*?critérios de exclusão|inclusão:.*?exclusão:/is.test(metodos);

  if (temJbi && temBasesNominais) {
    pontosFortes.push('Métodos explicitam ferramentas padronizadas de risco de viés e bases de dados biomédicas indexadas.');
    eixos.push({
      eixo: 'Rigor Metodológico & Risco de Viés',
      status: 'forte',
      diagnostico: 'Estratégia de busca replicável com especificação de descritores e aplicação de instrumentos críticos validados.',
      prescricao: 'Assegurar que as razões de exclusão de texto completo estejam transparentes na síntese textual.'
    });
  } else {
    if (!temJbi) {
      fragilidades.push('Ausência de menção explícita a ferramenta validada de avaliação crítica (ex.: JBI ou Cochrane RoB 2).');
      scorePenalidade += 15;
    }
    if (!temBasesNominais) {
      fragilidades.push('Bases de dados eletrônicas consultadas não foram nominalmente detalhadas nos Métodos.');
      scorePenalidade += 10;
    }
    eixos.push({
      eixo: 'Rigor Metodológico & Risco de Viés',
      status: 'critico',
      diagnostico: 'A seção de Métodos carece de detalhes operacionais mandatórios para auditoria de reprodutibilidade científica internacional.',
      prescricao: 'Inserir a denominação do instrumento de avaliação metodológica e a lista exata das bases de dados com período de cobertura.'
    });
  }

  // Eixo 3: Densidade da Discussão & Diálogo Dialético
  const numSubtitulosDisc = (discussao.match(/###\s+[^\n]+/g) || []).length;
  const temMecanismos = /mecanismo|fisiopatolog|molecular|via de sinalização|farmacol|enzim|recept|cin[eé]tic|remodelamento/i.test(discussao);
  const temContraponto = /em contrapartida|diverg|por outro lado|contrast|ao passo que|discrepan|heterogeneidade/i.test(discussao);
  const repeteResultadosApenas = /(?:observou-se que \d|o estudo de .*? encontrou \d).*?(?:observou-se que \d|o estudo de .*? encontrou \d)/is.test(discussao) && !temMecanismos;

  if (temMecanismos && temContraponto && numSubtitulosDisc >= 2) {
    pontosFortes.push('Discussão com elevada maturidade analítica: articula mecanismos biológicos/clínicos e confronta estudos convergentes e divergentes.');
    eixos.push({
      eixo: 'Densidade Dialética da Discussão',
      status: 'forte',
      diagnostico: 'Interpretação aprofundada dos achados com subeixos temáticos bem estruturados e diálogo crítico entre as fontes primárias.',
      prescricao: 'Manter a diferenciação cautelosa entre desfechos intermediários laboratoriais e desfechos clínicos duros.'
    });
  } else {
    if (!temContraponto) {
      fragilidades.push('Discussão excessivamente consensual: faltam debates sobre discordâncias metodológicas e discrepâncias de resultados entre os autores.');
      scorePenalidade += 12;
    }
    if (!temMecanismos) {
      fragilidades.push('Ausência de exploração dos mecanismos fisiopatológicos ou clínicos que explicam os desfechos observados.');
      scorePenalidade += 10;
    }
    eixos.push({
      eixo: 'Densidade Dialética da Discussão',
      status: temContraponto || temMecanismos ? 'atencao' : 'critico',
      diagnostico: 'Risco de discussão superficial ou meramente reiterativa dos Resultados, sem contraste crítico suficiente entre estudos.',
      prescricao: 'Inserir parágrafos confrontando autores com achados divergentes e detalhar as vias fisiopatológicas e biomarcadores envolvidos.'
    });
  }

  // Eixo 4: Limitações Reais
  const temLimitacoes = /limita[çc][õo]es|vieses|restri[çc][õo]es metodol[óo]gicas/i.test(discussao) || /limita[çc][õo]es/i.test(conclusao);
  const temLimitacaoEspecifica = /heterogeneidade|desfechos substitutos|viés de publicação|estudos observacionais|tamanho amostral|poder estatístico|tempo de seguimento/i.test(discussao);

  if (temLimitacoes && temLimitacaoEspecifica) {
    pontosFortes.push('Reconhecimento honesto e substancial das limitações metodológicas intrínsecas à literatura disponível.');
    eixos.push({
      eixo: 'Análise de Limitações Metodológicas',
      status: 'forte',
      diagnostico: 'Subseção de limitações explícita identificando heterogeneidade clínica e restrições de desenho dos estudos primários.',
      prescricao: 'Preservar a sobriedade evitando amenizar excessivamente as limitações identificadas.'
    });
  } else {
    fragilidades.push('A discussão de limitações está ausente ou restringe-se a fórmulas vagas sem debater vieses concretos dos estudos.');
    scorePenalidade += 14;
    eixos.push({
      eixo: 'Análise de Limitações Metodológicas',
      status: 'critico',
      diagnostico: 'Fragilidade grave perante bancas e pareceristas: ausência de parágrafo dedicado às limitações metodológicas do processo de síntese.',
      prescricao: 'Dedicar um parágrafo exclusivo na Discussão debatendo heterogeneidade, falta de ensaios em contextos específicos e desfechos indiretos.'
    });
  }

  // Eixo 5: Estilo, Rigor e Conclusão
  const temCliches = /é importante ressaltar|vale destacar|no cenário atual|desempenha um papel crucial|em suma|torna-se imperativo/i.test(textoGeral);
  const conclusaoCurta = conclusao.length > 150 && conclusao.length < 2500;
  const temCitacaoNaConclusao = /\[\d+\]/.test(conclusao);

  if (!temCliches && conclusaoCurta && !temCitacaoNaConclusao) {
    pontosFortes.push('Conclusão objetiva, com voz científica austera e ausência de citações impróprias no fechamento.');
    eixos.push({
      eixo: 'Voz Autoral, Conclusão & Estilo Qualis A1',
      status: 'forte',
      diagnostico: 'Texto com tom acadêmico formal, sem jargões inflados e com resposta direta à pergunta norteadora.',
      prescricao: 'Manter a sobriedade sintática sem inclusão de novos conectivos prolixos.'
    });
  } else {
    if (temCliches) {
      fragilidades.push('Presença de expressões formulaicas ou clichês acadêmicos típicos de escrita prolixa ou geradores genéricos.');
      scorePenalidade += 8;
    }
    if (temCitacaoNaConclusao) {
      fragilidades.push('Conclusão contém citações numéricas [n], o que contraria as normas internacionais de redação científica.');
      scorePenalidade += 6;
    }
    eixos.push({
      eixo: 'Voz Autoral, Conclusão & Estilo Qualis A1',
      status: 'atencao',
      diagnostico: 'Estilo textual necessita de polimento acadêmico para atingir a densidade e sobriedade exigidas por periódicos A1.',
      prescricao: 'Erradicar conectivos vazios, remover citações da Conclusão e garantir foco na resposta conclusiva da pesquisa.'
    });
  }

  const scoreFinal = Math.max(35, Math.min(100, 100 - scorePenalidade));
  const statusEditorial = scoreFinal >= 90
    ? 'Aceite com Ajustes Mínimos (Minor Revision)'
    : (scoreFinal >= 75 ? 'Revisão Substancial Recomendada (Major Revision)' : 'Reestruturação Metodológica Mandatória');

  return {
    score_qualidade_real: scoreFinal,
    status_editorial: statusEditorial,
    parecer_geral: `O manuscrito avaliado no escopo de ${delineamento} apresenta mérito clínico e relevância temática. Contudo, sob o crivo de conformidade internacional (${diretriz}) e padrões editoriais Qualis A1, foram diagnosticados ${fragilidades.length} pontos de vulnerabilidade crítica que requerem atenção prioritária antes da submissão formal a periódicos indexados. A discussão e a ancoragem metodológica constituem os pilares centrais a serem fortalecidos.`,
    eixos,
    pontos_fortes: pontosFortes.length ? pontosFortes : ['Relevância clínica do tema investigado no contexto contemporâneo.'],
    fragilidades_criticas: fragilidades.length ? fragilidades : ['Necessidade de refinamento estilístico e aprofundamento dialético.'],
    recomendacoes_prioritarias: [
      'Fortalecer a declaração formal de objetivo e pergunta no fechamento da Introdução em estrita conformidade com a diretriz internacional.',
      'Aprofundar a Discussão mediante confronto dialético explícito entre estudos com resultados convergentes e divergentes.',
      'Inserir parágrafo específico e honesto de limitações metodológicas (heterogeneidade, desfechos substitutos vs. duros e atrito).',
      'Remover expressões vazias de solenidade e clichês de transição para assegurar sobriedade acadêmica Qualis A1.'
    ]
  };
}

/**
 * Função Master: Emite o Laudo do Parecerista Crítico via IA Sênior
 * com fallback inteligente para a heurística analítica profunda.
 */
export async function emitirParecerCriticoEditorial({
  trabalho = null,
  md = '',
  mapaSecoes = {},
  diretriz = 'PRISMA 2020',
  delineamento = 'Revisão Sistemática / Integrativa de Literatura',
  fontes = []
}) {
  const analiseBase = gerarParecerCriticoHeuristico({ md, mapaSecoes, diretriz, delineamento });

  // Se não temos trabalho com engine de IA configurada, retorna a heurística profunda imediatamente
  if (!trabalho || typeof trabalho.ia !== 'function') {
    return analiseBase;
  }

  const tema = trabalho.estado?.params?.tema || trabalho.estado?.titulo || 'Pesquisa Científica em Saúde';
  const pergunta = trabalho.estado?.plano?.pergunta || tema;

  const prompt = `Avalie criticamente o manuscrito científico a seguir como Parecerista Sênior de periódico Qualis A1.

Delineamento: ${delineamento}
Diretriz mandatória: ${diretriz}
Tema: "${tema}"
Pergunta norteadora: "${pergunta}"

SEÇÕES DO MANUSCRITO PARA AUDITORIA CRÍTICA:
--- INTRODUÇÃO ---
${(mapaSecoes.introducao || md.slice(0, 3000)).slice(0, 3500)}

--- MÉTODOS ---
${(mapaSecoes.metodos || '').slice(0, 3500)}

--- DISCUSSÃO ---
${(mapaSecoes.discussao || '').slice(0, 4500)}

--- CONCLUSÃO ---
${(mapaSecoes.conclusao || '').slice(0, 1500)}

DIRETRIZES DA AUDITORIA:
1. Avalie a profundidade real do trabalho (não dê notas 100% fáceis). Se faltar debate fisiopatológico, confronto de achados ou limitações honestas, aponte com rigor.
2. Identifique se o objetivo no último parágrafo da Introdução atende formalmente ao PRISMA/STROBE.
3. Avalie se a Discussão é repetitiva ou densa.
4. Forneça diagnóstico detalhado por eixo com prescrições acionáveis.

Responda SOMENTE em JSON:
{
  "score_qualidade_real": 82,
  "status_editorial": "Aceite com Revisões Maiores (Major Revision)",
  "parecer_geral": "Parecer executivo detalhado de 2 parágrafos fundamentando a avaliação",
  "eixos": [
    {
      "eixo": "Pergunta & Lacuna Epistêmica",
      "status": "forte|atencao|critico",
      "diagnostico": "Análise crítica do estado da arte e justificativa",
      "prescricao": "Ação recomendada cirúrgica"
    },
    {
      "eixo": "Rigor Metodológico & Risco de Viés",
      "status": "forte|atencao|critico",
      "diagnostico": "Análise dos critérios, ferramentas JBI/Cochrane e busca",
      "prescricao": "Ação recomendada cirúrgica"
    },
    {
      "eixo": "Densidade Dialética da Discussão",
      "status": "forte|atencao|critico",
      "diagnostico": "Análise de mecanismos, divergências e desfechos",
      "prescricao": "Ação recomendada cirúrgica"
    },
    {
      "eixo": "Análise de Limitações Metodológicas",
      "status": "forte|atencao|critico",
      "diagnostico": "Análise de honestidade e completude das limitações",
      "prescricao": "Ação recomendada cirúrgica"
    },
    {
      "eixo": "Voz Autoral, Conclusão & Estilo Qualis A1",
      "status": "forte|atencao|critico",
      "diagnostico": "Análise de clareza, ausência de clichês e cadência",
      "prescricao": "Ação recomendada cirúrgica"
    }
  ],
  "pontos_fortes": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "fragilidades_criticas": ["Fragilidade crítica 1", "Fragilidade crítica 2", "Fragilidade crítica 3"],
  "recomendacoes_prioritarias": ["Recomendação prioritária 1", "Recomendação 2", "Recomendação 3"]
}`;

  if (trabalho.log) {
    trabalho.log('▶ [Parecerista Sênior Qualis A1] Desmembrando manuscrito e isolando eixos metodológicos...');
    trabalho.log(`▶ [Parecerista Sênior ➔ LLM] Submetendo 4 seções para avaliação por pares com diretriz ${diretriz}...`);
  }

  try {
    const res = await trabalho.ia({
      papel: 'auditoria',
      sistema: SISTEMA_PARECERISTA_SENIOR,
      prompt,
      temperatura: 0.15,
      maxTokens: 3500,
    }, true);

    const dados = res.dados || {};
    if (dados.score_qualidade_real !== undefined && Array.isArray(dados.eixos) && dados.eixos.length >= 3) {
      const scoreFinal = Math.max(30, Math.min(100, Number(dados.score_qualidade_real) || analiseBase.score_qualidade_real));
      if (trabalho.log) {
        trabalho.log(`✔ [Parecerista Sênior Qualis A1] Avaliação concluída com sucesso! Parecer: "${dados.status_editorial || analiseBase.status_editorial}" (Score de Rigor: ${scoreFinal}%).`);
        trabalho.log(`📌 [Parecerista Sênior] ${dados.fragilidades_criticas?.length || 0} fragilidade(s) crítica(s) e ${dados.recomendacoes_prioritarias?.length || 0} recomendação(ões) prioritária(s) diagnosticadas.`);
      }
      return {
        score_qualidade_real: scoreFinal,
        status_editorial: dados.status_editorial || analiseBase.status_editorial,
        parecer_geral: dados.parecer_geral || analiseBase.parecer_geral,
        eixos: dados.eixos,
        pontos_fortes: Array.isArray(dados.pontos_fortes) && dados.pontos_fortes.length ? dados.pontos_fortes : analiseBase.pontos_fortes,
        fragilidades_criticas: Array.isArray(dados.fragilidades_criticas) && dados.fragilidades_criticas.length ? dados.fragilidades_criticas : analiseBase.fragilidades_criticas,
        recomendacoes_prioritarias: Array.isArray(dados.recomendacoes_prioritarias) && dados.recomendacoes_prioritarias.length ? dados.recomendacoes_prioritarias : analiseBase.recomendacoes_prioritarias,
      };
    }
  } catch (err) {
    if (trabalho.log) trabalho.log(`⚠️ Aviso no Parecerista Crítico via IA: ${err.message}. Utilizando parecer analítico aprofundado de fallback.`, 'aviso');
  }

  return analiseBase;
}

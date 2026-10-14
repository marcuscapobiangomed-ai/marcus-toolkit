/**
 * Agente de Auditoria de Conformidade Polimórfica: PRISMA 2020 / STROBE / JBI
 * 
 * Avalia o manuscrito científico contra as diretrizes internacionais correspondentes:
 * - PRISMA 2020: 27 itens oficiais para revisões sistemáticas e integrativas (BMJ 2021).
 * - STROBE: 22 itens oficiais para estudos observacionais (coortes, caso-controle, transversais).
 * - Detecção automática de delineamento para aplicar a métrica justa e adequada.
 */

export const ITENS_PRISMA_2020 = [
  { item: 1, secao: 'Título', descricao: 'Identificação clara do tipo de revisão no título', peso: 1 },
  { item: 2, secao: 'Resumo', descricao: 'Resumo estruturado (Objetivo, Métodos, Resultados, Conclusão)', peso: 2 },
  { item: 3, secao: 'Introdução', descricao: 'Racional e justificativa com base na lacuna da literatura', peso: 1 },
  { item: 4, secao: 'Introdução', descricao: 'Declaração explícita do objetivo e pergunta norteadora no último parágrafo', peso: 2 },
  { item: 5, secao: 'Métodos', descricao: 'Critérios de inclusão e exclusão explícitos e justificados', peso: 2 },
  { item: 6, secao: 'Métodos', descricao: 'Fontes de informação (bases eletrônicas, período e datas)', peso: 2 },
  { item: 7, secao: 'Métodos', descricao: 'Estratégia de busca completa replicável (strings e descritores)', peso: 2 },
  { item: 8, secao: 'Métodos', descricao: 'Processo de triagem e seleção independente dos estudos', peso: 1 },
  { item: 9, secao: 'Métodos', descricao: 'Processo de extração de dados e variáveis padronizadas', peso: 1 },
  { item: 10, secao: 'Métodos', descricao: 'Discriminação de desfechos clínicos avaliados (primários vs secundários)', peso: 2 },
  { item: 11, secao: 'Métodos', descricao: 'Avaliação crítica de qualidade metodológica e risco de viés (JBI)', peso: 2 },
  { item: 12, secao: 'Métodos', descricao: 'Definição das medidas de síntese e comparação', peso: 1 },
  { item: 13, secao: 'Métodos', descricao: 'Critérios para agrupamento e síntese temática', peso: 1 },
  { item: 14, secao: 'Métodos', descricao: 'Tratamento de inconsistências ou heterogeneidade entre estudos', peso: 1 },
  { item: 15, secao: 'Métodos', descricao: 'Avaliação do risco de viés decorrente de dados faltantes', peso: 1 },
  { item: 16, secao: 'Resultados', descricao: 'Fluxo da seleção dos estudos e menção ao Fluxograma PRISMA', peso: 2 },
  { item: 17, secao: 'Resultados', descricao: 'Tabela de caracterização dos estudos incluídos (amostra, delineamento, país)', peso: 2 },
  { item: 18, secao: 'Resultados', descricao: 'Resultados detalhados da avaliação de qualidade metodológica (JBI)', peso: 2 },
  { item: 19, secao: 'Resultados', descricao: 'Apresentação dos achados individuais dos estudos primários', peso: 1 },
  { item: 20, secao: 'Resultados', descricao: 'Síntese crítica organizada por eixos temáticos', peso: 2 },
  { item: 21, secao: 'Resultados', descricao: 'Análise de subgrupos e variáveis intervenientes', peso: 1 },
  { item: 22, secao: 'Resultados', descricao: 'Grau de certeza e concordância das evidências', peso: 1 },
  { item: 23, secao: 'Discussão', descricao: 'Interpretação geral dos achados no contexto do estado da arte', peso: 2 },
  { item: 24, secao: 'Discussão', descricao: 'Limitações metodológicas dos estudos e do próprio processo de revisão', peso: 2 },
  { item: 25, secao: 'Discussão', descricao: 'Implicações práticas para a assistência clínica e futuras pesquisas', peso: 2 },
  { item: 26, secao: 'Outros', descricao: 'Registro de protocolo (PROSPERO ou declaração de arquivamento)', peso: 1 },
  { item: 27, secao: 'Outros', descricao: 'Declaração de conflitos de interesse, fontes de financiamento e ética', peso: 1 },
];

export const ITENS_STROBE = [
  { item: 1, secao: 'Título e Resumo', descricao: 'Indicação do delineamento (coorte, caso-controle ou transversal) no título ou resumo', peso: 2 },
  { item: 2, secao: 'Introdução', descricao: 'Fundamentação científica e contextualização do problema', peso: 1 },
  { item: 3, secao: 'Introdução', descricao: 'Objetivos específicos e/ou hipóteses prévias declaradas', peso: 2 },
  { item: 4, secao: 'Métodos', descricao: 'Apresentação clara do delineamento do estudo logo no início', peso: 2 },
  { item: 5, secao: 'Métodos', descricao: 'Cenário, local, período de recrutamento e coleta de dados', peso: 2 },
  { item: 6, secao: 'Métodos', descricao: 'Critérios de elegibilidade e métodos de seleção dos participantes', peso: 2 },
  { item: 7, secao: 'Métodos', descricao: 'Definição precisa de variáveis: desfechos, exposições e preditores', peso: 2 },
  { item: 8, secao: 'Métodos', descricao: 'Fontes de dados e métodos de mensuração das variáveis', peso: 1 },
  { item: 9, secao: 'Métodos', descricao: 'Abordagem de potenciais fontes de viés (seleção, informação, confusão)', peso: 2 },
  { item: 10, secao: 'Métodos', descricao: 'Tamanho amostral ou cálculo do poder estatístico', peso: 1 },
  { item: 11, secao: 'Métodos', descricao: 'Tratamento de variáveis quantitativas e categorizações', peso: 1 },
  { item: 12, secao: 'Métodos', descricao: 'Métodos estatísticos descritivos e inferenciais empregados', peso: 2 },
  { item: 13, secao: 'Resultados', descricao: 'Fluxo e número de participantes em cada estágio do estudo', peso: 2 },
  { item: 14, secao: 'Resultados', descricao: 'Características demográficas e clínicas basais da amostra', peso: 2 },
  { item: 15, secao: 'Resultados', descricao: 'Número de eventos de desfecho ou dados quantitativos de síntese', peso: 2 },
  { item: 16, secao: 'Resultados', descricao: 'Estimativas de associação brutas e ajustadas com IC95% e p-valor', peso: 2 },
  { item: 17, secao: 'Resultados', descricao: 'Outras análises (subgrupos, sensibilidade ou estratificação)', peso: 1 },
  { item: 18, secao: 'Discussão', descricao: 'Resumo dos principais achados articulados aos objetivos', peso: 2 },
  { item: 19, secao: 'Discussão', descricao: 'Discussão das limitações do estudo e fontes remanescentes de viés', peso: 2 },
  { item: 20, secao: 'Discussão', descricao: 'Interpretação prudente dos achados no cenário científico internacional', peso: 2 },
  { item: 21, secao: 'Discussão', descricao: 'Generalizabilidade e validade externa dos resultados', peso: 1 },
  { item: 22, secao: 'Outros', descricao: 'Aspectos éticos (CEP/CAAE), financiamento e ausência de conflitos', peso: 2 },
];

/**
 * Detecta automaticamente o delineamento epidemiológico ou metodológico do artigo.
 */
export function detectarDelineamento(md, mapaSecoes = {}) {
  const textoGeral = String(md || '');
  const cabecalhoEIntro = `${textoGeral.slice(0, 1500)}\n${mapaSecoes.introducao || ''}\n${mapaSecoes.metodos || ''}`.toLowerCase();

  const termosRevisao = /(?:revis[aã]o (?:integrativa|sistem[aá]tica|de escopo|narrativa)|scoping review|systematic review|meta-an[aá]lise|metan[aá]lise|prisma 2020|decs\/mesh)/i;
  const termosObservacional = /(?:estudo de coorte|coorte prospectiv|coorte retrospectiv|caso-controle|case-control|estudo transversal|cross-sectional|estudo observacional|prontu[aá]rios|pacientes ambulatoriais)/i;
  const termosEnsaio = /(?:ensaio cl[ií]nico|clinical trial|randomizado|randomized|duplo-cego|placebo-controlado)/i;

  if (termosObservacional.test(cabecalhoEIntro) && !termosRevisao.test(textoGeral.slice(0, 300))) {
    return {
      tipo: 'observacional',
      nome: 'Estudo Observacional (Coorte / Caso-Controle / Transversal)',
      diretriz: 'STROBE',
      total_itens: 22,
    };
  }

  if (termosEnsaio.test(cabecalhoEIntro) && !termosRevisao.test(textoGeral.slice(0, 300))) {
    return {
      tipo: 'ensaio_clinico',
      nome: 'Ensaio Clínico Randomizado',
      diretriz: 'CONSORT',
      total_itens: 25,
    };
  }

  return {
    tipo: 'revisao',
    nome: 'Revisão Sistemática / Integrativa de Literatura',
    diretriz: 'PRISMA 2020',
    total_itens: 27,
  };
}

function extrairSecoesFallback(md, mapa = {}) {
  if (mapa && (mapa.introducao || mapa.metodos || mapa.resultados || mapa.discussao)) {
    return mapa;
  }
  const texto = String(md || '');
  const mIntro = texto.match(/## (?:1 |1\. )?Introdu[cç][aã]o([\s\S]*?)(?=\n## |$)/i);
  const mMet = texto.match(/## (?:2 |2\. )?(?:M[eé]todos|Metodologia|Materiais e M[eé]todos)([\s\S]*?)(?=\n## |$)/i);
  const mRes = texto.match(/## (?:3 |3\. )?Resultados([\s\S]*?)(?=\n## |$)/i);
  const mDisc = texto.match(/## (?:4 |4\. )?Discuss[aã]o([\s\S]*?)(?=\n## |$)/i);
  const mConc = texto.match(/## (?:5 |5\. )?(?:Conclus[aã]o|Considera[cç][oõ]es Finais)([\s\S]*?)(?=\n## |$)/i);
  const mResumo = texto.match(/\*\*RESUMO:\*\*([\s\S]*?)(?=\n\n\*\*Palavras-chave:|\n## |$)/i) || texto.match(/## Resumo([\s\S]*?)(?=\n## |$)/i);

  return {
    ...mapa,
    introducao: (mIntro ? mIntro[1] : '').trim(),
    metodos: (mMet ? mMet[1] : '').trim(),
    resultados: (mRes ? mRes[1] : '').trim(),
    discussao: (mDisc ? mDisc[1] : '').trim(),
    conclusao: (mConc ? mConc[1] : '').trim(),
    resumo: (mResumo ? mResumo[1] : '').trim(),
  };
}

/**
 * Realiza a auditoria de conformidade PRISMA 2020 sobre o Markdown do artigo.
 */
export function auditarConformidadePrisma(md, mapaSecoes = {}) {
  const mapa = extrairSecoesFallback(md, mapaSecoes);
  const textoGeral = String(md || '');
  const introducao = mapa.introducao || '';
  const metodos = mapa.metodos || '';
  const resultados = mapa.resultados || '';
  const discussao = mapa.discussao || '';
  const conclusao = mapa.conclusao || '';

  const avaliacoes = [];
  let pontosGanhos = 0;
  let pontosPossiveis = 0;

  for (const reg of ITENS_PRISMA_2020) {
    pontosPossiveis += reg.peso;
    let conforme = false;
    let observacao = '';

    const paragrafosIntro = String(introducao || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const ultimoParagIntro = paragrafosIntro.slice(-1)[0] || '';

    switch (reg.item) {
      case 1:
        conforme = /revis[aã]o (?:integrativa|sistem[aá]tica|narrativa|de escopo)/i.test(textoGeral.slice(0, 300));
        observacao = conforme ? 'Tipo de revisão identificado no título/cabeçalho.' : 'Acrescentar o tipo de revisão no título (ex: "Revisão Integrativa" ou "Revisão Sistemática").';
        break;
      case 2:
        conforme = /(?:objetivo|methods|resultados|conclus[aã]o)/i.test(mapaSecoes.resumo || textoGeral.slice(0, 1500));
        observacao = conforme ? 'Resumo com estrutura formal detectada (Objetivo, Métodos, Resultados e Conclusão).' : 'Estruturar formalmente o resumo em seções: Objetivo, Métodos, Resultados e Conclusão.';
        break;
      case 3:
        conforme = introducao.length > 500 && /(?:lacuna|controv[eé]rsia|diverg[eê]ncia|escassez|pouco explorad|inconclusiv|justificativa|impacto cl[ií]nico)/i.test(introducao);
        observacao = conforme ? 'Racional fundamentado com delimitação da lacuna do conhecimento na literatura.' : 'Aprofundar a Introdução demonstrando a lacuna epistêmica e a controvérsia clínica na literatura.';
        break;
      case 4:
        conforme = /objetiv(?:o|ou|a-se|ou-se)|pergunta norteadora/i.test(ultimoParagIntro);
        observacao = conforme ? 'Objetivo formalmente declarado no último parágrafo da Introdução.' : 'O Item 4 do PRISMA 2020 exige a declaração explícita do objetivo no último parágrafo da Introdução.';
        break;
      case 5:
        conforme = /(?:crit[eé]rios de inclus[aã]o|foram inclu[ií]dos).*?(?:crit[eé]rios de exclus[aã]o|foram exclu[ií]dos)/is.test(metodos) || (metodos.includes('inclusão') && metodos.includes('exclusão'));
        observacao = conforme ? 'Critérios de elegibilidade (inclusão e exclusão) especificados.' : 'Detalhar separadamente critérios explícitos de inclusão e de exclusão nos Métodos.';
        break;
      case 6:
        conforme = /(?:pubmed|medline).*?(?:scielo|lilacs)|(?:scielo|lilacs).*?(?:pubmed|medline)/is.test(metodos);
        observacao = conforme ? 'Bases de dados bibliográficas indexadas especificadas nominalmente.' : 'Especificar nominalmente todas as bases consultadas (ex.: PubMed/MEDLINE, SciELO, LILACS) e período.';
        break;
      case 7:
        conforme = /(?:mesh|decs|descritores|estrat[eé]gia de busca|operadores booleanos|and.*?or)/i.test(metodos);
        observacao = conforme ? 'Estratégia de busca detalhada com descritores controlados e operadores.' : 'Inserir a string de busca ou os descritores controlados (DeCS/MeSH) e operadores booleanos.';
        break;
      case 8:
        conforme = /(?:pares|dupl|independente|revisores|cegos entre si)/i.test(metodos);
        observacao = conforme ? 'Processo de seleção independente por pares documentado.' : 'Mencionar processo de triagem independente por revisores/pares.';
        break;
      case 9:
        conforme = /(?:extra[cç][aã]o|coleta de dados|formul[aá]rio padronizado|vari[aá]veis extra[ií]das)/i.test(metodos);
        observacao = conforme ? 'Processo e variáveis de extração de dados descritos.' : 'Descrever como os dados foram tabulados e quais variáveis foram extraídas dos estudos.';
        break;
      case 10:
        conforme = /(?:desfecho|desfechos prim[aá]rios|secund[aá]rios|endpoints|vari[aá]veis cl[ií]nicas)/i.test(metodos) || /(?:desfechos prim[aá]rios|desfechos secund[aá]rios)/i.test(resultados);
        observacao = conforme ? 'Desfechos clínicos primários e secundários discriminados.' : 'Diferenciar formalmente desfechos clínicos primários de secundários nos Métodos.';
        break;
      case 11:
        conforme = /(?:jbi|joanna briggs|robins|rob 2|cochrane|newcastle-ottawa|qualidade metodol[oó]gica|risco de vi[eé]s)/i.test(metodos);
        observacao = conforme ? 'Instrumento validado de avaliação crítica e risco de viés especificado (JBI / Cochrane).' : 'Mencionar nominalmente a ferramenta de avaliação crítica (ex.: Joanna Briggs Institute - JBI).';
        break;
      case 12:
        conforme = /(?:s[ií]ntese narrativa|s[ií]ntese qualitativa|meta-an[aá]lise|metan[aá]lise|agrupamento tem[aá]tico)/i.test(metodos);
        observacao = conforme ? 'Método formal de síntese e integração das evidências declarado.' : 'Declarar o método de síntese das evidências (narrativa, temático ou metanálise).';
        break;
      case 13:
        conforme = (discussao.match(/###\s+[^\n]+/g) || []).length >= 2 || /(?:eixos tem[aá]ticos|categorias anal[ií]ticas)/i.test(metodos);
        observacao = conforme ? 'Discussão estruturada por eixos temáticos claros com subtítulos.' : 'Organizar a discussão em pelo menos dois eixos temáticos utilizando subtítulos (###).';
        break;
      case 14:
        conforme = /(?:diverg|converg|heterogeneidade|discrep[aâ]ncia|em contrapartida|contrastando|ao passo que)/i.test(discussao);
        observacao = conforme ? 'Divergências e heterogeneidade entre os estudos primários debatidas criticamente.' : 'Debater divergências metodológicas e discordâncias de resultados entre os estudos primários.';
        break;
      case 15:
        conforme = /(?:dados faltantes|atrito|perdas de seguimento|vi[eé]s de publica[cç][aã]o|relato seletivo)/i.test(discussao) || /(?:dados faltantes|atrito)/i.test(metodos);
        observacao = conforme ? 'Impacto de viés de publicação ou dados faltantes ponderado.' : 'Ponderar o impacto de dados não relatados, perdas amostrais ou viés de publicação.';
        break;
      case 16:
        conforme = /(?:fluxograma|figura 1|prisma 2020|processo de sele[cç][aã]o)/i.test(resultados) || /fluxograma/i.test(textoGeral);
        observacao = conforme ? 'Referência ao fluxograma de seleção PRISMA 2020 presente nos Resultados.' : 'Fazer referência ao fluxograma de seleção PRISMA 2020 nos Resultados.';
        break;
      case 17:
        conforme = /(?:tabela 1|quadro 1|caracteriza[cç][aã]o dos estudos)/i.test(resultados);
        observacao = conforme ? 'Tabela/Quadro de caracterização dos estudos incluídos presente.' : 'Incluir Tabela 1 sintetizando autor, ano, país, amostra, intervenção e principais achados.';
        break;
      case 18:
        conforme = /(?:qualidade metodol[oó]gica|avalia[cç][aã]o cr[ií]tica|escore jbi|baixo risco|alta qualidade)/i.test(resultados);
        observacao = conforme ? 'Resultados da avaliação de qualidade metodológica detalhados nos Resultados.' : 'Apresentar a síntese dos resultados da avaliação crítica (JBI / Cochrane) nos Resultados.';
        break;
      case 19:
        conforme = (resultados.match(/\[\d+\]/g) || []).length >= 5;
        observacao = conforme ? 'Resultados sustentados por múltiplas citações de estudos primários catalogados.' : 'Citar formalmente as referências individuais dos estudos ao descrever os resultados.';
        break;
      case 20:
        conforme = discussao.length > 1200 && (discussao.match(/\[\d+\]/g) || []).length >= 6;
        observacao = conforme ? 'Discussão aprofundada com densidade analítica e diálogo crítico entre as fontes.' : 'Expandir o diálogo crítico na Discussão, articulando os achados com o corpo de evidências.';
        break;
      case 21:
        conforme = /(?:subgrupo|estratifica[cç][aã]o|faixa et[aá]ria|gravidade|comorbidade)/i.test(discussao) || /(?:subgrupo)/i.test(resultados);
        observacao = conforme ? 'Estratificação por subgrupos ou perfis clínicos abordada.' : 'Ponderar particularidades de subgrupos clínicos se aplicável.';
        break;
      case 22:
        conforme = /(?:grau de certeza|certeza da evid[eê]ncia|grade|robustez|consist[eê]ncia cl[ií]nica)/i.test(discussao) || /(?:grau de certeza|grade)/i.test(resultados);
        observacao = conforme ? 'Ponderação da certeza da evidência científica abordada.' : 'Ponderar o grau de certeza das evidências (sistema GRADE ou consistência metodológica).';
        break;
      case 23:
        conforme = /(?:confront|corrobora|alinha-se|diverge|literatura internacional|estado da arte)/i.test(discussao);
        observacao = conforme ? 'Interpretação confrontada ativamente com o conhecimento científico estabelecido.' : 'Confrontar diretamente os achados com a literatura científica internacional.';
        break;
      case 24:
        conforme = /(?:limita[cç][oõ]es metodol[oó]gicas|limita[cç][oõ]es deste estudo|limita[cç][oõ]es da revis[aã]o)/i.test(discussao) && /(?:heterogeneidade|vi[eé]s|desenho|amostra|seguimento|estudos observacionais)/i.test(discussao);
        observacao = conforme ? 'Subseção de limitações honesta reconhecendo vieses intrínsecos e restrições de desenho.' : 'Dedicar parágrafo explícito às limitações metodológicas (heterogeneidade, viés de relato e desenho).';
        break;
      case 25:
        conforme = /(?:implica[cç][oõ]es para a pr[aá]tica|implica[cç][oõ]es cl[ií]nicas|pesquisas futuras|ensaios cl[ií]nicos pragm[aá]ticos)/i.test(discussao) || /(?:recomenda-se|pesquisas futuras)/i.test(conclusao);
        observacao = conforme ? 'Implicações clínicas e direcionamentos para futuras pesquisas apresentados.' : 'Apontar implicações para a conduta médica e direcionamentos para pesquisas futuras.';
        break;
      case 26:
        conforme = /(?:prospero|registro de protocolo|declara[cç][aã]o de transpar[eê]ncia|arquivamento)/i.test(metodos) || /(?:declara[cç][aã]o de transpar[eê]ncia)/i.test(textoGeral);
        observacao = conforme ? 'Registro de protocolo ou nota formal de transparência metodológica presente.' : 'Mencionar registro de protocolo (ex.: PROSPERO) ou nota formal de transparência de dados.';
        break;
      case 27:
        conforme = /(?:conflito de interesses|declara[cç][aã]o de conflito|fontes de financiamento|aus[eê]ncia de conflitos)/i.test(textoGeral);
        observacao = conforme ? 'Declaração formal de ausência de conflitos de interesse e financiamento presente.' : 'Inserir declaração formal de conflito de interesses e fontes de financiamento.';
        break;
    }

    if (conforme) pontosGanhos += reg.peso;

    avaliacoes.push({
      item: reg.item,
      secao: reg.secao,
      descricao: reg.descricao,
      conforme,
      observacao,
    });
  }

  const conformidadeScore = Math.round((pontosGanhos / pontosPossiveis) * 100);
  const totalConformes = avaliacoes.filter((a) => a.conforme).length;

  return {
    diretriz: 'PRISMA 2020',
    delineamento: 'Revisão Sistemática / Integrativa de Literatura',
    score_percentual: conformidadeScore,
    itens_conformes: totalConformes,
    total_itens: ITENS_PRISMA_2020.length,
    status_geral: conformidadeScore >= 85 ? 'Excelente (Qualis A1)' : (conformidadeScore >= 70 ? 'Bom (Requer pequenos ajustes)' : 'Incompleto'),
    avaliacoes,
    pendencias: avaliacoes.filter((a) => !a.conforme).map((a) => `[Item ${a.item} - ${a.secao}]: ${a.observacao}`),
  };
}

/**
 * Realiza a auditoria de conformidade STROBE sobre o Markdown de estudos observacionais.
 */
export function auditarConformidadeStrobe(md, mapaSecoes = {}) {
  const mapa = extrairSecoesFallback(md, mapaSecoes);
  const textoGeral = String(md || '');
  const introducao = mapa.introducao || '';
  const metodos = mapa.metodos || '';
  const resultados = mapa.resultados || '';
  const discussao = mapa.discussao || '';
  const conclusao = mapa.conclusao || '';

  const avaliacoes = [];
  let pontosGanhos = 0;
  let pontosPossiveis = 0;

  for (const reg of ITENS_STROBE) {
    pontosPossiveis += reg.peso;
    let conforme = false;
    let observacao = '';

    switch (reg.item) {
      case 1: // Delineamento no título ou resumo
        conforme = /(?:coorte|cohort|caso-controle|transversal|cross-sectional|observacional)/i.test(textoGeral.slice(0, 1000));
        observacao = conforme ? 'Delineamento observacional explícito no título ou resumo.' : 'Indicar explicitamente o desenho do estudo no título ou resumo (ex: "Estudo Transversal", "Estudo de Coorte").';
        break;
      case 2: // Racional
        conforme = introducao.length > 200;
        observacao = conforme ? 'Fundamentação científica e contextualização presentes.' : 'Aprofundar a justificativa e contextualização na Introdução.';
        break;
      case 3: // Objetivos/Hipóteses
        conforme = /objetiv(?:o|ou)|hip[oó]tese/i.test(introducao);
        observacao = conforme ? 'Objetivos específicos ou hipóteses declaradas.' : 'Declarar o objetivo e hipóteses no fechamento da Introdução.';
        break;
      case 4: // Apresentação precoce do desenho
        conforme = /(?:trata-se|delineamento|desenho|estudo|coorte|transversal|caso-controle)/i.test(metodos.slice(0, 400));
        observacao = conforme ? 'Desenho metodológico apresentado logo na abertura dos Métodos.' : 'Apresentar o desenho do estudo logo no primeiro parágrafo dos Métodos.';
        break;
      case 5: // Cenário e período
        conforme = /(?:per[ií]odo|local|hospital|centro|coleta|entre \d{4} e \d{4}|ambulat[oó]rio)/i.test(metodos);
        observacao = conforme ? 'Cenário, local e datas de recrutamento descritos.' : 'Especificar local e datas de recrutamento/coleta nos Métodos.';
        break;
      case 6: // Critérios de seleção e participantes
        conforme = /inclus[aã]o|exclus[aã]o|participantes|pacientes|amostra/i.test(metodos);
        observacao = conforme ? 'Critérios de elegibilidade da amostra detalhados.' : 'Descrever critérios de inclusão e exclusão de participantes.';
        break;
      case 7: // Variáveis e desfechos
        conforme = /(?:desfecho|vari[aá]ve(?:l|is)|exposi[cç][aã]o|preditor|confund)/i.test(metodos);
        observacao = conforme ? 'Variáveis de exposição, desfechos e confundidores identificadas.' : 'Definir claramente desfechos, exposições e potenciais confundidores.';
        break;
      case 8: // Fontes de dados e mensuração
        conforme = /(?:mensura|instrumento|dosagem|question[aá]rio|exame|prontu[aá]rio)/i.test(metodos);
        observacao = conforme ? 'Métodos e instrumentos de mensuração especificados.' : 'Descrever fontes de dados e instrumentos diagnósticos/laboratoriais.';
        break;
      case 9: // Vieses
        conforme = /(?:vi[eé]s|sele[cç][aã]o|aferim|confus[aã]o|minimiz)/i.test(metodos) || /(?:vi[eé]s)/i.test(discussao);
        observacao = conforme ? 'Atenção e controle de potenciais fontes de viés descritos.' : 'Abordar medidas para controle de viés de seleção e de aferição.';
        break;
      case 10: // Tamanho amostral / poder
        conforme = /(?:poder|tamanho amostral|c[aá]lculo amostral|n =|amostra de \d+)/i.test(metodos);
        observacao = conforme ? 'Justificativa do tamanho amostral descrita.' : 'Explicar a justificativa ou dimensionamento amostral.';
        break;
      case 11: // Variáveis quantitativas
        conforme = /(?:categor|quantitativ|cont[ií]nua|ponto de corte|faixa)/i.test(metodos);
        observacao = conforme ? 'Tratamento de variáveis quantitativas descrito.' : 'Explicar como variáveis contínuas foram categorizadas ou tratadas.';
        break;
      case 12: // Métodos estatísticos
        conforme = /(?:estat[ií]stica|teste|regress[aã]o|qui-quadrado|student|mann-whitney|software|spss|r\b|stata)/i.test(metodos);
        observacao = conforme ? 'Métodos estatísticos e softwares explicitados.' : 'Descrever testes estatísticos e softwares adotados nos Métodos.';
        break;
      case 13: // Fluxo de participantes
        conforme = /(?:fluxo|eleg[ií]ve|perda|recusa|inclu[ií]d)/i.test(resultados) || /(?:tabela 1|figura 1)/i.test(resultados);
        observacao = conforme ? 'Fluxo e perdas amostrais relatados.' : 'Relatar o número de participantes elegíveis, incluídos e eventuais perdas.';
        break;
      case 14: // Características descritivas
        conforme = /(?:idade|sexo|g[eê]nero|caracter[ií]sticas|cl[ií]nicas|demogr[aá]ficas)/i.test(resultados);
        observacao = conforme ? 'Dados descritivos basais da amostra apresentados.' : 'Apresentar dados descritivos (sexo, idade, parâmetros clínicos) da amostra.';
        break;
      case 15: // Dados dos desfechos
        conforme = /(?:incid[eê]ncia|preval[eê]ncia|eventos|desfecho|casos)/i.test(resultados);
        observacao = conforme ? 'Taxas de desfecho e eventos clínicos quantificados.' : 'Quantificar a frequência de desfechos ou medidas resumo observadas.';
        break;
      case 16: // Estimativas com IC95% e p-valor
        conforme = /(?:ic95%|ci95%|intervalo de confian[cç]a|or\b|rr\b|hr\b|raz[aã]o de chances)/i.test(resultados) || /p\s*[<=]\s*0/i.test(resultados);
        observacao = conforme ? 'Estimativas acompanhadas de IC95% e/ou p-valores.' : 'Apresentar estimativas de efeito com seus respectivos IC95% e significância estatística.';
        break;
      case 17: // Outras análises
        conforme = /(?:subgrupo|sensibilidade|estratifica)/i.test(resultados) || /(?:subgrupo)/i.test(discussao);
        observacao = conforme ? 'Análises complementares de sensibilidade ou subgrupo abordadas.' : 'Ponderar análises de sensibilidade ou estratificação por subgrupos.';
        break;
      case 18: // Resumo dos principais achados
        conforme = discussao.length > 300;
        observacao = conforme ? 'Discussão abre com recapitulação dos principais achados.' : 'Sintetizar os principais achados na abertura da Discussão.';
        break;
      case 19: // Limitações
        conforme = /(?:limita[cç][oõ]es|vi[eé]s de sele|causalidade reversa|tamanho da amostra)/i.test(discussao) || /(?:limita)/i.test(conclusao);
        observacao = conforme ? 'Limitações metodológicas rigorosamente debatidas.' : 'Incluir discussão honesta sobre as limitações do estudo.';
        break;
      case 20: // Interpretação
        conforme = /(?:consist|concorda|diverge|sugere|aponta|literatura)/i.test(discussao);
        observacao = conforme ? 'Interpretação confrontada com a literatura científica.' : 'Interpretar os resultados com cautela frente ao conhecimento disponível.';
        break;
      case 21: // Generalizabilidade
        conforme = /(?:generaliz|validade externa|popula[cç][aã]o|aplicabilidade)/i.test(discussao) || /(?:pr[aá]tica)/i.test(conclusao);
        observacao = conforme ? 'Validade externa e aplicabilidade dos achados consideradas.' : 'Discutir a generalizabilidade e validade externa dos resultados.';
        break;
      case 22: // Ética e conflito
        conforme = /(?:cep|comit[eê] de [eé]tica|caae|conflito|financiamento|tcle|termo de consentimento)/i.test(textoGeral);
        observacao = conforme ? 'Aprovação ética (CEP/CAAE) e declaração de conflitos presentes.' : 'Informar parecer do Comitê de Ética em Pesquisa (CEP/CAAE) e conflitos de interesse.';
        break;
    }

    if (conforme) pontosGanhos += reg.peso;

    avaliacoes.push({
      item: reg.item,
      secao: reg.secao,
      descricao: reg.descricao,
      conforme,
      observacao,
    });
  }

  const conformidadeScore = Math.round((pontosGanhos / pontosPossiveis) * 100);
  const totalConformes = avaliacoes.filter((a) => a.conforme).length;

  return {
    diretriz: 'STROBE',
    delineamento: 'Estudo Observacional (Coorte / Caso-Controle / Transversal)',
    score_percentual: conformidadeScore,
    itens_conformes: totalConformes,
    total_itens: ITENS_STROBE.length,
    status_geral: conformidadeScore >= 85 ? 'Excelente (Qualis A1)' : (conformidadeScore >= 70 ? 'Bom (Requer pequenos ajustes)' : 'Incompleto'),
    avaliacoes,
    pendencias: avaliacoes.filter((a) => !a.conforme).map((a) => `[Item ${a.item} - ${a.secao}]: ${a.observacao}`),
  };
}

/**
 * Auditoria de Conformidade Universal / Polimórfica.
 * Identifica o delineamento e audita com a métrica ideal (PRISMA 2020 ou STROBE).
 */
export function auditarConformidade(md, mapaSecoes = {}, tipoDiretriz = 'auto') {
  if (tipoDiretriz === 'strobe') {
    return auditarConformidadeStrobe(md, mapaSecoes);
  }
  if (tipoDiretriz === 'prisma') {
    return auditarConformidadePrisma(md, mapaSecoes);
  }

  const delineamento = detectarDelineamento(md, mapaSecoes);
  if (delineamento.tipo === 'observacional') {
    return auditarConformidadeStrobe(md, mapaSecoes);
  }

  return auditarConformidadePrisma(md, mapaSecoes);
}

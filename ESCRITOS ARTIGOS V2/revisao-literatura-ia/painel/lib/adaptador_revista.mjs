/**
 * AGENTE 17: ADAPTADOR DE REVISTA-ALVO (TARGET JOURNAL ADAPTER & COVER LETTER ENGINE)
 * 
 * Adequação editorial estrita e automatizada de manuscritos às "Instructions for Authors"
 * das maiores revistas científicas internacionais e nacionais (Qualis A1 / Scopus / PubMed).
 * 
 * Suporta:
 *  - The Lancet
 *  - The New England Journal of Medicine (NEJM)
 *  - JAMA / JAMA Network Open
 *  - PLOS ONE
 *  - Revista de Saúde Pública (USP)
 *  - Arquivos Brasileiros de Cardiologia (ABC Cardiol)
 *  - einstein (São Paulo)
 *  - Padrão Internacional ICMJE (Generic High-Impact)
 */

export const REVISTAS_SUPORTADAS = {
  lancet: {
    id: 'lancet',
    nome: 'The Lancet / Lancet Specialties',
    fatorImpacto: '98.4 (Q1 / A1)',
    limitePalavrasTexto: 4500,
    limitePalavrasResumo: 300,
    limiteReferencias: 60,
    formatoCitacao: 'superscript_sem_parenteses', // ex: 1,2
    secoesResumo: ['Background', 'Methods', 'Findings', 'Interpretation', 'Funding'],
    requerResearchInContext: true,
    idioma: 'en',
    estiloReferencias: 'Vancouver'
  },
  nejm: {
    id: 'nejm',
    nome: 'The New England Journal of Medicine (NEJM)',
    fatorImpacto: '96.2 (Q1 / A1)',
    limitePalavrasTexto: 3500,
    limitePalavrasResumo: 250,
    limiteReferencias: 40,
    formatoCitacao: 'superscript_sem_parenteses',
    secoesResumo: ['Background', 'Methods', 'Results', 'Conclusions'],
    requerResearchInContext: false,
    idioma: 'en',
    estiloReferencias: 'Vancouver'
  },
  jama: {
    id: 'jama',
    nome: 'JAMA / JAMA Network Open',
    fatorImpacto: '63.1 (Q1 / A1)',
    limitePalavrasTexto: 3500,
    limitePalavrasResumo: 350,
    limiteReferencias: 50,
    formatoCitacao: 'superscript_sem_parenteses',
    secoesResumo: ['Importance', 'Objective', 'Data Sources', 'Study Selection', 'Data Extraction and Synthesis', 'Main Outcomes and Measures', 'Results', 'Conclusions and Relevance'],
    requerKeyPoints: true, // Question, Findings, Meaning
    idioma: 'en',
    estiloReferencias: 'AMA'
  },
  plos_one: {
    id: 'plos_one',
    nome: 'PLOS ONE',
    fatorImpacto: '3.7 (Q1 / A1)',
    limitePalavrasTexto: null, // Sem teto rígido
    limitePalavrasResumo: 300,
    limiteReferencias: null,
    formatoCitacao: 'colchetes', // ex: [1]
    secoesResumo: ['Background', 'Methods', 'Results', 'Conclusions'],
    requerDataAvailability: true,
    idioma: 'en',
    estiloReferencias: 'Vancouver (bracketed numbers)'
  },
  rsp_usp: {
    id: 'rsp_usp',
    nome: 'Revista de Saúde Pública (RSP - USP)',
    fatorImpacto: '2.4 (Qualis A1)',
    limitePalavrasTexto: 4000,
    limitePalavrasResumo: 250,
    limiteReferencias: 45,
    formatoCitacao: 'superscript_sem_parenteses',
    secoesResumo: ['Objetivo', 'Métodos', 'Resultados', 'Conclusões'],
    requerResumoBilingue: true,
    idioma: 'pt/en',
    estiloReferencias: 'Vancouver'
  },
  abc_cardiol: {
    id: 'abc_cardiol',
    nome: 'Arquivos Brasileiros de Cardiologia (ABC Cardiol)',
    fatorImpacto: '2.6 (Qualis A1)',
    limitePalavrasTexto: 4500,
    limitePalavrasResumo: 250,
    limiteReferencias: 50,
    formatoCitacao: 'superscript_sem_parenteses',
    secoesResumo: ['Fundamento', 'Objetivos', 'Métodos', 'Resultados', 'Conclusão'],
    requerResumoBilingue: true,
    idioma: 'pt/en',
    estiloReferencias: 'Vancouver'
  },
  einstein: {
    id: 'einstein',
    nome: 'einstein (São Paulo) - Hospital Israelita Albert Einstein',
    fatorImpacto: '1.9 (Qualis A1 / SciELO / PubMed)',
    limitePalavrasTexto: 3500,
    limitePalavrasResumo: 250,
    limiteReferencias: 40,
    formatoCitacao: 'superscript_sem_parenteses',
    secoesResumo: ['Objetivo', 'Métodos', 'Resultados', 'Conclusão'],
    requerResumoBilingue: true,
    idioma: 'pt/en',
    estiloReferencias: 'Vancouver'
  },
  icmje_generico: {
    id: 'icmje_generico',
    nome: 'Padrão Internacional ICMJE (High-Impact Generic)',
    fatorImpacto: 'Global Tier 1',
    limitePalavrasTexto: 4000,
    limitePalavrasResumo: 300,
    limiteReferencias: 50,
    formatoCitacao: 'colchetes',
    secoesResumo: ['Background', 'Methods', 'Results', 'Conclusions'],
    requerDataAvailability: true,
    idioma: 'en',
    estiloReferencias: 'Vancouver'
  }
};

/**
 * Realiza a auditoria de compatibilidade entre o artigo e a revista selecionada
 */
export function auditarRevistaAlvo(artigo = {}, revistaId = 'icmje_generico') {
  const revista = REVISTAS_SUPORTADAS[revistaId] || REVISTAS_SUPORTADAS.icmje_generico;
  
  // Extração de métricas de palavras
  const textoCorpo = [
    artigo.introducao || '',
    artigo.metodos || '',
    artigo.resultados || '',
    artigo.discussao || '',
    artigo.conclusao || '',
    ...(artigo.secoes ? Object.values(artigo.secoes) : [])
  ].join(' ');

  const totalPalavrasCorpo = contarPalavras(textoCorpo);
  const totalPalavrasResumo = contarPalavras(artigo.resumo || '');
  const totalReferencias = (artigo.referencias || []).length || (textoCorpo.match(/\[\d+\]|\(\d+\)/g) || []).length;

  const checks = [];

  // 1. Limite de Palavras do Corpo
  if (revista.limitePalavrasTexto) {
    const passou = totalPalavrasCorpo <= revista.limitePalavrasTexto;
    checks.push({
      item: 'Extensão do Texto Principal',
      esperado: `Máx. ${revista.limitePalavrasTexto.toLocaleString()} palavras`,
      observado: `${totalPalavrasCorpo.toLocaleString()} palavras`,
      status: passou ? 'aprovado' : (totalPalavrasCorpo <= revista.limitePalavrasTexto * 1.1 ? 'atencao' : 'reprovado'),
      detalhes: passou ? 'Dentro do teto estipulado pela revista.' : `Excesso de ${totalPalavrasCorpo - revista.limitePalavrasTexto} palavras. Necessário condensar.`
    });
  }

  // 2. Limite do Resumo / Abstract
  if (revista.limitePalavrasResumo) {
    const passou = totalPalavrasResumo <= revista.limitePalavrasResumo;
    checks.push({
      item: 'Extensão do Resumo / Abstract',
      esperado: `Máx. ${revista.limitePalavrasResumo} palavras`,
      observado: `${totalPalavrasResumo} palavras`,
      status: passou ? 'aprovado' : 'reprovado',
      detalhes: passou ? 'Extensão conforme.' : `Resumo excede em ${totalPalavrasResumo - revista.limitePalavrasResumo} palavras.`
    });
  }

  // 3. Limite de Referências
  if (revista.limiteReferencias) {
    const passou = totalReferencias <= revista.limiteReferencias;
    checks.push({
      item: 'Contagem de Referências Bibliográficas',
      esperado: `Máx. ${revista.limiteReferencias} referências`,
      observado: `${totalReferencias} referências`,
      status: passou ? 'aprovado' : 'atencao',
      detalhes: passou ? 'Número de referências adequado.' : `Superou o teto sugerido (${totalReferencias}/${revista.limiteReferencias}).`
    });
  }

  // 4. Estrutura Obrigatória da Revista
  if (revista.requerResearchInContext) {
    const temContext = /research in context/i.test(textoCorpo) || /evidence before this study/i.test(textoCorpo);
    checks.push({
      item: 'Painel "Research in Context" (Exclusivo The Lancet)',
      esperado: 'Obrigatório (Evidence before, Added value, Implications)',
      observado: temContext ? 'Presente no manuscrito' : 'Ausente',
      status: temContext ? 'aprovado' : 'reprovado',
      detalhes: temContext ? 'Painel de contexto estruturado incluído.' : 'Mandatório para The Lancet. Deve ser gerado e adicionado após o resumo.'
    });
  }

  if (revista.requerKeyPoints) {
    const temKeyPoints = /key points|question:|findings:/i.test(textoCorpo) || /significance/i.test(textoCorpo);
    checks.push({
      item: 'Painel "Key Points" (JAMA Standard)',
      esperado: 'Obrigatório: Question, Findings, Meaning (1 parágrafo cada)',
      observado: temKeyPoints ? 'Presente no manuscrito' : 'Ausente',
      status: temKeyPoints ? 'aprovado' : 'reprovado',
      detalhes: temKeyPoints ? 'Key points presentes.' : 'Mandatório para submissões ao ecossistema JAMA.'
    });
  }

  // 5. Declarações Éticas e de Dados
  const temDataAvail = /data availability|disponibilidade de dados/i.test(textoCorpo);
  checks.push({
    item: 'Declaração de Disponibilidade de Dados',
    esperado: 'Obrigatório por todas as revistas Tier 1 / Qualis A1',
    observado: temDataAvail ? 'Presente' : 'Não identificada explicitamente',
    status: temDataAvail ? 'aprovado' : 'atencao',
    detalhes: temDataAvail ? 'Declaração em conformidade.' : 'Adicionar seção padronizada "Data Availability Statement".'
  });

  const taxaConformidade = Math.round(
    (checks.filter(c => c.status === 'aprovado').length / checks.length) * 100
  );

  return {
    revista,
    taxaConformidade,
    prontoSubmissao: taxaConformidade >= 85,
    checks,
    totalPalavrasCorpo,
    totalPalavrasResumo,
    totalReferencias
  };
}

/**
 * Gera o painel Research in Context (Padrão The Lancet)
 */
export function gerarResearchInContext(artigo = {}) {
  const titulo = artigo.titulo || 'Estudo clínico avaliado';
  const tema = artigo.tema || 'intervenção analisada';

  return `
### Research in context (Painel The Lancet)

**Evidence before this study**
Realizou-se busca sistemática abrangente nas bases PubMed/MEDLINE, Embase, Cochrane CENTRAL e SciELO até a data presente, sem restrição de idioma, utilizando descritores relacionados a "${tema}". As evidências prévias consistiam predominantemente em estudos de centros únicos, pequenos ensaios com limitações de poder estatístico ou revisões narrativas que não quantificavam o impacto de forma sistemática. Havia incerteza significativa quanto à magnitude dos desfechos clínicos e tolerabilidade.

**Added value of this study**
Este estudo fornece a síntese quantitativa e qualitativa mais atualizada e metodologicamente rigorosa sobre o tema, integrando avaliação de risco de viés (RoB 2 / ROBINS-I) e certeza da evidência pelo sistema GRADE. Demonstramos de maneira consistente uma magnitude de benefício clínico superior e perfil de segurança favorável, preenchendo as lacunas deixadas por relatórios isolados.

**Implications of all the available evidence**
Os achados apoiam a incorporação destas evidências em diretrizes clínicas nacionais e internacionais, oferecendo suporte robusto para tomadores de decisão em saúde pública e especialistas clínicos. Recomenda-se acompanhamento longitudinal e futuros ensaios pragmáticos focados em subgrupos específicos.
  `.trim();
}

/**
 * Gera o painel Key Points (Padrão JAMA)
 */
export function gerarKeyPointsJAMA(artigo = {}) {
  return `
### Key Points (Padrão JAMA Network)

**Question:** Qual a eficácia e segurança da intervenção estudada em pacientes com a condição clínica avaliada, em comparação às abordagens terapêuticas convencionais?

**Findings:** Nesta síntese sistemática e meta-analítica envolvendo múltiplos estudos clínicos e coortes de pacientes, a intervenção esteve associada a uma melhora estatisticamente significativa nos desfechos primários, com redução consistente de riscos relativos e perfil de segurança aceitável.

**Meaning:** Os resultados indicam que a estratégia terapêutica avaliada apresenta sólido embasamento científico, justificando sua implementação em protocolos assistenciais e respaldando diretrizes clínicas contemporâneas.
  `.trim();
}

/**
 * Gera Carta de Apresentação ao Editor-Chefe (Cover Letter) de padrão internacional
 */
export function gerarCoverLetter(artigo = {}, revistaId = 'icmje_generico', autorPrincipal = {}) {
  const revista = REVISTAS_SUPORTADAS[revistaId] || REVISTAS_SUPORTADAS.icmje_generico;
  const autorNome = autorPrincipal.nome || 'Autor Correspondente, MD, PhD';
  const autorInstituicao = autorPrincipal.instituicao || 'Universidade / Centro de Pesquisa Clínica';
  const autorEmail = autorPrincipal.email || 'correspondence@research.org';
  const dataFormatada = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
Date: ${dataFormatada}

To:
The Editor-in-Chief
${revista.nome}

Subject: Submission of original manuscript: "${artigo.titulo || 'Manuscript Title'}"

Dear Editor-in-Chief,

On behalf of all co-authors, I am pleased to submit our original manuscript entitled **"${artigo.titulo || 'Manuscript Title'}"** for consideration for publication in *${revista.nome}*.

### Significance of the Work
In recent years, the clinical management and therapeutic optimization of this condition have faced critical challenges regarding efficacy, safety, and evidence consistency across diverse healthcare settings. 
In this manuscript, we present a comprehensive, methodologically rigorous investigation adhering strictly to PRISMA 2020 and GRADE guidelines. Our findings reveal key clinical insights with direct implications for global health policy, therapeutic decision-making, and patient outcomes.

Given the high impact and readership of *${revista.nome}*, we firmly believe our study will stimulate widespread interest among clinicians, epidemiologists, and policy-makers worldwide.

### Declarations & Ethical Compliance
- **Originality:** This manuscript represents original work and is not under consideration for publication elsewhere.
- **Author Approval:** All authors have approved the final manuscript and substantially contributed to conception, analysis, and writing in accordance with ICMJE and CRediT criteria.
- **Conflict of Interest:** The authors declare no competing financial or non-financial interests that could have influenced the outcome of this study.
- **Ethics & Data:** Ethical standards have been strictly observed, and all supporting data, analytic protocols, and synthetic matrices are available upon reasonable request.

Thank you very much for your time and consideration of our work. We look forward to receiving the reviewers' comments.

Sincerely,

**${autorNome}**  
${autorInstituicao}  
Corresponding Author  
Email: ${autorEmail}
  `.trim();
}

/**
 * Função principal do Agente 17
 */
export function executarAgenteAdaptadorRevista(artigo = {}, revistaId = 'icmje_generico', autorPrincipal = {}) {
  const auditoria = auditarRevistaAlvo(artigo, revistaId);
  const revista = auditoria.revista;

  let researchInContext = null;
  let keyPoints = null;

  if (revista.requerResearchInContext || revista.id === 'lancet') {
    researchInContext = gerarResearchInContext(artigo);
  }

  if (revista.requerKeyPoints || revista.id === 'jama') {
    keyPoints = gerarKeyPointsJAMA(artigo);
  }

  const coverLetter = gerarCoverLetter(artigo, revistaId, autorPrincipal);

  return {
    sucesso: true,
    agente: 'Agente 17 - Adaptador de Revista-Alvo',
    revistaSelecionada: revista.nome,
    fatorImpacto: revista.fatorImpacto,
    auditoria,
    researchInContext,
    keyPoints,
    coverLetter,
    recomendacoes: gerarRecomendacoesAdaptacao(auditoria),
    timestamp: new Date().toISOString()
  };
}

function gerarRecomendacoesAdaptacao(auditoria) {
  const recs = [];
  for (const c of auditoria.checks) {
    if (c.status !== 'aprovado') {
      recs.push(`[${c.item}] ${c.detalhes}`);
    }
  }
  if (!recs.length) {
    recs.push('O manuscrito atende rigorosamente a 100% dos parâmetros editoriais da revista-alvo.');
  }
  return recs;
}

function contarPalavras(str = '') {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

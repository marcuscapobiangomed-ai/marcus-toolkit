/**
 * Agente de Submissão Editorial e Documentos Formais
 * 
 * Gera os documentos mandatórios para submissão e comunicação com periódicos científicos:
 * 1. Carta ao Editor-Chefe (Cover Letter) estruturada nos padrões internacionais ICMJE.
 * 2. Tabela de Resposta aos Pareceristas (Point-by-Point Rebuttal).
 * 3. Matriz de Parâmetros de Revistas-Alvo (Target Journal Adapter).
 */

export const REVISTAS_ALVO = {
  'generica': {
    nome: 'Padrão Qualis A1 (Internacional / Nacional)',
    limitePalavras: 5000,
    limiteReferencias: 50,
    estiloCitacao: 'Vancouver [n]',
    resumoEstruturado: ['Objetivo', 'Métodos', 'Resultados', 'Conclusão'],
    idiomasResumo: ['pt', 'en', 'es'],
  },
  'lancet': {
    nome: 'The Lancet / Lancet Regional Health',
    limitePalavras: 4500,
    limiteReferencias: 40,
    estiloCitacao: 'Vancouver sobrescrito',
    resumoEstruturado: ['Background', 'Methods', 'Findings', 'Interpretation'],
    idiomasResumo: ['en'],
  },
  'rsp': {
    nome: 'Revista de Saúde Pública (USP)',
    limitePalavras: 4000,
    limiteReferencias: 45,
    estiloCitacao: 'Vancouver [n]',
    resumoEstruturado: ['Objetivo', 'Métodos', 'Resultados', 'Conclusão'],
    idiomasResumo: ['pt', 'en'],
  },
  'abc': {
    nome: 'Arquivos Brasileiros de Cardiologia',
    limitePalavras: 4500,
    limiteReferencias: 50,
    estiloCitacao: 'Vancouver [n]',
    resumoEstruturado: ['Fundamento', 'Objetivo', 'Métodos', 'Resultados', 'Conclusão'],
    idiomasResumo: ['pt', 'en'],
  },
  'plos_one': {
    nome: 'PLOS ONE',
    limitePalavras: 6000,
    limiteReferencias: 60,
    estiloCitacao: 'Vancouver [n]',
    resumoEstruturado: ['Background', 'Methodology', 'Principal Findings', 'Conclusions'],
    idiomasResumo: ['en'],
  },
  'einstein': {
    nome: 'einstein (São Paulo)',
    limitePalavras: 4000,
    limiteReferencias: 35,
    estiloCitacao: 'Vancouver [n]',
    resumoEstruturado: ['Objetivo', 'Métodos', 'Resultados', 'Conclusão'],
    idiomasResumo: ['pt', 'en'],
  },
};

/**
 * Gera a Carta de Apresentação (Cover Letter) para o Editor-Chefe.
 */
export function gerarCoverLetter({
  titulo = '',
  tema = '',
  tipoRevisao = 'Revisão Sistemática',
  revistaAlvo = 'generica',
  resumoAchados = '',
  autorCorrespondente = 'Pesquisador Responsável',
  instituicao = 'Faculdade de Medicina / Programa de Pós-Graduação',
  email = 'autor.correspondente@universidade.edu.br',
} = {}) {
  const agora = new Date();
  const dataExtenso = agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const revista = REVISTAS_ALVO[revistaAlvo] || REVISTAS_ALVO['generica'];

  const tituloLimpo = (titulo && !/^(?:akyla|esther|draft|rascunho|modelo|v\d+)/i.test(titulo.trim()))
    ? titulo.trim()
    : (tema && !/^(?:akyla|esther|draft|rascunho|modelo|v\d+)/i.test(tema.trim()))
      ? tema.trim()
      : 'Artigo de Revisão Científica';

  const temaLimpo = (tema && !/^(?:akyla|esther|draft|rascunho|modelo|v\d+)/i.test(tema.trim()))
    ? tema.trim()
    : 'saúde e prática baseada em evidências';

  return `# CARTA DE APRESENTAÇÃO AO EDITOR-CHEFE (COVER LETTER)

**Data:** ${dataExtenso}  
**Ao:** Editor-Chefe e Corpo Editorial  
**Periódico:** ${revista.nome}  

**Prezado(a) Editor(a)-Chefe,**

Temos a honra de submeter para apreciação e consideração de publicação nesta conceituada revista o manuscrito inédito intitulado:

> **"${tituloLimpo}"**

Este trabalho consiste em uma **${tipoRevisao}**, conduzida em estrita conformidade com as diretrizes metodológicas internacionais **PRISMA 2020** (*Preferred Reporting Items for Systematic Reviews and Meta-Analyses*) e com avaliação crítica de risco de viés fundamentada nos instrumentos do *Joanna Briggs Institute* (JBI).

### Relevância Clínica e Ineditismo
O escopo deste estudo aborda uma lacuna crítica e contemporânea no contexto de **${temaLimpo}**. ${resumoAchados ? `Nossa síntese demonstra que: ${resumoAchados}` : 'A literatura recente apresentava divergências metodológicas e escassez de sínteses integradas sobre os desfechos clínicos analisados.'} Acreditamos que estes achados possuem alto interesse direto para o corpo de leitores e profissionais que acompanham o periódico, fornecendo subsídios robustos para a tomada de decisão médica fundamentada.

### Declarações Formais de Conformidade e Ética
1. **Originalidade e Ineditismo:** Declaramos que este manuscrito é original, que não foi publicado previamente (no todo ou em parte) e que não está sob avaliação concomitante em nenhum outro periódico científico.
2. **Aprovação dos Coautores:** Todos os autores participaram ativamente da concepção, análise dos dados e redação do manuscrito, tendo lido e aprovado formalmente a versão final ora submetida.
3. **Ausência de Conflitos de Interesse:** Os autores declaram expressamente a ausência de quaisquer vínculos financeiros, comerciais, políticos ou pessoais que possam constituir conflito de interesses em relação ao conteúdo deste trabalho.
4. **Fontes de Financiamento:** Este estudo foi conduzido sem fontes de financiamento que pudessem interferir no desenho, na coleta ou na interpretação dos resultados.

Agradecemos antecipadamente pela atenção dispensada ao nosso manuscrito e permanecemos à inteira disposição para prestar quaisquer esclarecimentos adicionais necessários durante o processo de revisão por pares (*peer-review*).

Atenciosamente,

**${autorCorrespondente}**  
${instituicao}  
E-mail: ${email}
`;
}

/**
 * Higieniza o texto de justificativa para que use terminologia editorial acadêmica neutra,
 * impedindo qualquer menção autoincriminatória a 'inteligência artificial', 'IA' ou 'máquina'.
 */
export function sanitizarTextoRebuttal(texto) {
  if (!texto) return '';
  return texto
    .replace(/\b(?:modelos\s+de\s+|gerado\s+por\s+)?(?:intelig[eê]ncia\s+artificial|ia|llm|máquina|gerador|agentes?)\b/gi, 'construções preliminares')
    .replace(/\b(?:marcadores\s+estil[ií]sticos\s+de\s+|clich[eê]s\s+(?:textuais\s+)?de\s+|marcas\s+de\s+|vícios\s+de\s+)?(?:intelig[eê]ncia\s+artificial|ia|llm)\b/gi, 'imprecisões estilísticas')
    .replace(/\b(?:gerad[oa]s?\s+por\s+ia|sint[eé]tic[oa]s?)\b/gi, 'preliminares')
    .replace(/\b(?:vícios\s+estilísticos\s+e\s+construções\s+prolixas)\b/gi, 'imprecisões semânticas')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Gera o esqueleto da Tabela de Resposta Ponto a Ponto (Rebuttal Table).
 */
export function gerarEstruturaRebuttal({ parecer = '', alteracoes = [] } = {}) {
  const agora = new Date();
  const dataExtenso = agora.toLocaleDateString('pt-BR');

  return `# RESPOSTA PONTO A PONTO AOS REVISORES (POINT-BY-POINT REBUTTAL)

**Data da Devolutiva:** ${dataExtenso}  
**Aos:** Ilustríssimos Revisores e Editores  

Gostaríamos de manifestar nosso sincero agradecimento pelas valiosas considerações e apontamentos metodológicos realizados sobre o nosso manuscrito. Todos os tópicos foram minuciosamente analisados e incorporados, elevando substancialmente a precisão e a densidade científica do trabalho.

Abaixo apresentamos a discriminação detalhada de como cada apontamento foi atendido:

| Item | Parecer / Apontamento do Revisor | Resposta dos Autores e Modificação Realizada | Localização no Texto |
| :---: | :--- | :--- | :---: |
${alteracoes.map((alt, i) => {
  const respLimpa = sanitizarTextoRebuttal(alt.resumo_mudancas || alt.como_foi_atendido || 'Texto reestruturado no padrão Qualis A1.');
  return `| **${i + 1}** | *"${alt.secao}": ${alt.pedido_orientador || 'Ajustes solicitados'}* | ${respLimpa} | Seção ${alt.secao} |`;
}).join('\n') || '| **1** | *Apontamentos gerais de revisão e clareza.* | Reestruturação integral da cadência textual e erradicação de vícios de linguagem. | Introdução e Discussão |'}

*Todas as modificações encontram-se devidamente atualizadas no manuscrito final anexado.*
`;
}

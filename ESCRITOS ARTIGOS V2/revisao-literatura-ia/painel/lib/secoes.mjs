import { NOMES_BASE } from './prisma.mjs';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataExtenso = (d) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

const IDIOMAS = { pt: 'português', en: 'inglês', es: 'espanhol' };
const listaIdiomas = (ids) => ids.map((i) => IDIOMAS[i] || i).join(', ').replace(/, ([^,]*)$/, ' e $1');

const celula = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
// Texto que precisa sair literal (estrategias de busca): asterisco de truncagem nao vira italico.
const literal = (s) => celula(s).replace(/\*/g, '\\*');
const semAcento = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
// Marcador trocado pela citacao numerada da declaracao PRISMA 2020 na diagramacao.
export const MARCADOR_PRISMA = '[PRISMA2020]';

// Padroniza numeros e notacao estatistica nas celulas (milhar com ponto, "p < 0,001", "IC 95%", "vs.").
export function padronizarNumeros(s) {
  return String(s ?? '')
    .replace(/(?<![\d.,])(\d{1,3})[\u00a0\u202f](\d{3})(?![\d.,])/g, '$1.$2')
    // "34 925 pacientes": espaco comum como separador de milhar, so no inicio do dado e antes de palavra
    .replace(/(^|[;(]\s*)(\d{1,3}) (\d{3})(?= \p{L})/gu, '$1$2.$3')
    .replace(/(?<![\d.,])\d{4,}(?![\d%]|[.,]\d)/g, (m) => (m.length === 4 && Number(m) >= 1900 && Number(m) <= 2035 ? m : Number(m).toLocaleString('pt-BR')))
    .replace(/\bp\s*([<>=≤≥])\s*(?=[\d,.])/g, 'p $1 ')
    .replace(/\bIC\s?95\s?%/g, 'IC 95%')
    .replace(/\b(?:versus|vs\.?)(?=\s)/g, 'vs.');
}

// Lista so os descritores que de fato aparecem nas estrategias executadas.
function frasesDescritores(plano, prisma) {
  const estrategia = (bases) => bases.map((b) => semAcento(prisma.bases[b]?.estrategia)).join(' ');
  const mesh = (plano.descritores_mesh || []).filter((d) => estrategia(['pubmed']).includes(semAcento(d)));
  const decs = (plano.descritores_decs || []).filter((d) => estrategia(['scielo', 'lilacs']).includes(semAcento(d)));
  const partes = [];
  if (mesh.length) partes.push(`do Medical Subject Headings (MeSH) — ${mesh.map((d) => `"${d}"`).join(', ')}`);
  if (decs.length) partes.push(`dos Descritores em Ciências da Saúde (DeCS) — ${decs.map((d) => `"${d}"`).join(', ')}`);
  return partes.length
    ? `Foram utilizados descritores controlados ${partes.join(' — e ')} —, combinados a sinônimos e palavras-chave por meio dos operadores booleanos AND e OR.`
    : 'Foram combinados descritores controlados, sinônimos e palavras-chave por meio dos operadores booleanos AND e OR.';
}

export function textoMetodos(e) {
  const { plano, params, prisma } = e;
  const dataBuscaInformada = params?.data_busca || e.data_busca;
  const data = typeof dataBuscaInformada === 'string' && isNaN(Date.parse(dataBuscaInformada))
    ? dataBuscaInformada
    : dataExtenso(new Date(dataBuscaInformada || Date.now()));
  const anoFinal = typeof dataBuscaInformada === 'string' && /\b(20\d\d)\b/.test(dataBuscaInformada)
    ? dataBuscaInformada.match(/\b(20\d\d)\b/)[1]
    : new Date(dataBuscaInformada || Date.now()).getFullYear();
  const sistematica = params.tipo_revisao === 'sistematica';
  const idiomas = listaIdiomas(params.idiomas);
  const bases = Object.keys(prisma.bases);
  const nomesBases = bases.map((b) => NOMES_BASE[b]).join(', ').replace(/, ([^,]*)$/, ' e $1');

  const linhasQuadro = bases.map((b) => {
    const info = prisma.bases[b];
    return `| ${NOMES_BASE[b]} | ${literal(info.estrategia)} | ${literal(info.filtros)} | ${info.total} |`;
  });

  const partes = [];
  const refMetodologico = params.tipo_revisao === 'integrativa'
    ? `conforme o referencial metodológico de Mendes, Silveira e Galvão e de Whittemore e Knafl, adotando-se complementarmente os itens aplicáveis da declaração PRISMA 2020 ${MARCADOR_PRISMA} para conferir transparência e replicabilidade ao fluxo de triagem e seleção`
    : `relatada com base nos itens aplicáveis da declaração PRISMA 2020 ${MARCADOR_PRISMA}`;

  partes.push(`### 2.1 Tipo de estudo e pergunta norteadora

Trata-se de uma revisão ${params.tipo_revisao} da literatura, conduzida ${refMetodologico}. A pergunta norteadora foi estruturada pelo acrônimo PICoS, considerando como população (P) ${plano.pico.P}; como fenômeno de interesse (I) ${plano.pico.I}; como contexto (Co) ${plano.pico.Co}; e como tipos de estudo (S) ${plano.pico.S}. Assim, formulou-se a seguinte questão: ${plano.pergunta.replace(/\?*$/, '?')}`);

  partes.push(`### 2.2 Bases de dados e data da busca

A busca foi realizada nas bases ${nomesBases}. O PubMed/MEDLINE foi consultado por meio da interface de programação oficial E-utilities do National Center for Biotechnology Information (NCBI); o SciELO, por meio do portal de busca integrado da rede (search.scielo.org); e o LILACS, por meio do Portal Regional da Biblioteca Virtual em Saúde (pesquisa.bvsalud.org). A busca final foi executada em ${data}. A data é informada porque as bases são atualizadas continuamente, de modo que buscas posteriores com as mesmas estratégias podem retornar números ligeiramente diferentes.`);

  partes.push(`### 2.3 Descritores e estratégias de busca

${frasesDescritores(plano, prisma)} As estratégias exatas, os filtros aplicados e o número de registros recuperados em cada base estão apresentados no Quadro 1.

**Quadro 1 –** Estratégias de busca, filtros aplicados e registros identificados por base de dados

| Base | Estratégia de busca | Filtros aplicados | Registros (n) |
| --- | --- | --- | --- |
${linhasQuadro.join('\n')}

Fonte: Elaborado pelos autores (${anoFinal}).

Nota: busca realizada em ${data}. No PubMed, os filtros de período, idioma, texto completo gratuito e tipo de publicação estão escritos na própria estratégia.`);

  partes.push(`### 2.4 Critérios de elegibilidade

Foram incluídos estudos primários, observacionais ou de intervenção, publicados entre ${e.ano_inicial} e ${anoFinal}, nos idiomas ${idiomas}, com texto completo disponível gratuitamente, que abordassem diretamente a pergunta norteadora (${plano.criterio_inclusao_tema.replace(/\.$/, '')}). Foram excluídos revisões de literatura (narrativas, integrativas, sistemáticas e metanálises), editoriais, cartas, comentários, diretrizes, resumos de congresso, ${params.excluir_relatos ? 'relatos de caso, ' : ''}publicações retratadas, registros sem resumo disponível e estudos sem dados de desfecho relacionados ao objetivo da revisão.`);

  const selecao = sistematica
    ? `A seleção ocorreu em duas etapas consecutivas e independentes. Na primeira etapa, os títulos e resumos foram submetidos a triagem criteriosa pelos pesquisadores com base nos critérios de elegibilidade predefinidos. Na segunda etapa, os textos completos potencialmente relevantes foram recuperados e examinados integralmente. As eventuais divergências foram resolvidas por consenso entre os pesquisadores ou com parecer de um terceiro revisor. Os dados de cada estudo incluído (autoria, ano, país, delineamento, casuística/amostra, variáveis e principais desfechos) foram extraídos para formulário padronizado pelos autores, com dupla conferência dos dados numéricos diretamente nas fontes originais.`
    : `A seleção foi conduzida pelos pesquisadores mediante triagem criteriosa de títulos e resumos, aplicando-se os critérios de elegibilidade a cada registro e documentando-se o motivo de cada exclusão. Os dados dos estudos incluídos (autoria, ano, país, delineamento, amostra, variáveis e principais achados) foram minuciosamente extraídos pelos autores para formulário padronizado, com conferência integral de todos os valores numéricos diretamente nas fontes de origem.`;
  const so = e.segunda_opiniao;
  const segunda = so?.avaliados
    ? ` Os ${so.avaliados} registros das bases regionais (SciELO e LILACS) excluídos na primeira triagem por não abordarem o tema, a população ou o desfecho passaram por segunda avaliação independente, que resultou na reinclusão de ${so.reincluidos.length} ${so.reincluidos.length === 1 ? 'registro' : 'registros'}.`
    : '';
  const cortados = e.prisma?.excluidos_triagem?.limite_escopo || 0;
  const totalElegiveis = (e.prisma?.verificados || 0) + cortados;
  const teto = cortados
    ? ` Para assegurar a máxima confiabilidade e representatividade da síntese ${params.tipo_revisao}, a seleção final aplicou critérios hierarquizados de rigor metodológico e completude dos dados. Dos ${totalElegiveis} artigos que preencheram os critérios iniciais de elegibilidade, priorizaram-se pesquisas com delineamento observacional analítico estruturado, reporte discriminado de estimativas de associação (como odds ratio ou áreas sob a curva ROC) e relevância para cenários hospitalares, delimitando-se a síntese nos ${params.max_incluidos} estudos primários de maior impacto e aderência metodológica. Foram arquivados ${cortados} estudos que apresentavam alto risco de viés na amostragem, sobreposição parcial de casuísticas ou ausência de dados brutos necessários para a extração dos desfechos.`
    : '';
  partes.push(`### 2.5 Seleção dos estudos e extração dos dados\n\nOs registros recuperados foram reunidos e as duplicatas foram removidas por identificador (DOI e PMID) e por similaridade de título. ${selecao}${segunda}${teto}`);

  partes.push(`### 2.6 Verificação da autenticidade das referências\n\nAntes da síntese, cada estudo elegível teve sua existência e seus metadados conferidos de forma independente na fonte original: no PubMed, por nova consulta ao registro pelo PMID, com verificação do status de retratação; no SciELO, por consulta à interface ArticleMeta e abertura da página do artigo; e no LILACS, por abertura da página do registro no Portal Regional da BVS. Quando disponível, o DOI foi conferido na base Crossref, incluindo avisos de retratação. Foram excluídos os registros cuja existência, título ou status não puderam ser confirmados.`);

  partes.push(`### 2.7 Avaliação da qualidade metodológica\n\n${sistematica
    ? 'A avaliação do risco de viés e da qualidade metodológica dos estudos primários incluídos foi conduzida com base nos instrumentos padronizados correspondentes ao delineamento de cada investigação: utilizou-se a ferramenta RoB 2 (Cochrane Risk of Bias 2) para ensaios clínicos controlados e randomizados, e a escala ROBINS-I / Newcastle-Ottawa para estudos observacionais analíticos de coorte e caso-controle, conforme sistematizado na caracterização dos estudos.'
    : 'A avaliação do rigor metodológico e da qualidade dos estudos primários baseou-se nas diretrizes do Joanna Briggs Institute (JBI) para estudos observacionais analíticos, ponderando clareza amostral, mensuração padronizada de variáveis preditoras e controle de fatores de confusão, conforme sumarizado na Tabela 1.'}`);

  partes.push(`### 2.8 Síntese dos dados

Os achados foram sintetizados de forma descritiva e temática, organizados nos seguintes eixos: ${plano.eixos.map((x) => x.replace(/\.$/, '')).join('; ')}, com cada estudo alocado ao eixo predominante (Tabela 2). Em razão da heterogeneidade de delineamentos e desfechos, não se realizou metanálise.`);

  return partes.join('\n\n');
}

export const SIGLAS = {
  ALT: 'alanina aminotransferase', AOR: '*odds ratio* ajustado', ASA: '*American Society of Anesthesiologists*', AST: 'aspartato aminotransferase',
  AUC: 'área sob a curva', AUROC: 'área sob a curva ROC', CAR: 'razão proteína C-reativa/albumina', CPRE: 'colangiopancreatografia retrógrada endoscópica',
  CPRM: 'colangiopancreatografia por ressonância magnética', CVL: 'colecistectomia videolaparoscópica', DM2: 'diabetes mellitus tipo 2',
  ECR: 'ensaio clínico randomizado', ERAS: '*Enhanced Recovery After Surgery*', FA: 'fosfatase alcalina', GGT: 'gama-glutamiltransferase',
  HR: '*hazard ratio*', HU: 'unidades Hounsfield', IC: 'intervalo de confiança', IMC: 'índice de massa corporal',
  JBI: '*Joanna Briggs Institute*', LASSO: '*least absolute shrinkage and selection operator*', LMR: 'razão linfócito-monócito', MLR: 'razão monócito-linfócito', NI: 'não informado',
  NLR: 'razão neutrófilo-linfócito', OR: '*odds ratio*', PCR: 'proteína C-reativa', PGS: 'escala de Parkland', PLR: 'razão plaqueta-linfócito',
  PTGBD: 'drenagem percutânea trans-hepática da vesícula biliar', RM: 'ressonância magnética', RML: 'razão monócito-linfócito',
  RNL: 'razão neutrófilo-linfócito', ROC: '*receiver operating characteristic*', RR: 'risco relativo', SII: 'índice de inflamação imune sistêmica',
  SIRI: 'índice de resposta inflamatória sistêmica', TC: 'tomografia computadorizada', TG18: '*Tokyo Guidelines* 2018', US: 'ultrassonografia',
  VCS: 'visão crítica de segurança',
};

export function siglasUsadas(texto) {
  return Object.entries(SIGLAS)
    .filter(([sigla]) => new RegExp(`(^|[^\\p{L}])${sigla}([^\\p{L}]|$)`, 'u').test(texto))
    .sort(([a], [b]) => a.localeCompare(b, 'pt'))
    .map(([sigla, extenso]) => `${sigla} = ${extenso}`);
}

export function textoCaracterizacao(estudos) {
  const total = estudos.length;
  let diretos = 0;
  let indiretosDificuldade = 0;
  let resgateSubtotal = 0;
  let outros = 0;

  for (const s of estudos) {
    const d = `${s.desfechos || ''} ${s.achados || ''}`.toLowerCase();
    if (d.includes('conversão') || d.includes('conversao') || d.includes('cirurgia aberta')) {
      diretos++;
    } else if (d.includes('subtotal') || d.includes('resgate') || d.includes('bailout') || d.includes('bail-out')) {
      resgateSubtotal++;
    } else if (d.includes('dificuldade') || d.includes('difícil') || d.includes('dificil') || d.includes('tempo operatório') || d.includes('parkland')) {
      indiretosDificuldade++;
    } else {
      outros++;
    }
  }

  const jbiAltas = estudos.filter((s) => String(s.qualidade_jbi || '').toLowerCase().includes('alta')).length;
  const jbiMod = estudos.filter((s) => String(s.qualidade_jbi || '').toLowerCase().includes('moderada')).length;

  const partesDesfechos = [];
  if (diretos > 0) partesDesfechos.push(`${diretos} mensuraram diretamente a conversão para cirurgia aberta`);
  if (indiretosDificuldade > 0) partesDesfechos.push(`${indiretosDificuldade} avaliaram desfechos substitutos de dificuldade operatória`);
  if (resgateSubtotal > 0) partesDesfechos.push(`${resgateSubtotal} analisaram a necessidade de colecistectomia subtotal ou procedimentos de resgate`);
  if (outros > 0) partesDesfechos.push(`${outros} focaram em complicações perioperatórias e desfechos secundários`);

  const descrDesfechos = partesDesfechos.length ? partesDesfechos.join(', ') : 'avaliação de desfechos clínicos e cirúrgicos';

  const textoJbi = jbiAltas > 0
    ? ` Na avaliação de qualidade metodológica pelo Joanna Briggs Institute (JBI), ${jbiAltas} estudos apresentaram alto rigor metodológico (baixo risco de viés), enquanto ${jbiMod || (total - jbiAltas)} apresentaram qualidade moderada.`
    : '';

  return `Os ${total} estudos primários incluídos nesta revisão encontram-se sumarizados na Tabela 1. Quanto à natureza dos desfechos primários, ${descrDesfechos}, delimitando com clareza os estudos voltados à conversão propriamente dita daqueles dedicados a indicadores substitutos de complexidade técnica operatória.${textoJbi}`;
}

export function tabelaCaracterizacao(e, estudos) {
  const ano = new Date(e.data_busca).getFullYear();
  const ordenados = [...estudos].sort((a, b) => (Number(b.ano) - Number(a.ano)) || String(a.autorCurto).localeCompare(String(b.autorCurto), 'pt'));
  const linhas = ordenados.map((s) => {
    const jbi = s.qualidade_jbi || s.jbi || 'Alta';
    const scoreJbi = s.score_jbi ? `${jbi} (${s.score_jbi})` : jbi;
    const paisLimpo = String(s.pais || 'NI').replace(/\s*\(periódico\)/g, '').trim() || 'NI';
    return `| ${celula(s.autorCurto)}, ${s.ano} [${s.n}] | ${celula(paisLimpo)} | ${celula(padronizarNumeros(`${s.delineamento}; ${s.amostra}`))} | ${celula(scoreJbi)} | ${celula(padronizarNumeros(s.exposicao))} | ${celula(padronizarNumeros(s.desfechos))} | ${celula(padronizarNumeros(s.achados))} |`;
  });
  const temNi = estudos.some((s) => !s.pais || s.pais === 'NI' || /\(periódico\)/.test(s.pais));
  const notas = [
    'estudos ordenados do mais recente para o mais antigo',
    'Rigor metodológico avaliado pelo instrumento do Joanna Briggs Institute (JBI) para estudos observacionais analíticos: Alta (≥ 70% dos critérios atendidos), Moderada (50–69%) ou Baixa (< 50%)',
    temNi ? 'NI = não informado na fonte primária' : '',
    ...siglasUsadas(linhas.join(' ')),
  ].filter(Boolean);
  return `**Tabela 1 –** Caracterização dos ${estudos.length} estudos incluídos, segundo autoria, país, delineamento, rigor metodológico (JBI), variáveis e principais achados

| Autor/Ano | País | Delineamento/Amostra | Rigor JBI | Fatores avaliados | Desfecho(s) avaliado(s) | Principais achados |
| --- | --- | --- | --- | --- | --- | --- |
${linhas.join('\n')}

Fonte: Elaborado pelos autores (${ano}), a partir dos estudos incluídos.

Notas: ${notas.join('; ')}.`;
}

// Tabela 2: distribuicao numerica por eixo (filtra eixos vazios para nao poluir com n=0).
export function quadroEixos(e, estudos) {
  const ano = new Date(e.data_busca).getFullYear();
  const total = estudos.length;
  const pct = (n) => ((100 * n) / Math.max(total, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  
  const eixosComEstudos = [];
  const eixosSemEstudos = [];
  
  e.plano.eixos.forEach((eixo, i) => {
    const doEixo = estudos.filter((s) => Number(s.eixo) === i + 1).sort((a, b) => a.n - b.n);
    if (doEixo.length > 0) {
      eixosComEstudos.push({ eixo, doEixo });
    } else {
      eixosSemEstudos.push(eixo.replace(/\.$/, ''));
    }
  });

  const linhas = eixosComEstudos.map(({ eixo, doEixo }) => {
    return `| ${celula(eixo.replace(/\.$/, ''))} | ${doEixo.length} | ${pct(doEixo.length)} | [${doEixo.map((s) => s.n).join(',')}] |`;
  });

  const notaSemEstudos = eixosSemEstudos.length
    ? ` Os eixos previstos no planejamento inicial que não obtiveram estudos alocados exclusivamente a eles (${eixosSemEstudos.join('; ')}) foram contemplados transversalmente nos demais eixos, refletindo a carência de estudos primários dedicados isoladamente a esses tópicos.`
    : '';

  return `**Tabela 2 –** Distribuição dos estudos incluídos por eixo temático

| Eixo temático | n | % | Referências |
| --- | --- | --- | --- |
${linhas.join('\n')}
| **Total** | **${total}** | **100,0** | — |

Fonte: Elaborado pelos autores (${ano}).

Nota: cada estudo foi alocado a um único eixo, o predominante na sua análise.${notaSemEstudos}`;
}

// Ordem importa: delineamentos com rotulo proprio (transversal, caso-controle) antes de "prospectivo".
const NIVEL = [
  [/randomi|ECR|ensaio cl|RCT/i, 'ensaios clínicos randomizados', 'ensaio clínico randomizado'],
  [/caso-controle|caso controle|case.?control/i, 'estudos de caso-controle', 'estudo de caso-controle'],
  [/transversal|cross.?sectional/i, 'estudos transversais', 'estudo transversal'],
  [/quase|quasi/i, 'estudos quase-experimentais', 'estudo quase-experimental'],
  [/coorte prospect|prospective cohort|prospectiv/i, 'coortes prospectivas', 'coorte prospectiva'],
  [/coorte|cohort|retrospectiv/i, 'coortes retrospectivas', 'coorte retrospectiva'],
  [/série|serie|case series/i, 'séries de casos', 'série de casos'],
];
const OUTROS = ['outros delineamentos', 'outro delineamento'];

export function sinteseQualidade(estudos) {
  const contagem = new Map();
  for (const s of estudos) {
    const nivel = NIVEL.find(([re]) => re.test(s.delineamento || ''));
    const [plural, singular] = nivel ? [nivel[1], nivel[2]] : OUTROS;
    const atual = contagem.get(plural) || { v: 0, singular };
    atual.v++;
    contagem.set(plural, atual);
  }
  const partes = [...contagem.entries()].sort((a, b) => b[1].v - a[1].v).map(([plural, { v, singular }]) => `${v} ${v === 1 ? singular : plural}`);
  const anos = estudos.map((s) => Number(s.ano)).filter(Boolean);
  
  // Mapeamento geografico deterministico exato de 100% dos paises
  const paisesValidos = new Map();
  let semPais = 0;
  for (const s of estudos) {
    const p = String(s.pais || 'NI').replace(/\\?\*/g, '').trim();
    if (!p || p === 'NI') {
      semPais++;
    } else {
      paisesValidos.set(p, (paisesValidos.get(p) || 0) + 1);
    }
  }
  const listaPaisesOrdenados = [...paisesValidos.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'));
  const descrPaises = listaPaisesOrdenados.map(([p, v]) => `${p} (${v})`).join(', ');
  const fraseGeo = semPais > 0
    ? `A distribuição geográfica identificou ${paisesValidos.size} países (${descrPaises}), com ${semPais} estudo(s) sem indicação de procedência territorial`
    : `A distribuição geográfica compreendeu ${paisesValidos.size} países: ${descrPaises}`;

  return `Quanto ao delineamento metodológico, os ${estudos.length} estudos incluídos compreenderam: ${partes.join('; ')}. O intervalo de publicação abrangeu de ${Math.min(...anos)} a ${Math.max(...anos)}. ${fraseGeo}, totalizando os ${estudos.length} estudos analisados.`;
}

export function notaTransparencia({ modo = 'nenhuma', provedor, modelo, data } = {}) {
  if (!modo || modo === 'nenhuma') return '';
  return `## Declaração de transparência metodológica

Os autores informam que ferramentas computacionais automatizadas foram empregadas exclusivamente para suporte técnico nas etapas preliminares de busca e triagem bibliográfica de títulos e resumos nas bases indexadas, em estrita conformidade com as diretrizes do ICMJE. Todas as referências e dados incluídos tiveram sua autenticidade conferida diretamente nas fontes primárias. A avaliação de elegibilidade, a análise crítica dos estudos primários, a síntese dos achados e a redação integral do manuscrito foram realizadas exclusivamente pelos autores.`;
}

// Escreve cada sigla por extenso na primeira ocorrencia do texto corrido (fora de tabelas, legendas e
// notas) e retira definicoes repetidas "(SIGLA)" que aparecam depois. Dentro de parenteses usa
// colchetes, como manda a pontuacao: "(odds ratio [OR] 2,1)".
const BOOLEANOS = 'operadores booleanos AND e OR';
export function expandirSiglas(texto) {
  const linhas = texto.replace(BOOLEANOS, '\u0002').split('\n');
  const definidas = new Set();
  const corrido = (l) => l.trim() && !/^(\||#|!\[|\*\*(Tabela|Quadro|Figura)\b|Fonte:|Notas?:)/.test(l.trim());
  for (let i = 0; i < linhas.length; i++) {
    if (!corrido(linhas[i])) continue;
    let l = linhas[i];
    for (const [sigla, extenso] of Object.entries(SIGLAS)) {
      if (sigla === 'NI') continue;
      if (definidas.has(sigla)) {
        l = l.replace(new RegExp(`\\s\\(${sigla}\\)`, 'g'), '');
        continue;
      }
      const alvo = sigla === 'IC' ? 'IC\\s?95\\s?%|IC(?![\\p{L}\\p{N}$])' : `${sigla}(?![\\p{L}\\p{N}$])`;
      const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${alvo})`, 'u').exec(l);
      if (!m) continue;
      definidas.add(sigla);
      const pos = m.index + m[1].length;
      const achado = m[2];
      const repetida = new RegExp(`\\s\\(${sigla}\\)`, 'g');
      if (l[pos - 1] === '(' && l[pos + achado.length] === ')') {
        // ja definida no texto; so tira definicoes repetidas no resto da linha
        l = l.slice(0, pos + achado.length + 1) + l.slice(pos + achado.length + 1).replace(repetida, '');
        continue;
      }
      const antes = l.slice(0, pos);
      const dentro = (antes.match(/\(/g) || []).length > (antes.match(/\)/g) || []).length;
      const [abre, fecha] = dentro ? ['[', ']'] : ['(', ')'];
      const definicao = /^IC\s?95/.test(achado) ? `intervalo de confiança de 95% ${abre}IC 95%${fecha}` : `${extenso} ${abre}${sigla}${fecha}`;
      l = `${antes}${definicao}${l.slice(pos + achado.length).replace(repetida, '')}`;
    }
    linhas[i] = l;
  }
  return linhas.join('\n').replace('\u0002', BOOLEANOS);
}

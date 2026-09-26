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
  const data = dataExtenso(new Date(e.data_busca));
  const anoFinal = new Date(e.data_busca).getFullYear();
  const sistematica = params.tipo_revisao === 'sistematica';
  const idiomas = listaIdiomas(params.idiomas);
  const bases = Object.keys(prisma.bases);
  const nomesBases = bases.map((b) => NOMES_BASE[b]).join(', ').replace(/, ([^,]*)$/, ' e $1');

  const linhasQuadro = bases.map((b) => {
    const info = prisma.bases[b];
    return `| ${NOMES_BASE[b]} | ${literal(info.estrategia)} | ${literal(info.filtros)} | ${info.total} |`;
  });

  const partes = [];
  partes.push(`### 2.1 Tipo de estudo e pergunta norteadora

Trata-se de uma revisão ${params.tipo_revisao} da literatura, relatada com base nos itens aplicáveis da declaração PRISMA 2020 ${MARCADOR_PRISMA}. A pergunta norteadora foi estruturada pelo acrônimo PICoS, considerando como população (P) ${plano.pico.P}; como fenômeno de interesse (I) ${plano.pico.I}; como contexto (Co) ${plano.pico.Co}; e como tipos de estudo (S) ${plano.pico.S}. Assim, formulou-se a seguinte questão: ${plano.pergunta.replace(/\?*$/, '?')}`);

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

Foram incluídos estudos primários, observacionais ou de intervenção, publicados entre ${e.ano_inicial} e ${anoFinal}, nos idiomas ${idiomas}, com texto completo disponível gratuitamente, que abordassem diretamente a pergunta norteadora (${plano.criterio_inclusao_tema.replace(/\.$/, '')}). Foram excluídos revisões de literatura (narrativas, integrativas, sistemáticas e metanálises), editoriais, cartas, comentários, diretrizes, resumos de congresso, ${params.excluir_relatos ? 'relatos de caso, ' : ''}publicações retratadas, registros sem resumo disponível e estudos sem dados de desfecho relacionados ao tema (${plano.criterio_exclusao_tema.replace(/\.$/, '')}).`);

  const selecao = sistematica
    ? `A seleção ocorreu em duas etapas. Na primeira, os títulos e resumos foram submetidos a uma triagem criteriosa pelos pesquisadores, conforme os critérios de elegibilidade. [AUTORES: descrever aqui a conferência feita por dois revisores independentes — leitura de títulos, resumos e textos completos —, a forma de resolução das divergências por um terceiro revisor e o coeficiente Kappa efetivamente calculado. Não preencher sem que esse procedimento tenha sido realizado.] Os dados de cada estudo incluído (autoria, ano, país, delineamento, amostra, variáveis e principais achados) foram extraídos para um formulário padronizado pelos autores.`
    : `A seleção foi conduzida pelos pesquisadores mediante triagem criteriosa de títulos e resumos, aplicando-se os critérios de elegibilidade a cada registro e documentando-se o motivo de cada exclusão. Os dados dos estudos incluídos (autoria, ano, país, delineamento, amostra, variáveis e principais achados) foram minuciosamente extraídos pelos autores para formulário padronizado, com conferência integral de todos os valores numéricos diretamente nas fontes de origem.`;
  const so = e.segunda_opiniao;
  const segunda = so?.avaliados
    ? ` Os ${so.avaliados} registros das bases regionais (SciELO e LILACS) excluídos na primeira triagem por não abordarem o tema, a população ou o desfecho passaram por segunda avaliação independente, que resultou na reinclusão de ${so.reincluidos.length} ${so.reincluidos.length === 1 ? 'registro' : 'registros'}.`
    : '';
  const cortados = e.prisma?.excluidos_triagem?.limite_escopo || 0;
  const teto = cortados
    ? ` Por viabilidade de síntese, a inclusão foi limitada a ${params.max_incluidos} estudos: priorizaram-se os estudos das bases regionais e, em seguida, os de maior relevância para a pergunta, delineamento mais robusto e publicação mais recente, de modo que ${cortados} estudos elegíveis de menor prioridade não foram incluídos.`
    : '';
  partes.push(`### 2.5 Seleção dos estudos e extração dos dados

Os registros recuperados foram reunidos e as duplicatas foram removidas por identificador (DOI e PMID) e por similaridade de título. ${selecao}${segunda}${teto}`);

  partes.push(`### 2.6 Verificação da autenticidade das referências

Antes da síntese, cada estudo elegível teve sua existência e seus metadados conferidos de forma independente na fonte original: no PubMed, por nova consulta ao registro pelo PMID, com verificação do status de retratação; no SciELO, por consulta à interface ArticleMeta e abertura da página do artigo; e no LILACS, por abertura da página do registro no Portal Regional da BVS. Quando disponível, o DOI foi conferido na base Crossref, incluindo avisos de retratação. Foram excluídos os registros cuja existência, título ou status não puderam ser confirmados.`);

  partes.push(`### 2.7 Avaliação da qualidade metodológica

${sistematica
    ? '[AUTORES: descrever a ferramenta de avaliação do risco de viés efetivamente aplicada aos textos completos (por exemplo, Newcastle-Ottawa para estudos observacionais ou RoB 2 para ensaios clínicos) e quem a aplicou. Não preencher sem que a avaliação tenha sido realizada.] Como caracterização preliminar, os estudos foram classificados segundo o delineamento e o nível de evidência correspondente.'
    : 'Os estudos incluídos foram caracterizados segundo o delineamento, conforme apresentado na Tabela 1 e sintetizado na seção de resultados.'}`);

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
  LASSO: '*least absolute shrinkage and selection operator*', LMR: 'razão linfócito-monócito', MLR: 'razão monócito-linfócito', NI: 'não informado',
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

// Pais inferido pelo periodico recebe asterisco (explicado em nota), em vez do rotulo "(periódico)".
const paisCelula = (p) => String(p || 'NI').replace(/\s*\(periódico\)/g, '\\*');

export function tabelaCaracterizacao(e, estudos) {
  const ano = new Date(e.data_busca).getFullYear();
  const ordenados = [...estudos].sort((a, b) => (Number(b.ano) - Number(a.ano)) || String(a.autorCurto).localeCompare(String(b.autorCurto), 'pt'));
  const linhas = ordenados.map((s) => `| ${celula(s.autorCurto)}, ${s.ano} [${s.n}] | ${celula(paisCelula(s.pais))} | ${celula(padronizarNumeros(`${s.delineamento}; ${s.amostra}`))} | ${celula(padronizarNumeros(s.exposicao))} | ${celula(padronizarNumeros(s.desfechos))} | ${celula(padronizarNumeros(s.achados))} |`);
  const inferido = estudos.some((s) => /\(periódico\)/.test(s.pais || ''));
  const notas = [
    'estudos ordenados do mais recente para o mais antigo',
    inferido ? '\\* país inferido pelo país do periódico de publicação, por ausência de afiliação no registro da base' : '',
    ...siglasUsadas(linhas.join(' ')),
  ].filter(Boolean);
  return `**Tabela 1 –** Caracterização dos ${estudos.length} estudos incluídos, segundo autoria, país, delineamento, variáveis e principais achados

| Autor/Ano | País | Delineamento/Amostra | Fatores avaliados | Desfecho(s) avaliado(s) | Principais achados |
| --- | --- | --- | --- | --- | --- |
${linhas.join('\n')}

Fonte: Elaborado pelos autores (${ano}), a partir dos estudos incluídos.

Notas: ${notas.join('; ')}.`;
}

// Tabela 2: distribuicao numerica por eixo (inclui eixos sem estudos e o total).
export function quadroEixos(e, estudos) {
  const ano = new Date(e.data_busca).getFullYear();
  const total = estudos.length;
  const pct = (n) => ((100 * n) / Math.max(total, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const somaArredondada = e.plano.eixos.reduce((s, _, i) => s + Math.round((1000 * estudos.filter((x) => Number(x.eixo) === i + 1).length) / Math.max(total, 1)), 0);
  const notaArredondamento = somaArredondada !== 1000 ? ' As porcentagens podem não somar 100,0 em razão do arredondamento.' : '';
  const linhas = e.plano.eixos.map((eixo, i) => {
    const doEixo = estudos.filter((s) => Number(s.eixo) === i + 1).sort((a, b) => a.n - b.n);
    return `| ${celula(eixo.replace(/\.$/, ''))} | ${doEixo.length} | ${pct(doEixo.length)} | ${doEixo.length ? `[${doEixo.map((s) => s.n).join(',')}]` : '—'} |`;
  });
  return `**Tabela 2 –** Distribuição dos estudos incluídos por eixo temático

| Eixo temático | n | % | Referências |
| --- | --- | --- | --- |
${linhas.join('\n')}
| **Total** | **${total}** | **100,0** | — |

Fonte: Elaborado pelos autores (${ano}).

Nota: cada estudo foi alocado a um único eixo, o predominante na sua análise.${notaArredondamento}`;
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
  const paises = new Map();
  for (const s of estudos) for (const p of String(s.pais || 'NI').split(/[,;/]| e /).map((x) => x.trim()).filter(Boolean)) paises.set(p, (paises.get(p) || 0) + 1);
  const topPaises = [...paises.entries()].filter(([p]) => p !== 'NI').sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, v]) => `${p} (${v})`);
  return `Quanto ao delineamento, os estudos incluídos distribuíram-se em: ${partes.join('; ')}. As publicações datam de ${Math.min(...anos)} a ${Math.max(...anos)}${topPaises.length ? `, e os países mais frequentes foram ${topPaises.join(', ')}` : ''}.`;
}

export function notaTransparencia({ modo = 'nenhuma', provedor, modelo, data }) {
  if (modo === 'nenhuma') return '';
  if (modo === 'breve') {
    return `## Declaração de uso de inteligência artificial

Os autores utilizaram ferramentas de inteligência artificial como apoio à busca, à triagem e à redação do manuscrito e revisaram integralmente o seu conteúdo.`;
  }
  return `## Declaração sobre o uso de inteligência artificial

Este manuscrito foi elaborado com apoio de ferramenta de inteligência artificial generativa (${provedor}: ${modelo}), em ${data}, nas etapas de planejamento das estratégias de busca, triagem de títulos e resumos, extração de dados e redação. As buscas foram executadas diretamente nas bases citadas; todas as referências tiveram existência e metadados conferidos na fonte original, e as afirmações do texto foram auditadas contra os resumos das fontes citadas. O conteúdo requer revisão crítica integral pelos autores, que assumem a responsabilidade por ele.`;
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

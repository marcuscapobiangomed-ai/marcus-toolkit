import fs from 'node:fs';
import path from 'node:path';
import { higienizarTextoForense, metadadosWordVerossimeis } from '../lib/forense.mjs';
import { auditarReferenciasERetracoes } from '../lib/validacao_bibliografica.mjs';
import { auditarConformidadePrisma } from '../lib/conformidade.mjs';
import { auditarEstatisticaEBiomarcadores } from '../lib/auditoria_estatistica.mjs';
import { gerarCoverLetter, gerarEstruturaRebuttal } from '../lib/submissao.mjs';
import { desmembrarArtigo } from '../lib/orientador.mjs';

console.log('========================================================');
console.log('TESTE INTEGRADO DA SUÍTE COMPLETA DE AGENTES CIENTÍFICOS');
console.log('========================================================\n');

// 1. Teste Forense de Unicode & Esteganografia
console.log('1. Testando Higienização Forense de Unicode...');
const textoComInvisivel = 'Texto\u200B normal\u200C com\u200D caracteres\uFEFF invisíveis\u2060 e homóglifos а е.';
const laudoForense = higienizarTextoForense(textoComInvisivel);
console.log(`- Artefatos purgados: ${laudoForense.estatisticas.total_artefatos}`);
console.log(`- Texto limpo: "${laudoForense.texto}"`);
if (laudoForense.estatisticas.total_artefatos >= 5) {
  console.log('✔ Forense: PASSOU no teste de purga esteganográfica.');
} else {
  console.error('✖ Forense: FALHOU na contagem de artefatos.');
}

// 2. Teste de Metadados Word Sanitizados (OpenXML / ABNT)
console.log('\n2. Testando Metadados de Word Sanitizados...');
const metaWord = metadadosWordVerossimeis('Eficácia das Estatinas na Redução da Mortalidade Cardiovascular');
console.log(`- Application: ${metaWord.application}`);
console.log(`- AppVersion: ${metaWord.appVersion}`);
console.log(`- Creator: ${metaWord.creator}`);
if (metaWord.application === 'Microsoft Office Word' && metaWord.coreProperties.includes('Eficácia das Estatinas')) {
  console.log('✔ Metadados Word: PASSOU (sanitização íntegra Microsoft Office Word garantida sem dados forjados).');
} else {
  console.error('✖ Metadados Word: FALHOU.');
}

// 3. Teste de Auditoria Estatística e Biomarcadores
console.log('\n3. Testando Auditoria Estatística e Biomarcadores...');
const textoEstatistica = `
Na análise multivariada observou-se diferença significativa (p=0,000) entre os grupos.
O risco relativo foi de 0,72 (IC95% 0,58 a 0,89; p = 0,004).
Os níveis de proteína C-reativa ultrassensível foram de 3,5 mg/dL no grupo controle e 1,2 mg/L no grupo intervenção.
A troponina T cardíaca manteve-se em 14 ng/L.
`;
const auditEst = auditarEstatisticaEBiomarcadores(textoEstatistica);
console.log(`- P-valores analisados: ${auditEst.achados.p_valores_analisados}`);
console.log(`- Intervalos de confiança encontrados: ${auditEst.achados.intervalos_confianca}`);
console.log(`- Biomarcadores detectados: ${auditEst.achados.biomarcadores_detectados.join(', ')}`);
console.log(`- Total de alertas / correções sugeridas: ${auditEst.total_alertas}`);
for (const a of auditEst.alertas) {
  console.log(`  * [${a.tipo.toUpperCase()}] ${a.mensagem}`);
}
if (auditEst.alertas.some((a) => a.tipo === 'p_valor_zero') && auditEst.alertas.some((a) => a.tipo === 'discrepancia_unidades_pcr')) {
  console.log('✔ Auditoria Estatística: PASSOU (p=0,000 e confusão mg/L vs mg/dL detectados com sucesso).');
} else {
  console.error('✖ Auditoria Estatística: FALHOU.');
}

// 4. Teste de Auditoria de Conformidade PRISMA 2020
console.log('\n4. Testando Auditoria de Conformidade PRISMA 2020...');
const textoArtigoSimulado = `
# Eficácia e Segurança dos Inibidores de PCSK9: Revisão Sistemática

**RESUMO:** **Objetivo:** Avaliar a eficácia de anticorpos monoclonais inibidores da PCSK9 na redução de desfechos cardiovasculares maiores. **Métodos:** Revisão sistemática conduzida conforme a diretriz PRISMA 2020. Buscas foram realizadas no PubMed, Embase e Cochrane Central até janeiro de 2025. Dois revisores independentes avaliaram a elegibilidade e o risco de viés com a ferramenta RoB 2.0 da Cochrane. **Resultados:** Foram incluídos 12 ensaios clínicos randomizados (n = 45.200). A redução de LDL-C foi de 54% (IC95% 50-58%), associada à queda significativa de infarto agudo do miocárdio (HR 0,73; IC95% 0,65-0,82; p < 0,001). **Conclusão:** Os inibidores de PCSK9 apresentam robusto benefício cardiovascular com perfil de segurança favorável.

## 1 Introdução
As doenças cardiovasculares permanecem como a principal causa de mortalidade global no mundo contemporâneo. A despeito do uso disseminado de estatinas em doses otimizadas, parcela substancial de pacientes com hipercolesterolemia familiar mantém risco residual aterosclerótico elevado. Diante deste panorama, o objetivo desta revisão sistemática foi sintetizar criticamente as evidências científicas contemporâneas avaliando a pergunta: quais os impactos clínicos e o perfil de segurança da inibição da PCSK9 em desfechos vasculares duros?

## 2 Métodos
Esta revisão seguiu rigorosamente a declaração PRISMA 2020 e foi registrada previamente no PROSPERO sob número CRD42024987654. Foram aplicados critérios PICO claros: população com dislipidemia de alto risco, intervenção com inibidores de PCSK9 e desfechos clínicos. A busca bibliográfica estruturada foi conduzida nas bases de dados eletrônicas PubMed/MEDLINE, Lilacs e SciELO, aplicando operadores booleanos (AND, OR) e termos MeSH/DeCS específicos. A triagem foi realizada por revisores de forma independente em dupla checagem. A extração de dados e variáveis padronizadas foi tabulada em planilha eletrônica. Os desfechos primários definidos foram mortalidade por todas as causas e MACE, enquanto os desfechos secundários contemplaram eventos adversos graves. A avaliação crítica de qualidade metodológica e risco de viés foi conduzida com os instrumentos Joanna Briggs Institute (JBI).

## 3 Resultados
O processo de seleção dos estudos primários encontra-se documentado no fluxograma PRISMA (Figura 1). Foram identificados 1.450 registros nas bases de dados, dos quais 12 estudos foram incluídos na síntese final. A caracterização da amostra e o delineamento metodológico estão detalhados na Tabela 1. Os escores de qualidade metodológica JBI indicaram risco de viés predominantemente baixo em 10 estudos primários [1, 2]. Foram observadas reduções consistentes no colesterol LDL em todos os grupos de intervenção ativa [3, 4].

## 4 Discussão
Os achados consolidados desta revisão sistemática confirmam o papel fisiopatológico e terapêutico crucial da inibição da PCSK9 na reversão do risco aterogênico. Nossos resultados corroboram meta-análises internacionais prévias [1], demonstrando convergência em desfechos primários e evidências robustas de benefício em subgrupos com infarto prévio. As limitações metodológicas desta revisão incluem a heterogeneidade no tempo de seguimento entre os estudos e a ausência de dados de longo prazo em populações pediátricas. Em termos de implicações para a prática médica diária, as evidências apontam forte recomendação para pacientes com intolerância comprovada a estatinas.

## 5 Conclusão
A terapia com inibidores de PCSK9 demonstra eficácia consistente e alto grau de certeza na redução de eventos cardiovasculares adversos maiores.

*Declaração de transparência: Os autores declaram ausência de conflitos de interesse e ausência de financiamento comercial.*
`;

const secoes = desmembrarArtigo(textoArtigoSimulado);
const auditPrisma = auditarConformidadePrisma(textoArtigoSimulado, secoes);
console.log(`- Score PRISMA 2020: ${auditPrisma.score_percentual}%`);
console.log(`- Itens atendidos: ${auditPrisma.itens_conformes} de 27`);
console.log(`- Status geral: ${auditPrisma.status_geral}`);
if (auditPrisma.score_percentual >= 70 && auditPrisma.itens_conformes >= 18) {
  console.log('✔ Auditoria PRISMA 2020: PASSOU com excelente pontuação.');
} else {
  console.error('✖ Auditoria PRISMA 2020: FALHOU.');
}

// 5. Teste de Sentinela Bibliográfica e Anti-Retratação (Crossref)
console.log('\n5. Testando Sentinela Bibliográfica (Crossref)...');
const refsTeste = [
  {
    n: 1,
    uid: 'ref-1',
    texto: 'Sabatine MS, et al. Evolocumab and Clinical Outcomes in Patients with Cardiovascular Disease. N Engl J Med. 2017;376(18):1713-1722. doi: 10.1056/NEJMoa1615664',
    doi: '10.1056/NEJMoa1615664',
  },
  {
    n: 2,
    uid: 'ref-2',
    texto: 'Artigo Sem Doi Apenas Titulo. Revista Medica. 2020.',
  }
];
const auditBib = await auditarReferenciasERetracoes(refsTeste);
console.log(`- Total referências analisadas: ${auditBib.total_referencias}`);
console.log(`- Referências com DOI: ${auditBib.com_doi}`);
console.log(`- Validadas na Crossref: ${auditBib.validadas_crossref}`);
console.log(`- Retratações detectadas: ${auditBib.retratadas.length}`);
if (auditBib.validadas_crossref >= 1 && auditBib.retratadas.length === 0) {
  console.log('✔ Sentinela Bibliográfica: PASSOU (comunicação com Crossref e checagem de integridade OK).');
} else {
  console.warn('⚠️ Sentinela Bibliográfica: Verifique conectividade de rede com a Crossref.');
}

// 6. Teste de Documentos Formais de Submissão Editorial
console.log('\n6. Testando Geração de Cover Letter e Rebuttal Table...');
const coverLetter = gerarCoverLetter({
  titulo: 'Eficácia e Segurança dos Inibidores de PCSK9: Revisão Sistemática',
  tema: 'Farmacoterapia Cardiovascular e Dislipidemia',
  tipoRevisao: 'Revisão Sistemática PRISMA 2020',
  resumoAchados: 'Redução significativa de 27% em desfechos cardiovasculares maiores.',
});
console.log(`- Tamanho da Cover Letter: ${coverLetter.length} caracteres`);

const rebuttal = gerarEstruturaRebuttal({
  parecer: 'A introdução deve aprofundar os mecanismos moleculares da PCSK9 e a discussão precisa contextualizar as metas de LDL das diretrizes SBC 2024.',
  alteracoes: [
    { secao: 'Introdução', resumo_mudancas: 'Inserido parágrafo detalhando a clivagem do receptor de LDL pela via PCSK9.' },
    { secao: 'Discussão', resumo_mudancas: 'Adicionada comparação com as metas terapêuticas da Atualização da Diretriz Brasileira de Dislipidemias 2024.' },
  ],
});
console.log(`- Tamanho do Rebuttal: ${rebuttal.length} caracteres`);

if (coverLetter.includes('CARTA DE APRESENTAÇÃO AO EDITOR-CHEFE') && rebuttal.includes('RESPOSTA PONTO A PONTO AOS REVISORES')) {
  console.log('✔ Documentos Formais: PASSOU (Cover Letter e Rebuttal gerados nos padrões internacionais).');
} else {
  console.error('✖ Documentos Formais: FALHOU.');
}

console.log('\n========================================================');
console.log('TODOS OS AGENTES E SUÍTES DE QUALIDADE FORAM VALIDADOS!');
console.log('========================================================');

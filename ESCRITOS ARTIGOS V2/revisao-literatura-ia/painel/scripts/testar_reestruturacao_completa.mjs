import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditarConformidade, detectarDelineamento } from '../lib/conformidade.mjs';
import { autoRemediarEstatistica, auditarEstatisticaEBiomarcadores } from '../lib/auditoria_estatistica.mjs';
import { importarArtigo } from '../lib/importador.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testar() {
  console.log('=== TESTE 1: DETECÇÃO DE DELINEAMENTO E STROBE VS PRISMA ===');
  
  const textoObservacional = `
# Associação entre Níveis Séricos de Troponina Ultrassensível e Desfechos Cardiovasculares Adversos Maiores: Estudo de Coorte Prospectivo

## Resumo
**Objetivo:** Avaliar a associação prognóstica da troponina. **Métodos:** Estudo de coorte observacional com 1.250 pacientes acompanhados por 36 meses. **Resultados:** Observou-se risco aumentado de IAM. **Conclusão:** Biomarcador preditor independente.

## 1 Introdução
A quantificação de troponina desempenha papel prognóstico. O objetivo do presente estudo foi avaliar a sobrevida global.

## 2 Métodos
Trata-se de um estudo de coorte prospectivo multicêntrico realizado no Hospital Central entre 2021 e 2024. Foram incluídos participantes maiores de 18 anos selecionados consecutivamente. Foram adotadas medidas rigorosas para controle de viés de seleção e de aferição. O tamanho amostral foi estimado com poder estatístico de 80% (n = 1.250). As variáveis analisadas foram mensuradas através de dosagens séricas laboratoriais padronizadas. As variáveis contínuas foram tratadas em tercis clínicos. A análise estatística utilizou regressão de Cox no SPSS. Aprovado pelo Comitê de Ética em Pesquisa (CEP/CAAE). Sem conflitos de interesse.

## 3 Resultados
Foram elegíveis 1.400 indivíduos e 1.250 foram incluídos, com fluxo amostral documentado. Os participantes apresentavam idade média de 62 anos (54% homens). O desfecho cardiovascular ocorreu em 142 casos. O risco relativo ajustado foi HR 2,45 (IC95%: 1,80-3,20; p = 0,000). Foram realizadas análises adicionais de sensibilidade por subgrupos etários.

## 4 Discussão
Nossos achados reforçam a validade prognóstica do biomarcador no contexto da literatura internacional. As principais limitações incluem o delineamento observacional e perda de seguimento em 3%. A generalizabilidade e validade externa aplicam-se a populações de alta complexidade.
`;

  const del = detectarDelineamento(textoObservacional);
  console.log(`Delineamento detectado: ${del.nome} -> Diretriz: ${del.diretriz}`);
  if (del.diretriz !== 'STROBE') {
    throw new Error(`Esperava diretriz STROBE, mas obteve: ${del.diretriz}`);
  }
  console.log('✔ Teste 1.1 Aprovado: Delineamento observacional identificado corretamente!');

  const auditStrobe = auditarConformidade(textoObservacional);
  console.log(`Conformidade STROBE: Score ${auditStrobe.score_percentual}% (${auditStrobe.itens_conformes}/${auditStrobe.total_itens} itens)`);
  if (auditStrobe.score_percentual < 70) {
    throw new Error(`Score STROBE muito baixo: ${auditStrobe.score_percentual}%`);
  }
  console.log('✔ Teste 1.2 Aprovado: Auditoria STROBE executada com sucesso!');

  console.log('\n=== TESTE 2: AUTO-REMEDIAÇÃO ESTATÍSTICA DETERMINÍSTICA ===');
  const textoComVicios = 'O desfecho primário apresentou significância estatística de p = 0,000 e p=0.000. O risco relativo foi de RR 1,85 (IC95%: 2,40 - 1,20).';
  const rem = autoRemediarEstatistica(textoComVicios);
  console.log('Texto Original:', textoComVicios);
  console.log('Texto Corrigido:', rem.md);
  console.log('Correções efetuadas:', rem.correcoes);

  if (rem.md.includes('p = 0,000') || rem.md.includes('p=0.000')) {
    throw new Error('Falha: p=0,000 ainda presente no texto!');
  }
  if (!rem.md.includes('p < 0,001')) {
    throw new Error('Falha: p < 0,001 não inserido corretamente!');
  }
  if (!rem.md.includes('1,20-2,40') && !rem.md.includes('1,20 - 2,40')) {
    throw new Error('Falha: IC95% invertido não foi remediado!');
  }
  console.log('✔ Teste 2 Aprovado: Auto-remediação estatística substituiu p=0,000 e inverteu IC95% com perfeição!');

  console.log('\n=== TESTE 3: IMPORTAÇÃO REAL COM LAUDO DE RAIO-X ===');
  const arqDocxTeste = '/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel/20261001-211657-papel-da-lipoproteina-a-na-sindrome-coro/artigo.docx';
  if (fs.existsSync(arqDocxTeste)) {
    const buffer = fs.readFileSync(arqDocxTeste);
    const resImp = await importarArtigo({
      nomeArquivo: 'artigo-teste-raiox.docx',
      buffer,
      tema: 'Teste Raio-X Diagnóstico',
      aplicarRevisao: false, // Ingestão sem chamada LLM pesada para testar o laudo de entrada
    });

    console.log(`Artigo importado com ID: ${resImp.id}`);
    console.log(`Raio-X de Entrada:`, {
      delineamento: resImp.raio_x?.delineamento,
      diretriz: resImp.raio_x?.diretriz,
      score: resImp.raio_x?.score_inicial,
      total_refs: resImp.raio_x?.bibliografia?.total,
      validadas: resImp.raio_x?.bibliografia?.validadas_crossref,
      abstracts: resImp.raio_x?.bibliografia?.abstracts_pubmed,
    });

    const caminhoRaioXMd = path.join('/Users/user/Documents/Tool-Kit/ESCRITOS ARTIGOS V2/Artigos/painel', resImp.id, 'raio-x.md');
    if (!fs.existsSync(caminhoRaioXMd)) {
      throw new Error('Falha: raio-x.md não foi gerado na pasta do trabalho!');
    }
    console.log('✔ Teste 3 Aprovado: raio-x.md gerado e estruturado na pasta do trabalho!');
  } else {
    console.log('Aviso: Arquivo DOCX de teste não encontrado para o Teste 3.');
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DA REESTRUTURAÇÃO PASSARAM COM SUCESSO!');
  console.log('======================================================');
}

testar().catch((err) => {
  console.error('❌ ERRO NO TESTE:', err);
  process.exit(1);
});

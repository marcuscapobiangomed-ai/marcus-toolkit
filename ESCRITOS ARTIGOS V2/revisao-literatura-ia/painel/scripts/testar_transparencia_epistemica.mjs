import assert from 'node:assert';
import { avaliarRiscoVies, gerarTrafficLightSVG, gerarTabelaRiscoViesMarkdown } from '../lib/risco_vies.mjs';
import { extrairDesfechos, gerarTabelaSoFMarkdown, gerarTabelaSoFHtml, executarAgenteGrade } from '../lib/grade_sof.mjs';
import { auditarSimilaridade } from '../lib/turnitin_shield.mjs';
import { renderizarLaudoRaioXCompleto } from '../lib/render_raio_x.mjs';

console.log('🧪 Iniciando teste de Transparência Epistemológica e Rotulagem Ética (P4)...');

// 1. Teste RoB 2 / Risco de Viés
const dadosRoB = avaliarRiscoVies([{ titulo: 'Estudo Teste', resumo: 'Ensaio clínico randomizado.', delineamento: 'RCT' }]);
const svgTL = gerarTrafficLightSVG(dadosRoB);
const mdRoB = gerarTabelaRiscoViesMarkdown(dadosRoB);

console.log('[Teste 1] Risco de Viés -> Verificando rotulagem de estimativa');
assert(svgTL.includes('Estimativa algorítmica preliminar'), 'SVG deve conter aviso de estimativa algorítmica preliminar');
assert(mdRoB.includes('estimativa preliminar automatizada'), 'Tabela Markdown deve conter nota metodológica explícita');
assert(mdRoB.includes('não substituindo o julgamento pericial independente por pares humanos'), 'Deve destacar necessidade de chancela humana');

// 2. Teste GRADE / SoF
const gradeRes = executarAgenteGrade({ introducao: 'Mortalidade e sobrevida em 100 pacientes com resposta clínica.', resultados: 'Taxa de remissão de 50%.' }, dadosRoB);
const mdGrade = gradeRes.tabelaMd;
const htmlGrade = gradeRes.tabelaHtml;

console.log('[Teste 2] Sistema GRADE -> Verificando rotulagem da certeza da evidência');
assert(mdGrade.includes('estimativas preliminares automatizadas geradas por IA'), 'Markdown SoF deve indicar estimativa preliminar automatizada');
assert(htmlGrade.includes('Estimativa Algorítmica · GRADE'), 'HTML SoF deve conter badge de estimativa algorítmica');

// 3. Teste Turnitin / Originalidade
const auditTurnitin = auditarSimilaridade({ introducao: 'Texto acadêmico para teste de originalidade.' }, []);
console.log(`[Teste 3] Originalidade Preditiva -> Status: "${auditTurnitin.status}"`);
assert(!auditTurnitin.status.includes('Blindado'), 'Status não deve usar termo absolutista "Blindado"');
assert(auditTurnitin.aviso_metodologico.includes('não substitui o relatório definitivo do servidor oficial'), 'Deve conter aviso metodológico de limitação de escopo');

// 4. Teste Laudo de Raio-X Completo
const laudoHtml = renderizarLaudoRaioXCompleto({
  id: 'teste-laudo',
  titulo: 'Artigo de Avaliação Epistêmica',
  raio_x_entrada: {
    score_inicial: 95,
    diretriz: 'PRISMA 2020',
    delineamento: 'Revisão Sistemática',
    risco_vies: { score_medio: 90, estudos_avaliados: 10 },
    turnitin: { similaridade_preditiva: '< 3.0%', status: 'Excelente (< 3% estimado)' },
    compliance: { credit_pendente: true, prisma_itens: 28 },
  }
});

console.log('[Teste 4] Laudo Raio-X -> Verificando avisos epistêmicos e isenção');
assert(laudoHtml.includes('Nota Epistêmica:'), 'Laudo deve conter bloco de Nota Epistêmica');
assert(laudoHtml.includes('Isenção de Responsabilidade Epistêmica:'), 'Rodapé deve conter isenção de responsabilidade');
assert(laudoHtml.includes('Auditoria Preditiva de Similaridade'), 'Deve usar vocabulário de auditoria preditiva');

console.log('✅ Todos os testes de Transparência Epistemológica (Fase 7 - P4) passaram com 100% de sucesso!\n');

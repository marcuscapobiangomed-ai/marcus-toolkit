/**
 * Agente Sentinela de Retratações e Validador Bibliográfico Universal (Crossref / PubMed)
 * 
 * Inspeciona 100% das referências do artigo científico:
 * 1. Verifica se houve retratação (retraction / expression of concern / erratum) na Crossref e PubMed.
 * 2. Identifica e valida o identificador persistente DOI em bases oficiais com cache local.
 * 3. Recupera o abstract real para fundamentação factual da auditoria.
 * 4. Garante formatação Vancouver rigorosa com link de acesso permanente.
 */

import { hidratarReferenciasEmLote } from './hidratacao_bibliografica.mjs';

/**
 * Executa a auditoria bibliográfica completa sobre 100% das referências do manuscrito.
 */
export async function auditarReferenciasERetracoes(referencias = [], { limiteConsulta = null, progressoCb = null } = {}) {
  if (!Array.isArray(referencias) || referencias.length === 0) {
    return {
      total: 0,
      total_referencias: 0,
      com_doi: 0,
      validadas_crossref: 0,
      com_abstract_real: 0,
      retratadas: [],
      avisos: [],
      detalhes: [],
      referencias_hidratadas: [],
    };
  }

  // Se limiteConsulta for explicitamente passado e não-nulo, respeita; caso contrário, audita 100% das referências
  const listaAlvo = (limiteConsulta && Number(limiteConsulta) > 0)
    ? referencias.slice(0, Number(limiteConsulta))
    : referencias;

  const resultadoHidratacao = await hidratarReferenciasEmLote(listaAlvo, { progressoCb });
  const hidratadas = resultadoHidratacao.referencias;

  const retratadas = [];
  const avisos = [];
  const detalhes = [];
  let validadasCrossref = 0;
  let comDoi = 0;
  let comAbstractReal = 0;

  hidratadas.forEach((ref, idx) => {
    const n = ref.n || (idx + 1);
    const temDoi = Boolean(ref.doi);
    if (temDoi) comDoi++;
    if (ref.tem_abstract_real) comAbstractReal++;

    let status = 'NÃO_CONFERIDO_API';
    if (ref.retratado) {
      status = 'RETRATADO';
      retratadas.push({
        n,
        ref: ref.texto,
        titulo: ref.titulo,
        doi: ref.doi,
        motivo: 'Artigo identificado com nota de retratação ou cancelamento na base oficial.',
      });
    } else if (temDoi) {
      status = 'VALIDADO';
      validadasCrossref++;
    }

    detalhes.push({
      n,
      titulo: (ref.titulo || ref.texto || '').slice(0, 90),
      doi: ref.doi || 'Não detectado',
      status,
      tem_abstract: ref.tem_abstract_real,
    });
  });

  return {
    total: listaAlvo.length,
    total_referencias: listaAlvo.length,
    com_doi: comDoi,
    validadas_crossref: validadasCrossref,
    com_abstract_real: comAbstractReal,
    retratadas,
    avisos,
    detalhes,
    referencias_hidratadas: hidratadas,
  };
}

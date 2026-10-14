/**
 * Classificação da base de origem SOMENTE com evidência verificável.
 * Sem evidência, devolve 'nao_verificada'. Compartilhado por importador e migração.
 */
export function classificarBaseOrigem(r = {}) {
  const doi = (r.doi || '').toLowerCase();
  const per = (r.periodico || '').toLowerCase();
  const txt = ((r.texto || '') + ' ' + (r.titulo || '')).toLowerCase();
  const url = (r.url || '').toLowerCase();

  if (url.includes('scielo') || doi.includes('10.4067') || doi.includes('10.1590') || doi.includes('10.24950') || /chilena|medicina interna|arq bras|scielo/i.test(per) || /scielo\.pt|scielo\.org/i.test(txt)) {
    return { base: 'scielo', evidencia: 'url/doi/periódico' };
  }
  if (url.includes('lilacs') || url.includes('bvsalud') || doi.includes('10.24875') || doi.includes('10.24265') || /horizonte médico|archivos de cardiología de méxico|gaceta médica/i.test(per) || /lilacs|bvs/i.test(txt)) {
    return { base: 'lilacs', evidencia: 'url/doi/periódico' };
  }
  if (r.pmid || url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) {
    return { base: 'pubmed', evidencia: 'pmid/url' };
  }
  return { base: 'nao_verificada', evidencia: '' };
}

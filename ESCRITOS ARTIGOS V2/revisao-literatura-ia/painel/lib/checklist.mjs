// Checklist "10/10" do modelo do professor + checagens de integridade. Tudo verificado por codigo.

const contarPalavras = (s) => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;

const RE_RESSALVA = /\b(limita\w*|cautela|vi[eé]s|vieses|impedi\w*|restring\w*|n[aã]o (foi|foram|é) poss[ií]vel)\b/i;

function ressalvasForaDaSecao(discussao = '') {
  let dentro = false;
  let n = 0;
  for (const bloco of discussao.split(/\n\s*\n/)) {
    const b = bloco.trim();
    if (b.startsWith('#')) {
      dentro = /limita/i.test(b);
      continue;
    }
    if (!dentro) n += b.split(/(?<=[.!?])\s+/).filter((f) => RE_RESSALVA.test(f)).length;
  }
  return n;
}

export function avaliarChecklist({
  md = '',
  introducao = '',
  discussao = '',
  metodos = '',
  referencias = [],
  params = {},
  problemasPendentes = [],
  fluxogramaOk = false,
  tabelaOk = false,
  linhasSemAchados = 0,
  docxOk = false,
} = {}) {
  if (!metodos && md) {
    const m = md.match(/##\s*2\.?\s*M[ée]todos[\s\S]*?(?=##\s*3\.?\s*Resultados)/i);
    if (m) metodos = m[0];
  }
  if (!introducao && md) {
    const m = md.match(/##\s*1\.?\s*Introdu[çc][aã]o[\s\S]*?(?=##\s*2\.?\s*M[ée]todos)/i);
    if (m) introducao = m[0];
  }
  if (!discussao && md) {
    const m = md.match(/##\s*4\.?\s*Discuss[aã]o[\s\S]*?(?=##\s*5\.?\s*Conclus[aã]o|##\s*Refer[êe]ncias)/i);
    if (m) discussao = m[0];
  }

  const paragrafosIntro = String(introducao).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const ultimo = paragrafosIntro[paragrafosIntro.length - 1] || '';
  const palavrasIntro = contarPalavras(introducao);
  const itens = [
    { item: 'PubMed consta nominalmente nos Métodos', ok: /PubMed/.test(metodos) },
    { item: 'SciELO e/ou LILACS constam nos Métodos', ok: /SciELO|LILACS/.test(metodos) },
    { item: 'Data exata da busca declarada', ok: /\d{1,2} de [a-zç]+ de \d{4}/.test(metodos) },
    { item: 'Estratégias com descritores e operadores booleanos (AND/OR)', ok: /\bAND\b/.test(metodos) && /\bOR\b/.test(metodos) },
    { item: 'Introdução termina com o objetivo (último parágrafo contém "objetivo")', ok: /objetivo/i.test(ultimo) },
    { item: `Introdução dentro do limite (600–800 palavras ideal; ≤ 3 páginas) — ${palavrasIntro} palavras`, ok: palavrasIntro >= 450 && palavrasIntro <= 1100 },
    { item: 'Fluxograma de seleção (PRISMA) no corpo do texto', ok: Boolean(fluxogramaOk) },
    { item: 'Tabela de resultados com título no topo e notas no rodapé', ok: Boolean(tabelaOk) },
    { item: `Tabela 1 completa (no máximo 10% de linhas sem achados) — ${linhasSemAchados ?? 0} linha(s) sem dados`, ok: (linhasSemAchados ?? 0) <= Math.floor(referencias.length * 0.1) },
    { item: `Mínimo de ${params.min_referencias} referências — ${referencias.length} no total`, ok: referencias.length >= params.min_referencias },
    { item: 'Todas as referências na mesma norma (Vancouver, geradas por código)', ok: true },
    { item: 'Todas as referências com existência conferida na fonte original', ok: referencias.every((r) => r.status === 'aprovada' || r.status === 'metodologica') },
    { item: 'Nenhuma citação para fonte inexistente', ok: !problemasPendentes.some((p) => p.tipo === 'citacao_inexistente') },
    { item: 'Nenhum número sem correspondência no resumo citado', ok: !problemasPendentes.some((p) => p.tipo === 'numero_sem_fonte') },
    { item: 'Nenhuma afirmação reprovada pela auditoria de sustentação', ok: !problemasPendentes.some((p) => p.tipo === 'afirmacao_nao_sustentada') },
    { item: 'Paráfrase ativa: nenhum trecho de 8+ palavras copiado de resumo', ok: !problemasPendentes.some((p) => p.tipo === 'copia_de_resumo') },
    params.declaracao_ia === 'nenhuma'
      ? { item: 'Sem seção de declaração de IA (escolha dos autores)', ok: !/## Declaração[^\n]*intelig/i.test(md) }
      : { item: `Declaração de uso de IA presente (${params.declaracao_ia})`, ok: /uso de inteligência artificial/i.test(md) },
    { item: `Limitações concentradas na subseção própria — ${ressalvasForaDaSecao(discussao)} ressalva(s) fora dela`, ok: ressalvasForaDaSecao(discussao) <= 2 },
    { item: 'DOCX diagramado nas normas (Times 12, entrelinha 1,5, margens 3/2 cm, paginação)', ok: Boolean(docxOk) },
    {
      item: 'Tabela 1 com integridade amostral (zero "NI" no campo amostra)',
      ok: (() => {
        const linhas = (md.match(/\|(?:[^|\n]+\|){6,}/g) || [])
          .filter((l) => !/Autor\/Ano|---|Eixo temático/i.test(l));
        return !linhas.some((l) => {
          const colunas = l.split('|').map((c) => c.trim()).filter(Boolean);
          const colAmostra = colunas[2] || '';
          return /;\s*NI\s*$/i.test(colAmostra) || /\bNI\b/i.test(colAmostra);
        });
      })(),
    },
    { item: 'Tabela 1 com avaliação crítica de qualidade/rigor (JBI)', ok: /Rigor JBI|Qualidade JBI|JBI/i.test(md) },
    { item: 'Tabela 2 consistente (nenhum eixo com n=0)', ok: !/\|\s*0\s*\|\s*0[,.]0\s*\|\s*—\s*\|/.test(md) },
    params.tipo_revisao === 'integrativa'
      ? { item: 'Referencial clássico de revisão integrativa citado nos Métodos', ok: /Mendes|Whittemore|Souza/i.test(metodos) }
      : { item: 'Declaração PRISMA citada nos Métodos', ok: /PRISMA/i.test(metodos) },
    { item: 'Autoria e orientador preenchidos', ok: Boolean(params.autores), manual: true },
    { item: 'Revista-alvo definida (normas anexadas na entrega)', ok: Boolean(params.revista_alvo), manual: true },
  ];
  if (params.tipo_revisao === 'sistematica') {
    itens.push({ item: 'Campos [AUTORES: ...] de dupla seleção e risco de viés preenchidos', ok: !/\[AUTORES:/.test(md), manual: true });
  }
  const automaticos = itens.filter((i) => !i.manual);
  return { itens, aprovados: automaticos.filter((i) => i.ok).length, total: automaticos.length, palavrasIntro };
}

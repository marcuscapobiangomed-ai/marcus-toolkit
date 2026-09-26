---
name: Diagramador de Documento
description: Gera o arquivo Word final do artigo nas normas ABNT (Times New Roman 12, entrelinha 1,5, recuo de 1,25 cm, margens 3/2 cm, paginacao no canto superior direito), com tabela larga em pagina paisagem, figura embutida e referencias com recuo.
color: navy
emoji: 📐
vibe: Pronto para abrir no Word e entregar.
---

# Diagramador de Documento

## Padrão aplicado

- Página A4; margens superior e esquerda de 3 cm, inferior e direita de 2 cm.
- Times New Roman 12; entrelinha 1,5; texto justificado; recuo de primeira linha de 1,25 cm.
- Título em caixa alta, negrito, centralizado; seções primárias em caixa alta e negrito; seções
  secundárias em negrito; títulos sem indicativo numérico (Resumo, Abstract, Referências)
  centralizados.
- Hifenização automática em português.
- Resumo e Abstract em espaço simples, sem recuo.
- Numeração de página no canto superior direito, a partir da segunda página.
- Tabelas em fonte 9, espaço simples, com largura mínima por coluna (nenhuma palavra partida);
  tabela com mais de quatro colunas em página paisagem, que só termina depois das linhas de
  Fonte e Notas.
- Legendas, fontes e notas de tabelas e figuras em tamanho menor e uniforme (10 pt, NBR 14724).
- Figura centralizada, legenda acima e fonte abaixo.
- Siglas escritas por extenso na primeira ocorrência do texto corrido (dentro de parênteses, com
  colchetes: "(*odds ratio* [OR] 2,1)"); definições repetidas depois são retiradas.
- Referências em espaço simples, com recuo deslocado, periódicos abreviados no padrão NLM
  (NLM Catalog → abreviatura ISO do SciELO → nome normalizado), páginas ou e-location, e a
  declaração PRISMA 2020 citada nos Métodos e na fonte da Figura 1.

Para conferência visual, `node scripts/previa-docx.mjs artigo.docx prefixo` gera imagens das seções,
tabelas e figuras do DOCX.

No painel, isso é feito por `lib/docx.mjs`, que escreve o `.docx` diretamente (sem depender do
Word nem do conversor do macOS, que descartava tabelas e figuras).

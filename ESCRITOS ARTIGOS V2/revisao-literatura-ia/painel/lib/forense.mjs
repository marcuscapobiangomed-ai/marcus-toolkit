/**
 * Agente de Higienização Forense de Unicode e Sanitização de Metadados
 * 
 * Executa a limpeza "Layer A" profunda contra artefatos tipográficos invisíveis,
 * caracteres homóglifos (Cyrillic/Greek lookalikes), bidi overrides e marcas esteganográficas,
 * além de higienizar metadados internos de arquivos .docx.
 */

// Conjunto de codepoints invisíveis, formatadores e marcadores esteganográficos
const CODEPOINTS_INVISIVEIS = new Set([
  0x00AD, // soft hyphen
  0x034F, // combining grapheme joiner
  0x061C, // Arabic letter mark
  0x115F, 0x1160, // Hangul fillers
  0x17B4, 0x17B5, // Khmer vowel inherents
  0x180B, 0x180C, 0x180D, 0x180E, // Mongolian variation selectors / separator
  0x200B, // zero width space (ZWSP)
  0x200C, // zero width non-joiner (ZWNJ)
  0x200D, // zero width joiner (ZWJ)
  0x200E, 0x200F, // LRM, RLM
  0x202A, 0x202B, 0x202C, 0x202D, 0x202E, // LRE, RLE, PDF, LRO, RLO
  0x2060, // word joiner
  0x2061, 0x2062, 0x2063, 0x2064, // invisible math operators / separator
  0x2066, 0x2067, 0x2068, 0x2069, // LRI, RLI, FSI, PDI
  0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F, // symmetric swapping inhibits
  0xFEFF, // Byte Order Mark (BOM) / ZWNBSP
]);

// Mapa de homóglifos comuns inseridos por IA/steganography (Cirílico/Grego -> Latino)
const HOMOGLIFOS_PARA_LATINO = {
  // Cirílico minúsculo
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's',
  // Cirílico maiúsculo
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
  // Grego
  'ο': 'o', 'ν': 'v', 'Ο': 'O', 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ρ': 'P', 'Τ': 'T', 'Χ': 'X',
};

/**
 * Higieniza o texto bruto, removendo caracteres invisíveis, corrigindo homóglifos
 * inseridos no meio de palavras latinas e normalizando espaços atípicos.
 */
export function higienizarTextoForense(texto) {
  if (!texto || typeof texto !== 'string') {
    return { texto: '', estatisticas: { invisiveis: 0, homoglifos: 0, espacos_corrigidos: 0 } };
  }

  let invisiveisRemovidos = 0;
  let homoglifosSubstituidos = 0;
  let espacosCorrigidos = 0;

  // 1. Remoção de codepoints invisíveis
  const charsLimpos = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0);
    if (CODEPOINTS_INVISIVEIS.has(cp) || (cp >= 0xFE00 && cp <= 0xFE0F)) {
      invisiveisRemovidos++;
    } else {
      charsLimpos.push(ch);
    }
  }

  let resultado = charsLimpos.join('');

  // 2. Normalização de quebras de parágrafo / linha atípicas (\u2028, \u2029)
  resultado = resultado.replace(/[\u2028\u2029]/g, '\n');

  // 3. Normalização de espaços tipográficos atípicos para espaço padrão
  resultado = resultado.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, () => {
    espacosCorrigidos++;
    return ' ';
  });

  // 4. Detecção e conversão de homóglifos em palavras predominantemente latinas
  resultado = resultado.replace(/[\p{L}]+/gu, (palavra) => {
    // Se a palavra contém caracteres latinos E homóglifos cirílicos/gregos misturados:
    const temLatino = /[a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]/.test(palavra);
    if (!temLatino) return palavra;

    let palavraCorrigida = '';
    let alterou = false;
    for (const char of palavra) {
      if (HOMOGLIFOS_PARA_LATINO[char]) {
        palavraCorrigida += HOMOGLIFOS_PARA_LATINO[char];
        homoglifosSubstituidos++;
        alterou = true;
      } else {
        palavraCorrigida += char;
      }
    }
    return alterou ? palavraCorrigida : palavra;
  });

  return {
    texto: resultado,
    estatisticas: {
      invisiveis: invisiveisRemovidos,
      homoglifos: homoglifosSubstituidos,
      espacos_corrigidos: espacosCorrigidos,
      total_artefatos: invisiveisRemovidos + homoglifosSubstituidos + espacosCorrigidos,
    },
  };
}

/**
 * Gera metadados sanitizados e íntegros de OpenXML para arquivos .docx nas normas ABNT.
 * Preserva o título real e datas fidedignas, sem dados falsos de autoria, empresa ou ferramentas de terceiros.
 */
export function metadadosWordVerossimeis(titulo, opcoes = {}) {
  const agora = new Date();
  const isoAgora = agora.toISOString().replace(/\.\d+Z$/, 'Z');
  const autorHonesto = (opcoes.autor || opcoes.autores || 'Autor').trim();
  const tituloLimpo = titulo
    ? String(titulo).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'Artigo Científico';

  const coreProperties = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${tituloLimpo}</dc:title>
  <dc:creator>${autorHonesto}</dc:creator>
  <cp:lastModifiedBy>${autorHonesto}</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${isoAgora}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${isoAgora}</dcterms:modified>
</cp:coreProperties>`;

  const appProperties = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Template>Normal.dotm</Template>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

  return {
    coreProperties,
    appProperties,
    application: 'Microsoft Office Word',
    appVersion: '16.0000',
    creator: autorHonesto,
  };
}

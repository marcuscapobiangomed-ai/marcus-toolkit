/**
 * Extrai o país a partir do texto de afiliação institucional (PubMed/Crossref).
 * Só devolve país com evidência textual explícita; caso contrário devolve ''.
 * Convenção PubMed: o país costuma ser o último segmento da afiliação (após vírgula).
 */

const PAISES = [
  ['Brasil', /\b(brazil|brasil)\b/i],
  ['Estados Unidos', /\b(usa|u\.s\.a\.?|united states( of america)?)\b/i],
  ['Reino Unido', /\b(united kingdom|uk|england|scotland|wales|northern ireland)\b/i],
  ['Canadá', /\bcanad[aá]\b/i],
  ['México', /\b(mexico|méxico)\b/i],
  ['Argentina', /\bargentina\b/i],
  ['Chile', /\bchile\b/i],
  ['Colômbia', /\bcolombia\b/i],
  ['Peru', /\bper[uú]\b/i],
  ['Uruguai', /\buruguay\b/i],
  ['Portugal', /\bportugal\b/i],
  ['Espanha', /\b(spain|españa|espana)\b/i],
  ['França', /\bfrance\b/i],
  ['Alemanha', /\b(germany|deutschland)\b/i],
  ['Itália', /\b(italy|italia)\b/i],
  ['Países Baixos', /\b(netherlands|the netherlands|holland)\b/i],
  ['Suíça', /\bswitzerland\b/i],
  ['Suécia', /\bsweden\b/i],
  ['Dinamarca', /\bdenmark\b/i],
  ['Noruega', /\bnorway\b/i],
  ['Bélgica', /\bbelgium\b/i],
  ['China', /\b(china|p\.?\s?r\.? china)\b/i],
  ['Japão', /\bjapan\b/i],
  ['Coreia do Sul', /\b(south korea|republic of korea|korea)\b/i],
  ['Índia', /\bindia\b/i],
  ['Austrália', /\baustralia\b/i],
  ['Irã', /\biran\b/i],
  ['Turquia', /\b(turkey|türkiye|turkiye)\b/i],
  ['Egito', /\begypt\b/i],
  ['África do Sul', /\bsouth africa\b/i],
  ['Arábia Saudita', /\bsaudi arabia\b/i],
  ['Israel', /\bisrael\b/i],
];

export function paisDaAfiliacao(afiliacao = '') {
  const txt = String(afiliacao || '').trim();
  if (!txt) return '';
  // Prioriza o último segmento (convenção PubMed), depois o texto inteiro.
  const segmentos = txt.replace(/\.\s*$/, '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const ultimo = segmentos[segmentos.length - 1] || '';
  for (const [nome, re] of PAISES) if (re.test(ultimo)) return nome;
  const candidatos = PAISES.filter(([, re]) => re.test(txt));
  return candidatos.length === 1 ? candidatos[0][0] : '';
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Coeficiente de Dice sobre palavras: 1 = titulos identicos apos normalizacao.
export function similaridade(a, b) {
  const pa = normalizar(a).split(' ').filter((w) => w.length > 2);
  const pb = normalizar(b).split(' ').filter((w) => w.length > 2);
  if (!pa.length || !pb.length) return 0;
  const sb = new Map();
  for (const w of pb) sb.set(w, (sb.get(w) || 0) + 1);
  let comum = 0;
  for (const w of pa) {
    const n = sb.get(w);
    if (n) {
      comum++;
      sb.set(w, n - 1);
    }
  }
  return (2 * comum) / (pa.length + pb.length);
}

export function paginaContemTitulo(textoPagina, titulo) {
  if (!titulo) return false;
  const linhas = textoPagina.split(/\n+/).filter((l) => l.trim().length > 15);
  if (linhas.some((l) => similaridade(l, titulo) >= 0.85)) return true;
  const inicio = normalizar(titulo).slice(0, 60);
  return inicio.length >= 20 && normalizar(textoPagina).includes(inicio);
}

export function slug(s, max = 60) {
  return normalizar(s).replace(/\s+/g, '-').slice(0, max).replace(/-+$/, '') || 'revisao';
}

// Higiene: remove caracteres invisiveis/formatadores que ferramentas costumam deixar no texto.
const INVISIVEIS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\u00AD\u180E]/g;
const ESPECIAIS = /[\u00A0\u2028\u2029]/g;
export function limparInvisiveis(s) {
  const removidos = (s.match(INVISIVEIS)?.length || 0) + (s.match(ESPECIAIS)?.length || 0);
  const texto = s.replace(INVISIVEIS, '').replace(/\u00A0/g, ' ').replace(/[\u2028\u2029]/g, '\n');
  return { texto, removidos };
}

export function escaparHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodificarEntidades(s) {
  return String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

// "Miyahara, Andre Kiyoshi" -> "Miyahara AK"; "Goupil R" permanece.
export function autorVancouver(nome) {
  const n = String(nome || '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  if (!n.includes(',')) return n;
  const [sobrenome, resto] = n.split(',', 2).map((x) => x.trim());
  const iniciais = resto
    .split(/[\s-]+/)
    .filter(Boolean)
    // particulas so em minusculas: "E" sozinho e inicial (ex.: "Altamirano, E"), nao a conjuncao "e"
    .filter((p) => !/^(de|da|do|dos|das|e|y|del|la)$/.test(p))
    .map((p) => p[0].toUpperCase())
    .join('');
  return `${sobrenome} ${iniciais}`.trim();
}

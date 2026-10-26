/** Paletas de dados: identidade por matiz, contraste adequado a cada fundo. */
export type ModoCor = "dark" | "light";
export const FUNDO_DADOS_CLARO = "#edf1f8";
export const FUNDO_ROTULOS_CLARO = "#ead8eb";

function hsl(cor: string): [number, number, number] {
  const match = cor.match(/^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/);
  if (match) return [+match[1], +match[2] / 100, +match[3] / 100];
  let hex = cor.replace("#", "");
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}

function luminancia(cor: string): number {
  const [h, s, l] = hsl(cor);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const linear = rgb.map((v) => v + m).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}

export function contrasteCor(a: string, b: string): number {
  const x = luminancia(a), y = luminancia(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/** Escurece somente a luminosidade; mantém matiz e saturação da identidade. */
export function corParaFundoClaro(cor: string, minimo = 4.5, fundo = FUNDO_ROTULOS_CLARO): string {
  if (contrasteCor(cor, fundo) >= minimo) return cor;
  const [h, s, l] = hsl(cor);
  const montar = (v: number) => `hsl(${h.toFixed(3)} ${(s * 100).toFixed(3)}% ${(v * 100).toFixed(3)}%)`;
  let seguro = 0, alto = l;
  for (let i = 0; i < 24; i++) {
    const meio = (seguro + alto) / 2;
    if (contrasteCor(montar(meio), fundo) >= minimo + .01) seguro = meio; else alto = meio;
  }
  return montar(seguro);
}

const publicidadeEscura = ["#f38bc1", "#c2adf1", "#f03d94", "#a4b7e6", "#dc76b3", "#9489d9", "#d3a5d8", "#7186b6"];
const escura = {
  intensidade: ["#56a6c3", "#8b79bb", "#e773ae"],
  patrimonio: ["#735a9e", "#b54c9d", "#ff68a8"],
  razao: ["#4f7fe3", "#7d7099", "#ff68a8"],
  abstencao: ["#2f4fbf", "#ff5a4d"], publicidade: publicidadeEscura,
};
const clara = {
  intensidade: ["#6689b3", "#806096", "#a02366"],
  patrimonio: ["#9e7db5", "#9d4e98", "#9a1e5c"],
  razao: ["#315fa5", "#877099", "#b1266d"],
  abstencao: ["#3156a8", "#b52e4f"],
  publicidade: publicidadeEscura.map((c) => corParaFundoClaro(c, 3, FUNDO_DADOS_CLARO)),
};
export const paletaAnalises = (tema: ModoCor) => tema === "light" ? clara : escura;

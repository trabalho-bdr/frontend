// Nuvem de categorias da Q9: escala por valor contratado e layout determinístico.
// Módulo puro (sem DOM): a medição de texto é injetada para poder ser testada.

export const CLOUD_FONT_STACK = "Manrope, 'DM Sans', sans-serif";
export const CLOUD_LIMIT = 24;
export const CLOUD_PAPER = '#fbf4e2';
// Mapa de calor: valores menores em azul frio, passando por ciano, verde, âmbar,
// laranja até o vermelho rubi de maior valor.
// Todas as paradas e intermediários mantêm contraste mínimo de 4,5:1 sobre CLOUD_PAPER.
export const CLOUD_STOPS = [
  '#1d4ed8',
  '#0369a1',
  '#0f766e',
  '#b45309',
  '#c2410c',
  '#991b1b',
];

const HIT_X = 6;
const HIT_MIN_W = 48;
const HIT_MIN_H = 32;
const MARGIN = 6;
const collator = new Intl.Collator('pt-BR');
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const rowLabel = (row) => row?.categoria || row?.grupo || 'Sem categoria';
export const rowKey = (row) => `${row?.grupo ?? ''}::${row?.categoria ?? ''}`;

/** Ordena explicitamente por valor decrescente (empates por nome) e remove o que a escala não comporta. */
export function rankCategories(rows = []) {
  return rows
    .filter((row) => Number.isFinite(row?.valor) && row.valor > 0)
    .slice()
    .sort(
      (a, b) =>
        b.valor - a.valor ||
        collator.compare(String(a.categoria ?? ''), String(b.categoria ?? '')) ||
        collator.compare(String(a.grupo ?? ''), String(b.grupo ?? '')),
    );
}

export function selectCloudWords(rows = [], limit = CLOUD_LIMIT) {
  const ranked = rankCategories(rows);
  const shown = ranked.slice(0, limit);
  return {
    shown,
    eligible: ranked.length,
    total: rows.length,
    hidden: ranked.length - shown.length,
    excluded: rows.length - ranked.length,
  };
}

/** Razão 0–1 usada para tamanho e cor: compressão monotônica que espalha o mapa de calor. */
export const weightRatio = (valor, maximum) =>
  maximum > 0 ? clamp((Math.max(0, valor) / maximum) ** 0.42, 0, 1) : 0;

export const weightForRatio = (t) => (t > 0.6 ? 800 : t > 0.28 ? 700 : 600);

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
export function colorForRatio(t, stops = CLOUD_STOPS) {
  const x = clamp(t, 0, 1) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(x));
  const from = hex(stops[index]);
  const to = hex(stops[index + 1]);
  const mix = x - index;
  return (
    '#' +
    from
      .map((channel, i) =>
        Math.round(channel + (to[i] - channel) * mix)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** Quebra por palavras; partes maiores que a linha são divididas por caracteres. */
export function wrapLabel(text, font, weight, maxLine, measure) {
  const lines = [];
  let current = '';
  const push = (word) => {
    const attempt = current ? current + ' ' + word : word;
    if (measure(attempt, font, weight) <= maxLine || !current) current = attempt;
    else {
      lines.push(current);
      current = word;
    }
  };
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (measure(word, font, weight) <= maxLine) {
      push(word);
      continue;
    }
    if (current) lines.push(current);
    current = '';
    let piece = '';
    for (const char of word) {
      if (piece && measure(piece + char, font, weight) > maxLine) {
        lines.push(piece);
        piece = '';
      }
      piece += char;
    }
    current = piece;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Posiciona palavras horizontais em espiral elíptica, da maior para a menor,
 * sem aleatoriedade: o mesmo conjunto e a mesma largura geram a mesma figura.
 */
export function layoutCloud(rows, { width, measure, minHeight = 0 }) {
  if (!rows.length || !(width > 0)) return { height: minHeight, items: [] };
  const narrow = width < 520;
  const pad = narrow ? 10 : 22;
  const inner = Math.max(120, width - 2 * pad);
  const avail = inner - 2 * HIT_X;
  const minFont = narrow ? 13 : 14;
  const maxFont = clamp(inner * 0.095, narrow ? 26 : 30, 62);
  const maximum = Math.max(...rows.map((row) => row.valor));
  const base = rows.map((row) => {
    const t = weightRatio(row.valor, maximum);
    return { row, t, weight: weightForRatio(t), font: minFont + (maxFont - minFont) * t };
  });
  const widest = (item, font) =>
    Math.max(
      ...rowLabel(item.row)
        .split(/\s+/)
        .map((token) => measure(token, font, item.weight)),
    );
  // Uma única redução global preserva a ordem entre tamanhos.
  let shrink = 1;
  for (const item of base) {
    const width0 = widest(item, item.font);
    if (width0 > avail) shrink = Math.min(shrink, avail / width0);
  }
  const items = base.map((item) => {
    const font = Math.round(Math.max(12, item.font * shrink) * 2) / 2;
    const label = rowLabel(item.row);
    const token = widest(item, font);
    let lineMax = clamp(font * 0.62 * 13, Math.min(token, avail), avail);
    let lines = wrapLabel(label, font, item.weight, lineMax, measure);
    for (let tries = 0; lines.length > 3 && lineMax < avail && tries < 4; tries++) {
      lineMax = Math.min(avail, lineMax * 1.35);
      lines = wrapLabel(label, font, item.weight, lineMax, measure);
    }
    const lineHeight = font * 1.12;
    const textW = Math.max(...lines.map((line) => measure(line, font, item.weight)));
    const textH = lines.length * lineHeight;
    return {
      ...item,
      font,
      lines,
      lineHeight,
      textW,
      textH,
      color: colorForRatio(item.t),
      hw: Math.min(inner, Math.max(HIT_MIN_W, textW + 2 * HIT_X)),
      hh: Math.max(HIT_MIN_H, textH + 12),
      cx: 0,
      cy: 0,
    };
  });

  const placed = [];
  const stretch = narrow ? 1.15 : 2.3;
  const fits = (cx, cy, item) => {
    if (cx - item.hw / 2 < pad || cx + item.hw / 2 > width - pad) return false;
    return placed.every(
      (other) =>
        Math.abs(cx - other.cx) >= (item.hw + other.hw) / 2 + MARGIN ||
        Math.abs(cy - other.cy) >= (item.hh + other.hh) / 2 + MARGIN,
    );
  };
  for (const item of items) {
    let done = false;
    for (let step = 0; step < 9000 && !done; step++) {
      const angle = step * 0.09;
      const radius = 2.2 * angle;
      const cx = width / 2 + radius * Math.cos(angle) * stretch;
      const cy = radius * Math.sin(angle);
      if (fits(cx, cy, item)) {
        item.cx = cx;
        item.cy = cy;
        done = true;
      }
    }
    if (!done) {
      const bottom = Math.max(...placed.map((other) => other.cy + other.hh / 2));
      item.cx = width / 2;
      item.cy = bottom + MARGIN + item.hh / 2;
    }
    placed.push(item);
  }

  const top = Math.min(...items.map((item) => item.cy - item.hh / 2));
  const bottom = Math.max(...items.map((item) => item.cy + item.hh / 2));
  const left = Math.min(...items.map((item) => item.cx - item.hw / 2));
  const right = Math.max(...items.map((item) => item.cx + item.hw / 2));
  const verticalPad = narrow ? 14 : 22;
  const height = Math.max(minHeight, Math.ceil(bottom - top + 2 * verticalPad));
  const dx = width / 2 - (left + right) / 2;
  const dy = (height - (bottom - top)) / 2 - top;
  for (const item of items) {
    item.cx = Math.round((item.cx + dx) * 10) / 10;
    item.cy = Math.round((item.cy + dy) * 10) / 10;
  }
  return { height, items };
}

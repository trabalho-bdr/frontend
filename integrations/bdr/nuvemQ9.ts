/** Layout determinístico: rótulos inteiros, caixas sem colisão e peso monetário. */
export type PalavraEntrada = { categoria: string; grupo: string; valor: number };
export type PalavraPosicionada = PalavraEntrada & {
  x: number; y: number; tamanho: number; largura: number; altura: number; linhas: string[];
};

function linhasRotulo(texto: string): string[] {
  const linhas: string[] = [];
  for (const palavra of texto.split(/\s+/)) {
    if (!linhas.length || `${linhas[linhas.length - 1]} ${palavra}`.length > 24) linhas.push(palavra);
    else linhas[linhas.length - 1] += ` ${palavra}`;
  }
  return linhas;
}

export function posicionarPalavras(
  entrada: PalavraEntrada[], largura: number, altura: number,
  medir = (texto: string, tamanho: number) => texto.length * tamanho * .56,
): PalavraPosicionada[] {
  const candidatas = entrada.filter((p) => Number.isFinite(p.valor) && p.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria, "pt-BR"))
    .slice(0, largura < 520 ? 18 : 32);
  const maior = candidatas[0]?.valor || 1;
  const linhasPrincipal = linhasRotulo(candidatas[0]?.categoria || "Publicidade");
  const fontePrincipal = Math.min(largura < 520 ? 43 : 62,
    largura * (largura < 520 ? .8 : .62) / Math.max(...linhasPrincipal.map((s) => medir(s, 1))),
    altura * .3 / (linhasPrincipal.length * 1.12));
  const colocadas: PalavraPosicionada[] = [];
  for (const palavra of candidatas) {
    const linhas = linhasRotulo(palavra.categoria);
    const inicial = 12 + Math.sqrt(palavra.valor / maior) * Math.max(0, fontePrincipal - 12);
    let encontrada = false;
    for (let tentativa = 0; tentativa < 4 && !encontrada; tentativa++) {
      const tamanho = Math.max(12, inicial * (1 - tentativa * .12));
      const w = Math.max(...linhas.map((s) => medir(s, tamanho))) + 14;
      const h = linhas.length * tamanho * 1.12 + 12;
      if (w > largura - 12 || h > altura - 12) continue;
      for (let i = 0; i < 5200; i++) {
        const angulo = i * .37;
        const raio = 3 * Math.sqrt(i);
        const x = largura / 2 + Math.cos(angulo) * raio * Math.max(1, largura / altura * .8);
        const y = altura / 2 + Math.sin(angulo) * raio;
        if (x - w / 2 < 6 || x + w / 2 > largura - 6 || y - h / 2 < 6 || y + h / 2 > altura - 6) continue;
        if (colocadas.some((p) => Math.abs(p.x - x) < (p.largura + w) / 2 && Math.abs(p.y - y) < (p.altura + h) / 2)) continue;
        colocadas.push({ ...palavra, x, y, tamanho, largura: w, altura: h, linhas });
        encontrada = true;
        break;
      }
    }
  }
  return colocadas;
}

const LIMITE_CONSULTA_MS = 45_000;

export async function consultarJson<T>(url: string, signal: AbortSignal, limiteMs = LIMITE_CONSULTA_MS): Promise<T> {
  const consulta = new AbortController();
  const cancelar = () => consulta.abort(signal.reason);
  if (signal.aborted) cancelar();
  else signal.addEventListener("abort", cancelar, { once: true });
  let expirou = false;
  const limite = setTimeout(() => { expirou = true; consulta.abort(); }, limiteMs);
  try {
    const resposta = await fetch(url, { signal: consulta.signal });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => null);
      throw new Error(typeof erro?.detail === "string" ? erro.detail : "Não foi possível consultar os dados. Tente novamente.");
    }
    return await resposta.json();
  } catch (erro) {
    if (expirou && !signal.aborted) {
      throw new Error(`A consulta demorou mais de ${Math.round(limiteMs / 1000)} segundos. Tente novamente ou reduza o recorte pelos filtros.`);
    }
    throw erro;
  } finally {
    clearTimeout(limite);
    signal.removeEventListener("abort", cancelar);
  }
}

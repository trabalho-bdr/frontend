
import { scaleLinear } from "d3-scale";
import { feature } from "topojson-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GraficosLegenda, HistoricoAno, resumirLegendaPorPartido } from "./GraficosLegenda";
import { Feat, Mapa } from "./Mapa";
import { gerarLinhasMockLegenda, opcoesMockLegenda } from "./mockLegenda";
import { coresUf, corPartido as corDoPartido } from "./coresEleitorais";
import { paletaAnalises } from "./paletaAnalises";
import { PainelPublicidade } from "./PainelQ9";
import { PainelPatrimonio } from "./PainelPatrimonio";
import { AlternarTema, useTema } from "./Tema";

type Cat = { ufs: { cod: string; sigla: string; nome: string }[]; municipios: Record<string, { id: string; nome: string }[]> };
type Reg = Record<string, number | string | null>;
type Dados = { uf: string; ano: number; municipios: Record<string, Reg> };
type LinhaLegenda = { id_municipio: string; municipio: string; id_partido: string; partido: string; votos_legenda: number; votos_nominais: number };
type OpcaoLegenda = { ano: number; cargo: string };
type DadosUfLegenda = { uf: string; linhas: LinhaLegenda[] };
type DadosAnoUfLegenda = DadosUfLegenda & { ano: number };
const COBERTOS = ["CE", "MA", "MS", "RJ", "RN", "RS"];
const ANOS_CARGO_LEGENDA: Record<string, number[]> = { "Deputado Federal": [2018, 2022], "Deputado Estadual": [2018, 2022], "Vereador": [2020, 2024] };
const SEM_MUNICIPIOS: { id: string; nome: string }[] = [];
const SEM_OPCOES_LEGENDA: OpcaoLegenda[] = [];
const CINZA_SEM_REGISTRO = "var(--theme-map-nodata,#2b2b31)", ROXO_SEM_VALOR = "var(--theme-map-undefined,#4a3d5c)";

const json = async <T,>(u: string, signal?: AbortSignal): Promise<T> => {
  const r = await fetch(u, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
const feats = (topo: any): Feat[] => (feature(topo, topo.objects[Object.keys(topo.objects)[0]]) as any).features;
const fmt = (v: unknown, d = 0, suf = "") =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: d }) + suf : "sem dado";
const somarLinhasLegenda = (linhas: LinhaLegenda[]): LinhaLegenda[] => {
  const agrupadas = new Map<string, LinhaLegenda>();
  for (const item of linhas) {
    const chave = `${item.id_municipio}/${item.id_partido}`;
    const atual = agrupadas.get(chave);
    if (atual) {
      atual.votos_legenda += item.votos_legenda;
      atual.votos_nominais += item.votos_nominais;
    } else agrupadas.set(chave, { ...item });
  }
  return [...agrupadas.values()];
};

export function App({initialAnalise = "abstencao"}: {initialAnalise?: "abstencao" | "legenda" | "publicidade" | "patrimonio"}) {
  const { tema } = useTema();
  const paleta = paletaAnalises(tema), CORES_UF = coresUf(tema);
  const CORES_INTENSIDADE_UF = paleta.intensidade;
  const corPartido = (sigla: string) => corDoPartido(sigla, tema);
  const [analise, setAnalise] = useState(initialAnalise);
  const [todosAnosLegenda, setTodosAnosLegenda] = useState(false);
  const mostrarMock = false;
  const [visaoMapa, setVisaoMapa] = useState<"intensidade" | "vencedor">("vencedor");
  const [cat, setCat] = useState<Cat | null>(null);
  const [ufs, setUfs] = useState<Feat[]>([]);
  const [uf, setUf] = useState<string | null>(null);
  const [mun, setMun] = useState<string | null>(null);
  const [geoMun, setGeoMun] = useState<Record<string, Feat[]>>({});
  const [anos, setAnos] = useState<number[]>([]);
  const [ano, setAno] = useState<number | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [status, setStatus] = useState<"ok" | "carregando" | "erro" | "api">("ok");
  const [erroGeo, setErroGeo] = useState("");
  const [opcoesLegenda, setOpcoesLegenda] = useState<OpcaoLegenda[]>([]);
  const [anoLegenda, setAnoLegenda] = useState<number | null>(null);
  const [cargo, setCargo] = useState("");
  const [partido, setPartido] = useState("");
  const [buscaRankingPartido, setBuscaRankingPartido] = useState("");
  const [mostrarTodosPartidos, setMostrarTodosPartidos] = useState(false);
  const [faixaLegendaSelecionada, setFaixaLegendaSelecionada] = useState<number | null>(null);
  const [linhasLegenda, setLinhasLegenda] = useState<LinhaLegenda[]>([]);
  const [statusLegenda, setStatusLegenda] = useState<"ok" | "carregando" | "erro">("ok");
  const [dadosBrasil, setDadosBrasil] = useState<DadosUfLegenda[]>([]);
  const [statusBrasil, setStatusBrasil] = useState<"ok" | "carregando" | "erro">("ok");
  const [dadosHistoricos, setDadosHistoricos] = useState<DadosAnoUfLegenda[]>([]);
  const [statusHistorico, setStatusHistorico] = useState<"ok" | "carregando" | "erro">("ok");
  const [chaveHistorico, setChaveHistorico] = useState("");
  const chaveHistoricoAtual = `${cargo}|${uf ?? "BR"}|${opcoesLegenda.filter((item) => item.cargo === cargo && ANOS_CARGO_LEGENDA[cargo]?.includes(item.ano)).map((item) => item.ano).join(",")}`;
  const cache = useRef(new Map<string, Dados>());

  useEffect(() => {  // base geográfica (estática) e anos disponíveis (API)
    json<Cat>("/geo/catalogo.json").then(setCat).catch(() => setErroGeo("Catálogo de municípios ausente. Rode scripts/preparar_malhas.py."));
    json<any>("/geo/br_ufs.json").then((t) => setUfs(feats(t))).catch(() => setErroGeo("Malha nacional ausente. Rode scripts/preparar_malhas.py."));
    json<{ anos: number[] }>("/api/bdr/anos").then((r) => { setAnos(r.anos); setAno(r.anos[r.anos.length - 1] ?? null); })
      .catch(() => setStatus("api"));
    json<{ opcoes: OpcaoLegenda[] }>("/api/bdr/legenda/opcoes").then((r) => {
      setOpcoesLegenda(r.opcoes);
      const preferida = r.opcoes.find((o) => o.ano === 2022 && o.cargo === "Deputado Federal") || r.opcoes.find((o) => ANOS_CARGO_LEGENDA[o.cargo]?.includes(o.ano));
      if (preferida) { setAnoLegenda(preferida.ano); setCargo(preferida.cargo); }
    }).catch(() => setStatusLegenda("erro"));
  }, []);

  useEffect(() => {  // malha municipal sob demanda, com cache
    if (!uf || geoMun[uf]) return;
    const ac = new AbortController();
    json<any>(`/geo/${uf}.json`, ac.signal).then((t) => setGeoMun((m) => ({ ...m, [uf]: feats(t) })))
      .catch((e) => e.name !== "AbortError" && setErroGeo(`Malha municipal de ${uf} indisponível.`));
    return () => ac.abort();
  }, [uf]);

  useEffect(() => {  // indicadores: respostas antigas são abortadas e ignoradas
    if (!uf || ano == null) return;
    const chave = `${uf}/${ano}`, hit = cache.current.get(chave);
    if (hit) { setDados(hit); setStatus("ok"); return; }
    const ac = new AbortController();
    setDados(null); setStatus("carregando");
    json<Dados>(`/api/bdr/q3/${uf}/${ano}`, ac.signal).then((d) => {
      if (ac.signal.aborted) return;
      cache.current.set(chave, d); setDados(d); setStatus("ok");
    }).catch((e) => e.name !== "AbortError" && setStatus("erro"));
    return () => ac.abort();
  }, [uf, ano]);

  useEffect(() => {
    if (mostrarMock || todosAnosLegenda || !uf || anoLegenda == null || !cargo) { setLinhasLegenda([]); return; }
    const ac = new AbortController(); setLinhasLegenda([]); setStatusLegenda("carregando");
    json<{ linhas: LinhaLegenda[] }>(`/api/bdr/legenda/${uf}/${anoLegenda}?cargo=${encodeURIComponent(cargo)}`, ac.signal)
      .then((r) => { setLinhasLegenda(r.linhas); setStatusLegenda("ok"); })
      .catch((e) => { if (e.name !== "AbortError") setStatusLegenda("erro"); });
    return () => ac.abort();
  }, [uf, anoLegenda, cargo, mostrarMock, todosAnosLegenda]);

  useEffect(() => {
    if (mostrarMock || todosAnosLegenda || uf || analise !== "legenda" || anoLegenda == null || !cargo) { setDadosBrasil([]); return; }
    const ac = new AbortController(); setDadosBrasil([]); setStatusBrasil("carregando");
    Promise.all(COBERTOS.map(async (sigla) => ({ uf: sigla, linhas: (await json<{ linhas: LinhaLegenda[] }>(`/api/bdr/legenda/${sigla}/${anoLegenda}?cargo=${encodeURIComponent(cargo)}`, ac.signal)).linhas })))
      .then((itens) => { if (!ac.signal.aborted) { setDadosBrasil(itens); setStatusBrasil("ok"); } })
      .catch((e) => { if (e.name !== "AbortError") setStatusBrasil("erro"); });
    return () => ac.abort();
  }, [mostrarMock, todosAnosLegenda, uf, analise, anoLegenda, cargo]);

  useEffect(() => {
    if (mostrarMock || analise !== "legenda" || !cargo) { setDadosHistoricos([]); return; }
    const anosCargo = [...new Set(opcoesLegenda.filter((item) => item.cargo === cargo && ANOS_CARGO_LEGENDA[cargo]?.includes(item.ano)).map((item) => item.ano))];
    if (!anosCargo.length) { setChaveHistorico(chaveHistoricoAtual); setDadosHistoricos([]); setStatusHistorico("erro"); return; }
    const ac = new AbortController();
    setChaveHistorico(chaveHistoricoAtual); setDadosHistoricos([]); setStatusHistorico("carregando");
    const ufsConsulta = uf ? [uf] : COBERTOS;
    Promise.all(anosCargo.flatMap((anoConsulta) => ufsConsulta.map(async (sigla) => ({
      ano: anoConsulta,
      uf: sigla,
      linhas: (await json<{ linhas: LinhaLegenda[] }>(`/api/bdr/legenda/${sigla}/${anoConsulta}?cargo=${encodeURIComponent(cargo)}`, ac.signal)).linhas,
    })))).then((itens) => { if (!ac.signal.aborted) { setDadosHistoricos(itens); setStatusHistorico("ok"); } })
      .catch((e) => { if (e.name !== "AbortError") setStatusHistorico("erro"); });
    return () => ac.abort();
  }, [mostrarMock, analise, cargo, uf, opcoesLegenda, chaveHistoricoAtual]);

  const siglas = useMemo(() => Object.fromEntries((cat?.ufs ?? []).map((u) => [u.cod, u.sigla])), [cat]);
  const lista = useMemo(() => uf ? cat?.municipios[uf] ?? SEM_MUNICIPIOS : cat ? COBERTOS.flatMap((sigla) => cat.municipios[sigla] ?? []) : SEM_MUNICIPIOS, [cat, uf]);
  const opcoesAtivas = (opcoesLegenda.length ? opcoesLegenda : mostrarMock ? opcoesMockLegenda : SEM_OPCOES_LEGENDA)
    .filter((item) => ANOS_CARGO_LEGENDA[item.cargo]?.includes(item.ano));
  const anosCargo = [...new Set(opcoesAtivas.filter((item) => item.cargo === cargo).map((item) => item.ano))].sort((a, b) => a - b);
  useEffect(() => { if (anosCargo.length && !todosAnosLegenda && !anosCargo.includes(anoLegenda ?? -1)) setAnoLegenda(anosCargo.at(-1)!); }, [cargo, anoLegenda, todosAnosLegenda, opcoesLegenda]);
  const periodoLegenda = todosAnosLegenda && anosCargo.length > 1 ? `soma de ${anosCargo.join(", ")}` : `${anosCargo[0] ?? anoLegenda ?? "—"}`;
  const dadosHistoricosMock = useMemo((): DadosAnoUfLegenda[] => {
    if (!mostrarMock || !cat) return [];
    return opcoesAtivas.filter((item) => item.cargo === cargo).flatMap((item) => COBERTOS.map((sigla) => ({
      ano: item.ano, uf: sigla, linhas: gerarLinhasMockLegenda(cat.municipios[sigla] ?? SEM_MUNICIPIOS, item.ano, cargo),
    })));
  }, [mostrarMock, cat, cargo, opcoesAtivas]);
  const dadosHistoricosAtivos = mostrarMock ? dadosHistoricosMock : chaveHistorico === chaveHistoricoAtual ? dadosHistoricos : [];
  const dadosUf = todosAnosLegenda
    ? dadosHistoricosAtivos.length ? (uf ? [uf] : COBERTOS).map((sigla) => ({ uf: sigla, linhas: somarLinhasLegenda(dadosHistoricosAtivos.filter((item) => item.uf === sigla).flatMap((item) => item.linhas)) })) : []
    : mostrarMock && anoLegenda != null && cat ? COBERTOS.map((sigla) => ({ uf: sigla, linhas: gerarLinhasMockLegenda(cat.municipios[sigla] ?? SEM_MUNICIPIOS, anoLegenda, cargo) })) : dadosBrasil;
  const linhasFonte = mostrarMock || todosAnosLegenda ? uf ? dadosUf.find((item) => item.uf === uf)?.linhas ?? [] : dadosUf.flatMap((item) => item.linhas) : uf ? linhasLegenda : dadosBrasil.flatMap((item) => item.linhas);
  const estadoLinhas = dadosUf.map((item) => {
    const linhas = item.linhas.filter((r) => !partido || r.id_partido === partido);
    const legenda = linhas.reduce((soma, r) => soma + r.votos_legenda, 0);
    const nominais = linhas.reduce((soma, r) => soma + r.votos_nominais, 0);
    return { uf: item.uf, legenda, percentual: legenda + nominais ? 100 * legenda / (legenda + nominais) : 0, temDados: legenda + nominais > 0 };
  });
  const percentuaisUf = estadoLinhas.filter((item) => item.temDados).map((item) => item.percentual);
  const totalLegendaUfs = estadoLinhas.reduce((soma, item) => soma + item.legenda, 0);
  const menorUf = Math.min(...percentuaisUf), maiorUf = Math.max(...percentuaisUf);
  const escalaIntensidadeUf = percentuaisUf.length ? scaleLinear<string>()
    .domain(menorUf === maiorUf ? [menorUf - 1, menorUf, menorUf + 1] : [menorUf, (menorUf + maiorUf) / 2, maiorUf])
    .range(CORES_INTENSIDADE_UF).clamp(true) : null;
  const larguraComparativaUf = (percentual: number) => maiorUf - menorUf < 0.1 ? 60 : 20 + 80 * (percentual - menorUf) / (maiorUf - menorUf);
  const nomes = useMemo(() => Object.fromEntries(lista.map((m) => [m.id, m.nome])), [lista]);
  const municipiosBusca = useMemo(() => Object.entries(cat?.municipios ?? {}).flatMap(([sigla, municipios]) =>
    municipios.map((item) => ({ ...item, uf: sigla }))), [cat]);
  const ufPorMunicipio = useMemo(() => Object.fromEntries(municipiosBusca.map((item) => [item.id, item.uf])), [municipiosBusca]);
  const votosPorMunicipioPartido = new Map<string, Map<string, { id: string; nome: string; votos: number }>>();
  const votosPorUfPartido = new Map<string, Map<string, { id: string; nome: string; votos: number }>>();
  for (const linha of linhasFonte) {
    if (partido && linha.id_partido !== partido) continue;
    const sigla = ufPorMunicipio[linha.id_municipio];
    if (!sigla || linha.votos_legenda <= 0) continue;
    for (const [chave, grupos] of [[linha.id_municipio, votosPorMunicipioPartido], [sigla, votosPorUfPartido]] as const) {
      let partidosLocal = grupos.get(chave);
      if (!partidosLocal) { partidosLocal = new Map(); grupos.set(chave, partidosLocal); }
      const atual = partidosLocal.get(linha.id_partido);
      if (atual) atual.votos += linha.votos_legenda;
      else partidosLocal.set(linha.id_partido, { id: linha.id_partido, nome: linha.partido, votos: linha.votos_legenda });
    }
  }
  const vencedores = (grupos: Map<string, Map<string, { id: string; nome: string; votos: number }>>) => new Map(
    [...grupos].map(([local, partidosLocal]) => [local, [...partidosLocal.values()].sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"))[0]]),
  );
  const vencedorMunicipio = vencedores(votosPorMunicipioPartido);
  const vencedorUf = vencedores(votosPorUfPartido);
  const selecionarUf = (sigla: string | null) => { setUf(sigla); setMun(null); };
  const selecionarMunicipio = (sigla: string, id: string) => { setUf(sigla); setMun(id); };
  const valido = dados && dados.uf === uf && dados.ano === ano ? dados : null;
  const valores = Object.values(valido?.municipios ?? {}).map((r) => r.abstencao_pct).filter((v): v is number => typeof v === "number");
  const [lo, hi] = [Math.min(...valores), Math.max(...valores)];
  const escala = valores.length ? scaleLinear<string>().domain([lo, hi]).range(paleta.abstencao) : null;
  const partidos = [...new Map(linhasFonte.map((r) => [r.id_partido, r.partido])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const linhasAtivas = linhasFonte.filter((r) => !partido || r.id_partido === partido);
  const partidosComRegistroMapa = [...new Set(linhasAtivas.filter((r) => (!mun || r.id_municipio === mun) && r.votos_legenda > 0).map((r) => r.partido))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const historicoMock = useMemo(() => mostrarMock ? opcoesAtivas.filter((item) => item.cargo === cargo).map((item) => resumirLegendaPorPartido(item.ano, gerarLinhasMockLegenda(lista, item.ano, cargo).filter((r) => !mun || r.id_municipio === mun))) : undefined, [mostrarMock, lista, cargo, mun, opcoesAtivas]);
  const historicoExterno: HistoricoAno[] | undefined = !mostrarMock
    ? anosCargo.map((anoConsulta) => resumirLegendaPorPartido(anoConsulta, dadosHistoricosAtivos.filter((item) => item.ano === anoConsulta).flatMap((item) => item.linhas).filter((item) => !mun || item.id_municipio === mun)))
    : undefined;
  const dadosProntosLegenda = mostrarMock ? !!cat : todosAnosLegenda ? statusHistorico === "ok" && chaveHistorico === chaveHistoricoAtual && dadosHistoricosAtivos.length > 0 : uf ? statusLegenda === "ok" : statusBrasil === "ok";
  const porMunicipio = linhasAtivas.reduce((acc, r) => {
    const atual = acc.get(r.id_municipio) || { legenda: 0, nominais: 0 };
    atual.legenda += r.votos_legenda; atual.nominais += r.votos_nominais;
    acc.set(r.id_municipio, atual); return acc;
  }, new Map<string, { legenda: number; nominais: number }>());
  const linhasRecorte = linhasAtivas.filter((r) => !mun || r.id_municipio === mun);
  const totalLegenda = linhasRecorte.reduce((s, r) => s + r.votos_legenda, 0);
  const totalNominais = linhasRecorte.reduce((s, r) => s + r.votos_nominais, 0);
  const percentualLegenda = totalLegenda + totalNominais ? 100 * totalLegenda / (totalLegenda + totalNominais) : null;
  const rankingPartidos = [...linhasRecorte.reduce((acc, r) => {
    const atual = acc.get(r.id_partido) || { id: r.id_partido, nome: r.partido, votos: 0 };
    atual.votos += r.votos_legenda; acc.set(r.id_partido, atual); return acc;
  }, new Map<string, { id: string; nome: string; votos: number }>()).values()].sort((a, b) => b.votos - a.votos);
  const termoRankingPartido = buscaRankingPartido.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
  const partidosFiltrados = termoRankingPartido ? rankingPartidos.filter((item) => item.nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").includes(termoRankingPartido)) : rankingPartidos;
  const partidosVisiveis = mostrarTodosPartidos || termoRankingPartido ? partidosFiltrados : partidosFiltrados.slice(0, 10);
  const percentuaisMunicipios = [...porMunicipio.values()].filter((r) => r.legenda + r.nominais > 0).map((r) => 100 * r.legenda / (r.legenda + r.nominais));
  const percentuaisDistribuicao = mun ? [...porMunicipio.entries()].filter(([id, r]) => id === mun && r.legenda + r.nominais > 0).map(([, r]) => 100 * r.legenda / (r.legenda + r.nominais)) : percentuaisMunicipios;
  const votosLegendaEstado = uf ? [...porMunicipio.values()].reduce((soma, r) => soma + r.legenda, 0) : 0;
  const votosNominaisEstado = uf ? [...porMunicipio.values()].reduce((soma, r) => soma + r.nominais, 0) : 0;
  const participacaoEstado = votosLegendaEstado + votosNominaisEstado > 0 ? 100 * votosLegendaEstado / (votosLegendaEstado + votosNominaisEstado) : null;
  const municipiosPorParticipacao = uf ? [...porMunicipio.entries()]
    .filter(([, r]) => r.legenda + r.nominais > 0)
    .map(([id, r]) => ({ id, percentual: 100 * r.legenda / (r.legenda + r.nominais), legenda: r.legenda }))
    .sort((a, b) => b.percentual - a.percentual || b.legenda - a.legenda) : [];
  const acimaMediaEstado = participacaoEstado === null ? 0 : municipiosPorParticipacao.filter((item) => item.percentual > participacaoEstado).length;
  const menorMunicipio = Math.min(...percentuaisMunicipios), maiorMunicipio = Math.max(...percentuaisMunicipios);
  const percentuaisOrdenados = [...percentuaisMunicipios].sort((a, b) => a - b);
  const quantil = (fracao: number) => percentuaisOrdenados[Math.floor((percentuaisOrdenados.length - 1) * fracao)] ?? 0;
  const [limiteBaixo, limiteMedio, limiteAlto] = [quantil(0.1), quantil(0.5), quantil(0.9)];
  const escalaIntensidadeMunicipio = percentuaisMunicipios.length ? scaleLinear<string>()
    .domain(menorMunicipio === maiorMunicipio ? [menorMunicipio - 1, menorMunicipio, menorMunicipio + 1] : [limiteBaixo, limiteMedio, limiteAlto])
    .range(CORES_INTENSIDADE_UF).clamp(true) : null;
  const cor = (id: string) => {
    if (analise === "legenda") {
      if (visaoMapa === "vencedor") return vencedorMunicipio.has(id) ? corPartido(vencedorMunicipio.get(id)!.nome) : CINZA_SEM_REGISTRO;
      const r = porMunicipio.get(id);
      if (!r || r.legenda + r.nominais === 0) return CINZA_SEM_REGISTRO;
      const share = 100 * r.legenda / (r.legenda + r.nominais);
      return escalaIntensidadeMunicipio?.(share) ?? CINZA_SEM_REGISTRO;
    }
    const r = valido?.municipios[id];
    if (!r) return CINZA_SEM_REGISTRO;                          // sem registro eleitoral (ou carregando)
    const v = r.abstencao_pct;
    return typeof v === "number" && escala ? escala(v) : ROXO_SEM_VALOR;  // 0 é cor válida; null é outra
  };
  const corUf = (sigla: string) => {
    if (visaoMapa === "vencedor") return vencedorUf.has(sigla) ? corPartido(vencedorUf.get(sigla)!.nome) : undefined;
    const item = estadoLinhas.find((r) => r.uf === sigla);
    return item?.temDados ? escalaIntensidadeUf?.(item.percentual) : undefined;
  };
  const descricaoUf = (sigla: string) => {
    if (visaoMapa === "vencedor") {
      const vencedor = vencedorUf.get(sigla);
      return vencedor ? `${sigla} — ${vencedor.nome}: ${fmt(vencedor.votos)} votos de legenda` : `${sigla} — sem dados disponíveis`;
    }
    const item = estadoLinhas.find((r) => r.uf === sigla);
    return item?.temDados ? `${sigla} — ${fmt(item.percentual, 1, "%")} de votos de legenda · ${fmt(item.legenda)} votos` : `${sigla} — sem dados disponíveis`;
  };
  const descricaoMun = (id: string) => {
    const registro = porMunicipio.get(id);
    const nome = nomes[id] || id;
    if (visaoMapa === "vencedor") {
      const vencedor = vencedorMunicipio.get(id);
      return vencedor && registro ? `${nome} · ${vencedor.nome}: ${fmt(vencedor.votos)} de ${fmt(registro.legenda)} votos de legenda (${fmt(100 * vencedor.votos / Math.max(1, registro.legenda), 1, "%")})` : `${nome} — sem dados disponíveis`;
    }
    return registro ? `${nome} — ${fmt(100 * registro.legenda / Math.max(1, registro.legenda + registro.nominais), 1, "%")} de votos de legenda · ${fmt(registro.legenda)} votos` : `${nome} — sem dados disponíveis`;
  };
  const sel = mun && valido ? valido.municipios[mun] : undefined;
  const registros = Object.entries(valido?.municipios ?? {});
  const totalEleitorado = registros.reduce((s, [, r]) => s + (typeof r.eleitorado === "number" ? r.eleitorado : 0), 0);
  const totalAbstencoes = registros.reduce((s, [, r]) => s + (typeof r.abstencoes === "number" ? r.abstencoes : 0), 0);
  const taxaGeral = totalEleitorado ? 100 * totalAbstencoes / totalEleitorado : null;
  const ranking = registros.filter(([, r]) => typeof r.abstencao_pct === "number")
    .sort((a, b) => Number(b[1].abstencao_pct) - Number(a[1].abstencao_pct)).slice(0, 8);
  const faixas = [0, 10, 20, 30, 40, 50].map((inicio) => ({
    rotulo: inicio === 50 ? "50%+" : `${inicio}–${inicio + 10}%`,
    valor: valores.filter((v) => v >= inicio && (inicio === 50 || v < inicio + 10)).length,
  }));
  const faixasLegenda = [0, 5, 10, 15, 20, 25].map((inicio) => ({
    inicio,
    rotulo: inicio === 25 ? "25%+" : `${inicio}–${inicio + 5}%`,
    valor: percentuaisDistribuicao.filter((v) => v >= inicio && (inicio === 25 || v < inicio + 5)).length,
  })).filter((faixa) => faixa.valor > 0 || faixa.inicio === faixaLegendaSelecionada);
  const faixasAtivas = analise === "legenda" ? faixasLegenda : faixas;
  const maxFaixaAtiva = Math.max(1, ...faixasAtivas.map((f) => f.valor));
  const anoAtivo = analise === "legenda" ? anoLegenda : ano;
  const nomeUf = cat?.ufs.find((item) => item.sigla === uf)?.nome || uf || "Brasil";

  if (analise === "publicidade") return <PainelPublicidade onAnalise={setAnalise} ufInicial={uf} />;
  if (analise === "patrimonio") return <PainelPatrimonio onAnalise={setAnalise} cat={cat} ufsGeo={ufs} geoMun={geoMun} siglas={siglas} nomes={nomes}
    municipiosBusca={municipiosBusca} erroGeo={erroGeo} uf={uf} mun={mun} onUf={selecionarUf} onMun={setMun} onMunicipio={selecionarMunicipio} />;

  const legendaMapa = analise === "abstencao" ? <div className="legenda"><strong>Abstenção (%) em {ano} · Q3</strong>
    <div className="barra" /><span>{valores.length ? `${lo.toFixed(1)} → ${hi.toFixed(1)}` : "Aguardando dados"}</span>
    <span><i style={{ background: CINZA_SEM_REGISTRO }} /> sem registro</span>
    <span><i style={{ background: ROXO_SEM_VALOR }} /> registro sem valor</span></div>
    : visaoMapa === "vencedor" ? undefined
    : !uf ? <div className="legenda"><strong>Participação dos votos de legenda</strong>
      <div className="barra" style={{ background: `linear-gradient(90deg, ${CORES_INTENSIDADE_UF.join(", ")})` }} />
      <span>{percentuaisUf.length ? `${fmt(menorUf, 1, "%")} → ${fmt(maiorUf, 1, "%")}` : "Aguardando dados das UFs"}</span>
      <span>Escala relativa entre as UFs neste recorte.</span>
      <span><i style={{ background: CINZA_SEM_REGISTRO }} /> sem dados neste recorte</span></div>
    : <div className="legenda"><strong>Votos de legenda (%)</strong>
      <div className="barra" style={{ background: `linear-gradient(90deg, ${CORES_INTENSIDADE_UF.join(", ")})` }} />
      <span>{percentuaisMunicipios.length ? `${fmt(limiteBaixo, 1, "%")} (P10) → ${fmt(limiteAlto, 1, "%")} (P90)` : "Aguardando dados dos municípios"}</span>
      <span>Extremos usam a cor do limite · <i style={{ background: CINZA_SEM_REGISTRO }} /> sem dados</span></div>;
  const controlesMapa = analise === "legenda" ? <div className="mapa-modos" role="group" aria-label="Visão do mapa">
    <button type="button" aria-pressed={visaoMapa === "vencedor"} onClick={() => setVisaoMapa("vencedor")}>Partido mais votado</button>
    <button type="button" aria-pressed={visaoMapa === "intensidade"} onClick={() => setVisaoMapa("intensidade")}>% votos de legenda</button>
  </div> : undefined;

  return (
    <div className={`layout layout-painel ${analise === "legenda" ? "analysis-legenda" : "analysis-abstencao"} ${analise === "legenda" && mun && visaoMapa === "intensidade" ? "municipio-selecionado" : ""} ${analise === "legenda" && mostrarMock ? "preview-mock" : ""}`}>
      <header className="app-header">
        <div className="app-header-main">
          <div className="view-heading"><span className="view-kicker">ELEIÇÕES BRASIL / PAINEL{analise === "legenda" && mostrarMock ? " / DADOS SIMULADOS" : ""}</span><strong>{analise === "legenda" ? "Votos por legenda" : "Participação eleitoral"}</strong><div className="view-context" aria-live="polite"><span>{mun ? `${nomes[mun] || mun} · ${nomeUf} (${uf})` : uf ? `${nomeUf} (${uf})` : analise === "legenda" ? "Brasil · UFs disponíveis" : "Brasil"}</span>{analise === "legenda" && mun && <button type="button" onClick={() => setMun(null)}>← Voltar ao estado</button>}</div></div>
          <div className="app-header-actions"><AlternarTema /></div>
        </div>
        <div className="app-filter-row">
          <div className="analysis-switch" role="group" aria-label="Análise eleitoral">
            <button aria-pressed={analise === "abstencao"} onClick={() => setAnalise("abstencao")}>Abstenção</button>
            <button aria-pressed={analise === "legenda"} onClick={() => setAnalise("legenda")}>Votos por legenda</button>
            <button aria-pressed={false} onClick={() => setAnalise("publicidade")}>Publicidade</button>
            <button aria-pressed={false} onClick={() => setAnalise("patrimonio")}>Patrimônio</button>
          </div>
          <label>Estado <select value={uf || ""} onChange={(e) => selecionarUf((e.target as HTMLSelectElement).value || null)}><option value="">Brasil</option>{COBERTOS.map((sigla) => <option value={sigla}>{cat?.ufs.find((item) => item.sigla === sigla)?.nome || sigla} ({sigla})</option>)}</select></label>
          <label>Ano <select value={analise === "legenda" && todosAnosLegenda ? "todos" : anoAtivo ?? ""} onChange={(e) => {
            const valor = (e.target as HTMLSelectElement).value;
            if (analise === "legenda" && valor === "todos") { setTodosAnosLegenda(true); setPartido(""); return; }
            const a = Number(valor);
            if (analise === "legenda") { setTodosAnosLegenda(false); setAnoLegenda(a); setPartido(""); if (!opcoesAtivas.some((o) => o.ano === a && o.cargo === cargo)) setCargo(opcoesAtivas.find((o) => o.ano === a)?.cargo || ""); }
            else setAno(a);
          }} disabled={analise === "legenda" ? !opcoesAtivas.length : !anos.length}>
            {analise === "legenda" && <option value="todos">Todos os anos</option>}
            {(analise === "legenda" ? anosCargo.slice().reverse() : anos).map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
          {analise === "legenda" && <><label>Cargo <select value={cargo} disabled={!opcoesAtivas.length} onChange={(e) => { setCargo((e.target as HTMLSelectElement).value); setPartido(""); }}>{(todosAnosLegenda ? [...new Map(opcoesAtivas.map((o) => [o.cargo, o])).values()] : opcoesAtivas.filter((o) => o.ano === anoLegenda)).sort((a, b) => a.cargo.localeCompare(b.cargo, "pt-BR")).map((o) => <option key={`${o.ano}-${o.cargo}`} value={o.cargo}>{o.cargo}</option>)}</select></label>
            <label className="global-party-filter"><span>Partido</span><select value={partido} onChange={(e) => setPartido((e.target as HTMLSelectElement).value)}><option value="">Todos</option>{partidos.map(([id, nome]) => <option value={id}>{nome}</option>)}</select></label></>}
          <button className="clear-filters" onClick={() => {
            selecionarUf(null); setPartido(""); setTodosAnosLegenda(false); setFaixaLegendaSelecionada(null);
            setAno(anos[anos.length - 1] ?? null);
            const inicial = opcoesAtivas.find((o) => o.ano === 2022 && o.cargo === "Deputado Federal") || opcoesAtivas[0];
            setAnoLegenda(inicial?.ano ?? null); setCargo(inicial?.cargo ?? "");
          }}>Limpar filtros</button>
        </div>
      </header>
      {analise === "legenda" && mun && (erroGeo || (!mostrarMock && (todosAnosLegenda ? statusHistorico === "erro" : statusLegenda === "erro"))) && <div className="panel-status" role="alert">{erroGeo || "Não foi possível consultar os votos deste município. Verifique a API e o banco."}</div>}
      {analise === "legenda" && mostrarMock && <div className="mock-data-banner" role="status">Prévia com dados simulados — os indicadores e gráficos usam o arquivo de mock, não resultados do TSE.</div>}
      <section className={`dash-kpis ${analise === "legenda" ? "three-kpis" : ""}`} aria-label="Resumo eleitoral">
        {analise === "legenda" ? <>
          <article><span>Votos de legenda</span><strong>{dadosProntosLegenda && linhasFonte.length ? fmt(totalLegenda) : "—"}</strong><small>{periodoLegenda} · {mun ? "município" : uf ? "estado" : "UFs disponíveis"}</small><i className="kpi-line pink" /></article>
          <article><span title="Votos de legenda ÷ (votos de legenda + votos nominais) no mesmo recorte e período.">Participação dos votos de legenda ⓘ</span><strong>{dadosProntosLegenda && linhasFonte.length ? fmt(percentualLegenda, 1, "%") : "—"}</strong><small>{periodoLegenda} · legenda / (legenda + nominais)</small><i className="kpi-line violet" /></article>
          <article><span>Votos nominais</span><strong>{dadosProntosLegenda && linhasFonte.length ? fmt(totalNominais) : "—"}</strong><small>{todosAnosLegenda ? anosCargo.length > 1 ? "Mesmo cargo · soma dos anos" : `Mesmo cargo · ${periodoLegenda}` : "Mesmo cargo e ano"}</small><i className="kpi-line cyan" /></article>
        </> : <>
          <article><span>Eleitorado</span><strong>{uf && valido ? fmt(mun ? sel?.eleitorado : totalEleitorado) : "—"}</strong><small>{mun ? nomes[mun] : uf || "Selecione um estado"}</small><i className="kpi-line cyan" /></article>
          <article><span>Abstenções</span><strong>{uf && valido ? fmt(mun ? sel?.abstencoes : totalAbstencoes) : "—"}</strong><small>Pessoas que não votaram</small><i className="kpi-line pink" /></article>
          <article><span>Taxa de abstenção</span><strong>{uf && valido ? fmt(mun ? sel?.abstencao_pct : taxaGeral, 1, "%") : "—"}</strong><small>Participação no recorte</small><i className="kpi-line violet" /></article>
          <article><span>Municípios com dados</span><strong>{uf && valido ? fmt(registros.length) : "—"}</strong><small>{uf ? `Estado: ${uf}` : "Selecione um estado"}</small><i className="kpi-line teal" /></article>
        </>}
      </section>
      <Mapa ufs={ufs} muns={uf ? geoMun[uf] ?? [] : []} uf={uf} siglas={siglas} cobertos={new Set(COBERTOS)}
        mun={mun} cor={cor} corUf={analise === "legenda" ? corUf : undefined} descricaoUf={analise === "legenda" ? descricaoUf : undefined} descricaoMun={analise === "legenda" ? descricaoMun : undefined} nomes={nomes} municipiosBusca={municipiosBusca} onUf={selecionarUf} onMun={setMun} onMunicipioBusca={selecionarMunicipio} legendaMapa={legendaMapa} controlesMapa={controlesMapa} />
      {!(analise === "legenda" && mun && visaoMapa === "intensidade") && <aside>
        {erroGeo && <p className="aviso erro">{erroGeo}</p>}
        {analise === "abstencao" && status === "api" && <p className="aviso erro">API indisponível: mapa sem indicadores.</p>}
        {analise === "legenda" && uf && !todosAnosLegenda && !mostrarMock && statusLegenda === "erro" && <p className="aviso erro">Votos por legenda indisponíveis. Verifique a API e o banco.</p>}
        {analise === "legenda" && !uf && !todosAnosLegenda && !mostrarMock && statusBrasil === "erro" && <p className="aviso erro">Não foi possível consultar os dados das UFs. Verifique a API e o banco.</p>}
        {analise === "legenda" && todosAnosLegenda && !mostrarMock && chaveHistorico === chaveHistoricoAtual && statusHistorico === "erro" && <p className="aviso erro">Não foi possível consultar todos os anos disponíveis.</p>}
        {!uf && analise !== "legenda" && <div className="empty-selection"><span>EXPLORAR O MAPA</span><h2>Selecione um lugar</h2><p>Busque um município no mapa, clique em um estado ou use o filtro acima.</p></div>}
        {analise === "legenda" && visaoMapa === "vencedor" && <section className="aside-party-coverage" aria-label="Cores dos partidos"><h2>Cores dos partidos</h2><p>{mun ? `${nomes[mun] || mun} · ${uf}` : uf ? `${nomeUf} · ${uf}` : "UFs disponíveis"} · {cargo} · {periodoLegenda}</p>{dadosProntosLegenda ? partidosComRegistroMapa.length ? <><strong>{partidosComRegistroMapa.length} partidos com votos de legenda</strong><ul>{partidosComRegistroMapa.map((nome) => <li key={nome}><i className="party-dot" style={{ background: corPartido(nome) }} /> {nome}</li>)}</ul></> : <p>Sem registros neste recorte.</p> : <p>Carregando partidos…</p>}<small><i className="party-dot" style={{ background: CINZA_SEM_REGISTRO }} /> sem registro</small></section>}
        {!uf && analise === "legenda" && visaoMapa === "intensidade" && estadoLinhas.length > 0 && <div className="aside-state-compare"><h3>Participação por UF</h3><p className="aside-state-total"><span>Votos de legenda · {percentuaisUf.length} UFs</span><strong>{percentuaisUf.length ? fmt(totalLegendaUfs) : "—"}</strong></p>{estadoLinhas.map((item) => <button key={item.uf} onClick={() => selecionarUf(item.uf)} aria-label={`Ver ${item.uf}: ${item.temDados ? `${fmt(item.percentual, 1, "%")}, ${fmt(item.legenda)} votos de legenda` : "sem dados"}`}><span><i className="state-dot" style={{ background: CORES_UF[item.uf] }} />{item.uf}</span><i className="state-track"><b style={{ width: `${item.temDados ? larguraComparativaUf(item.percentual) : 0}%`, background: CORES_UF[item.uf] }} /></i><span className="aside-state-values"><strong>{item.temDados ? fmt(item.percentual, 1, "%") : "—"}</strong><small>{item.temDados ? `${fmt(item.legenda)} votos` : "Sem dados"}</small></span></button>)}<small>Barras relativas à faixa observada · cores identificam as UFs.</small></div>}
        {analise === "legenda" && visaoMapa === "intensidade" && uf && <section className="aside-context-insights" aria-label="Comparação dos municípios"><h2>Comparação dos municípios</h2>
          {dadosProntosLegenda && municipiosPorParticipacao.length ? <>
            <div className="insight-above"><span>Municípios acima do percentual estadual</span><strong>{acimaMediaEstado} <small>de {municipiosPorParticipacao.length}</small></strong><i role="img" aria-label={`${acimaMediaEstado} de ${municipiosPorParticipacao.length} municípios acima do percentual estadual`}><b style={{ width: `${100 * acimaMediaEstado / municipiosPorParticipacao.length}%` }} /></i><small>Média estadual: {fmt(participacaoEstado, 1, "%")} dos votos foram de legenda.</small></div>
            <div className="insight-extremes"><h3>Maior participação</h3>{municipiosPorParticipacao.slice(0, 2).map((item) => <button type="button" key={item.id} onClick={() => setMun(item.id)}><span>{nomes[item.id] || item.id}</span><strong>{fmt(item.percentual, 1, "%")}</strong></button>)}
              <h3>Menor participação</h3>{[...municipiosPorParticipacao].reverse().slice(0, 2).map((item) => <button type="button" key={item.id} onClick={() => setMun(item.id)}><span>{nomes[item.id] || item.id}</span><strong>{fmt(item.percentual, 1, "%")}</strong></button>)}</div>
          </> : <p className="insight-empty">Os dados de comparação aparecerão após a consulta.</p>}
          <button type="button" className="insight-back" onClick={() => selecionarUf(null)}>← Voltar para o Brasil</button>
        </section>}
        {uf && <>
          {analise === "abstencao" && status === "carregando" && <p className="aviso">Carregando indicadores…</p>}
          {analise === "abstencao" && status === "erro" && <p className="aviso erro">Erro ao consultar os indicadores.</p>}
          {analise === "legenda" && !mostrarMock && (todosAnosLegenda ? statusHistorico : statusLegenda) === "carregando" && <p className="aviso">Carregando votos…</p>}
          {analise === "abstencao" && mun && <section aria-live="polite" aria-label="Indicadores do município"><p>Código IBGE: {mun}</p>
            {!valido ? null : !sel ? <p className="aviso">Sem registro de participação deste município em {ano}.</p> :
              <dl><dt>Abstenção</dt><dd>{fmt(sel.abstencao_pct, 2, "%")}</dd>
                <dt>Eleitorado</dt><dd>{fmt(sel.eleitorado)}</dd>
                <dt>População (2022)</dt><dd>{fmt(sel.populacao)}</dd>
                <dt>PIB per capita (2022)</dt><dd>{fmt(sel.pib_per_capita, 0)}</dd>
                </dl>}</section>}
        </>}
      </aside>}
      <section className="dash-charts" aria-label="Análises municipais">
        <article className={`dash-chart-card ${analise === "legenda" ? "party-ranking-card" : ""}`}><div className="dash-card-heading"><div><h2>{analise === "legenda" ? "Votos por partido" : "Taxas mais altas"}</h2><p>{analise === "legenda" ? `${mun ? nomes[mun] || mun : uf ? nomeUf : "Seis UFs disponíveis"} · ${cargo} · ${periodoLegenda} · ${rankingPartidos.length} partidos` : "Municípios do recorte selecionado"}</p></div>{analise === "legenda" && rankingPartidos.length > 0 && <div className="party-ranking-controls"><input className="busca-ranking-partido" type="search" value={buscaRankingPartido} onInput={(e) => setBuscaRankingPartido((e.target as HTMLInputElement).value)} placeholder="Buscar partido" aria-label="Buscar partido nesta lista" /></div>}</div>
          {analise === "legenda" ? rankingPartidos.length ? partidosVisiveis.length ? <><div className="dash-ranking dash-ranking-partidos" tabIndex={0} aria-label="Partidos encontrados na lista">{partidosVisiveis.map((r) => <div className={`dash-rank-row ${partido === r.id ? "selecionado" : ""}`} key={r.id} title={`${r.nome}: ${fmt(r.votos)} votos de legenda · ${fmt(100 * r.votos / Math.max(1, totalLegenda), 1, "%")} do total`}><span><i className="party-dot" style={{ background: corPartido(r.nome) }} />{r.nome}</span><i><b style={{ width: `${100 * r.votos / Math.max(1, rankingPartidos[0].votos)}%`, background: corPartido(r.nome) }} /></i><strong>{fmt(r.votos)} <small>{fmt(100 * r.votos / Math.max(1, totalLegenda), 1, "%")}</small></strong></div>)}</div>{!termoRankingPartido && rankingPartidos.length > 10 && <div className="party-ranking-footer"><span>{mostrarTodosPartidos ? `${rankingPartidos.length} partidos exibidos` : `Top 10 de ${rankingPartidos.length}`}</span><button type="button" className="legenda-show-more" onClick={() => setMostrarTodosPartidos(!mostrarTodosPartidos)}>{mostrarTodosPartidos ? "Mostrar somente os 10 principais" : `Ver todos os ${rankingPartidos.length} partidos`}</button></div>}</> : <div className="dash-empty">Nenhum partido encontrado nesta busca.</div> : <div className="dash-empty">Selecione um estado com votos para ver os partidos.</div>
            : ranking.length ? <div className="dash-ranking">{ranking.map(([id, r]) => <button key={id} onClick={() => setMun(id)}><span>{nomes[id] || id}</span><i><b style={{ width: `${Math.min(100, Number(r.abstencao_pct) * 2)}%` }} /></i><strong>{fmt(r.abstencao_pct, 1, "%")}</strong></button>)}</div> : <div className="dash-empty">Selecione um estado com dados para ver o ranking.</div>}</article>
        <article className="dash-chart-card"><h2>{analise === "legenda" ? "Distribuição dos votos de legenda" : "Distribuição da abstenção"}</h2><p>Quantidade de municípios por faixa percentual{analise === "legenda" && participacaoEstado !== null ? ` · referência estadual: ${fmt(participacaoEstado, 1, "%")}` : ""}</p>{(analise === "legenda" ? percentuaisDistribuicao.length : valores.length) ? analise === "legenda" ? <div className="dash-distribution-horizontal">{faixasLegenda.map((f) => <button type="button" aria-pressed={faixaLegendaSelecionada === f.inicio} className="dash-distribution-row" key={f.rotulo} onClick={() => setFaixaLegendaSelecionada(faixaLegendaSelecionada === f.inicio ? null : f.inicio)}><span>{f.rotulo}</span><i><b style={{ width: `${100 * f.valor / maxFaixaAtiva}%` }} /></i><strong>{fmt(f.valor)}</strong></button>)}</div> : <div className="dash-distribution">{faixasAtivas.map((f) => <div key={f.rotulo}><span>{f.valor}</span><i style={{ height: `${Math.max(3, 100 * f.valor / maxFaixaAtiva)}%` }} /><small>{f.rotulo}</small></div>)}</div> : <div className="dash-empty">Os dados aparecem após selecionar um estado.</div>}</article>
      </section>
      {analise === "legenda" && <GraficosLegenda uf={uf} mun={mun} cargo={cargo} partidoGlobal={partido} opcoes={opcoesAtivas} linhas={linhasAtivas} carregando={!dadosProntosLegenda} onMunicipio={selecionarMunicipio} ufPorMunicipio={ufPorMunicipio} ufsDisponiveis={COBERTOS} todosAnos={true} historicoMock={historicoMock} historicoExterno={historicoExterno} erroHistoricoExterno={chaveHistorico === chaveHistoricoAtual && statusHistorico === "erro"} faixaSelecionada={faixaLegendaSelecionada} />}
    </div>
  );
}

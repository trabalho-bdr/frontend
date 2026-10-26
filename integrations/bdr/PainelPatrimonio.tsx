
import { scaleLinear } from "d3-scale";
import { useEffect, useMemo, useState } from "react";
import { coresUf } from "./coresEleitorais";
import { paletaAnalises, type ModoCor } from "./paletaAnalises";
import { AlternarTema, useTema } from "./Tema";
import { Feat, Mapa } from "./Mapa";
import {
  CARGOS_MUNICIPAIS, UFS_Q2, gerarMockMapaQ2, gerarMockPatrimonio, opcoesMockQ2,
  type DadosMapaQ2, type DadosQ2, type LinhaTerritorio, type OpcaoQ2, type OpcoesQ2,
} from "./mockPatrimonio";
type Analise = "abstencao" | "legenda" | "publicidade" | "patrimonio";
type Indicador = "mediana" | "eleitos" | "razao";
type Cat = { ufs: { cod: string; sigla: string; nome: string }[]; municipios: Record<string, { id: string; nome: string }[]> };
type Props = {
  onAnalise: (analise: Analise) => void;
  cat: Cat | null; ufsGeo: Feat[]; geoMun: Record<string, Feat[]>; siglas: Record<string, string>;
  nomes: Record<string, string>; municipiosBusca: { id: string; nome: string; uf: string }[]; erroGeo: string;
  uf: string | null; mun: string | null;
  onUf: (sigla: string | null) => void; onMun: (id: string | null) => void; onMunicipio: (sigla: string, id: string) => void;
};

const ANOS = [2024, 2022, 2020, 2018];
const CINZA_SEM_REGISTRO = "var(--theme-map-nodata,#2b2b31)";
const MIN_DECIS = 30;
const INDICADORES: { valor: Indicador; rotulo: string; curto: string }[] = [
  { valor: "mediana", rotulo: "Patrimônio mediano dos candidatos", curto: "Mediana · candidatos" },
  { valor: "eleitos", rotulo: "Patrimônio mediano dos eleitos", curto: "Mediana · eleitos" },
  { valor: "razao", rotulo: "Eleitos ÷ não eleitos", curto: "Eleitos ÷ não eleitos" },
];

const num = (n: number | null | undefined, d = 0) => typeof n === "number" ? n.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";
const dec2 = (n: number | null | undefined) => typeof n === "number" ? n.toFixed(2).replace(".", ",") : "—";
const pct = (n: number | null | undefined, d = 1) => typeof n === "number" ? `${num(n, d)}%` : "—";
const brl = (n: number | null | undefined) => typeof n === "number" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—";
const brlCompacto = (n: number | null | undefined) => typeof n === "number" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }) : "—";
/** "DEPUTADO FEDERAL" → "Deputado Federal" (a API guarda o cargo em maiúsculas). */
const rotuloCargo = (c: string) => c.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
const rotuloIndicador = (i: Indicador) => INDICADORES.find((x) => x.valor === i)!.rotulo;

async function carregar<T>(url: string, signal: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal });
  if (!r.ok) {
    const corpo = await r.json().catch(() => null);
    throw new Error(typeof corpo?.detail === "string" ? corpo.detail : "Não foi possível consultar o patrimônio. Confira se a API está em execução.");
  }
  return r.json();
}

/** Valor que pinta o território no mapa, ou null quando não há dado para o indicador. */
function valorDe(r: LinhaTerritorio | undefined, ind: Indicador): number | null {
  if (!r || r.analisadas === 0) return null;
  if (ind === "mediana") return r.patrimonio_mediano;
  if (ind === "eleitos") return r.patrimonio_mediano_eleitos;
  const e = r.patrimonio_mediano_eleitos, n = r.patrimonio_mediano_nao_eleitos;
  return e != null && n != null && e > 0 && n > 0 ? e / n : null;
}
const formatarValor = (v: number | null, ind: Indicador) => v == null ? "sem dado" : ind === "razao" ? `${num(v, 2)}×` : brlCompacto(v);

/** Escala de cor: logarítmica (patrimônio, entre P5 e P95) ou divergente em torno de 1× (razão). */
function criarEscala(valores: number[], ind: Indicador, tema: ModoCor) {
  if (!valores.length) return null;
  const paleta = paletaAnalises(tema);
  if (ind === "razao") {
    const s = scaleLinear<string>().domain([-1, 0, 1]).range(paleta.razao).clamp(true);
    return { cor: (v: number) => s(Math.log2(v)), minimo: 0.5, maximo: 2 };
  }
  const logs = valores.map((v) => Math.log10(v + 1)).sort((a, b) => a - b);
  const q = (p: number) => logs[Math.min(logs.length - 1, Math.floor(p * (logs.length - 1)))];
  let lo = logs.length < 20 ? logs[0] : q(0.05), hi = logs.length < 20 ? logs[logs.length - 1] : q(0.95);
  if (hi - lo < 0.05) { lo -= 0.05; hi += 0.05; }
  const s = scaleLinear<string>().domain([lo, (lo + hi) / 2, hi]).range(paleta.patrimonio).clamp(true);
  return { cor: (v: number) => s(Math.log10(v + 1)), minimo: Math.max(0, 10 ** lo - 1), maximo: 10 ** hi - 1 };
}

const escolhaInicial = (lista: OpcaoQ2[]) => lista.find((o) => o.ano === 2024 && o.cargo === "VEREADOR") ?? lista[0] ?? { ano: null, cargo: "" };

export function PainelPatrimonio({ onAnalise, cat, ufsGeo, geoMun, siglas, nomes, municipiosBusca, erroGeo, uf, mun, onUf, onMun, onMunicipio }: Props) {
  const { tema } = useTema();
  const paleta = paletaAnalises(tema), CORES_UF = coresUf(tema);
  const [opcoes, setOpcoes] = useState<OpcoesQ2 | null>(null);
  const [sel, setSel] = useState<{ ano: number | null; cargo: string }>({ ano: null, cargo: "" });
  const [indicador, setIndicador] = useState<Indicador>("mediana");
  const mostrarMock = false;
  const [mapaReal, setMapaReal] = useState<DadosMapaQ2 | null>(null);
  const [resumoReal, setResumoReal] = useState<DadosQ2 | null>(null);
  const [erro, setErro] = useState("");
  const munDados = sel.cargo && !CARGOS_MUNICIPAIS.includes(sel.cargo) ? null : mun;  // cargo estadual não tem município

  useEffect(() => {  // opções (ano × cargo) que existem no banco
    if (mostrarMock) { setOpcoes(opcoesMockQ2); setErro(""); return; }
    const ac = new AbortController();
    setErro("");
    carregar<OpcoesQ2>("/api/bdr/q2/opcoes", ac.signal)
      .then((r) => { if (!ac.signal.aborted) setOpcoes(r); })
      .catch((e) => { if (!ac.signal.aborted) setErro(e.message); });
    return () => ac.abort();
  }, [mostrarMock]);

  useEffect(() => {  // mantém ano e cargo sempre válidos
    const lista = opcoes?.opcoes ?? [];
    if (lista.length) setSel((s) => lista.some((o) => o.ano === s.ano && o.cargo === s.cargo) ? s : escolhaInicial(lista));
  }, [opcoes]);

  useEffect(() => {  // valor por município e por UF (uma consulta por ano e cargo)
    if (mostrarMock || !sel.ano || !sel.cargo) return;
    const ac = new AbortController();
    setMapaReal(null);
    carregar<DadosMapaQ2>(`/api/bdr/q2/municipios?ano=${sel.ano}&cargo=${encodeURIComponent(sel.cargo)}`, ac.signal)
      .then((r) => { if (!ac.signal.aborted) setMapaReal(r); })
      .catch((e) => { if (!ac.signal.aborted) setErro(e.message); });
    return () => ac.abort();
  }, [mostrarMock, sel.ano, sel.cargo]);

  useEffect(() => {  // cartões, decis e comparativo do recorte (Brasil, UF ou município)
    if (mostrarMock || !sel.ano || !sel.cargo) return;
    const ac = new AbortController();
    const q = new URLSearchParams({ ano: String(sel.ano), cargo: sel.cargo });
    if (uf) q.set("uf", uf);
    if (munDados) q.set("municipio", munDados);
    setResumoReal(null);
    carregar<DadosQ2>(`/api/bdr/q2/patrimonio?${q}`, ac.signal)
      .then((r) => { if (!ac.signal.aborted) setResumoReal(r); })
      .catch((e) => { if (!ac.signal.aborted) setErro(e.message); });
    return () => ac.abort();
  }, [mostrarMock, sel.ano, sel.cargo, uf, munDados]);

  // MOCK — o modo de exemplo gera os mesmos tipos que a API devolve. Quando não precisar mais
  // dele, apague estes dois useMemo, o botão "Usar dados de exemplo" e o import de mockPatrimonio.
  const mapaMock = useMemo(() => mostrarMock && cat && sel.ano && sel.cargo ? gerarMockMapaQ2(cat.municipios, sel.ano, sel.cargo) : null, [mostrarMock, cat, sel.ano, sel.cargo]);
  const resumoMock = useMemo((): DadosQ2 | null => {
    if (!mostrarMock || !sel.ano || !sel.cargo) return null;
    if (!munDados) return gerarMockPatrimonio(sel.cargo, uf ?? "", sel.ano);
    const r = mapaMock?.municipios.find((m) => m.id_municipio === munDados);
    const vazio = { total: 0, validos: 0, negativos: 0, sem_resultado_definido: 0, cobertura_pct: null as number | null };
    const base = { ano: sel.ano, cargo: sel.cargo, uf, municipio: munDados, ufs_cobertas: UFS_Q2 };
    if (!r) return { ...base, resumo_situacao: [], correlacao: { linear: null, log: null, candidaturas: 0 }, decis: [], cobertura: vazio };
    const situacao = (s: "eleito" | "nao_eleito", n: number, v: number | null) => ({ situacao: s, candidaturas: n, patrimonio_medio: v ?? 0, patrimonio_mediano: v ?? 0 });
    return {
      ...base, correlacao: { linear: null, log: null, candidaturas: r.analisadas }, decis: [],
      resumo_situacao: [situacao("eleito", r.eleitos, r.patrimonio_mediano_eleitos), situacao("nao_eleito", r.analisadas - r.eleitos, r.patrimonio_mediano_nao_eleitos)].filter((s) => s.candidaturas > 0),
      cobertura: { ...vazio, total: r.candidaturas, validos: r.analisadas, cobertura_pct: 100 * r.analisadas / r.candidaturas },
    };
  }, [mostrarMock, sel.ano, sel.cargo, uf, munDados, mapaMock]);

  // descarta respostas de um recorte anterior enquanto a nova chega
  const mapa = mostrarMock ? mapaMock : mapaReal && mapaReal.ano === sel.ano && mapaReal.cargo === sel.cargo ? mapaReal : null;
  const resumo = mostrarMock ? resumoMock : resumoReal && resumoReal.ano === sel.ano && resumoReal.cargo === sel.cargo
    && (resumoReal.uf ?? null) === (uf ?? null) && (resumoReal.municipio ?? null) === (munDados ?? null) ? resumoReal : null;

  const cargoMunicipal = CARGOS_MUNICIPAIS.includes(sel.cargo);
  const cargoEstadual = !!sel.cargo && !cargoMunicipal;
  useEffect(() => { if (cargoEstadual && mun) onMun(null); }, [cargoEstadual]);  // ao mudar para cargo estadual, solta o município
  const nomeUf = cat?.ufs.find((u) => u.sigla === uf)?.nome || uf || "Brasil";
  const ufRow = (s: string | null) => mapa?.ufs.find((x) => x.uf === s);
  const munsDaUf = useMemo(() => uf && mapa ? mapa.municipios.filter((m) => m.uf === uf) : [], [mapa, uf]);
  const porMunicipio = useMemo(() => new Map(munsDaUf.map((m) => [m.id_municipio, m])), [munsDaUf]);
  const naoNulo = (v: number | null): v is number => v != null;
  const escalaUfs = useMemo(() => criarEscala((mapa?.ufs ?? []).map((r) => valorDe(r, indicador)).filter(naoNulo), indicador, tema), [mapa, indicador, tema]);
  const escalaMun = useMemo(() => criarEscala(munsDaUf.map((r) => valorDe(r, indicador)).filter(naoNulo), indicador, tema), [munsDaUf, indicador, tema]);
  const escalaAtiva = !uf || cargoEstadual ? escalaUfs : escalaMun;

  const cor = (id: string) => {  // município; nos cargos estaduais o estado inteiro tem a cor da UF
    const v = cargoEstadual ? valorDe(ufRow(uf), indicador) : valorDe(porMunicipio.get(id), indicador);
    return v == null || !escalaAtiva ? CINZA_SEM_REGISTRO : escalaAtiva.cor(v);
  };
  const corUf = (sigla: string) => {
    const v = valorDe(ufRow(sigla), indicador);
    return v == null || !escalaUfs ? undefined : escalaUfs.cor(v);
  };
  const descricaoUf = (sigla: string) => {
    const r = ufRow(sigla), v = valorDe(r, indicador);
    return v == null ? `${sigla} — sem dados neste recorte` : `${sigla} — ${rotuloIndicador(indicador)}: ${formatarValor(v, indicador)} · ${num(r!.analisadas)} candidaturas analisadas`;
  };
  const descricaoMun = (id: string) => {
    const nome = nomes[id] || id;
    if (cargoEstadual) return `${nome} — cargo estadual: ${descricaoUf(uf!)}`;
    const r = porMunicipio.get(id), v = valorDe(r, indicador);
    return v == null ? `${nome} — sem dados neste recorte` : `${nome} — ${rotuloIndicador(indicador)}: ${formatarValor(v, indicador)} · ${num(r!.analisadas)} candidaturas analisadas`;
  };

  const minimoRanking = sel.cargo === "PREFEITO" ? 2 : 5;
  const ranking = useMemo(() => {
    const itens = !uf ? (mapa?.ufs ?? []).map((r) => ({ id: r.uf, nome: r.uf, row: r as LinhaTerritorio }))
      : cargoMunicipal ? munsDaUf.filter((r) => r.analisadas >= minimoRanking).map((r) => ({ id: r.id_municipio, nome: nomes[r.id_municipio] || r.municipio || r.id_municipio, row: r as LinhaTerritorio })) : [];
    return itens.map((x) => ({ ...x, valor: valorDe(x.row, indicador) })).filter((x) => x.valor != null)
      .sort((a, b) => (b.valor as number) - (a.valor as number)).slice(0, 10);
  }, [mapa, munsDaUf, uf, cargoMunicipal, indicador, nomes, minimoRanking]);
  const maxRanking = Math.max(1, ...ranking.map((x) => x.valor as number));

  const eleitos = resumo?.resumo_situacao.find((s) => s.situacao === "eleito");
  const naoEleitos = resumo?.resumo_situacao.find((s) => s.situacao === "nao_eleito");
  const temDados = !!resumo?.resumo_situacao.length;
  const semPatrimonio = !!resumo && resumo.cobertura.total > 0 && resumo.cobertura.validos === 0;
  const poucosParaDecis = temDados && (resumo!.correlacao.candidaturas < MIN_DECIS || !resumo!.decis.length);
  const maxTaxa = Math.max(1, ...(resumo?.decis.map((d) => d.taxa_sucesso_pct) ?? [1]));
  const maxMediana = Math.max(1, eleitos?.patrimonio_mediano ?? 0, naoEleitos?.patrimonio_mediano ?? 0);
  const esperando = !resumo && !erro;
  const celula = (valor: string) => esperando ? "…" : temDados ? valor : "—";

  const linhaSel = munDados ? porMunicipio.get(munDados) : ufRow(uf);
  const cargosDoAno = (opcoes?.opcoes ?? []).filter((o) => o.ano === sel.ano);
  const anosDisponiveis = new Set((opcoes?.opcoes ?? []).map((o) => o.ano));
  const lista = opcoes?.opcoes ?? [];
  const razaoSel = valorDe(linhaSel, "razao");

  const legendaMapa = <div className="legenda"><strong>{rotuloIndicador(indicador)} · {sel.ano ?? "—"}</strong>
    <div className="barra" style={{ background: `linear-gradient(90deg, ${(indicador === "razao" ? paleta.razao : paleta.patrimonio).join(", ")})` }} />
    <span>{escalaAtiva ? indicador === "razao" ? "0,5× → 2×" : `${brlCompacto(escalaAtiva.minimo)} → ${brlCompacto(escalaAtiva.maximo)}` : "Aguardando dados"}</span>
    <span>{indicador === "razao" ? "Acima de 1×, os eleitos declaram mais que os não eleitos." : `Escala logarítmica, relativa a ${!uf || cargoEstadual ? "estas UFs" : "estes municípios"}.`}</span>
    <span><i style={{ background: CINZA_SEM_REGISTRO }} /> sem dados neste recorte</span></div>;

  return <div className="layout layout-painel analysis-patrimonio">
    <header className="app-header">
      <div className="app-header-main">
        <div className="view-heading"><span className="view-kicker">ELEIÇÕES BRASIL / PAINEL{mostrarMock ? " / DADOS SIMULADOS" : ""}</span><strong>Patrimônio e sucesso eleitoral</strong></div>
        <div className="app-header-actions"><div className="selected-location" aria-live="polite"><span>{mun ? "MUNICÍPIO SELECIONADO" : uf ? "ESTADO SELECIONADO" : "ABRANGÊNCIA"}</span>
          <strong>{mun ? `${nomes[mun] || mun} (${uf})` : uf ? `${nomeUf} (${uf})` : "Brasil · UFs disponíveis"}</strong>
          {mun && <button type="button" onClick={() => onMun(null)}>← Ver {nomeUf}</button>}</div><AlternarTema /></div>
      </div>
      <div className="app-filter-row">
        <div className="analysis-switch" role="group" aria-label="Análise eleitoral">
          <button aria-pressed={false} onClick={() => onAnalise("abstencao")}>Abstenção</button>
          <button aria-pressed={false} onClick={() => onAnalise("legenda")}>Votos por legenda</button>
          <button aria-pressed={false} onClick={() => onAnalise("publicidade")}>Publicidade</button>
          <button aria-pressed={true}>Patrimônio</button>
        </div>
        <label>Estado <select value={uf || ""} onChange={(e) => onUf((e.target as HTMLSelectElement).value || null)}>
          <option value="">Brasil</option>{UFS_Q2.map((s) => <option value={s}>{cat?.ufs.find((u) => u.sigla === s)?.nome || s} ({s})</option>)}</select></label>
        <label>Ano <select value={sel.ano ?? ""} disabled={!lista.length} onChange={(e) => {
          const ano = Number((e.target as HTMLSelectElement).value);
          const doAno = lista.filter((o) => o.ano === ano);
          setSel((s) => ({ ano, cargo: doAno.some((o) => o.cargo === s.cargo) ? s.cargo : (doAno.find((o) => o.cargo === "VEREADOR") ?? doAno[0])?.cargo ?? "" }));
        }}>{ANOS.map((a) => <option value={a} disabled={!anosDisponiveis.has(a)}>{a}{anosDisponiveis.has(a) ? "" : " (sem dados)"}</option>)}</select></label>
        <label>Cargo <select value={sel.cargo} disabled={!cargosDoAno.length} onChange={(e) => setSel((s) => ({ ...s, cargo: (e.target as HTMLSelectElement).value }))}>
          {cargosDoAno.map((o) => <option value={o.cargo}>{rotuloCargo(o.cargo)}</option>)}</select></label>
        <label>Indicador no mapa <select value={indicador} onChange={(e) => setIndicador((e.target as HTMLSelectElement).value as Indicador)}>
          {INDICADORES.map((i) => <option value={i.valor} title={i.rotulo}>{i.curto}</option>)}</select></label>
        
        <button className="clear-filters" onClick={() => { onUf(null); setSel(escolhaInicial(lista) as { ano: number | null; cargo: string }); setIndicador("mediana"); }}>Limpar filtros</button>
      </div>
      {mostrarMock && <div className="mock-data-banner" role="status">Prévia com dados simulados — os números são fictícios e não representam resultados do TSE.</div>}
      {erro && !mostrarMock && <div className="panel-status" role="alert">{erro}</div>}
      {erroGeo && <div className="panel-status" role="alert">{erroGeo}</div>}
      {semPatrimonio && !mostrarMock && <div className="q2-aviso" role="status"><strong>Sem patrimônio declarado para {rotuloCargo(sel.cargo)} em {sel.ano}</strong> — 0 de {num(resumo!.cobertura.total)} candidaturas neste recorte. Escolha outro ano ou cargo.</div>}
      {cargoEstadual && !!mapa && <div className="q2-aviso q2-info" role="status">{rotuloCargo(sel.cargo)} é um cargo estadual: os dados existem por estado, não por município. O mapa pinta cada estado inteiro.</div>}
    </header>

    <section className="dash-kpis" aria-label="Resumo do recorte" aria-busy={esperando}>
      <article><span>Patrimônio mediano · eleitos</span><strong>{celula(brlCompacto(eleitos?.patrimonio_mediano))}</strong>
        <small>{eleitos ? `${num(eleitos.candidaturas)} candidaturas eleitas` : "Sem registros"}</small><i className="kpi-line pink" /></article>
      <article><span>Patrimônio mediano · não eleitos</span><strong>{celula(brlCompacto(naoEleitos?.patrimonio_mediano))}</strong>
        <small>{naoEleitos ? `${num(naoEleitos.candidaturas)} candidaturas não eleitas` : "Sem registros"}</small><i className="kpi-line cyan" /></article>
      <article><span>Correlação patrimônio × sucesso</span><strong>{celula(dec2(resumo?.correlacao.linear))}</strong>
        <small>{temDados && resumo?.correlacao.linear != null ? `Com log do patrimônio: ${dec2(resumo.correlacao.log)}${resumo.correlacao.candidaturas < MIN_DECIS ? " · amostra pequena" : ""}` : mun ? "Poucos candidatos para calcular" : "−1 a 1 · 0 = nenhuma relação"}</small><i className="kpi-line violet" /></article>
      <article><span>Cobertura de patrimônio</span><strong>{esperando ? "…" : resumo ? pct(resumo.cobertura.cobertura_pct) : "—"}</strong>
        <small>{resumo ? `${num(resumo.cobertura.validos)} de ${num(resumo.cobertura.total)} candidaturas` : "Sem registros"}</small><i className="kpi-line teal" /></article>
    </section>

    <Mapa ufs={ufsGeo} muns={uf ? geoMun[uf] ?? [] : []} uf={uf} siglas={siglas} cobertos={new Set(UFS_Q2)}
      mun={mun} cor={cor} corUf={corUf} descricaoUf={descricaoUf} descricaoMun={descricaoMun} nomes={nomes}
      municipiosBusca={municipiosBusca} onUf={onUf} onMun={onMun} onMunicipioBusca={onMunicipio} legendaMapa={legendaMapa} />

    <aside>
      {!uf && <div className="empty-selection"><span>EXPLORAR O MAPA</span><h2>Selecione um lugar</h2><p>Clique em um estado, busque um município no mapa ou use o filtro acima.</p></div>}
      {!uf && !!mapa?.ufs.length && <section className="q2-uf-lista" aria-label="Comparação entre UFs"><h3>{rotuloIndicador(indicador)}</h3>
        {[...mapa.ufs].map((r) => ({ r, v: valorDe(r, indicador) })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1)).map(({ r, v }) =>
          <button key={r.uf} type="button" onClick={() => onUf(r.uf)}><span><i className="state-dot" style={{ background: CORES_UF[r.uf] }} />{r.uf}</span>
            <i className="state-track"><b style={{ width: `${v == null ? 0 : Math.max(6, 100 * v / Math.max(...mapa.ufs.map((x) => valorDe(x, indicador) ?? 0)))}%`, background: CORES_UF[r.uf] }} /></i>
            <strong>{formatarValor(v, indicador)}</strong></button>)}
        <small>{indicador === "razao" ? "Razão entre as medianas de eleitos e de não eleitos." : "Mediana do patrimônio declarado em cada UF."}</small></section>}
      {uf && <>
        <div className="aside-heading"><span>RECORTE ATUAL</span><h2>{mun ? nomes[mun] || mun : nomeUf}</h2>
          <p>{mun && cargoEstadual ? "Cargo estadual: os números são do estado" : mun ? "Detalhes do município selecionado" : cargoMunicipal ? "Clique em um município no mapa ou na lista" : "Cargo estadual: números do estado"}</p></div>
        {linhaSel ? <section aria-live="polite" aria-label="Números do recorte"><dl>
          <dt>Candidaturas</dt><dd>{num(linhaSel.candidaturas)}</dd>
          <dt>Com patrimônio e resultado</dt><dd>{num(linhaSel.analisadas)}</dd>
          <dt>Eleitos</dt><dd>{num(linhaSel.eleitos)} · {pct(linhaSel.taxa_sucesso_pct)}</dd>
          <dt>Patrimônio mediano</dt><dd>{brlCompacto(linhaSel.patrimonio_mediano)}</dd>
          <dt>Mediana dos eleitos</dt><dd>{brlCompacto(linhaSel.patrimonio_mediano_eleitos)}</dd>
          <dt>Mediana dos não eleitos</dt><dd>{brlCompacto(linhaSel.patrimonio_mediano_nao_eleitos)}</dd>
          <dt>Eleitos ÷ não eleitos</dt><dd>{razaoSel == null ? "—" : `${num(razaoSel, 2)}×`}</dd></dl></section>
          : <p className="aviso">{mapa ? "Sem dados neste recorte." : "Carregando…"}</p>}
        {linhaSel && <section className="q2-aside-decis" aria-label="Taxa de sucesso por decil de patrimônio">
          <h3>Patrimônio por decil</h3>
          {temDados && !poucosParaDecis ? <>
            <div className="dash-distribution dash-distribution-compacta" role="img" aria-label="Taxa de sucesso eleitoral por decil de patrimônio declarado">
              {resumo!.decis.map((d) => <div key={d.decil} title={`Decil ${d.decil}: ${brl(d.patrimonio_min)} a ${brl(d.patrimonio_max)} · ${num(d.eleitos)} eleitos de ${num(d.candidaturas)}`}>
                <span>{pct(d.taxa_sucesso_pct, 0)}</span><i style={{ height: `${Math.max(3, 100 * d.taxa_sucesso_pct / maxTaxa)}%` }} /><small>{d.decil}</small></div>)}
            </div>
            <p className="q2-eixo"><span>← menor patrimônio</span><span>maior →</span></p></>
            : <p className="dash-empty-compacta">{esperando ? "Calculando…" : semPatrimonio ? "Sem patrimônio declarado neste recorte." : poucosParaDecis ? `Poucas candidaturas (${num(resumo?.correlacao.candidaturas)}) para decis.` : "Sem candidaturas analisadas."}</p>}
        </section>}
        <button type="button" className="q2-voltar" onClick={() => mun ? onMun(null) : onUf(null)}>← {mun ? `Ver ${nomeUf}` : "Voltar para o Brasil"}</button>
      </>}
    </aside>

    <section className="dash-charts" aria-label="Análises do recorte">
      <article className="dash-chart-card q2-ranking"><h2>{!uf ? "UFs com maior valor" : "Municípios com maior valor"}</h2>
        <p>{rotuloIndicador(indicador)}{uf && cargoMunicipal ? ` · municípios com ao menos ${minimoRanking} candidaturas analisadas` : ""}</p>
        {ranking.length ? <div className="dash-ranking">{ranking.map((x) => <button key={x.id} type="button" onClick={() => !uf ? onUf(x.id) : onMun(x.id)}>
          <span>{x.nome}</span><i><b style={{ width: `${100 * (x.valor as number) / maxRanking}%` }} /></i><strong>{formatarValor(x.valor, indicador)}</strong></button>)}</div>
          : <div className="dash-empty">{uf && cargoEstadual ? "Cargo estadual: não há divisão por município." : mapa ? "Sem dados suficientes neste recorte." : "Carregando…"}</div>}
      </article>
      <article className="dash-chart-card"><h2>Taxa de sucesso por decil de patrimônio</h2>
        <p>Cada barra reúne 10% das candidaturas do recorte, ordenadas pelo patrimônio (decil 1 = menores, 10 = maiores).</p>
        {temDados && !poucosParaDecis ? <>
          <div className="dash-distribution" role="img" aria-label="Taxa de sucesso eleitoral por decil de patrimônio declarado">
            {resumo!.decis.map((d) => <div key={d.decil} title={`Decil ${d.decil}: ${brl(d.patrimonio_min)} a ${brl(d.patrimonio_max)} · ${num(d.eleitos)} eleitos de ${num(d.candidaturas)}`}>
              <span>{pct(d.taxa_sucesso_pct, 0)}</span><i style={{ height: `${Math.max(3, 100 * d.taxa_sucesso_pct / maxTaxa)}%` }} /><small>{d.decil}</small></div>)}
          </div>
          <div className="q2-eixo"><span>← menor patrimônio</span><span>maior patrimônio →</span></div></>
          : <div className="dash-empty">{esperando ? "Calculando os decis…" : semPatrimonio ? "Sem patrimônio declarado para este recorte." : poucosParaDecis ? `Poucas candidaturas (${num(resumo?.correlacao.candidaturas)}) para dividir em decis. Veja o comparativo abaixo.` : "Sem candidaturas com patrimônio e resultado definidos."}</div>}
      </article>
    </section>

    <section className="q2-situacao" aria-label="Patrimônio mediano por situação">
      <h2>Eleitos × não eleitos</h2>
      <p>Patrimônio mediano declarado (a mediana resiste melhor que a média aos poucos patrimônios muito altos).</p>
      {temDados ? <div className="dash-ranking">{resumo!.resumo_situacao.map((s) => <div className="dash-rank-row" key={s.situacao}>
        <span>{s.situacao === "eleito" ? "Eleitos" : "Não eleitos"}</span><i><b style={{ width: `${Math.min(100, 100 * s.patrimonio_mediano / maxMediana)}%` }} /></i><strong>{brlCompacto(s.patrimonio_mediano)}</strong></div>)}</div>
        : <div className="dash-empty">{esperando ? "Carregando…" : "Sem dados para comparar neste recorte."}</div>}
    </section>

    <details className="q2-method"><summary>Como ler estes dados <span>Fonte, regras e limitações</span></summary><div>
      <p><strong>Patrimônio</strong> é o valor de bens que o próprio candidato declarou ao TSE no registro da candidatura; não é auditado. Candidaturas sem valor (ou com valor negativo) ficam fora; veja a cobertura nos cartões.</p>
      <p><strong>Sucesso</strong> é qualquer resultado que comece com “ELEITO” (inclui eleito por QP e por média). <strong>Não eleito</strong> reúne “NÃO ELEITO” e “SUPLENTE”. “#NULO” e “2º TURNO” não definem sucesso nem fracasso e são excluídos{resumo && resumo.cobertura.sem_resultado_definido > 0 ? <> ({num(resumo.cobertura.sem_resultado_definido)} neste recorte)</> : null}. Cada candidatura conta uma vez, pelo resultado do último turno.</p>
      <p><strong>Mapa por município</strong> existe só para prefeito e vereador, que disputam em um município. Deputados, senador e governador disputam no estado inteiro e aparecem por UF. Municípios com poucos candidatos têm medianas instáveis; o ranking exige um mínimo de candidaturas analisadas.</p>
      <p>O patrimônio varia muito entre cargos, então a comparação é sempre dentro de um cargo e de um ano. Correlação não é causa: quem tem mais patrimônio costuma ter também mais estrutura de campanha, partido e visibilidade.</p>
    </div></details>
  </div>;
}

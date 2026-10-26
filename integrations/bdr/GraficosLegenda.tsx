import RecordCollection from '../../src/components/RecordCollection.jsx';

import { useEffect, useState } from "react";
import { coresUf, corPartido as corDoPartido } from "./coresEleitorais";
import { useTema } from "./Tema";

export type LinhaLegenda = { id_municipio: string; municipio: string; id_partido: string; partido: string; votos_legenda: number; votos_nominais: number };
type Opcao = { ano: number; cargo: string };
type SeriePartido = { id: string; nome: string; legenda: number };
export type HistoricoAno = { ano: number; partidos: SeriePartido[] };
type Props = { uf: string | null; mun: string | null; cargo: string; partidoGlobal: string; opcoes: Opcao[]; linhas: LinhaLegenda[]; carregando: boolean; onMunicipio: (uf: string, id: string) => void; ufPorMunicipio: Record<string, string>; ufsDisponiveis: string[]; todosAnos: boolean; historicoMock?: HistoricoAno[]; historicoExterno?: HistoricoAno[]; erroHistoricoExterno?: boolean; faixaSelecionada?: number | null };
export function resumirLegendaPorPartido(ano: number, linhas: LinhaLegenda[]): HistoricoAno {
  const partidos = new Map<string, SeriePartido>();
  for (const item of linhas) {
    const atual = partidos.get(item.id_partido) ?? { id: item.id_partido, nome: item.partido, legenda: 0 };
    atual.legenda += item.votos_legenda;
    partidos.set(item.id_partido, atual);
  }
  return { ano, partidos: [...partidos.values()] };
}
const numero = (valor: number) => valor.toLocaleString("pt-BR");
const percentual = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const normalizarBusca = (valor: string) => valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
const TAMANHO_PAGINA = 10;
const CONTINUIDADE_PARTIDARIA: Record<string, { id: string; nome: string; tipo: "renomeacao" | "fusao" }> = {
  PTC: { id: "historico-agir", nome: "PTC → AGIR", tipo: "renomeacao" },
  AGIR: { id: "historico-agir", nome: "PTC → AGIR", tipo: "renomeacao" },
  PPS: { id: "historico-cidadania", nome: "PPS → CIDADANIA", tipo: "renomeacao" },
  CIDADANIA: { id: "historico-cidadania", nome: "PPS → CIDADANIA", tipo: "renomeacao" },
  PR: { id: "historico-pl", nome: "PR → PL", tipo: "renomeacao" },
  PL: { id: "historico-pl", nome: "PR → PL", tipo: "renomeacao" },
  PRB: { id: "historico-republicanos", nome: "PRB → REPUBLICANOS", tipo: "renomeacao" },
  REPUBLICANOS: { id: "historico-republicanos", nome: "PRB → REPUBLICANOS", tipo: "renomeacao" },
  PATRI: { id: "historico-patriota", nome: "PATRI + PRP → PATRIOTA", tipo: "fusao" },
  PRP: { id: "historico-patriota", nome: "PATRI + PRP → PATRIOTA", tipo: "fusao" },
  PATRIOTA: { id: "historico-patriota", nome: "PATRI + PRP → PATRIOTA", tipo: "fusao" },
  DEM: { id: "historico-uniao", nome: "DEM + PSL → UNIÃO", tipo: "fusao" },
  PSL: { id: "historico-uniao", nome: "DEM + PSL → UNIÃO", tipo: "fusao" },
  "UNIÃO": { id: "historico-uniao", nome: "DEM + PSL → UNIÃO", tipo: "fusao" },
  PHS: { id: "historico-pode", nome: "PODE + PHS → PODE", tipo: "fusao" },
  PODE: { id: "historico-pode", nome: "PODE + PHS → PODE", tipo: "fusao" },
  PPL: { id: "historico-pcdob", nome: "PCdoB + PPL → PCdoB", tipo: "fusao" },
  "PC DO B": { id: "historico-pcdob", nome: "PCdoB + PPL → PCdoB", tipo: "fusao" },
  PCDOB: { id: "historico-pcdob", nome: "PCdoB + PPL → PCdoB", tipo: "fusao" },
};

const chaveHistorica = (partido: SeriePartido) => CONTINUIDADE_PARTIDARIA[partido.nome.toLocaleUpperCase("pt-BR")] ?? { id: partido.id, nome: partido.nome, tipo: null };

export function normalizarHistoricoPartidario(historico: HistoricoAno[]): HistoricoAno[] {
  return historico.map((item) => {
    const partidos = new Map<string, SeriePartido>();
    for (const partido of item.partidos) {
      const continuidade = chaveHistorica(partido);
      const atual = partidos.get(continuidade.id) ?? { id: continuidade.id, nome: continuidade.nome, legenda: 0 };
      atual.legenda += partido.legenda;
      partidos.set(continuidade.id, atual);
    }
    return { ano: item.ano, partidos: [...partidos.values()] };
  });
}

export function GraficosLegenda({ uf, mun, cargo, partidoGlobal, opcoes, linhas, carregando, onMunicipio, ufPorMunicipio, ufsDisponiveis, todosAnos, historicoMock, historicoExterno, erroHistoricoExterno = false, faixaSelecionada = null }: Props) {
  const { tema } = useTema();
  const CORES_UF = coresUf(tema);
  const corPartido = (sigla: string) => corDoPartido(sigla, tema);
  const [historico, setHistorico] = useState<HistoricoAno[]>([]);
  const [erroHistorico, setErroHistorico] = useState(false);
  const [buscaMunicipio, setBuscaMunicipio] = useState("");
  const [paginaMunicipios, setPaginaMunicipios] = useState(1);
  const [escalaSerie, setEscalaSerie] = useState<"participacao" | "votos">("participacao");
  const [partidosComparados, setPartidosComparados] = useState<string[]>([]);
  const [ordemMunicipios, setOrdemMunicipios] = useState<"votos" | "participacao">("votos");
  useEffect(() => { setBuscaMunicipio(""); setPaginaMunicipios(1); }, [uf, cargo, partidoGlobal]);
  useEffect(() => setPartidosComparados([]), [cargo, uf, mun]);
  useEffect(() => {
    setHistorico([]); setErroHistorico(false);
    if (!todosAnos || !cargo || historicoMock || historicoExterno || carregando) return;
    const anos = [...new Set(opcoes.filter((item) => item.cargo === cargo).map((item) => item.ano))].sort((a, b) => a - b);
    if (!anos.length) { setErroHistorico(true); return; }
    const ac = new AbortController();
    const ufsConsulta = uf ? [uf] : ufsDisponiveis;
    Promise.all(anos.map(async (anoConsulta) => {
      const resultados = await Promise.all(ufsConsulta.map(async (sigla) => {
        const resposta = await fetch(`/api/bdr/legenda/${sigla}/${anoConsulta}?cargo=${encodeURIComponent(cargo)}`, { signal: ac.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const dados: { linhas: LinhaLegenda[] } = await resposta.json();
        return dados.linhas;
      }));
      const linhasAno = resultados.flat().filter((item) => !mun || item.id_municipio === mun);
      return resumirLegendaPorPartido(anoConsulta, linhasAno);
    })).then((pontos) => { if (!ac.signal.aborted) setHistorico(pontos); })
      .catch(() => { if (!ac.signal.aborted) setErroHistorico(true); });
    return () => ac.abort();
  }, [todosAnos, uf, mun, cargo, opcoes, ufsDisponiveis, historicoMock, historicoExterno, carregando]);

  const municipios = [...linhas.reduce((acc, item) => {
    const atual = acc.get(item.id_municipio) || { id: item.id_municipio, nome: item.municipio, legenda: 0, nominais: 0, partidos: new Map<string, number>() };
    atual.legenda += item.votos_legenda; atual.nominais += item.votos_nominais;
    atual.partidos.set(item.partido, (atual.partidos.get(item.partido) ?? 0) + item.votos_legenda);
    acc.set(item.id_municipio, atual); return acc;
  }, new Map<string, { id: string; nome: string; legenda: number; nominais: number; partidos: Map<string, number> }>()).values()]
    .map((item) => ({ ...item, participacao: 100 * item.legenda / Math.max(1, item.legenda + item.nominais), partidoLider: [...item.partidos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0]?.[0] ?? "—" }))
    .sort((a, b) => ordemMunicipios === "votos" ? b.legenda - a.legenda || a.nome.localeCompare(b.nome, "pt-BR") : b.participacao - a.participacao || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item, indice) => ({ ...item, posicao: indice + 1 }));
  const municipioSelecionado = municipios.find((item) => item.id === mun);
  const termoMunicipio = normalizarBusca(buscaMunicipio.trim());
  const municipiosFiltrados = municipios.filter((item) => (!termoMunicipio || normalizarBusca(item.nome).includes(termoMunicipio)) && (faixaSelecionada === null || (item.participacao >= faixaSelecionada && (faixaSelecionada === 25 || item.participacao < faixaSelecionada + 5))));
  const totalPaginasMunicipios = Math.max(1, Math.ceil(municipiosFiltrados.length / TAMANHO_PAGINA));
  const paginaAtualMunicipios = Math.min(paginaMunicipios, totalPaginasMunicipios);
  const municipiosExibidos = municipiosFiltrados.slice((paginaAtualMunicipios - 1) * TAMANHO_PAGINA, paginaAtualMunicipios * TAMANHO_PAGINA);
  useEffect(() => {
    if (mun && !termoMunicipio) {
      const indice = municipios.findIndex((item) => item.id === mun);
      if (indice >= 0) setPaginaMunicipios(Math.floor(indice / TAMANHO_PAGINA) + 1);
    }
  }, [mun, municipioSelecionado?.posicao, termoMunicipio]);
  const historicoBruto = [...(historicoMock ?? historicoExterno ?? historico)];
  const historicoAtivo = normalizarHistoricoPartidario(historicoBruto).sort((a, b) => a.ano - b.ano);
  const todosPartidosHistoricos = [...new Map(historicoAtivo.flatMap((item) => item.partidos.map((p) => [p.id, p.nome] as const))).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const totaisPorAno = new Map(historicoAtivo.map((item) => [item.ano, item.partidos.reduce((soma, partido) => soma + partido.legenda, 0)]));
  const seriesHistoricas = todosPartidosHistoricos.map(([id, nome]) => {
    const pontos = historicoAtivo.map((item) => {
      const votos = item.partidos.find((p) => p.id === id)?.legenda;
      return { ano: item.ano, legenda: votos === undefined ? null : escalaSerie === "participacao" ? 100 * votos / Math.max(1, totaisPorAno.get(item.ano) ?? 0) : votos, votos };
    });
    const segmentos = pontos.reduce<{ ano: number; legenda: number }[][]>((grupos, item, indice) => {
      if (item.legenda === null) return grupos;
      if (!grupos.length || pontos[indice - 1].legenda === null) grupos.push([]);
      grupos.at(-1)!.push({ ano: item.ano, legenda: item.legenda });
      return grupos;
    }, []);
    return { id, nome, pontos: pontos.filter((item): item is { ano: number; legenda: number; votos: number } => item.legenda !== null), segmentos };
  });
  const seriesComparaveis = seriesHistoricas.filter((serie) => serie.pontos.length >= 2);
  const totalSemComparacao = seriesHistoricas.length - seriesComparaveis.length;
  const partidosIniciais = [...seriesComparaveis].sort((a, b) => (b.pontos.at(-1)?.legenda ?? 0) - (a.pontos.at(-1)?.legenda ?? 0)).slice(0, 5).map((item) => item.id);
  const partidoGlobalOriginal = historicoBruto.flatMap((item) => item.partidos).find((item) => item.id === partidoGlobal);
  const partidoGlobalComparavel = partidoGlobalOriginal ? chaveHistorica(partidoGlobalOriginal).id : partidoGlobal;
  const idsComparados = partidosComparados.length ? partidosComparados : partidoGlobal && seriesComparaveis.some((serie) => serie.id === partidoGlobalComparavel) ? [partidoGlobalComparavel] : partidosIniciais;
  const seriesComparadas = seriesComparaveis.filter((serie) => idsComparados.includes(serie.id));
  const partidosDisponiveis = seriesComparaveis.filter((serie) => !idsComparados.includes(serie.id));
  const valoresComparados = seriesComparadas.flatMap((serie) => serie.pontos.map((ponto) => ponto.legenda));
  const maximo = Math.max(0, ...valoresComparados);
  const piso = 0, teto = maximo || 1;
  const rotuloValor = (valor: number) => escalaSerie === "participacao" ? percentual(valor) : numero(Math.round(valor));
  const rotuloDiferenca = (valor: number) => `${valor > 0 ? "+" : ""}${escalaSerie === "participacao" ? percentual(valor) : `${numero(Math.round(valor))} votos`}`;
  const anoInicial = historicoAtivo[0]?.ano;
  const anoFinal = historicoAtivo.at(-1)?.ano;
  const xHistorico = (ano: number) => 72 + 456 * (ano - historicoAtivo[0].ano) / Math.max(1, historicoAtivo.at(-1)!.ano - historicoAtivo[0].ano);
  const yHistorico = (valor: number) => 165 - 120 * (valor - piso) / Math.max(1, teto - piso);
  const semDados = carregando || !linhas.length;

  return <section className="legenda-graficos" aria-label="Gráficos de votos por legenda">
    {todosAnos && <article className="dash-chart-card legenda-evolution"><div className="legenda-evolution-head"><div><span>SÉRIE HISTÓRICA</span><h2>Evolução dos votos de legenda</h2><p>{cargo || "Cargo"} · {mun ? "município" : uf || "seis UFs disponíveis"}</p></div></div>
      {erroHistorico || erroHistoricoExterno ? <div className="dash-empty">Não foi possível carregar a série histórica.</div> : !historicoAtivo.length ? <div className="dash-empty">Carregando eleições disponíveis…</div> : !seriesHistoricas.length ? <div className="dash-empty">Não há registros de partidos para este recorte.</div> : !seriesComparaveis.length ? <div className="dash-empty">Nenhum partido possui dados em pelo menos duas eleições neste recorte.</div> : <>
        <div className="legenda-line-options"><label>Como comparar<select value={escalaSerie} onChange={(e) => setEscalaSerie((e.target as HTMLSelectElement).value as "participacao" | "votos")}><option value="participacao">Participação (%)</option><option value="votos">Votos absolutos</option></select></label><label>Adicionar partido<select value="" disabled={!partidosDisponiveis.length || idsComparados.length >= 6} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; if (id) setPartidosComparados([...idsComparados, id]); }}><option value="">{idsComparados.length >= 6 ? "Limite de 6 partidos" : "Escolha um partido"}</option>{partidosDisponiveis.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}</select></label><button type="button" className="legenda-reset-series" onClick={() => setPartidosComparados([])}>Restaurar principais</button></div>
        <p className="legenda-method-note">Comparação histórica: renomeações são unificadas; fusões e incorporações somam as siglas de origem. Isso inclui DEM + PSL → UNIÃO, PODE + PHS → PODE, PCdoB + PPL → PCdoB e PATRI + PRP → PATRIOTA.</p>
        {totalSemComparacao > 0 && <p className="legenda-comparison-notice">{totalSemComparacao} {totalSemComparacao === 1 ? "partido não aparece" : "partidos não aparecem"} no seletor por não {totalSemComparacao === 1 ? "possuir" : "possuírem"} dados em pelo menos duas eleições.</p>}
        <div className="legenda-selected-series" aria-label="Partidos exibidos">{seriesComparadas.map((serie) => <button type="button" key={serie.id} title={`Remover ${serie.nome} do gráfico`} onClick={() => setPartidosComparados(idsComparados.filter((id) => id !== serie.id))}><i style={{ background: corPartido(serie.nome) }} />{serie.nome}<span aria-hidden="true">×</span></button>)}</div>
        <svg className="legenda-trend" viewBox="0 0 600 220" role="img" aria-label={`Votos de legenda de todos os partidos entre ${historicoAtivo[0].ano} e ${historicoAtivo.at(-1)!.ano}`}>
          {[piso, (piso + teto) / 2, teto].map((valor) => <g key={valor}><line x1="72" x2="528" y1={yHistorico(valor)} y2={yHistorico(valor)} className="mock-grid-line" /><text x="62" y={yHistorico(valor) + 4} text-anchor="end" className="legenda-trend-tick">{rotuloValor(valor)}</text></g>)}
          {seriesComparadas.map((serie) => <g key={serie.id}><title>{serie.nome}</title>{serie.segmentos.filter((segmento) => segmento.length > 1).map((segmento) => <polyline key={segmento[0].ano} points={segmento.map((item) => `${xHistorico(item.ano)},${yHistorico(item.legenda)}`).join(" ")} fill="none" stroke={corPartido(serie.nome)} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />)}{serie.pontos.map((item) => <circle key={item.ano} cx={xHistorico(item.ano)} cy={yHistorico(item.legenda)} r="4" fill={corPartido(serie.nome)}><title>{serie.nome} · {item.ano}: {numero(item.votos ?? 0)} votos · {percentual(100 * (item.votos ?? 0) / Math.max(1, totaisPorAno.get(item.ano) ?? 0))} do total</title></circle>)}</g>)}
          {historicoAtivo.map((item) => <text key={item.ano} x={xHistorico(item.ano)} y="205" text-anchor="middle" className="legenda-trend-year">{item.ano}</text>)}
        </svg>
        <div className="legenda-trend-summary" aria-label="Resumo da evolução dos partidos"><div className="legenda-trend-summary-head"><span>Partido</span><strong>{anoInicial}</strong><b aria-hidden="true" /><strong>{anoFinal}</strong><small>Variação</small></div>{seriesComparadas.map((serie) => { const inicio = serie.pontos[0]; const fim = serie.pontos.at(-1)!; const diferenca = fim.legenda - inicio.legenda; return <div key={serie.id}><span><i style={{ background: corPartido(serie.nome) }} />{serie.nome}</span><strong>{rotuloValor(inicio.legenda)}</strong><b aria-hidden="true">→</b><strong>{rotuloValor(fim.legenda)}</strong><small className={diferenca > 0 ? "subiu" : diferenca < 0 ? "caiu" : "estavel"}>{rotuloDiferenca(diferenca)}</small></div>; })}</div>
        <small className="legenda-evolution-note">{escalaSerie === "participacao" ? "Variação da participação entre a primeira e a última eleição." : "Variação no total de votos entre a primeira e a última eleição."}</small>
      </>}
    </article>}
    <article className="dash-chart-card legenda-municipios"><div className="legenda-municipios-intro"><div><span>RECORTE MUNICIPAL</span><h2>Votos de legenda por município</h2><p>Selecione um município para localizá-lo no mapa.</p></div><div className="legenda-municipios-filtros"><strong>{numero(municipiosFiltrados.length)}{termoMunicipio || faixaSelecionada !== null ? ` de ${numero(municipios.length)}` : ""} municípios</strong><input id="busca-municipios-legenda" type="search" value={buscaMunicipio} placeholder="Buscar município" aria-label="Buscar município" onInput={(e) => { setBuscaMunicipio((e.target as HTMLInputElement).value); setPaginaMunicipios(1); }} /><select value={ordemMunicipios} aria-label="Ordenar municípios" onChange={(e) => { setOrdemMunicipios((e.target as HTMLSelectElement).value as "votos" | "participacao"); setPaginaMunicipios(1); }}><option value="votos">Mais votos</option><option value="participacao">Maior participação</option></select></div></div>
      {semDados ? <div className="dash-empty">Os municípios aparecem quando os dados do recorte carregam.</div> : <>
        {municipioSelecionado && <div className="legenda-posicao-municipio" role="status"><span>Município selecionado <strong>{municipioSelecionado.nome}</strong></span><span><b>{municipioSelecionado.posicao}º</b> de {municipios.length} · {numero(municipioSelecionado.legenda)} votos</span></div>}
        {municipiosFiltrados.length ? <><RecordCollection key={paginaAtualMunicipios} pageSize={TAMANHO_PAGINA} title="Explore os municípios por votos de legenda" items={municipiosExibidos.map(item=>({id:item.id,title:item.nome,subtitle:`${item.posicao}º no recorte${!uf&&ufPorMunicipio[item.id]?' · '+ufPorMunicipio[item.id]:''}`,value:`${numero(item.legenda)} votos de legenda`,selected:mun===item.id,bar:{value:item.participacao,max:100,label:`${percentual(item.participacao)} de participação`},fields:[{label:'Participação dos votos de legenda',value:percentual(item.participacao)},{label:'Partido líder',value:item.partidoLider}],actionLabel:'Abrir município',onSelect:()=>{const sigla=ufPorMunicipio[item.id]||uf;if(sigla)onMunicipio(sigla,item.id)}}))}/><nav className="legenda-municipios-paginacao" aria-label="Páginas de municípios"><span>{numero((paginaAtualMunicipios - 1) * TAMANHO_PAGINA + 1)}–{numero(Math.min(paginaAtualMunicipios * TAMANHO_PAGINA, municipiosFiltrados.length))} de {numero(municipiosFiltrados.length)} · página {paginaAtualMunicipios} de {totalPaginasMunicipios}</span><div><button type="button" disabled={paginaAtualMunicipios === 1} onClick={() => setPaginaMunicipios(paginaAtualMunicipios - 1)}>Anterior</button><button type="button" disabled={paginaAtualMunicipios === totalPaginasMunicipios} onClick={() => setPaginaMunicipios(paginaAtualMunicipios + 1)}>Próxima</button></div></nav></> : <div className="dash-empty">Nenhum município encontrado. Tente outro nome ou limpe a faixa selecionada.</div>}
      </>}
    </article>
  </section>;
}

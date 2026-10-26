
import { useEffect, useMemo, useRef, useState } from "react";
import { posicionarPalavras } from "./nuvemQ9";
import { EvolucaoPublicidade } from "./SerieCampanha";
import { AlternarTema } from "./Tema";
import { consultarJson as carregar } from "./requisicaoApi";
type Analise = "abstencao" | "legenda" | "publicidade" | "patrimonio";
type Opcao = { ano: number; cargo: string; rotulo: string };
type Candidato = { id_candidatura: string; id_candidato: string; nome: string; nome_civil: string | null;
  numero_urna: number | null; municipio: string | null; uf: string; partido: string | null };
type Categoria = { categoria: string; grupo: string; valor: number; participacao: number | null; candidaturas: number; registros: number; em_revisao: number };
type Dados = {
  ano: number; cargo: string; uf: string | null; criterio: string; candidato: Candidato | null; grupos: Categoria[]; categorias: Categoria[];
  resumo: { publicidade: number; total_campanha: number; indefinido: number; fora_publicidade: number;
    excluido_criterio: number; em_revisao: number; registros: number; candidaturas: number;
    sem_valor: number; ajustes_negativos: number; tipos: number; categorias: number };
};
type Filtros = { ano: number; cargo: string; uf: string; criterio: "sugeridas" | "explicitas"; candidato: Candidato | null };
const UFS = ["CE", "MA", "MS", "RJ", "RN", "RS"];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (n: number) => n.toLocaleString("pt-BR");
const percentual = (n: number | null) => n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const CORES = ["var(--q9-word-1,#f38bc1)", "var(--q9-word-2,#c2adf1)", "var(--q9-word-3,#f03d94)", "var(--q9-word-4,#a4b7e6)", "var(--q9-word-5,#dc76b3)", "var(--q9-word-6,#9489d9)"];
const chave = (c: Categoria) => `${c.grupo}::${c.categoria}`;

function Nuvem({ categorias, selecionada, onSelecionar }: {
  categorias: Categoria[]; selecionada: string | null; onSelecionar: (categoria: Categoria) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(760);
  const altura = largura < 520 ? 420 : 450;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setLargura(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const medir = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    return (texto: string, tamanho: number) => {
      if (!ctx) return texto.length * tamanho * .56;
      ctx.font = `650 ${tamanho}px system-ui`;
      return ctx.measureText(texto).width;
    };
  }, []);
  const palavras = useMemo(() => posicionarPalavras(categorias, largura, altura, medir), [categorias, largura, altura]);
  return <div className="q9-cloud" ref={ref}>
    <svg viewBox={`0 0 ${largura} ${altura}`} role="group" aria-label="Categorias de publicidade, dimensionadas pelo valor contratado">
      {palavras.map((p, i) => <g key={`${p.grupo}:${p.categoria}`} transform={`translate(${p.x},${p.y})`}
        role="button" tabIndex={0} className={`q9-word ${selecionada === `${p.grupo}::${p.categoria}` ? "is-selected" : ""}`}
        aria-pressed={selecionada === `${p.grupo}::${p.categoria}`}
        aria-label={`${p.categoria}: ${brl(p.valor)}`} onClick={() => onSelecionar(categorias.find((c) => c.categoria === p.categoria && c.grupo === p.grupo)!)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelecionar(categorias.find((c) => c.categoria === p.categoria && c.grupo === p.grupo)!); } }}>
        <title>{p.categoria} · {brl(p.valor)}</title>
        <rect x={-p.largura / 2} y={-p.altura / 2} width={p.largura} height={p.altura} rx={8} />
        <text text-anchor="middle" dominant-baseline="central" font-size={p.tamanho} font-weight={650} fill={CORES[i % CORES.length]}>
          {p.linhas.map((linha, j) => <tspan x={0} y={(j - (p.linhas.length - 1) / 2) * p.tamanho * 1.12}>{linha}</tspan>)}
        </text>
      </g>)}
    </svg>
    <div className="q9-cloud-caption"><span><i /> Maior palavra, maior investimento</span><span>{palavras.length} de {categorias.length} categorias</span></div>
  </div>;
}

function BuscaCandidato({ filtros, onSelecionar }: { filtros: Filtros; onSelecionar: (c: Candidato | null) => void }) {
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<{ candidatos: Candidato[]; tem_mais: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    setResultado(null); setErro("");
    if (busca.trim().length < 2 || filtros.candidato) { setCarregando(false); return; }
    const ac = new AbortController();
    setCarregando(true);
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ ano: String(filtros.ano), cargo: filtros.cargo, busca: busca.trim() });
      if (filtros.uf) query.set("uf", filtros.uf);
      carregar<{ candidatos: Candidato[]; tem_mais: boolean }>(`/api/bdr/q9/candidatos?${query}`, ac.signal)
        .then((r) => { if (!ac.signal.aborted) { setResultado(r); setCarregando(false); } })
        .catch((e) => { if (!ac.signal.aborted) { setErro(e.message); setCarregando(false); } });
    }, 300);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [busca, filtros.candidato, tentativa]);
  const detalhes = (c: Candidato) => [c.numero_urna, c.partido, c.municipio, c.uf].filter((v) => v != null && v !== "").join(" · ");
  if (filtros.candidato) return <section className="q9-candidate-selected" aria-label="Candidato selecionado">
    <div><span className="q9-eyebrow">DESPESAS DESTE CANDIDATO</span><strong>{filtros.candidato.nome}</strong>
      <small>{detalhes(filtros.candidato)} · {filtros.ano}</small></div>
    <button onClick={() => { setBusca(""); onSelecionar(null); }}>Ver todos os candidatos</button>
  </section>;
  return <section className="q9-candidate-search" aria-label="Analisar um candidato específico">
    <label for="q9-busca-candidato">Pesquisar candidato específico</label>
    <div className="q9-candidate-input"><input id="q9-busca-candidato" type="search" autoComplete="off" maxLength={120}
      placeholder="Digite o nome de urna ou nome civil" value={busca} aria-describedby="q9-busca-ajuda"
      onInput={(e) => { setBusca(e.currentTarget.value); setResultado(null); setErro(""); }} />
      {busca && <button aria-label="Limpar busca de candidato" onClick={() => setBusca("")}>Limpar</button>}</div>
    <p id="q9-busca-ajuda">Busque pelo menos 2 letras e selecione uma candidatura. A busca respeita o ano, cargo e estado acima.</p>
    <div role="status" aria-live="polite">{carregando ? "Buscando candidatos…" : resultado ? resultado.candidatos.length ? `${resultado.candidatos.length} candidaturas encontradas${resultado.tem_mais ? "; refine o nome para ver outras" : ""}.` : "Nenhum candidato com despesas encontrado neste recorte." : ""}</div>
    {erro && <div className="q9-search-error" role="alert">{erro} <button onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>}
    {!!resultado?.candidatos.length && <ul className="q9-candidate-results">{resultado.candidatos.map((c) => <li key={c.id_candidatura}><button onClick={() => onSelecionar(c)}>
      <strong>{c.nome}</strong><span>{detalhes(c)}</span>
      {c.nome_civil && c.nome_civil !== c.nome && <small>{c.nome_civil}</small>}
    </button></li>)}</ul>}
  </section>;
}

function exportar(dados: Dados) {
  const linhas: (string | number)[][] = [["Ano", "Cargo", "UF", "Candidato", "ID candidatura", "Tipo de publicidade", "Valor contratado", "Participação na publicidade (%)", "Candidaturas", "Registros"]];
  for (const g of dados.grupos) linhas.push([dados.ano, dados.cargo, dados.uf || "CE MA MS RJ RN RS", dados.candidato?.nome || "Todos", dados.candidato?.id_candidatura || "", g.grupo,
    g.valor.toFixed(2).replace(".", ","), g.participacao?.toFixed(4).replace(".", ",") || "", g.candidaturas, g.registros]);
  const csv = "\uFEFF" + linhas.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `publicidade-${dados.ano}-${dados.cargo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PainelPublicidade({ onAnalise, ufInicial }: { onAnalise: (analise: Analise) => void; ufInicial?: string | null }) {
  const [filtros, setFiltros] = useState<Filtros>({ ano: 2024, cargo: "PREFEITO", uf: ufInicial || "", criterio: "sugeridas", candidato: null });
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [erroOpcoes, setErroOpcoes] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [atualizacao, setAtualizacao] = useState(0);
  const ultimaAtualizacao = useRef(0);
  const [foco, setFoco] = useState<{ grupo: string; categoria?: string } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setErroOpcoes("");
    carregar<{ opcoes: Opcao[] }>("/api/bdr/q9/opcoes", ac.signal).then((r) => {
      if (ac.signal.aborted) return;
      setOpcoes(r.opcoes);
      const preferida = r.opcoes.find((o) => o.ano === 2024 && o.cargo === "PREFEITO") || r.opcoes[0];
      if (preferida) setFiltros((f) => ({ ...f, ano: preferida.ano, cargo: preferida.cargo }));
      else { setCarregando(false); setErroOpcoes("Não há despesas disponíveis nos anos de 2018, 2020, 2022 e 2024."); }
    }).catch((e) => { if (!ac.signal.aborted) { setErroOpcoes(e.message); setCarregando(false); } });
    return () => ac.abort();
  }, [tentativa]);

  useEffect(() => {
    if (!opcoes.some((o) => o.ano === filtros.ano && o.cargo === filtros.cargo)) return;
    const ac = new AbortController();
    setCarregando(true); setDados(null); setErro(""); setFoco(null);
    const query = new URLSearchParams({ ano: String(filtros.ano), cargo: filtros.cargo, criterio: filtros.criterio });
    if (filtros.uf) query.set("uf", filtros.uf);
    if (filtros.candidato) query.set("id_candidatura", filtros.candidato.id_candidatura);
    if (atualizacao !== ultimaAtualizacao.current) query.set("atualizar", "true");
    ultimaAtualizacao.current = atualizacao;
    carregar<Dados>(`/api/bdr/q9/despesas?${query}`, ac.signal).then((r) => {
      if (!ac.signal.aborted) { setDados(r); setCarregando(false); }
    }).catch((e) => { if (!ac.signal.aborted) { setErro(e.message); setCarregando(false); } });
    return () => ac.abort();
  }, [opcoes, filtros, atualizacao]);

  const resumo = dados?.resumo;
  const selecionada = foco?.categoria ? dados?.categorias.find((c) => c.grupo === foco.grupo && c.categoria === foco.categoria) : null;
  const destaque = selecionada || dados?.grupos.find((g) => g.grupo === foco?.grupo) || dados?.grupos[0];
  const palavras = useMemo(() => (dados?.categorias || []).filter((c) => c.valor > 0 && (!foco || c.grupo === foco.grupo)), [dados, foco?.grupo]);
  const cargoRotulo = opcoes.find((o) => o.ano === filtros.ano && o.cargo === filtros.cargo)?.rotulo || "Cargo";
  const parcela = resumo && resumo.total_campanha > 0 ? 100 * resumo.publicidade / resumo.total_campanha : null;
  const temDados = !!resumo?.registros;

  return <div className="layout q9-page">
    <header className="app-header">
      <div className="app-header-main">
        <div className="view-heading"><span className="view-kicker">ELEIÇÕES BRASIL / QUESTÃO 09</span><strong>Publicidade eleitoral</strong><span className="view-context">O investimento por trás das campanhas</span></div>
        <div className="app-header-actions"><span className="q9-periodo"><i /> 2018 — 2024</span><AlternarTema /></div>
      </div>
      <div className="app-filter-row">
        <div className="analysis-switch" role="group" aria-label="Análise eleitoral">
          <button aria-pressed={false} onClick={() => onAnalise("abstencao")}>Abstenção</button>
          <button aria-pressed={false} onClick={() => onAnalise("legenda")}>Votos por legenda</button>
          <button aria-pressed={true}>Publicidade</button>
          <button aria-pressed={false} onClick={() => onAnalise("patrimonio")}>Patrimônio</button>
        </div>
        <label>Ano da eleição<select aria-label="Ano da eleição" value={filtros.ano} disabled={!opcoes.length} onChange={(e) => {
          const ano = Number(e.currentTarget.value);
          setFiltros((f) => ({ ...f, ano, candidato: null, cargo: opcoes.some((o) => o.ano === ano && o.cargo === f.cargo) ? f.cargo : opcoes.find((o) => o.ano === ano)?.cargo || "" }));
        }}>{[2024, 2022, 2020, 2018].map((ano) => <option value={ano} disabled={!opcoes.some((o) => o.ano === ano)}>{ano}</option>)}</select></label>
        <label>Tipo de candidato · cargo<select aria-label="Cargo disputado" value={filtros.cargo} disabled={!opcoes.length} onChange={(e) => { const cargo = e.currentTarget.value; setFiltros((f) => ({ ...f, cargo, candidato: null })); }}>
          {opcoes.filter((o) => o.ano === filtros.ano).map((o) => <option value={o.cargo}>{o.rotulo}</option>)}
        </select></label>
        <label>Estado<select aria-label="Estado da candidatura" value={filtros.uf} onChange={(e) => { const uf = e.currentTarget.value; setFiltros((f) => ({ ...f, uf, candidato: null })); }}><option value="">Todas as 6 UFs</option>{UFS.map((uf) => <option value={uf}>{uf}</option>)}</select></label>
        <button className="q9-refresh" disabled={carregando} onClick={() => erroOpcoes ? setTentativa((n) => n + 1) : setAtualizacao((n) => n + 1)} aria-label="Atualizar despesas">↻</button>
      </div>
    </header>

    <main className="q9-content">
      <div className="q9-intro"><div><span className="q9-eyebrow">GASTOS DE CAMPANHA</span><h1>Concentração de Gastos Publicitários</h1><p>Explore os tipos de publicidade e propaganda eleitoral por cargo e ano.</p></div>
        <div className="q9-intro-actions"><span className="q9-context-chip">{cargoRotulo} <b>·</b> {filtros.ano} <b>·</b> {filtros.uf || "6 UFs"}</span><button className="q9-export" disabled={!temDados || carregando} onClick={() => dados && exportar(dados)}>↓ Baixar resumo</button></div>
      </div>

      {(erro || erroOpcoes) && <div className="q9-error" role="alert"><div><strong>Não foi possível carregar este recorte</strong><p>{erro || erroOpcoes}</p></div><button onClick={() => erroOpcoes ? setTentativa((n) => n + 1) : setAtualizacao((n) => n + 1)}>Tentar novamente</button></div>}

      <BuscaCandidato key={`${filtros.ano}:${filtros.cargo}:${filtros.uf}`} filtros={filtros} onSelecionar={(candidato) => setFiltros((f) => ({ ...f, candidato }))} />

      <section className="q9-kpis" aria-label="Investimento no recorte" aria-busy={carregando}>
        <article className="q9-kpi q9-kpi-principal"><div><span className="q9-kpi-label">Publicidade identificada</span><span className="q9-kpi-icon">↗</span></div><strong>{carregando ? <i className="q9-skeleton" /> : resumo ? brl(resumo.publicidade) : "—"}</strong><p>Valor contratado nas categorias selecionadas</p></article>
        <article className="q9-kpi"><div><span className="q9-kpi-label">Parcela das despesas de campanha</span><span className="q9-kpi-icon">◔</span></div><strong>{carregando ? <i className="q9-skeleton" /> : percentual(parcela)}</strong><p>{resumo ? `de ${brl(resumo.total_campanha)} contratados no recorte` : "Publicidade em relação às despesas do recorte"}</p></article>
        <article className="q9-kpi"><div><span className="q9-kpi-label">Candidaturas com publicidade</span><span className="q9-kpi-icon">♧</span></div><strong>{carregando ? <i className="q9-skeleton" /> : resumo ? numero(resumo.candidaturas) : "—"}</strong><p>{resumo ? `${resumo.tipos} tipos de publicidade · ${numero(resumo.registros)} registros` : "Candidaturas distintas no recorte"}</p></article>
      </section>

      <div className="q9-exploration">
        <section className="q9-card q9-cloud-card" aria-label="Nuvem de categorias de gastos">
          <div className="q9-card-heading"><div><span className="q9-eyebrow">O PESO DE CADA CATEGORIA</span><h2>O que move a campanha</h2><p>{foco ? foco.grupo : "As palavras revelam onde está o investimento."}</p></div>{foco && <button className="q9-reset" onClick={() => setFoco(null)}>Ver todas ↗</button>}</div>
          {carregando ? <div className="q9-cloud-loading" role="status"><div className="q9-orbita" /><strong>Organizando as categorias…</strong><span>Calculando os valores de {cargoRotulo.toLowerCase()} em {filtros.ano}.</span></div>
            : palavras.length ? <Nuvem categorias={palavras} selecionada={selecionada ? chave(selecionada) : null} onSelecionar={(c) => setFoco({ grupo: c.grupo, categoria: c.categoria })} />
            : <div className="q9-empty"><span>◌</span><h3>{erro || erroOpcoes ? "Aguardando os dados" : "Sem categorias para a nuvem"}</h3><p>{temDados ? "As categorias deste recorte não têm saldo positivo. Consulte os valores no ranking." : "Não há despesas identificadas como publicidade com estes filtros. Experimente outro ano, cargo ou estado."}</p></div>}
        </section>

        <section className="q9-card q9-spotlight" aria-live="polite">
          <span className="q9-eyebrow">{foco ? "SEU RECORTE EM DESTAQUE" : "MAIOR CONCENTRAÇÃO"}</span>
          <div className="q9-spotlight-symbol">↗</div>
          <h2>{carregando ? "Lendo os investimentos…" : destaque ? selecionada?.categoria || destaque.grupo : "Nenhum tipo identificado"}</h2>
          <strong className="q9-spotlight-value">{!carregando && destaque ? brl(destaque.valor) : "—"}</strong>
          <p>{selecionada ? "contratados nesta categoria" : "contratados neste tipo de publicidade"}</p>
          <div className="q9-share"><div className="q9-ring" style={{ background: `conic-gradient(var(--chart-pink,#f03d94) ${Math.min(100, Math.max(0, destaque?.participacao || 0))}%, var(--theme-surface-raised,#343d58) 0)` }}><span>{!carregando ? percentual(destaque?.participacao ?? null) : "—"}</span></div><p>do investimento<br /><strong>em publicidade identificada</strong></p></div>
          <div className="q9-spotlight-bottom"><span>Candidaturas</span><strong>{!carregando && destaque ? numero(destaque.candidaturas) : "—"}</strong></div>
          <small>Clique em uma palavra ou em um tipo abaixo para explorar o valor investido.</small>
        </section>
      </div>

      <section className="q9-card q9-ranking" aria-label="Valores por tipo de publicidade">
        <div className="q9-card-heading"><div><span className="q9-eyebrow">INVESTIMENTO EM PERSPECTIVA</span><h2>Como os gastos se distribuem</h2><p>Participação de cada tipo no valor contratado em publicidade.</p></div><span className="q9-count">{dados?.grupos.length || 0} tipos</span></div>
        <div className="q9-rank-head"><span>Tipo de publicidade</span><span>Valor contratado</span><span>Participação</span></div>
        {!carregando && dados?.grupos.length ? dados.grupos.map((g, i) => <button key={g.grupo} className={`q9-rank-row ${foco?.grupo === g.grupo ? "active" : ""}`} aria-pressed={foco?.grupo === g.grupo} onClick={() => setFoco(foco?.grupo === g.grupo && !foco.categoria ? null : { grupo: g.grupo })}>
          <span className="q9-rank-name"><small>{String(i + 1).padStart(2, "0")}</small><span>{g.grupo}<i className="q9-track"><b style={{ width: `${Math.max(0, 100 * g.valor / Math.max(1, dados.grupos[0].valor))}%`, background: i === 0 ? "var(--chart-pink,#f03d94)" : "var(--chart-purple,#8f80c2)" }} /></i></span></span><strong>{brl(g.valor)}</strong><span>{percentual(g.participacao)}</span>
        </button>) : <div className="q9-rank-placeholder">{carregando ? "Carregando valores…" : "Os valores por tipo aparecerão aqui quando houver despesas identificadas."}</div>}
      </section>

      <EvolucaoPublicidade key={`${filtros.cargo}:${filtros.uf}:${filtros.candidato?.id_candidato || "todos"}`} cargo={filtros.cargo} uf={filtros.uf} criterio={filtros.criterio} candidato={filtros.candidato} atualizacao={atualizacao} />

      <details className="q9-method"><summary>Como ler estes dados <span>Classificação, cobertura e valores</span></summary><div>
        <p>As categorias são sugestões analíticas obtidas das descrições das despesas. Não são categorias oficiais do TSE. Valores contratados não significam valores já pagos.</p>
        <label className="q9-strict"><input type="checkbox" checked={filtros.criterio === "explicitas"} onChange={(e) => { const checked = e.currentTarget.checked; setFiltros((f) => ({ ...f, criterio: checked ? "explicitas" : "sugeridas" })); }} /><span>Mostrar apenas equivalências explícitas sem ambiguidade prevista no dicionário.<small>É um subconjunto conservador; não representa toda a publicidade da campanha.</small></span></label>
        {resumo && <p><strong>{brl(resumo.em_revisao)}</strong> da publicidade exibida depende de classificação textual em revisão. Outros <strong>{brl(resumo.indefinido)}</strong> no recorte têm natureza de publicidade indefinida e ficam fora da nuvem e do ranking.{resumo.sem_valor > 0 && ` Há ${numero(resumo.sem_valor)} registros sem valor monetário válido, excluídos das somas.`}</p>}
        <p>A nuvem mostra até 32 categorias com saldo positivo (18 em telas pequenas). Palavras maiores indicam maior valor; o ranking informa os números exatos. Ajustes negativos são preservados nas somas. Candidaturas são contadas de forma distinta, sem somar contagens entre categorias.</p>
      </div></details>
      <footer className="q9-footer"><span><i /> Recorte disponível: CE, MA, MS, RJ, RN e RS.</span><span>{cargoRotulo} · {filtros.ano} · {filtros.uf || "Todas as 6 UFs"}</span></footer>
    </main>
  </div>;
}

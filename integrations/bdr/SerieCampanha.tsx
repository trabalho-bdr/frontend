import RecordCollection from '../../src/components/RecordCollection.jsx';

import { useEffect, useState } from "react";
import { useTema } from "./Tema";
import { paletaAnalises } from "./paletaAnalises";
import { consultarJson as get } from "./requisicaoApi";

type Candidato = { id_candidato: string; nome: string };
type Partido = { id_partido: string; sigla: string; nome: string };
type Taxa = { analisadas: number; eleitas: number; taxa: number | null };
type Coorte = { pares: number; antes: Taxa; depois: Taxa; variacao_taxa_pp: number | null; novas_vitorias: number; vitorias_consecutivas: number };
type Ano = { ano: number; candidaturas: number; resultado: Taxa; sem_resultado: number; com_despesas: number; com_perfil: number;
  publicidade: number; em_revisao: number; sem_valor: number; partidos: string[]; resultados: string[];
  grupos: { grupo: string; valor: number; participacao: number | null }[] };
type Comparacao = { antes: number; depois: number; mudanca_pp: number | null; candidatos_repetidos: number; perfis_comparaveis: number;
  variacoes: { grupo: string; antes: number; depois: number; delta_pp: number }[];
  coorte: Coorte; faixas: (Coorte & { faixa: string })[];
  associacoes: { grupo: string; ampliaram: Coorte; outros: Coorte; diferenca_taxas_pp: number | null }[] };
type Dados = { modo: string; serie: Ano[]; comparacoes: Comparacao[] };
const dinheiro = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nfmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const pct = (n: number | null | undefined) => n == null ? "—" : `${nfmt(n)}%`;
const pontos = (n: number | null | undefined) => n == null ? "—" : `${n > 0 ? "+" : ""}${nfmt(n)} p.p.`;
function BadgeResultado({ ano }: { ano: Ano }) {
  const definido = ano.candidaturas === 1 && ano.resultado.analisadas === 1;
  const eleito = definido && ano.resultado.eleitas === 1;
  const texto = definido ? eleito ? "Eleito" : "Não eleito"
    : !ano.candidaturas ? "Sem candidatura" : ano.candidaturas > 1 ? "Resultados diversos" : "Sem resultado definido";
  const estado = definido ? eleito ? "eleito" : "nao-eleito" : "indefinido";
  return <span className={`q9-evo-result q9-evo-result-${estado}`} title={ano.resultados.join(" · ") || texto}
    aria-label={`Resultado eleitoral ${ano.ano}: ${texto}`}>
    <span aria-hidden="true">{definido ? eleito ? "✓" : "×" : "—"}</span>{texto}
  </span>;
}

export function EvolucaoPublicidade({ cargo, uf, criterio, candidato, atualizacao }: {
  cargo: string; uf: string; criterio: string; candidato: Candidato | null; atualizacao: number;
}) {
  const { tema } = useTema();
  const cores = paletaAnalises(tema).publicidade;
  const [modo, setModo] = useState<"partido" | "candidato">(candidato ? "candidato" : "partido");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [partido, setPartido] = useState("");
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [erroPartidos, setErroPartidos] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [periodo, setPeriodo] = useState("");
  const titulares = ["PREFEITO", "VEREADOR", "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "SENADOR", "GOVERNADOR", "PRESIDENTE"];
  const valido = titulares.includes(cargo);
  useEffect(() => {
    if (!valido || modo !== "partido") return;
    const ac = new AbortController(); setErroPartidos("");
    const q = new URLSearchParams({ cargo }); if (uf) q.set("uf", uf);
    get<{ partidos: Partido[] }>(`/api/bdr/q9/partidos?${q}`, ac.signal).then((r) => {
      if (ac.signal.aborted) return;
      setPartidos(r.partidos); setPartido((id) => r.partidos.some((p) => p.id_partido === id) ? id : r.partidos[0]?.id_partido || "");
    }).catch((e) => { if (!ac.signal.aborted) setErroPartidos(e.message); });
    return () => ac.abort();
  }, [cargo, uf, modo, tentativa, valido]);
  useEffect(() => {
    setDados(null); setErro(""); setCarregando(false);
    if (!valido || (modo === "partido" ? !partido : !candidato)) return;
    const ac = new AbortController(); setCarregando(true);
    const q = new URLSearchParams({ cargo, criterio }); if (uf) q.set("uf", uf);
    if (modo === "partido") q.set("id_partido", partido); else q.set("id_candidato", candidato!.id_candidato);
    if (tentativa || atualizacao) q.set("atualizar", "true");
    get<Dados>(`/api/bdr/q9/evolucao?${q}`, ac.signal).then((r) => {
      if (!ac.signal.aborted) { setDados(r); setCarregando(false); }
    }).catch((e) => { if (!ac.signal.aborted) { setErro(e.message); setCarregando(false); } });
    return () => ac.abort();
  }, [cargo, uf, criterio, modo, partido, candidato?.id_candidato, tentativa, atualizacao, valido]);
  const comp = dados?.comparacoes.find((c) => `${c.antes}-${c.depois}` === periodo) || dados?.comparacoes.at(-1);
  const grupos = [...new Set(dados?.serie.flatMap((a) => a.grupos.map((g) => g.grupo)) || [])].sort();
  const cor = (grupo: string) => cores[grupos.indexOf(grupo) % cores.length];
  const antes = dados?.serie.find((a) => a.ano === comp?.antes), depois = dados?.serie.find((a) => a.ano === comp?.depois);
  const mudancaTaxa = antes?.resultado.taxa != null && depois?.resultado.taxa != null ? depois.resultado.taxa - antes.resultado.taxa : null;
  const maiorMudanca = comp?.variacoes.toSorted((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp))[0];
  return <section className="q9-card q9-evolution" aria-label="Evolução da publicidade e sucesso eleitoral">
    <div className="q9-card-heading"><div><span className="q9-eyebrow">ESTRATÉGIA ENTRE ELEIÇÕES</span><h2>Estratégia Publicitária e sucesso eleitoral</h2>
      <p>Compare todos os anos disponíveis de 2018 a 2024 no mesmo cargo e estado. O filtro de ano acima vale para o painel da nuvem.</p></div></div>
    {!valido ? <p className="q9-evo-note">Escolha um cargo titular para comparar sucesso eleitoral. Vices e suplentes da chapa não têm resultado independente.</p> : <>
      <div className="q9-evo-controls"><div className="q9-evo-switch" role="group" aria-label="Entidade da evolução">
        <button aria-pressed={modo === "partido"} onClick={() => setModo("partido")}>Por partido</button>
        <button aria-pressed={modo === "candidato"} disabled={!candidato} onClick={() => setModo("candidato")}>Por candidato</button>
      </div>{modo === "partido" ? <label>Partido<select aria-label="Partido na evolução" value={partido} disabled={!partidos.length} onChange={(e) => setPartido(e.currentTarget.value)}>
        {!partidos.length && <option value="">{erroPartidos ? "Indisponível" : "Sem partidos carregados"}</option>}
        {partidos.map((p) => <option key={p.id_partido} value={p.id_partido}>{p.sigla} · {p.nome}</option>)}
      </select></label> : <strong className="q9-evo-person">{candidato?.nome}</strong>}
      {dados && !!dados.comparacoes.length && <label>Comparar eleições<select aria-label="Eleições da comparação" value={comp ? `${comp.antes}-${comp.depois}` : ""} onChange={(e) => setPeriodo(e.currentTarget.value)}>
        {dados.comparacoes.map((c) => <option value={`${c.antes}-${c.depois}`}>{c.antes} → {c.depois}</option>)}
      </select></label>}</div>
      {!candidato && <p className="q9-evo-note">Para acompanhar uma pessoa, use a pesquisa de candidato acima e selecione a candidatura. O histórico acompanha o mesmo candidato, inclusive ao mudar de partido.</p>}
      {(erro || erroPartidos) && <div className="q9-error" role="alert"><p>{erro || erroPartidos}</p><button onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>}
      {carregando && <p className="q9-evo-note" role="status">Comparando investimentos e resultados eleitorais…</p>}
      {dados && <>
        <div className="q9-evo-years">{dados.serie.map((a) => <article key={a.ano}>
          <div className="q9-evo-year-heading"><span className="q9-eyebrow">ELEIÇÃO {a.ano}</span>{modo === "candidato" && <BadgeResultado ano={a} />}</div>
          <strong>{a.candidaturas ? dinheiro(a.publicidade) : "Sem candidatura"}</strong>
          <span className="q9-evo-sub">{a.partidos.join(" · ") || "Sem partido identificado"}</span>
          <div className="q9-evo-stack" role="img" aria-label={`Distribuição da publicidade em ${a.ano}`}>
            {a.grupos.every((g) => g.participacao != null) && a.grupos.map((g) => <span key={g.grupo} style={{ width: `${g.participacao}%`, background: cor(g.grupo) }} title={`${g.grupo}: ${pct(g.participacao)} · ${dinheiro(g.valor)}`} />)}
          </div><span>Taxa de vitória <b>{pct(a.resultado.taxa)}</b></span>
          <small>{a.resultado.eleitas} eleitas / {a.resultado.analisadas} com resultado definido</small>
          <small>{a.com_despesas} com despesas / {a.candidaturas} candidaturas · {a.sem_resultado} sem resultado definido</small>
          {a.em_revisao !== 0 && <small>{dinheiro(a.em_revisao)} classificados por descrições em revisão</small>}
          {a.sem_valor > 0 && <small>{a.sem_valor} despesas sem valor válido, excluídas das somas</small>}
        </article>)}</div>
        {!dados.serie.some((a) => a.candidaturas) && <p className="q9-evo-note">Sem candidaturas para esta entidade no cargo e estado selecionados.</p>}
        {!!grupos.length && <div className="q9-evo-legend">{grupos.map((g) => <span key={g}><i style={{ background: cor(g) }} />{g}</span>)}</div>}
        <RecordCollection title="Participação e valor contratado por tipo de publicidade" items={grupos.map(g=>({id:g,title:g,fields:[...dados.serie.map(a=>{const item=a.grupos.find(v=>v.grupo===g);const temPerfil=a.grupos.some(v=>v.participacao!=null);return {label:String(a.ano),value:`${pct(item?.participacao??(temPerfil?0:null))} · ${a.com_despesas?dinheiro(item?.valor||0):'Sem despesas'}`}}),...(comp?[{label:`Variação ${comp.antes} → ${comp.depois}`,value:pontos(comp.variacoes.find(v=>v.grupo===g)?.delta_pp)}]:[])]}))}/>
        {comp ? <>
          <div className="q9-evo-insights"><article><span>Redistribuição do perfil</span><strong>{pontos(comp.mudanca_pp)}</strong><small>Metade da soma das mudanças absolutas de participação. Zero indica composição igual.</small></article>
            <article><span>Maior mudança no período</span><strong>{maiorMudanca ? pontos(maiorMudanca.delta_pp) : "—"}</strong><small>{maiorMudanca?.grupo || "Sem perfis comparáveis nas duas eleições."}</small></article>
            <article><span>Variação da taxa de vitória</span><strong>{pontos(mudancaTaxa)}</strong><small>Conjunto da entidade: {pct(antes?.resultado.taxa)} → {pct(depois?.resultado.taxa)}. A composição das candidaturas pode mudar.</small></article></div>
          <h3>Mesmos candidatos nas duas eleições</h3>
          <p className="q9-evo-note">{comp.candidatos_repetidos} candidatos repetidos no mesmo cargo, UF e município; {comp.perfis_comparaveis} com perfil válido nas duas eleições; {comp.coorte.pares} também com ambos os resultados definidos. No modo partido, a pessoa precisa pertencer ao partido nas duas eleições.</p>
          {!comp.coorte.pares ? <p className="q9-evo-note">Não há pares suficientes para relacionar mudanças de investimento e resultado neste período. A evolução agregada continua disponível.</p> : <>
            <RecordCollection title="Resultado eleitoral por intensidade de mudança do perfil" items={comp.faixas.map(f=>({id:f.faixa,title:f.faixa,value:pct(f.depois.taxa),subtitle:`Taxa de vitória em ${comp.depois}`,fields:[{label:'Candidatos comparáveis',value:f.pares},{label:`Vitória em ${comp.antes}`,value:pct(f.antes.taxa)},{label:'Variação',value:pontos(f.variacao_taxa_pp)},{label:'Novas vitórias',value:f.novas_vitorias},{label:'Vitórias consecutivas',value:f.vitorias_consecutivas}]}))}/>
            <RecordCollection title="Ampliar uma categoria esteve associado a mais vitórias?" items={comp.associacoes.map(a=>({id:a.grupo,title:a.grupo,value:pontos(a.diferenca_taxas_pp),subtitle:'Diferença de taxas atuais',fields:[{label:'Ampliaram pelo menos 10 pontos percentuais',value:`${pct(a.ampliaram.depois.taxa)} · ${a.ampliaram.pares} pessoas`},{label:'Demais candidatos',value:`${pct(a.outros.depois.taxa)} · ${a.outros.pares} pessoas`}]}))}/>
            <p className="q9-evo-note">Cada ficha compara candidatos que usaram aquela categoria em pelo menos uma das eleições: aumento de participação de 10 p.p. ou mais versus os demais. Os grupos de categorias podem conter as mesmas pessoas. Amostras pequenas não sustentam conclusões gerais.</p>
          </>}
        </> : <p className="q9-evo-note">É necessário haver duas eleições disponíveis para o mesmo cargo para calcular mudanças.</p>}
        <details className="q9-method"><summary>Metodologia da evolução e do sucesso eleitoral</summary><div>
          <p>Sucesso segue a questão 2: ELEITO, ELEITO POR QP e ELEITO POR MÉDIA são vitórias; NÃO ELEITO e SUPLENTE são insucessos. Reunimos os registros dos turnos da mesma pessoa, cargo, território e ano, somando suas despesas e usando o resultado do último turno. Resultados ausentes, indefinidos ou conflitantes ficam fora da taxa; patrimônio não é um requisito nesta análise.</p>
          <p>As taxas anuais incluem todas as candidaturas da entidade com resultado definido, mesmo sem despesas. As comparações individuais exigem o mesmo identificador de candidato e território, eleições regulares com intervalo de quatro anos, publicidade positiva e ambos os resultados definidos. Composições com categorias negativas não entram nas comparações percentuais; ajustes continuam nos valores monetários.</p>
          <p>Valores em reais nominais, sem correção pela inflação. O perfil representa a participação de cada tipo no total identificado como publicidade e segue o critério de classificação do painel. Os grupos são sugestões analíticas, com descrições em revisão. Totais sem publicidade não geram distribuição percentual.</p>
          <p>Vitórias consecutivas observadas não confirmam reeleição: faltam informações sobre exercício do mandato e intenção de reeleição. Partidos são acompanhados pelo identificador cadastrado; fusões e mudanças de nome não são unificadas automaticamente. O recorte cobre CE, MA, MS, RJ, RN e RS.</p>
          <p>Associação não demonstra que o investimento causou a vitória. Mudanças de candidatos, território, força do partido, orçamento e contexto da eleição podem explicar os resultados.</p>
        </div></details>
      </>}
    </>}
  </section>;
}

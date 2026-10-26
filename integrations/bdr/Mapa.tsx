
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { coresUf } from "./coresEleitorais";
import { useTema } from "./Tema";

export type Feat = { type: "Feature"; properties: { codarea: string }; geometry: any };
type Props = {
  ufs: Feat[]; muns: Feat[]; uf: string | null; siglas: Record<string, string>; cobertos: Set<string>;
  mun: string | null; cor: (id: string) => string; corUf?: (sigla: string) => string | undefined; nomes: Record<string, string>;
  descricaoUf?: (sigla: string) => string; descricaoMun?: (id: string) => string;
  municipiosBusca: { id: string; nome: string; uf: string }[];
  onUf: (sigla: string) => void; onMun: (id: string) => void;
  onMunicipioBusca: (sigla: string, id: string) => void;
  legendaMapa?: ReactNode;
  controlesMapa?: ReactNode;
};

const normalizar = (valor: string) => valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function Mapa(p: Props) {
  const { tema } = useTema();
  const CORES_UF = coresUf(tema);
  const svg = useRef<SVGSVGElement>(null), g = useRef<SVGGElement>(null);
  const zb = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [dica, setDica] = useState("");
  const [busca, setBusca] = useState("");
  const indiceBusca = useMemo(() => p.municipiosBusca.map((item) => ({ ...item, chave: normalizar(`${item.nome} ${item.uf}`) })), [p.municipiosBusca]);
  const termo = normalizar(busca.trim());
  const resultados = termo ? indiceBusca.filter((item) => item.chave.includes(termo) || item.id.includes(termo))
    .sort((a, b) => Number(b.chave.startsWith(termo)) - Number(a.chave.startsWith(termo)) || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 8) : [];
  const escolherResultado = (item: { id: string; uf: string }) => {
    p.onMunicipioBusca(item.uf, item.id);
    setBusca("");
  };

  useEffect(() => {  // redimensiona com o contêiner (a área do painel não entra no mapa)
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(svg.current!.parentElement!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const elemento = svg.current;
    if (!elemento) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([1, 80])
      .on("zoom", (e) => g.current?.setAttribute("transform", e.transform.toString()));
    zb.current = z;
    const selecao = select(elemento);
    selecao.call(z);
    return () => {
      selecao.interrupt().on(".zoom", null);
      z.on("zoom", null);
      zb.current = undefined;
    };
  }, []);

  // A projeção é ajustada ao Brasil; UFs e municípios usam a mesma, então se alinham.
  const path = useMemo(() => geoPath(geoMercator().fitSize([size.w, size.h],
    { type: "FeatureCollection", features: p.ufs } as any)), [size, p.ufs]);
  const dUf = useMemo(() => p.ufs.map((f) => path(f as any) || ""), [path, p.ufs]);
  const dMun = useMemo(() => p.muns.map((f) => path(f as any) || ""), [path, p.muns]);

  const mover = (t: any) => {
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    select(svg.current!).transition().duration(reduz ? 0 : 700).call(zb.current!.transform as any, t);
  };
  const enquadrar = () => {
    let t = zoomIdentity;
    const f = (p.mun && p.muns.find((x) => x.properties.codarea === p.mun))
      || (p.uf && p.ufs.find((x) => p.siglas[x.properties.codarea] === p.uf));
    if (f) {
      const [[x0, y0], [x1, y1]] = path.bounds(f as any);
      const k = Math.min(60, 0.9 / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h));
      t = zoomIdentity.translate(size.w / 2, size.h / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }
    mover(t);
  };
  useEffect(enquadrar, [p.uf, p.mun, p.muns.length, path]);

  const iSel = p.mun ? p.muns.findIndex((f) => f.properties.codarea === p.mun) : -1;
  const comMun = p.muns.length > 0;
  return (
    <div className={`mapa ${p.mun ? "mapa-com-municipio" : ""} ${p.controlesMapa ? "mapa-com-modos" : ""}`}>
      <div className="mapa-busca">
        <label for="busca-municipio-mapa">Buscar município</label>
        <div className="mapa-busca-campo"><span aria-hidden="true">⌕</span><input id="busca-municipio-mapa" type="search" value={busca}
          placeholder="Nome ou código IBGE" autoComplete="off"
          onInput={(e) => setBusca((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === "Enter" && resultados[0]) escolherResultado(resultados[0]); if (e.key === "Escape") setBusca(""); }} /></div>
        {termo && <div className="mapa-busca-resultados" role="status">
          {resultados.length ? resultados.map((item) => <button key={`${item.uf}-${item.id}`} onClick={() => escolherResultado(item)}>
            <span><span className="municipio-resultado-nome">{item.nome}</span><small className="uf-badge" style={{ color: CORES_UF[item.uf], borderColor: CORES_UF[item.uf] }}>{item.uf}</small></span><span aria-hidden="true">↗</span></button>)
            : <p>Nenhum município encontrado nos estados disponíveis.</p>}
        </div>}
      </div>
      <svg ref={svg} role="group" aria-label="Mapa interativo: Brasil, estados e municípios">
        <g ref={g}>
          {p.ufs.map((f, i) => {
            const s = p.siglas[f.properties.codarea], cob = p.cobertos.has(s);
            const oculto = comMun && s === p.uf;
            return <path key={f.properties.codarea} d={dUf[i]} className={`uf ${cob ? "cob" : "fora"}${oculto ? " oculto" : ""}`} style={cob && !p.uf ? { fill: p.corUf?.(s) } : undefined}
              onClick={() => cob && p.onUf(s)} onKeyDown={(e) => { if (cob && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.onUf(s); } }}
              tabIndex={cob ? 0 : -1} role={cob ? "button" : undefined} aria-label={`Selecionar estado ${s}${p.descricaoUf ? `: ${p.descricaoUf(s)}` : ""}`}
              onMouseEnter={() => setDica(p.descricaoUf ? p.descricaoUf(s) : `${s}${cob ? "" : " — sem dados disponíveis"}`)}
              onMouseLeave={() => setDica("")} />;
          })}
          {p.muns.map((f, i) => (
            <path key={f.properties.codarea} d={dMun[i]} className="mun" style={{ fill: p.cor(f.properties.codarea) }}
              onClick={() => p.onMun(f.properties.codarea)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onMun(f.properties.codarea); } }}
              tabIndex={0} role="button" aria-label={`Selecionar município ${p.nomes[f.properties.codarea] ?? f.properties.codarea}`}
              onMouseEnter={() => setDica(p.descricaoMun ? p.descricaoMun(f.properties.codarea) : `${p.nomes[f.properties.codarea] ?? f.properties.codarea} — ${p.uf}`)}
              onMouseLeave={() => setDica("")} />
          ))}
          {iSel >= 0 && <path d={dMun[iSel]} className="mun sel" pointer-events="none" />}
        </g>
      </svg>
      {p.controlesMapa}
      {p.mun && <div className="mapa-municipio-selecionado" role="status"><span>Município no mapa</span><strong>{p.nomes[p.mun] ?? p.mun}{p.uf ? ` · ${p.uf}` : ""}</strong></div>}
      {p.legendaMapa && <div className="mapa-legenda">{p.legendaMapa}</div>}
      {!p.uf && <div className="mapa-hint">Busque um município ou selecione um estado</div>}
      <div className="dica" aria-live="polite">{dica}</div>
      <div className="zoomctl">
        <button aria-label="Aproximar" onClick={() => select(svg.current!).transition().call(zb.current!.scaleBy as any, 1.6)}>+</button>
        <button aria-label="Afastar" onClick={() => select(svg.current!).transition().call(zb.current!.scaleBy as any, 1 / 1.6)}>−</button>
        <button aria-label="Reenquadrar" onClick={enquadrar}>⤢</button>
      </div>
    </div>
  );
}

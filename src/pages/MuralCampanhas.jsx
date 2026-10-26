import { electionYearsForOffice, municipalOffice } from '../data/filterScope.js';
import { useCatalog } from '../catalog/useCatalog.jsx';
import { readContext, writeContext } from '../data/investigationContext.js';
import { savedEvidence } from '../data/exhibition.js';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Pin,
  SlidersHorizontal,
  ReceiptText,
  Layers3,
} from 'lucide-react';
const sampleCandidates = [];
import { getCandidates } from '../data/client.js';
import ComparisonPanel from '../components/ComparisonPanel.jsx';
import { states } from '../data/catalog.js';

const money = (n) =>
  n == null
    ? 'Não informado'
    : Number(n).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
const nfmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const noAccent = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const tones = [
  'poster-brick',
  'poster-blue',
  'poster-yellow',
  'poster-green',
  'poster-cream',
  'poster-deep',
];
const resultsTxt = (r) =>
  r?.startsWith('ELEITO')
    ? 'ELEITA/O'
    : r === 'SUPLENTE'
      ? 'SUPLÊNCIA'
      : r || 'SITUAÇÃO INDEFINIDA';
const leaders = [];
const stableLeaders = leaders.filter((r) => r.origem === r.destino).length;
const unitCost = (c) => (c?.gastos != null && c?.votos > 0 ? c.gastos / c.votos : null);
export default function MuralCampanhas({ mode, onResearch, onOpenCandidate, initialScope = {} }) {
  initialScope = {
    ...readContext(),
    ...Object.fromEntries(Object.entries(initialScope).filter(([, value]) => value != null)),
  };
  const [year, setYear] = useState(String(initialScope.ano || 2024)),
    [uf, setUf] = useState(initialScope.uf || ''),
    [party, setParty] = useState(initialScope.partido || ''),
    [cargo, setCargo] = useState(initialScope.cargo || 'VEREADOR');
  const [search, setSearch] = useState(''),
    [ordem, setOrdem] = useState('votos'),
    [resultado, setResultado] = useState('');
  const [page, setPage] = useState(0),
    [liveRows, setLiveRows] = useState([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState(false);
  const [selected, setSelected] = useState(null),
    [flipped, setFlipped] = useState(false),
    [versus, setVersus] = useState([]);
  const [municipioId, setMunicipioId] = useState(
    municipalOffice(cargo) && uf ? readContext().municipioId || '' : '',
  );
  const filterOptions = useCatalog('opcoes', { ano: year, uf, cargo });
  const changeCargo = (value) => {
    setCargo(value);
    setParty('');
    setMunicipioId('');
    if (!electionYearsForOffice(value).includes(Number(year)))
      setYear(String(electionYearsForOffice(value).at(-1)));
  };
  const changeYear = (value) => {
    setYear(value);
    setParty('');
  };
  const changeUf = (value) => {
    setUf(value);
    setParty('');
    setMunicipioId('');
  };
  useEffect(() => {
    setPage(0);
    setSelected(null);
    setVersus([]);
  }, [year, uf, party, cargo, municipioId, search, ordem, resultado]);
  useEffect(() => {
    if (mode !== 'live') return;
    let active = true;
    const t = setTimeout(async () => {
      setBusy(true);
      setProblem(false);
      try {
        const x = await getCandidates({
          ano: year,
          uf,
          partido: party,
          cargo,
          municipio: municipalOffice(cargo) ? municipioId : '',
          search,
          resultado,
          ordem,
          offset: page * 18,
          limit: 18,
        });
        if (active) {
          setLiveRows(x.rows || []);
          setTotal(x.total || 0);
        }
      } catch {
        if (active) {
          setProblem(true);
          setLiveRows([]);
          setTotal(0);
        }
      } finally {
        if (active) setBusy(false);
      }
    }, 290);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [mode, year, uf, party, cargo, municipioId, search, ordem, resultado, page]);
  const candidates = useMemo(() => {
    if (mode === 'live') return liveRows;
    if (year !== '2024' || cargo !== 'VEREADOR') return [];
    let a = sampleCandidates.filter(
      (c) =>
        (!uf || c.uf === uf) &&
        (!party || c.partido === party) &&
        (!resultado || c.resultado.includes(resultado)) &&
        (!search ||
          noAccent([c.nome, c.municipio, c.partido].join(' ')).includes(noAccent(search))),
    );
    const key =
      ordem === 'gastos'
        ? (x) => x.gastos ?? -1
        : ordem === 'custo_voto'
          ? (x) => unitCost(x) ?? -1
          : (x) => x.votos ?? -1;
    a = a.sort((a, b) => key(b) - key(a));
    return a.slice(page * 18, (page + 1) * 18);
  }, [mode, liveRows, year, uf, party, cargo, resultado, search, ordem, page]);
  const count =
    mode === 'live'
      ? total
      : useMemoPlaceholder(sampleCandidates, year, cargo, uf, party, resultado, search);
  const pages = Math.ceil(count / 18);
  const wallStats = useMemo(() => {
    const valid = candidates.filter((c) => c.votos != null);
    const gastos = candidates.filter((c) => c.gastos != null);
    const votos = valid.reduce((a, c) => a + Number(c.votos), 0);
    const despesas = gastos.reduce((a, c) => a + Number(c.gastos), 0);
    return {
      exibidos: candidates.length,
      votos,
      despesas,
      eleitos: candidates.filter((c) => c.resultado?.startsWith('ELEITO')).length,
      comGastos: gastos.length,
    };
  }, [candidates]);
  const picked =
    selected && candidates.find((c) => c.id === selected.id)
      ? candidates.find((c) => c.id === selected.id)
      : selected;
  const pick = (c) => {
    setSelected(c);
    setFlipped(false);
  };
  const compare = (c) =>
    setVersus((list) =>
      list.some((x) => x.id === c.id) ? list : list.length >= 2 ? [list[1], c] : [...list, c],
    );
  const eligible =
    versus.length === 2 && versus[0].ano === versus[1].ano && versus[0].cargo === versus[1].cargo;
  return (
    <div className="mural-v5">
      <div className="section-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            MURAL DE CANDIDATURAS / CAMPANHAS & RESULTADOS
          </div>
          <h2>
            CADA CARTAZ <em>É UM DADO.</em>
          </h2>
          <p>
            Cartazes analíticos presos ao muro: selecione, vire e compare candidaturas reais. Os
            cartazes são criações editoriais, não peças originais de propaganda.
          </p>
        </div>
      </div>
      <div className="mural-filter-bar">
        <label className="mural-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar candidatura ou município"
            aria-label="Pesquisar candidaturas"
          />
        </label>
        <select
          aria-label="Ano eleitoral"
          value={year}
          onChange={(e) => changeYear(e.target.value)}
        >
          {electionYearsForOffice(cargo)
            .reverse()
            .map((y) => (
              <option key={y}>{y}</option>
            ))}
        </select>
        <select aria-label="Estado" value={uf} onChange={(e) => changeUf(e.target.value)}>
          <option value="">6 estados</option>
          {states.map((s) => (
            <option value={s.uf} key={s.uf}>
              {s.uf}
            </option>
          ))}
        </select>
        <select aria-label="Cargo" value={cargo} onChange={(e) => changeCargo(e.target.value)}>
          <option value="VEREADOR">Vereador</option>
          <option value="PREFEITO">Prefeito</option>
          <option value="DEPUTADO ESTADUAL">Deputado estadual</option>
          <option value="DEPUTADO FEDERAL">Deputado federal</option>
          <option value="SENADOR">Senador</option>
          <option value="GOVERNADOR">Governador</option>
        </select>
        {municipalOffice(cargo) && (
          <select
            aria-label="Município do mural"
            value={municipioId}
            disabled={!uf || filterOptions.loading}
            onChange={(e) => setMunicipioId(e.target.value)}
          >
            <option value="">
              {uf ? 'Todos os municípios do estado' : 'Selecione um estado primeiro'}
            </option>
            {(filterOptions.data?.municipios || []).map((town) => (
              <option key={town.id} value={town.id}>
                {town.nome}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Partido"
          value={party}
          disabled={filterOptions.loading}
          onChange={(e) => setParty(e.target.value)}
        >
          <option value="">Todos os partidos</option>
          {(filterOptions.data?.facets.partido || []).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Resultado"
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
        >
          <option value="">Todos os resultados</option>
          <option value="ELEITO">Eleitos</option>
          <option value="NÃO ELEITO">Não eleitos</option>
          <option value="SUPLENTE">Suplentes</option>
        </select>
        <select
          aria-label="Ordenar cartazes"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
        >
          <option value="votos">Mais votos</option>
          <option value="gastos">Mais gastos</option>
          <option value="custo_voto">Gasto por voto mais alto</option>
        </select>
      </div>
      <div className="mural-topline">
        <span>
          <SlidersHorizontal size={14} /> {nfmt(count)} CANDIDATURAS NO RECORTE · {year}
        </span>
        <span>TOQUE NUM CARTAZ PARA ABRIR SEU DOSSIÊ</span>
      </div>
      <div className="wall-analysis-strip" aria-label="Resumo dos cartazes atualmente exibidos">
        <div>
          <small>CARTAZES VISÍVEIS</small>
          <b>{wallStats.exibidos}</b>
        </div>
        <div>
          <small>VOTOS DOS CARTAZES</small>
          <b>{nfmt(wallStats.votos)}</b>
        </div>
        <div>
          <small>DESPESAS INFORMADAS</small>
          <b>{money(wallStats.despesas)}</b>
        </div>
        <div>
          <small>ELEITOS NO RECORTE VISÍVEL</small>
          <b>{wallStats.eleitos}</b>
        </div>
        <p>
          Totais apenas dos cartazes desta página, não de toda a eleição. Despesas disponíveis em{' '}
          {wallStats.comGastos} dos {wallStats.exibidos} cartazes.
        </p>
      </div>
      <div className="mural-v5-layout">
        <section className="mural-brick" aria-label="Muro de cartazes eleitorais individuais">
          <div className="wall-top-stencil">
            CARTAZES DE CAMPANHAS <b>ANALÍTICOS</b> / NÃO OFICIAIS
          </div>
          {busy ? (
            <div className="wall-empty">PROCURANDO CARTAZES…</div>
          ) : problem ? (
            <div className="wall-empty">NÃO FOI POSSÍVEL CONSULTAR O ACERVO AGORA.</div>
          ) : candidates.length === 0 ? (
            <div className="wall-empty">
              NENHUM CARTAZ NESTE RECORTE.
              {mode !== 'live' ? ' A AMOSTRA LOCAL CONTÉM 24 CANDIDATURAS DE 2024.' : ''}
            </div>
          ) : (
            <div className="campaign-posters">
              {candidates.map((c, i) => (
                <motion.button
                  key={c.id}
                  type="button"
                  aria-label={`Abrir cartaz de ${c.nome}`}
                  aria-pressed={picked?.id === c.id}
                  className={
                    'campaign-poster ' +
                    tones[(i + (c.numero || 0)) % tones.length] +
                    (picked?.id === c.id ? ' highlighted' : '')
                  }
                  style={{ '--poster-tilt': `${[1, -2, 3, -1, 2, -3][i % 6]}deg` }}
                  initial={{ opacity: 0, scale: 0.87, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  whileHover={{ scale: 1.07, y: -8, rotate: 0, zIndex: 4 }}
                  transition={{
                    type: 'spring',
                    stiffness: 140,
                    damping: 20,
                    delay: Math.min(i * 0.028, 0.4),
                  }}
                  onClick={() => pick(c)}
                >
                  <i className="pushpin" />
                  <span className="poster-election">
                    {c.ano} · {c.uf} · {c.partido || '—'}
                  </span>
                  <span className="poster-portrait" aria-hidden="true">
                    <strong>
                      {String(c.nome || '?')
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </strong>
                  </span>
                  <strong className="poster-name">{c.nome}</strong>
                  <span className="poster-number">{c.numero ?? '—'}</span>
                  <span className="poster-metrics">
                    <b>{nfmt(c.votos)}</b>
                    <small>VOTOS</small>
                    <b>{money(c.gastos)}</b>
                    <small>DESPESAS</small>
                  </span>
                  <small className="poster-read">PUXAR CARTAZ ↗</small>
                </motion.button>
              ))}
            </div>
          )}
          <div className="mural-pagination">
            <button disabled={page === 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>
              ← ANTERIOR
            </button>
            <strong>{pages ? `${page + 1} DE ${pages}` : 'SEM RESULTADOS'}</strong>
            <button disabled={page + 1 >= pages} onClick={() => setPage((x) => x + 1)}>
              MAIS CARTAZES →
            </button>
          </div>
        </section>
        <aside className="poster-review">
          <div className="poster-review-top">
            <span>FICHA RETIRADA DO MURO</span>
            <span>↻ CLIQUE PARA VIRAR</span>
          </div>
          <AnimatePresence mode="wait">
            {picked ? (
              <motion.div
                key={picked.id}
                initial={{ opacity: 0, x: 45, rotate: 7 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                exit={{ opacity: 0, x: -35 }}
                className="poster-review-card"
              >
                <button
                  className={'poster-review-flipper' + (flipped ? ' is-back' : '')}
                  onClick={() => setFlipped(!flipped)}
                  aria-label={`Virar dossiê de ${picked.nome}`}
                >
                  <div className="poster-flip-face">
                    <div className="paper-stripe">SANTINHO ANALÍTICO · {picked.ano}</div>
                    <span className="big-paper-number">{picked.numero ?? '—'}</span>
                    <h3>{picked.nome}</h3>
                    <strong>
                      {picked.partido} · {picked.uf}
                    </strong>
                    <span>{picked.municipio || picked.uf}</span>
                    <p>{resultsTxt(picked.resultado)}</p>
                    <small>VIRAR PARA VER A PRESTAÇÃO DE CONTAS ↺</small>
                  </div>
                  <div className="poster-flip-face back">
                    <span className="paper-stripe">VERSO / INDICADORES</span>
                    <h3>{picked.nome}</h3>
                    <dl>
                      <div>
                        <dt>VOTOS</dt>
                        <dd>{nfmt(picked.votos)}</dd>
                      </div>
                      <div>
                        <dt>DESPESAS TOTAIS</dt>
                        <dd>{money(picked.gastos)}</dd>
                      </div>
                      <div>
                        <dt>GASTO / VOTO OBTIDO</dt>
                        <dd>{unitCost(picked) == null ? '—' : money(unitCost(picked))}</dd>
                      </div>
                      <div>
                        <dt>PATRIMÔNIO</dt>
                        <dd>{money(picked.patrimonio)}</dd>
                      </div>
                      <div>
                        <dt>RESULTADO</dt>
                        <dd>{picked.resultado ?? '—'}</dd>
                      </div>
                    </dl>
                    <small>
                      Gasto/voto é uma divisão descritiva; não mede compra de voto ou eficácia
                      causal.
                    </small>
                  </div>
                </button>
                <div className="poster-ops">
                  <button onClick={() => compare(picked)}>
                    <Layers3 size={15} /> COMPARAR
                  </button>
                  <button onClick={() => onOpenCandidate(picked)}>
                    <ReceiptText size={15} /> ABRIR RECIBOS <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="poster-review-empty">
                Puxe um cartaz do muro para ler o que os dados revelam sobre aquela candidatura.
              </div>
            )}
          </AnimatePresence>
          <div className="poster-crosscheck">
            <div className="micro">COMPARAÇÃO RÁPIDA / ATÉ DUAS CANDIDATURAS</div>
            {versus.map((v) => (
              <div key={v.id}>
                <b>{v.nome}</b>
                <span>
                  {nfmt(v.votos)} votos · {money(v.gastos)}
                </span>
                <button onClick={() => setVersus((a) => a.filter((x) => x.id !== v.id))}>×</button>
              </div>
            ))}
            {versus.length === 2 && (
              <p>
                {eligible
                  ? 'Duas campanhas do mesmo ano e cargo. Compare votos, gastos e contexto territorial.'
                  : 'Atenção: anos/cargos diferentes; não compare diretamente como se fossem disputas equivalentes.'}
              </p>
            )}
          </div>
          <div className="insight-under-poster">
            <span>ANÁLISE QUE CRUZA O MURO</span>
            <p>
              Quais municípios mantiveram a mesma sigla líder? Abra a comparação para consultar a
              base atual. Liderança agregada não mede permanência ideológica.
            </p>
            <button onClick={() => onResearch(7)}>
              EXPLORAR A MUDANÇA DOS PARTIDOS <ArrowUpRight size={16} />
            </button>
            <button onClick={() => onResearch(9)}>
              COMPARAR PROPAGANDA E GASTOS <ArrowUpRight size={16} />
            </button>
          </div>
        </aside>
      </div>
      <ComparisonPanel topic="partidos" mode={mode} />
    </div>
  );
}
function useMemoPlaceholder(samples, year, cargo, uf, party, resultado, search) {
  return year !== '2024' || cargo !== 'VEREADOR'
    ? 0
    : samples.filter(
        (c) =>
          (!uf || c.uf === uf) &&
          (!party || c.partido === party) &&
          (!resultado || c.resultado.includes(resultado)) &&
          (!search ||
            noAccent([c.nome, c.municipio, c.partido].join(' ')).includes(noAccent(search))),
      ).length;
}

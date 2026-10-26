import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import {
  ArrowLeft,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  Award,
  DollarSign,
  Users,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { getQ2Opcoes, getQ2Municipios, getQ2Patrimonio } from '../data/client.js';
import './patrimonio-mapa-dossie.css';

const COVERED_UFS = [
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
];

const UF_SET = new Set(COVERED_UFS.map((x) => x.uf));

const INDICADORES = [
  {
    valor: 'mediana',
    rotulo: 'Patrimônio mediano · todos os candidatos',
    curto: 'Mediana · candidatos',
  },
  { valor: 'eleitos', rotulo: 'Patrimônio mediano · apenas eleitos', curto: 'Mediana · eleitos' },
  {
    valor: 'razao',
    rotulo: 'Razão de disparidade (eleitos ÷ não eleitos)',
    curto: 'Eleitos ÷ não eleitos',
  },
];

const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fDec = (n, d = 2) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
const money = (n) =>
  n == null
    ? '—'
    : Number(n).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });

const compactMoney = (n) => {
  if (n == null || isNaN(n)) return '—';
  const val = Number(n);
  if (val >= 1e6)
    return `R$ ${(val / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (val >= 1e3)
    return `R$ ${(val / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return money(val);
};

const pct = (n) =>
  n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const rotuloCargo = (c) => {
  if (!c) return '';
  return c.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
};

const cacheGeo = new Map();

export default function PatrimonioMapaDossie({ mode = 'snapshot' }) {
  const [uf, setUf] = useState('');
  const [mun, setMun] = useState(null);
  const [ano, setAno] = useState(2024);
  const [cargo, setCargo] = useState('VEREADOR');
  const [indicador, setIndicador] = useState('mediana');
  const [opcoes, setOpcoes] = useState([]);

  const [mapaData, setMapaData] = useState(null);
  const [resumoData, setResumoData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [geoJson, setGeoJson] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const [hover, setHover] = useState(null);

  const [busca, setBusca] = useState('');
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [catalogo, setCatalogo] = useState(null);

  // Carrega catálogo de municípios
  useEffect(() => {
    fetch('/geo/catalogo.json')
      .then((r) => r.json())
      .then(setCatalogo)
      .catch(() => {});
  }, []);

  // Carrega opções de ano e cargo
  useEffect(() => {
    getQ2Opcoes().then((res) => {
      if (res?.opcoes?.length) {
        setOpcoes(res.opcoes);
      }
    });
  }, []);

  // Carrega malha geográfica (estados ou município da UF)
  const sourceGeo = uf || 'estados';
  useEffect(() => {
    setHover(null);
    setGeoError(false);
    setZoomScale(1);
    setPan({ x: 0, y: 0 });

    if (cacheGeo.has(sourceGeo)) {
      setGeoJson(cacheGeo.get(sourceGeo));
      return;
    }

    const controller = new AbortController();
    fetch(`/maps/${sourceGeo}.geojson`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar malha');
        return r.json();
      })
      .then((d) => {
        cacheGeo.set(sourceGeo, d);
        setGeoJson(d);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setGeoError(true);
      });

    return () => controller.abort();
  }, [sourceGeo]);

  // Carrega dados de municípios e UFs para o mapa
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMapaData(null);
    getQ2Municipios({ ano, cargo, uf })
      .then((d) => {
        if (active) setMapaData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ano, cargo, uf]);

  // Carrega resumo analítico (decis, eleitos x não eleitos, correlação)
  useEffect(() => {
    if (!uf) {
      setResumoData(null);
      return;
    }
    let active = true;
    setResumoData(null);
    getQ2Patrimonio({ ano, cargo, uf, municipio: mun || '' })
      .then((d) => {
        if (active) setResumoData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ano, cargo, uf, mun]);

  // Projeção D3 ajustada ao mapa
  const { pathGenerator, projection } = useMemo(() => {
    if (!geoJson) return { pathGenerator: null, projection: null };
    const proj = geoMercator().fitExtent(
      [
        [30, 20],
        [740, 480],
      ],
      geoJson,
    );
    return { pathGenerator: geoPath(proj), projection: proj };
  }, [geoJson]);

  // Mapas de lookup
  const dadosPorMunicipio = useMemo(() => {
    const map = new Map();
    (mapaData?.municipios || []).forEach((m) => {
      map.set(m.id_municipio, m);
    });
    return map;
  }, [mapaData]);

  const dadosPorUf = useMemo(() => {
    const map = new Map();
    (mapaData?.ufs || []).forEach((u) => {
      map.set(u.uf, u);
    });
    return map;
  }, [mapaData]);

  // Nomes de municípios do catálogo
  const nomesMunicipios = useMemo(() => {
    const map = new Map();
    if (!catalogo?.municipios) return map;
    Object.values(catalogo.municipios).forEach((list) => {
      list.forEach((m) => map.set(m.id, m.nome));
    });
    return map;
  }, [catalogo]);

  // Índice de busca
  const listaBusca = useMemo(() => {
    if (!catalogo?.municipios) return [];
    const list = [];
    if (uf && catalogo.municipios[uf]) {
      catalogo.municipios[uf].forEach((m) => list.push({ ...m, uf }));
    } else {
      Object.entries(catalogo.municipios).forEach(([sigla, muns]) => {
        muns.forEach((m) => list.push({ ...m, uf: sigla }));
      });
    }
    return list;
  }, [catalogo, uf]);

  const resultadosBusca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return listaBusca
      .filter((m) => m.nome.toLowerCase().includes(q) || m.id.includes(q))
      .slice(0, 7);
  }, [busca, listaBusca]);

  // Extrai valor do indicador
  const valorDe = (row, ind) => {
    if (!row || row.analisadas === 0) return null;
    if (ind === 'mediana') return row.patrimonio_mediano;
    if (ind === 'eleitos') return row.patrimonio_mediano_eleitos;
    const e = row.patrimonio_mediano_eleitos,
      n = row.patrimonio_mediano_nao_eleitos;
    return e != null && n != null && e > 0 && n > 0 ? e / n : null;
  };

  // Escala de cores do projeto atual: Azul Tinta (#174a8b, #24669b) e Tijolo (#ba4a3a)
  const { escalaMin, escalaMax } = useMemo(() => {
    if (!mapaData) return { escalaMin: 0, escalaMax: 100000 };
    const lista = uf ? mapaData.municipios || [] : mapaData.ufs || [];
    const valores = lista.map((r) => valorDe(r, indicador)).filter((v) => v != null && v > 0);
    if (!valores.length) return { escalaMin: 0, escalaMax: 100000 };
    valores.sort((a, b) => a - b);
    const min = valores[0];
    const max = valores[valores.length - 1];
    return { escalaMin: min, escalaMax: max };
  }, [mapaData, uf, indicador]);

  const corDaRegiao = (row) => {
    const v = valorDe(row, indicador);
    if (v == null) return '#e2ded4'; // sem dado

    if (indicador === 'razao') {
      // Razão divergente centrada em 1.0x:
      // < 1x: azul moderado, 1x: neutro ardósia, > 1x: tijolo quente (#ba4a3a)
      if (v < 0.9) return '#24669b';
      if (v <= 1.2) return '#64748b';
      if (v <= 2.5) return '#d97706';
      return '#ba4a3a';
    }

    // Escala sequencial para patrimônio em tons do projeto
    const logVal = Math.log10(v + 1);
    const logMin = Math.log10(Math.max(1, escalaMin));
    const logMax = Math.log10(Math.max(10, escalaMax));
    const t =
      logMax > logMin ? Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin))) : 0.5;

    if (t < 0.25) return '#93c5fd';
    if (t < 0.5) return '#3b82f6';
    if (t < 0.75) return '#1d4ed8';
    return '#0f294a';
  };

  // Navegação
  const escolherUf = (sigla) => {
    setUf(sigla);
    setMun(null);
    setBusca('');
  };

  const escolherMun = (id) => {
    setMun(id);
    setBusca('');
  };

  const limparSelecao = () => {
    setUf('');
    setMun(null);
    setBusca('');
  };

  // Ranking de municípios
  const ranking = useMemo(() => {
    if (!uf || !mapaData?.municipios) return [];
    return mapaData.municipios
      .filter((m) => m.analisadas >= (cargo === 'PREFEITO' ? 2 : 5))
      .map((m) => ({ ...m, valor: valorDe(m, indicador) }))
      .filter((m) => m.valor != null)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [uf, mapaData, cargo, indicador]);

  const maxRanking = Math.max(1, ...(ranking.map((x) => x.valor) || [1]));

  // Linha do recorte selecionado (UF ou Município)
  const linhaRecorte = useMemo(() => {
    if (mun) return dadosPorMunicipio.get(mun);
    if (uf) return dadosPorUf.get(uf);
    return null;
  }, [mun, uf, dadosPorMunicipio, dadosPorUf]);

  const eleitosResumo = resumoData?.resumo_situacao?.find((s) => s.situacao === 'eleito');
  const naoEleitosResumo = resumoData?.resumo_situacao?.find((s) => s.situacao === 'nao_eleito');
  const maxSituacao = Math.max(
    1,
    eleitosResumo?.patrimonio_mediano || 0,
    naoEleitosResumo?.patrimonio_mediano || 0,
  );

  const maxDecilTaxa = Math.max(1, ...(resumoData?.decis?.map((d) => d.taxa_sucesso_pct) || [1]));

  const stateName = COVERED_UFS.find((u) => u.uf === uf)?.nome || uf;
  const munName = mun ? nomesMunicipios.get(mun) || mun : '';

  return (
    <div
      className="pmd-dossier"
      role="region"
      aria-label="Dossiê de Patrimônio e Sucesso Eleitoral"
    >
      <p className="expo-source" role="status">
        {loading
          ? 'Consultando…'
          : mapaData?.source === 'live'
            ? 'Consulta atual'
            : mapaData?.source === 'snapshot'
              ? 'Referência do acervo'
              : 'Recorte indisponível'}{' '}
        · {ano} · {cargo} · {uf || '6 UFs'}
      </p>
      {/* Cabeçalho */}
      <div className="pmd-header">
        <div className="pmd-header-main">
          <div className="pmd-heading-group">
            <span>LABORATÓRIO EDITORIAL · INVESTIGAÇÃO 02</span>
            <h3>PATRIMÔNIO AJUDA A ELEGER?</h3>
          </div>

          <div className="pmd-location-badge">
            <div className="pmd-location-info">
              <small>
                {mun ? 'MUNICÍPIO SELECIONADO' : uf ? 'ESTADO SELECIONADO' : 'ABRANGÊNCIA'}
              </small>
              <strong>
                {mun
                  ? `${munName} (${uf})`
                  : uf
                    ? `${stateName} (${uf})`
                    : 'Brasil · 6 Estados Cobertos'}
              </strong>
            </div>
            {mun && (
              <button type="button" className="pmd-btn-back" onClick={() => setMun(null)}>
                <ArrowLeft size={13} /> VER {uf}
              </button>
            )}
            {uf && (
              <button type="button" className="pmd-btn-back" onClick={limparSelecao}>
                <ArrowLeft size={13} /> VER BRASIL
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="pmd-controls">
          <label>
            Estado
            <select value={uf} onChange={(e) => escolherUf(e.target.value)}>
              <option value="">Brasil (6 Estados)</option>
              {COVERED_UFS.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.nome} ({s.uf})
                </option>
              ))}
            </select>
          </label>

          <label>
            Ano
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[2024, 2022, 2020, 2018].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cargo
            <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
              {[
                'VEREADOR',
                'PREFEITO',
                'DEPUTADO ESTADUAL',
                'DEPUTADO FEDERAL',
                'SENADOR',
                'GOVERNADOR',
                'PRESIDENTE',
              ].map((c) => (
                <option key={c} value={c}>
                  {rotuloCargo(c)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Indicador no Mapa
            <select value={indicador} onChange={(e) => setIndicador(e.target.value)}>
              {INDICADORES.map((i) => (
                <option key={i.valor} value={i.valor}>
                  {i.curto}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="pmd-btn-reset" onClick={limparSelecao}>
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Cartões KPI: EXIBIDOS APENAS QUANDO UM ESTADO FOI SELECIONADO */}
      {uf && (
        <section className="pmd-kpis" aria-label="Indicadores do recorte">
          <div className="pmd-kpi tone-brick">
            <span>Patrimônio mediano · Eleitos</span>
            <strong>{compactMoney(eleitosResumo?.patrimonio_mediano)}</strong>
            <small>
              {eleitosResumo ? `${fNum(eleitosResumo.candidaturas)} eleitos` : 'Sem dados'}
            </small>
          </div>

          <div className="pmd-kpi tone-slate">
            <span>Patrimônio mediano · Não Eleitos</span>
            <strong>{compactMoney(naoEleitosResumo?.patrimonio_mediano)}</strong>
            <small>
              {naoEleitosResumo
                ? `${fNum(naoEleitosResumo.candidaturas)} não eleitos`
                : 'Sem dados'}
            </small>
          </div>

          <div className="pmd-kpi tone-navy">
            <span>Correlação Patrimônio × Sucesso</span>
            <strong>{fDec(resumoData?.correlacao?.linear)}</strong>
            <small>
              {resumoData?.correlacao?.log != null
                ? `Escala logarítmica: ${fDec(resumoData.correlacao.log)}`
                : 'Índice de Pearson (−1 a 1)'}
            </small>
          </div>

          <div className="pmd-kpi tone-gold">
            <span>Cobertura de Patrimônio</span>
            <strong>{pct(resumoData?.cobertura?.cobertura_pct)}</strong>
            <small>
              {resumoData?.cobertura
                ? `${fNum(resumoData.cobertura.validos)} de ${fNum(resumoData.cobertura.total)} candidaturas`
                : 'Auditoria TSE'}
            </small>
          </div>
        </section>
      )}

      {/* Palco do Mapa e Ficha Territorial */}
      <div className={`pmd-map-stage ${!uf ? 'full-width' : ''}`}>
        <div className="pmd-map-container">
          {/* Caixa de Busca */}
          <div className="pmd-map-search">
            <div className="pmd-search-box">
              <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
              <input
                type="text"
                placeholder={uf ? `Buscar município em ${uf}...` : 'Buscar município...'}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {resultadosBusca.length > 0 && (
              <div className="pmd-search-dropdown">
                {resultadosBusca.map((item) => (
                  <button
                    key={`${item.uf}-${item.id}`}
                    type="button"
                    onClick={() => {
                      escolherUf(item.uf);
                      escolherMun(item.id);
                    }}
                  >
                    <span>{item.nome}</span>
                    <small style={{ color: '#174a8b' }}>{item.uf}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SVG do Mapa */}
          {geoJson && pathGenerator ? (
            <svg
              className="pmd-map-svg"
              viewBox="0 0 770 510"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={
                uf ? `Mapa de municípios de ${stateName}` : 'Mapa do Brasil com estados cobertos'
              }
            >
              <defs>
                <pattern id="outside-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill="#e8e4d5" />
                  <path d="M0 6L6 0" stroke="#cbd5e1" strokeWidth="0.75" />
                </pattern>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoomScale})`}>
                {/* Visualização Nacional (Brasil) */}
                {!uf &&
                  geoJson.features.map((f) => {
                    const sigla = f.properties.uf || f.properties.sigla;
                    const coberto = UF_SET.has(sigla);
                    const row = dadosPorUf.get(sigla);
                    const v = valorDe(row, indicador);
                    const label = `${f.properties.nome || sigla}${coberto ? ` · Clique para dar zoom (${v != null ? compactMoney(v) : 'ver dados'})` : ' · Fora da cobertura'}`;

                    return (
                      <path
                        key={sigla}
                        d={pathGenerator(f) || ''}
                        className={`uf-path ${coberto ? 'cob' : 'fora'}`}
                        fill={coberto ? corDaRegiao(row) : 'url(#outside-hatch)'}
                        onClick={() => coberto && escolherUf(sigla)}
                        onMouseEnter={() => setHover({ label, id: sigla })}
                        onMouseLeave={() => setHover(null)}
                        tabIndex={coberto ? 0 : -1}
                        role={coberto ? 'button' : undefined}
                        aria-label={label}
                      />
                    );
                  })}

                {/* Rótulos dos estados cobertos no mapa nacional */}
                {!uf &&
                  geoJson.features
                    .filter((f) => UF_SET.has(f.properties.uf || f.properties.sigla))
                    .map((f) => {
                      const sigla = f.properties.uf || f.properties.sigla;
                      const pt = pathGenerator.centroid(f);
                      if (!pt || isNaN(pt[0])) return null;
                      return (
                        <g
                          key={`lbl-${sigla}`}
                          className="pmd-state-label"
                          transform={`translate(${pt[0]}, ${pt[1]})`}
                        >
                          <rect x="-15" y="-11" width="30" height="22" />
                          <text textAnchor="middle" y="4">
                            {sigla}
                          </text>
                        </g>
                      );
                    })}

                {/* Visualização Estadual (Municípios) */}
                {uf &&
                  geoJson.features.map((f) => {
                    const cod = String(
                      f.properties.codarea || f.properties.id || f.properties.cod_ibge,
                    );
                    const row = dadosPorMunicipio.get(cod);
                    const nome = nomesMunicipios.get(cod) || f.properties.nome || cod;
                    const v = valorDe(row, indicador);
                    const isSel = mun === cod;
                    const label = `${nome} · ${uf} · ${indicador === 'razao' ? (v != null ? `${fDec(v)}×` : 'sem dados') : compactMoney(v)}`;

                    return (
                      <path
                        key={cod}
                        d={pathGenerator(f) || ''}
                        className={`mun-path ${isSel ? 'is-selected' : ''}`}
                        fill={corDaRegiao(row)}
                        onClick={() => escolherMun(cod)}
                        onMouseEnter={() => setHover({ label, id: cod })}
                        onMouseLeave={() => setHover(null)}
                        tabIndex={0}
                        role="button"
                        aria-label={label}
                      />
                    );
                  })}
              </g>
            </svg>
          ) : (
            <div
              style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}
            >
              {geoError ? 'Não foi possível carregar o mapa.' : 'Desdobrando mapa territorial…'}
            </div>
          )}

          {/* Dica / Readout ao passar o mouse */}
          {hover && (
            <div className="pmd-map-readout" role="status">
              {hover.label}
            </div>
          )}

          {/* Controles de Zoom */}
          <div className="pmd-zoomctl">
            <button
              type="button"
              aria-label="Aproximar"
              onClick={() => setZoomScale((z) => Math.min(6, z * 1.35))}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Afastar"
              onClick={() => setZoomScale((z) => Math.max(0.7, z / 1.35))}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reenquadrar"
              onClick={() => {
                setZoomScale(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              ⤢
            </button>
          </div>

          {/* Legenda do Mapa */}
          <div className="pmd-map-legend">
            <strong>{INDICADORES.find((i) => i.valor === indicador)?.curto}</strong>
            <div
              className="pmd-legend-bar"
              style={{
                background:
                  indicador === 'razao'
                    ? 'linear-gradient(90deg, #24669b, #64748b, #d97706, #ba4a3a)'
                    : 'linear-gradient(90deg, #93c5fd, #3b82f6, #1d4ed8, #0f294a)',
              }}
            />
            <div className="pmd-legend-ticks">
              <span>{indicador === 'razao' ? '0,5×' : compactMoney(escalaMin)}</span>
              <span>
                {indicador === 'razao' ? '1,0× (igual)' : compactMoney((escalaMin + escalaMax) / 2)}
              </span>
              <span>{indicador === 'razao' ? '3,0×' : compactMoney(escalaMax)}</span>
            </div>
          </div>
        </div>

        {/* Ficha Territorial Lateral: VISÍVEL APENAS QUANDO UM ESTADO FOI SELECIONADO */}
        {uf && (
          <aside className="pmd-aside" aria-label="Ficha territorial do recorte">
            <div className="pmd-aside-heading">
              <span>FICHA TERRITORIAL</span>
              <h4>{mun ? munName : stateName}</h4>
              <p>
                {mun ? `Município de ${stateName} (${uf})` : `Unidade Federativa · ${stateName}`}
              </p>
            </div>

            {linhaRecorte ? (
              <dl className="pmd-record-dl">
                <dt>Candidaturas totais</dt>
                <dd>{fNum(linhaRecorte.candidaturas)}</dd>

                <dt>Analisadas (com declaração)</dt>
                <dd>{fNum(linhaRecorte.analisadas)}</dd>

                <dt>Eleitos</dt>
                <dd>
                  {fNum(linhaRecorte.eleitos)} ({pct(linhaRecorte.taxa_sucesso_pct)})
                </dd>

                <dt>Patrimônio mediano geral</dt>
                <dd>{compactMoney(linhaRecorte.patrimonio_mediano)}</dd>

                <dt>Mediana dos eleitos</dt>
                <dd style={{ color: '#ba4a3a' }}>
                  {compactMoney(linhaRecorte.patrimonio_mediano_eleitos)}
                </dd>

                <dt>Mediana dos não eleitos</dt>
                <dd style={{ color: '#24669b' }}>
                  {compactMoney(linhaRecorte.patrimonio_mediano_nao_eleitos)}
                </dd>

                <dt>Razão (eleitos ÷ não eleitos)</dt>
                <dd style={{ fontWeight: 800 }}>
                  {valorDe(linhaRecorte, 'razao') != null
                    ? `${fDec(valorDe(linhaRecorte, 'razao'))}×`
                    : '—'}
                </dd>
              </dl>
            ) : (
              <p style={{ color: '#64748b', fontSize: 12 }}>
                {loading ? 'Carregando indicadores...' : 'Sem dados para este recorte.'}
              </p>
            )}

            {mun && (
              <button type="button" className="pmd-aside-btn-clear" onClick={() => setMun(null)}>
                ← Voltar para {stateName}
              </button>
            )}

            {!mun && (
              <button type="button" className="pmd-aside-btn-clear" onClick={limparSelecao}>
                ← Voltar para o Brasil
              </button>
            )}
          </aside>
        )}
      </div>

      {/* CONDIÇÃO CRÍTICA:
          SE !uf (Brasil completo): MOSTRA APENAS O MAPA E O CONVITE EDITORIAL, SEM GRÁFICOS OU TABELAS DETALHADAS.
          SE uf (Estado clicado): MOSTRA A SUÍTE COMPLETA DE GRÁFICOS E COMPARAÇÕES. */}
      {!uf ? (
        <div className="pmd-national-prompt">
          <span className="pmd-prompt-pill">NAVEGAÇÃO TERRITORIAL</span>
          <h4>Selecione um dos 6 estados no mapa para aproximar</h4>
          <p>
            Para visualizar os gráficos analíticos de patrimônio, a curva de decis de sucesso e as
            comparações entre eleitos e não eleitos,{' '}
            <strong>clique em um dos 6 estados auditados no mapa acima</strong> ou use um dos
            atalhos rápidos abaixo:
          </p>
          <div className="pmd-state-cards">
            {COVERED_UFS.map((s) => (
              <button
                key={s.uf}
                type="button"
                className="pmd-state-card-btn"
                onClick={() => escolherUf(s.uf)}
              >
                <strong>{s.uf}</strong>
                <span>{s.nome}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Grade de Gráficos Analíticos */}
          <div className="pmd-charts-grid">
            {/* Gráfico 1: Taxa de Sucesso por Decil de Patrimônio */}
            <article className="pmd-chart-card">
              <h4>Taxa de sucesso por decil de patrimônio declarado</h4>
              <p className="card-desc">
                Candidaturas divididas em 10 grupos iguais ordenados por patrimônio declarado (Decil
                1 = 10% com menor patrimônio; Decil 10 = 10% com maior patrimônio).
              </p>

              {resumoData?.decis?.length ? (
                <>
                  <div
                    className="pmd-deciles-chart"
                    role="img"
                    aria-label="Taxa de sucesso eleitoral por decil de patrimônio"
                  >
                    {resumoData.decis.map((d) => {
                      const barHeight = Math.max(
                        6,
                        Math.round((d.taxa_sucesso_pct / maxDecilTaxa) * 115),
                      );
                      const isTop = d.decil === 10;
                      return (
                        <div
                          key={d.decil}
                          className="pmd-decile-col"
                          title={`Decil ${d.decil}: ${compactMoney(d.patrimonio_min)} a ${compactMoney(d.patrimonio_max)} · ${fNum(d.eleitos)} eleitos de ${fNum(d.candidaturas)}`}
                        >
                          <span className="pmd-decile-pct">{pct(d.taxa_sucesso_pct)}</span>
                          <div className="pmd-decile-bar-container">
                            <div
                              className={`pmd-decile-bar ${isTop ? 'top-tier' : ''}`}
                              style={{ height: `${barHeight}px` }}
                            />
                          </div>
                          <span className="pmd-decile-label">D{d.decil}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pmd-axis-labels">
                    <span>← Menor patrimônio</span>
                    <span>Maior patrimônio →</span>
                  </div>
                </>
              ) : (
                <div
                  style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: 13 }}
                >
                  Poucas candidaturas no recorte atual para calcular os 10 decis estatísticos.
                </div>
              )}
            </article>

            {/* Gráfico 2: Ranking de Municípios com Maior Valor */}
            <article className="pmd-chart-card">
              <h4>Municípios com maior valor · {stateName}</h4>
              <p className="card-desc">
                {INDICADORES.find((i) => i.valor === indicador)?.rotulo}. Clique em um município
                para selecioná-lo.
              </p>

              {ranking.length > 0 ? (
                <div className="pmd-ranking-list">
                  {ranking.map((item) => {
                    const nome =
                      nomesMunicipios.get(item.id_municipio) || item.municipio || item.id_municipio;
                    const fillPct = Math.min(100, Math.max(8, (item.valor / maxRanking) * 100));
                    return (
                      <button
                        key={item.id_municipio}
                        type="button"
                        className="pmd-ranking-item"
                        onClick={() => escolherMun(item.id_municipio)}
                      >
                        <span className="name">{nome}</span>
                        <div className="pmd-ranking-track">
                          <div className="pmd-ranking-fill" style={{ width: `${fillPct}%` }} />
                        </div>
                        <strong>
                          {indicador === 'razao'
                            ? `${fDec(item.valor)}×`
                            : compactMoney(item.valor)}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: 13 }}
                >
                  Sem municípios com amostragem suficiente para este indicador.
                </div>
              )}
            </article>
          </div>

          {/* Gráfico 3: Comparativo Eleitos x Não Eleitos */}
          <div className="pmd-comparison-box">
            <h4>Comparativo: Eleitos × Não Eleitos (Patrimônio Mediano Declarado)</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              A mediana resiste melhor do que a média à influência de patrimônios atípicos
              multimilionários.
            </p>

            <div className="pmd-comparison-rows">
              <div className="pmd-comp-row">
                <span>Candidaturas Eleitas</span>
                <div className="pmd-comp-track">
                  <div
                    className="pmd-comp-fill elected"
                    style={{
                      width: `${Math.min(100, Math.max(6, ((eleitosResumo?.patrimonio_mediano || 0) / maxSituacao) * 100))}%`,
                    }}
                  />
                </div>
                <strong>{compactMoney(eleitosResumo?.patrimonio_mediano)}</strong>
              </div>

              <div className="pmd-comp-row">
                <span>Não Eleitas e Suplentes</span>
                <div className="pmd-comp-track">
                  <div
                    className="pmd-comp-fill not-elected"
                    style={{
                      width: `${Math.min(100, Math.max(6, ((naoEleitosResumo?.patrimonio_mediano || 0) / maxSituacao) * 100))}%`,
                    }}
                  />
                </div>
                <strong>{compactMoney(naoEleitosResumo?.patrimonio_mediano)}</strong>
              </div>
            </div>
          </div>

          {/* Nota Metodológica Oficial */}
          <details className="pmd-method">
            <summary>Como ler estes dados · Regras de classificação e limitações</summary>
            <div>
              <p>
                <strong>Patrimônio declarado:</strong> Refere-se à soma de bens declarada
                formalmente pelos candidatos ao TSE no momento do registro da candidatura. Os
                valores não sofrem auditoria patrimonial prévia da Justiça Eleitoral. Candidaturas
                sem declaração ou com valor negativo são excluídas do cálculo das medianas.
              </p>
              <p>
                <strong>Definição de Sucesso:</strong> Candidaturas cujo resultado final contenha o
                termo &quot;ELEITO&quot; (incluindo eleição por quociente partidário e por média).
                Candidatos com resultado &quot;NÃO ELEITO&quot; ou &quot;SUPLENTE&quot; são
                categorizados como não eleitos. Registros nulos ou pendentes de julgamento são
                excluídos para evitar distorções estatísticas.
              </p>
              <p>
                <strong>Correlação vs. Causalidade:</strong> Uma correlação positiva indica
                associação estatística no conjunto de dados, mas não comprova relação de causa e
                efeito direta. Candidatos com maior patrimônio frequentemente contam com redes
                partidárias consolidadas e maior tempo de propaganda.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

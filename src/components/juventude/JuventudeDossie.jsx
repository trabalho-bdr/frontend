import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Filter, Calendar, Briefcase, MapPin, Award, CheckCircle2 } from 'lucide-react';
import './juventude.css';

import DescobertasGeracoes from './DescobertasGeracoes.jsx';
import RetratoGeracoes from './RetratoGeracoes.jsx';
import RenovacaoPartidos from './RenovacaoPartidos.jsx';
import MapaJuventude from './MapaJuventude.jsx';
import EvolucaoGeracional from './EvolucaoGeracional.jsx';
import EleitoradoPendente from './EleitoradoPendente.jsx';

import {
  getJuventudeOverview,
  getJuventudePartidos,
  getJuventudeMunicipios,
  getJuventudeEvolucao,
  getJuventudeCandidatos
} from '../../data/client.js';
import { juventudeSnapshot } from '../../data/juventudeSnapshot.js';

const UFS = ['CE', 'MA', 'MS', 'RJ', 'RN', 'RS'];

export default function JuventudeDossie({
  mode = 'snapshot',
  onResearch,
  onOpenCandidate
}) {
  // Estado dos filtros compartilhados
  const [cargo, setCargo] = useState('VEREADOR');
  const [ano, setAno] = useState(2024);
  const [uf, setUf] = useState('');

  // Dados carregados
  const [overviewData, setOverviewData] = useState(null);
  const [partidosData, setPartidosData] = useState([]);
  const [municipiosData, setMunicipiosData] = useState([]);
  const [mediaPonderadaMun, setMediaPonderadaMun] = useState(6.82);
  const [evolucaoData, setEvolucaoData] = useState({});
  const [candidatosAmostra, setCandidatosAmostra] = useState({});
  const [loading, setLoading] = useState(false);
  const [fonteAtiva, setFonteAtiva] = useState('auditado');

  // Ajustar ano quando o cargo muda para evitar combinações inválidas
  const handleCargoChange = (novoCargo) => {
    setCargo(novoCargo);
    if (novoCargo === 'VEREADOR') {
      if (ano !== 2020 && ano !== 2024) setAno(2024);
    } else {
      if (ano !== 2018 && ano !== 2022) setAno(2022);
    }
  };

  const limparFiltros = () => {
    setCargo('VEREADOR');
    setAno(2024);
    setUf('');
  };

  // Carregar dados (ao vivo com fallback robusto ao snapshot)
  useEffect(() => {
    let active = true;
    setLoading(true);

    const snapshotKey = `${ano}_${cargo.replace(' ', '_')}${uf ? `_${uf}` : ''}`;
    const baseSnapshotKey = `${ano}_${cargo.replace(' ', '_')}`;

    // Dados de fallback do snapshot
    const fallbackOverview =
      juventudeSnapshot.overview[snapshotKey] ||
      juventudeSnapshot.overview[baseSnapshotKey] ||
      juventudeSnapshot.overview['2024_VEREADOR'];

    const fallbackPartidos =
      juventudeSnapshot.partidos[baseSnapshotKey]?.partidos ||
      juventudeSnapshot.partidos['2024_VEREADOR']?.partidos ||
      [];

    const fallbackMun =
      juventudeSnapshot.municipios[String(ano)] ||
      juventudeSnapshot.municipios['2024'] ||
      { municipios: [], media_ponderada_pct_jovens: 6.82 };

    const fallbackEvolucao =
      juventudeSnapshot.evolucao[cargo] ||
      juventudeSnapshot.evolucao['VEREADOR'] ||
      {};

    const fallbackCandidatos = juventudeSnapshot.candidatosAmostra || {};

    if (mode === 'live') {
      Promise.allSettled([
        getJuventudeOverview({ ano, cargo, uf }),
        getJuventudePartidos({ ano, cargo, uf, min_candidaturas: 10 }),
        cargo === 'VEREADOR'
          ? getJuventudeMunicipios({ ano, cargo, uf })
          : Promise.resolve(fallbackMun),
        getJuventudeEvolucao({ cargo }),
        getJuventudeCandidatos({ ano, cargo, uf, limit: 12 })
      ])
        .then(([resOv, resPt, resMun, resEv, resCand]) => {
          if (!active) return;

          if (resOv.status === 'fulfilled' && resOv.value && resOv.value.faixas) {
            setOverviewData(resOv.value);
            setFonteAtiva('live');
          } else {
            setOverviewData(fallbackOverview);
            setFonteAtiva('auditado');
          }

          if (resPt.status === 'fulfilled' && resPt.value && resPt.value.partidos) {
            setPartidosData(resPt.value.partidos);
          } else {
            setPartidosData(fallbackPartidos);
          }

          if (resMun.status === 'fulfilled' && resMun.value && resMun.value.municipios) {
            setMunicipiosData(resMun.value.municipios);
            setMediaPonderadaMun(resMun.value.media_ponderada_pct_jovens || 6.82);
          } else {
            setMunicipiosData(fallbackMun.municipios);
            setMediaPonderadaMun(fallbackMun.media_ponderada_pct_jovens);
          }

          if (resEv.status === 'fulfilled' && resEv.value && resEv.value.series) {
            setEvolucaoData(resEv.value);
          } else {
            setEvolucaoData(fallbackEvolucao);
          }

          if (resCand.status === 'fulfilled' && resCand.value && resCand.value.candidatos) {
            setCandidatosAmostra((prev) => ({
              ...prev,
              '18_29': resCand.value.candidatos
            }));
          } else {
            setCandidatosAmostra(fallbackCandidatos);
          }
        })
        .catch(() => {
          if (!active) return;
          setOverviewData(fallbackOverview);
          setPartidosData(fallbackPartidos);
          setMunicipiosData(fallbackMun.municipios);
          setMediaPonderadaMun(fallbackMun.media_ponderada_pct_jovens);
          setEvolucaoData(fallbackEvolucao);
          setCandidatosAmostra(fallbackCandidatos);
          setFonteAtiva('auditado');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      // Modo Snapshot offline
      setOverviewData(fallbackOverview);
      setPartidosData(fallbackPartidos);
      setMunicipiosData(fallbackMun.municipios);
      setMediaPonderadaMun(fallbackMun.media_ponderada_pct_jovens);
      setEvolucaoData(fallbackEvolucao);
      setCandidatosAmostra(fallbackCandidatos);
      setFonteAtiva('auditado');
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [ano, cargo, uf, mode]);

  return (
    <article className="juventude-dossie" aria-label="Dossiê Especial: Juventude, candidaturas e representação política">
      {/* 1. CABEÇALHO EDITORIAL */}
      <header className="j-hero">
        <span className="j-hero-kicker">
          INVESTIGAÇÃO ESPECIAL · QUESTÃO 06
        </span>
        <h1 className="j-hero-title">
          O BRASIL QUE VOTA, O BRASIL QUE SE <em>CANDIDATA.</em>
        </h1>
        <p className="j-hero-sub">
          Onde estão os jovens na política — e quantos conseguem conquistar uma cadeira?
          Uma reportagem analítica sobre perfil etário, renovação partidária e mandatos eleitorais (2018–2024).
        </p>

        <div className="j-hero-meta">
          <span>
            <CheckCircle2 size={14} color="var(--j-verde)" />
            {fonteAtiva === 'live' ? 'CONSULTA AO ACERVO ATUALIZADO' : 'BASE AUDITADA · 21/10/2026'}
          </span>
          <span>• COBERTURA: CE · MA · MS · RJ · RN · RS</span>
          <span>• CARGO ATUAL: {cargo} ({ano})</span>
          {loading && <span style={{ color: 'var(--j-azul)' }}>• ATUALIZANDO DADOS…</span>}
        </div>
      </header>

      {/* 2. BARRA DE FILTROS COMPARTILHADOS */}
      <div className="j-controls-bar" role="search" aria-label="Filtros compartilhados da investigação">
        <div className="j-control-group">
          <label htmlFor="j-filtro-cargo">
            <Briefcase size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Cargo em Disputa
          </label>
          <select
            id="j-filtro-cargo"
            value={cargo}
            onChange={(e) => handleCargoChange(e.target.value)}
          >
            <option value="VEREADOR">Vereador (Municipal)</option>
            <option value="DEPUTADO ESTADUAL">Deputado Estadual (Geral)</option>
            <option value="DEPUTADO FEDERAL">Deputado Federal (Geral)</option>
          </select>
        </div>

        <div className="j-control-group">
          <label htmlFor="j-filtro-ano">
            <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Ano da Eleição
          </label>
          <select
            id="j-filtro-ano"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {cargo === 'VEREADOR' ? (
              <>
                <option value={2024}>2024 (Pleito mais recente)</option>
                <option value={2020}>2020</option>
              </>
            ) : (
              <>
                <option value={2022}>2022 (Pleito mais recente)</option>
                <option value={2018}>2018</option>
              </>
            )}
          </select>
        </div>

        <div className="j-control-group">
          <label htmlFor="j-filtro-uf">
            <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Unidade Federativa (UF)
          </label>
          <select
            id="j-filtro-uf"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">Todas as 6 UFs do acervo</option>
            {UFS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="j-btn-reset"
          onClick={limparFiltros}
          title="Restaurar recorte inicial"
        >
          <RotateCcw size={14} /> Limpar Recorte
        </button>
      </div>

      {/* 3. SISTEMA DE DESCOBERTAS CALCULADAS */}
      <DescobertasGeracoes
        descobertas={overviewData?.descobertas || []}
      />

      {/* 4. EXPERIÊNCIA 1: O RETRATO DAS GERAÇÕES */}
      <RetratoGeracoes
        overviewData={overviewData}
        amostraCandidatos={candidatosAmostra}
        onOpenCandidate={onOpenCandidate}
      />

      {/* 5. EXPERIÊNCIA 2: A RENOVAÇÃO DOS PARTIDOS */}
      <RenovacaoPartidos
        partidosData={partidosData}
        ano={ano}
        cargo={cargo}
        uf={uf}
      />

      {/* 6. EXPERIÊNCIA 3: O MAPA DA JUVENTUDE CANDIDATA (PARA ELEIÇÕES MUNICIPAIS) */}
      {cargo === 'VEREADOR' ? (
        <MapaJuventude
          municipiosData={municipiosData}
          mediaPonderada={mediaPonderadaMun}
          ano={ano}
          cargo={cargo}
          uf={uf}
          onSelectUf={(state) => setUf(state)}
        />
      ) : (
        <div style={{ background: '#f5f7f3', border: '1px dashed #ced7cb', padding: '18px 24px', marginBottom: '30px' }}>
          <span style={{ font: '700 11px var(--j-mono)', color: 'var(--j-azul)', textTransform: 'uppercase' }}>
            RECORTES TERRITORIAIS MUNICIPAIS
          </span>
          <p style={{ font: '500 13px var(--j-body)', margin: '6px 0 0 0', color: 'var(--j-texto-suave)' }}>
            O cargo de <strong>{cargo}</strong> possui circunscrição estadual/federal. Para investigar a distribuição de
            candidaturas jovens em nível <em>municipal</em> no Atlas, selecione o cargo de <strong>Vereador</strong>.
          </p>
        </div>
      )}

      {/* 7. EXPERIÊNCIA 4: A CURVA GERACIONAL (COMPARAÇÃO TEMPORAL) */}
      <EvolucaoGeracional
        evolucaoData={evolucaoData}
      />

      {/* 8. EXPERIÊNCIA 5: ELEITORADO PENDENTE E MODELO DE DISPERSÃO */}
      <EleitoradoPendente
        metodologia={juventudeSnapshot.metodologiaEleitoradoPendente}
      />

      {/* 9. NOTA METODOLÓGICA CONSOLIDADA */}
      <footer className="j-methodology-note">
        <strong>NOTA METODOLÓGICA E LIMITES LEGAIS DE ELEGIBILIDADE:</strong>
        <p style={{ margin: '4px 0 8px 0' }}>
          1. <strong>Cálculo de idade:</strong> A idade de cada candidatura é calculada com base na data de nascimento
          registrada e na data de realização do primeiro turno eleitoral, considerando dia e mês. Casos com data ausente,
          idade inferior a 18 anos ou superior a 105 anos foram mantidos em categoria própria (sem idade válida).
        </p>
        <p style={{ margin: '4px 0 8px 0' }}>
          2. <strong>Elegibilidade constitucional (CF/88, art. 14, § 3º, VI):</strong> A idade mínima legal de elegibilidade
          é de 18 anos para Vereador; 21 anos para Deputado Federal e Deputado Estadual. Candidatos a deputado com 20 anos
          na data do pleito podem ser admitidos se completarem 21 anos até a posse oficial.
        </p>
        <p style={{ margin: '4px 0 8px 0' }}>
          3. <strong>Indicadores e Denominadores:</strong> A <em>participação entre candidaturas</em> divide os jovens pelo total
          com idade válida; a <em>participação entre eleitos</em> divide os eleitos jovens pelo total de eleitos com idade válida;
          e a <em>taxa de eleição</em> divide os jovens eleitos pelos jovens com resultado definido (eleito, não eleito, suplente).
          Candidaturas com resultado nulo ou cancelado são excluídas do denominador da taxa.
        </p>
        <p style={{ margin: '4px 0 0 0' }}>
          4. <strong>Cobertura:</strong> O acervo compreende municípios e zonas de 6 Unidades Federativas (CE, MA, MS, RJ, RN, RS),
          não configurando amostra probabilística nacional. Pleitos suplementares foram excluídos para garantir comparabilidade temporal.
        </p>
      </footer>
    </article>
  );
}

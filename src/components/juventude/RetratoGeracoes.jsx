import React, { useState } from 'react';
import { Users, Award, ExternalLink, Info } from 'lucide-react';
import SantinhoModal from './SantinhoModal.jsx';

const fNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const pct = (n) => (n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`);

export default function RetratoGeracoes({
  overviewData,
  amostraCandidatos = {},
  onOpenCandidate
}) {
  const [metrica, setMetrica] = useState('candidaturas'); // 'candidaturas' | 'taxa_eleicao'
  const [faixaSelecionada, setFaixaSelecionada] = useState('18 a 29 anos');
  const [modalAberto, setModalAberto] = useState(false);

  if (!overviewData || !overviewData.faixas) {
    return <div className="j-empty-state">Carregando dados das gerações...</div>;
  }

  const { faixas, totais, recorte } = overviewData;
  const faixasValidas = faixas.filter((f) => f.ordem < 5);
  const semIdade = faixas.find((f) => f.ordem === 5);

  const maxVal = Math.max(
    1,
    ...faixasValidas.map((f) =>
      metrica === 'taxa_eleicao' ? (f.taxa_eleicao || 0) : f.candidaturas
    )
  );

  const selecionada =
    faixas.find((f) => f.faixa === faixaSelecionada) || faixasValidas[0];

  // Identificador da chave para buscar santinhos na amostra
  const keyMap = {
    '18 a 29 anos': '18_29',
    '30 a 44 anos': '30_44',
    '45 a 59 anos': '45_59',
    '60 anos ou mais': '60_mais'
  };
  const chaveAmostra = keyMap[selecionada?.faixa] || '18_29';
  const listaSantinhos = amostraCandidatos[chaveAmostra] || [];

  return (
    <section className="j-section-panel" aria-labelledby="retrato-geracoes-title">
      <header>
        <span className="j-step-badge">EXPERIÊNCIA 01 · COMPOSIÇÃO ETÁRIA</span>
        <h2 id="retrato-geracoes-title">QUEM SE CANDIDATA NO BRASIL?</h2>
        <p>
          Investigue a pirâmide etária das disputas eleitorais. Selecione uma geração para
          analisar sua taxa de sucesso e abrir as fichas dos candidatos que disputaram as urnas.
        </p>
      </header>

      {/* Botões de alternância da métrica do gráfico */}
      <div className="j-metric-toggle" role="group" aria-label="Métrica do gráfico geracional">
        <button
          type="button"
          aria-pressed={metrica === 'candidaturas'}
          onClick={() => setMetrica('candidaturas')}
        >
          Volume de Candidaturas
        </button>
        <button
          type="button"
          aria-pressed={metrica === 'taxa_eleicao'}
          onClick={() => setMetrica('taxa_eleicao')}
        >
          Taxa de Eleição (% Eleitos ÷ Definidos)
        </button>
      </div>

      <div className="j-generations-layout">
        {/* Gráfico de barras horizontais */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', font: '700 10px var(--j-mono)', color: 'var(--j-texto-suave)', textTransform: 'uppercase' }}>
            <span>FAIXA ETÁRIA</span>
            <span>
              {metrica === 'candidaturas'
                ? 'CANDIDATURAS (% DO TOTAL VÁLIDO)'
                : 'TAXA DE VITÓRIA (ELEITOS ÷ DEFINIDOS)'}
            </span>
          </div>

          <div className="j-bars-container" role="list" aria-label="Distribuição geracional de candidaturas">
            {faixasValidas.map((f) => {
              const valor = metrica === 'taxa_eleicao' ? (f.taxa_eleicao || 0) : f.candidaturas;
              const barWidth = Math.max(3, (valor / maxVal) * 100);
              const isSelected = f.faixa === faixaSelecionada;
              const isYouth = f.ordem === 1;

              return (
                <div
                  key={f.faixa}
                  role="listitem"
                  className={`j-generation-bar-row ${isSelected ? 'active' : ''}`}
                  onClick={() => setFaixaSelecionada(f.faixa)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFaixaSelecionada(f.faixa);
                    }
                  }}
                  title={`Clique para detalhar a faixa ${f.faixa}`}
                >
                  <div className="j-gen-label">
                    <span>{f.faixa}</span>
                    <small>
                      {f.ordem === 1 ? 'Estatuto da Juventude' : f.ordem === 4 ? '60+ anos' : 'Idade intermediária'}
                    </small>
                  </div>

                  <div className="j-gen-track">
                    <div
                      className={`j-gen-fill ${isYouth ? 'youth' : ''}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="j-gen-val">
                    {metrica === 'candidaturas' ? (
                      <>
                        <strong>{fNum(f.candidaturas)}</strong>
                        <small>{pct(f.pct_candidaturas)}</small>
                      </>
                    ) : (
                      <>
                        <strong>{pct(f.taxa_eleicao)}</strong>
                        <small>{fNum(f.eleitos)} eleitos</small>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Categoria separada: sem idade válida */}
          {semIdade && semIdade.candidaturas > 0 && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                background: '#f9f9f6',
                border: '1px dashed #ced7cb',
                font: '500 11px var(--j-mono)',
                color: 'var(--j-texto-suave)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                <strong>Sem idade válida registrada:</strong> {fNum(semIdade.candidaturas)} candidaturas
                (datas nulas ou anômalas mantidas em categoria isolada).
              </span>
              <span>{fNum(semIdade.eleitos)} eleitos</span>
            </div>
          )}

          <div style={{ marginTop: '14px', padding: '10px 12px', background: 'var(--j-azul-light)', borderLeft: '4px solid var(--j-azul)', font: '500 11px/1.5 var(--j-body)', color: 'var(--j-azul-dark)' }}>
            <strong>Distinção metodológica fundamental:</strong>
            <br />
            • <b>Participação entre eleitos:</b> fração que os jovens representam sobre o total de eleitos ({overviewData.faixas[0]?.pct_eleitos}%).
            <br />
            • <b>Taxa de eleição:</b> percentual de jovens que conseguiram se eleger entre todos os candidatos jovens com resultado definido ({overviewData.faixas[0]?.taxa_eleicao}%).
          </div>
        </div>

        {/* Ficha detalhada da geração selecionada */}
        <aside className="j-generation-inspector" aria-label={`Detalhes da faixa ${selecionada.faixa}`}>
          <div className="j-inspector-head">
            <span>DETALHE DO GRUPO ETÁRIO</span>
            <h4>{selecionada.faixa}</h4>
          </div>

          <div className="j-inspector-stats">
            <div className="j-stat-card">
              <span>CANDIDATURAS</span>
              <strong>{fNum(selecionada.candidaturas)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {pct(selecionada.pct_candidaturas)} do recorte
              </small>
            </div>

            <div className="j-stat-card">
              <span>ELEITOS</span>
              <strong>{fNum(selecionada.eleitos)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {pct(selecionada.pct_eleitos)} dos eleitos
              </small>
            </div>

            <div className="j-stat-card">
              <span>TAXA DE ELEIÇÃO</span>
              <strong style={{ color: 'var(--j-verde-dark)' }}>{pct(selecionada.taxa_eleicao)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                {fNum(selecionada.eleitos)} / {fNum(selecionada.definidos)}
              </small>
            </div>

            <div className="j-stat-card">
              <span>MÉDIA DE VOTOS</span>
              <strong>{fNum(selecionada.media_votos)}</strong>
              <small style={{ font: '600 10px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
                votos nominais
              </small>
            </div>
          </div>

          <div className="j-inspector-insight">
            {selecionada.ordem === 1 ? (
              <p style={{ margin: 0 }}>
                <strong>Juventude política:</strong> Representam {pct(selecionada.pct_candidaturas)} das candidaturas,
                conquistando {pct(selecionada.pct_eleitos)} das cadeiras. Sua taxa de sucesso individual é de {pct(selecionada.taxa_eleicao)}.
              </p>
            ) : selecionada.ordem === 2 ? (
              <p style={{ margin: 0 }}>
                <strong>Faixa de 30 a 44 anos:</strong> Apresenta a maior taxa de vitória nas urnas ({pct(selecionada.taxa_eleicao)})
                e a maior média de votos nominais ({fNum(selecionada.media_votos)}).
              </p>
            ) : selecionada.ordem === 3 ? (
              <p style={{ margin: 0 }}>
                <strong>Faixa de 45 a 59 anos:</strong> É o maior contingente numérico da disputa, reunindo{' '}
                {fNum(selecionada.candidaturas)} concorrentes ({pct(selecionada.pct_candidaturas)} das candidaturas).
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <strong>60 anos ou mais:</strong> Concentram {fNum(selecionada.candidaturas)} candidaturas, com taxa de eleição de{' '}
                {pct(selecionada.taxa_eleicao)}.
              </p>
            )}
          </div>

          <button
            type="button"
            className="j-btn-open-dossier"
            onClick={() => setModalAberto(true)}
          >
            <Users size={16} /> Ver Santinhos Desta Faixa ({fNum(selecionada.candidaturas)})
          </button>
        </aside>
      </div>

      {/* Modal / Fichário com santinhos reais */}
      {modalAberto && (
        <SantinhoModal
          faixaLabel={selecionada.faixa}
          candidatos={listaSantinhos}
          onClose={() => setModalAberto(false)}
          onOpenCandidate={onOpenCandidate}
        />
      )}

      {/* Tabela de acessibilidade / valores exatos */}
      <details className="j-accessible-table-wrapper">
        <summary>Consultar tabela com números e denominadores exatos</summary>
        <table>
          <thead>
            <tr>
              <th>Faixa Etária</th>
              <th>Candidaturas</th>
              <th>% Válidas</th>
              <th>Resultados Definidos</th>
              <th>Eleitos</th>
              <th>% Entre Eleitos</th>
              <th>Taxa de Eleição</th>
              <th>Média de Votos</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f.faixa}>
                <td><strong>{f.faixa}</strong></td>
                <td>{fNum(f.candidaturas)}</td>
                <td>{pct(f.pct_candidaturas)}</td>
                <td>{fNum(f.definidos)}</td>
                <td>{fNum(f.eleitos)}</td>
                <td>{pct(f.pct_eleitos)}</td>
                <td><strong>{pct(f.taxa_eleicao)}</strong></td>
                <td>{fNum(f.media_votos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, ArrowUpDown, CheckCircle2, XCircle, Clock,
  Layers, Plus, Trash2, ArrowUpRight, Search, Eye
} from 'lucide-react';

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

export default function CandidateSpendingRanking({
  candidates,
  totalCandidates,
  page,
  limit,
  onPageChange,
  ordem,
  onOrdemChange,
  filtroResultado,
  onFiltroResultadoChange,
  selectedCandidateId,
  onSelectCandidate,
  onOpenCandidateModal,
  onResearch
}) {
  // Lista de comparação da Mesa de Investigação (máximo 3 candidatos)
  const [deskList, setDeskList] = useState([]);

  const toggleDeskCandidate = (cand, e) => {
    e?.stopPropagation();
    setDeskList((prev) => {
      const exists = prev.find((c) => c.id === cand.id);
      if (exists) {
        return prev.filter((c) => c.id !== cand.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), cand]; // remove o mais antigo se já tiver 3
      }
      return [...prev, cand];
    });
  };

  const removeFromDesk = (id, e) => {
    e?.stopPropagation();
    setDeskList((prev) => prev.filter((c) => c.id !== id));
  };

  const totalPages = Math.ceil(totalCandidates / limit) || 1;

  return (
    <section className="q1-ranking-section">
      {/* Cabeçalho Editorial */}
      <div className="q1-section-header">
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c84d38', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            EXPERIÊNCIA 02 · FICHÁRIO ELEITORAL
          </span>
          <h2>NEM TODAS AS CADEIRAS CUSTAM IGUAL.</h2>
          <p>
            Investigue as candidaturas individuais do recorte. Compare orçamentos milionários que resultaram em derrotas com campanhas econômicas que conquistaram cadeiras.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096' }}>
            {fNum(totalCandidates)} candidaturas no recorte
          </span>
        </div>
      </div>

      {/* Barra de Controles: Ordenações e Filtros de Resultado */}
      <div className="q1-ranking-controls">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' }}>
            ORDENAÇÃO:
          </span>
          <div className="q1-segmented">
            <button
              className={ordem === 'custo_voto' ? 'active' : ''}
              onClick={() => onOrdemChange('custo_voto')}
              title="Maior gasto por voto recebido (despesas ÷ votos nominais)"
            >
              Maior Despesa por Voto
            </button>
            <button
              className={ordem === 'gastos' ? 'active' : ''}
              onClick={() => onOrdemChange('gastos')}
              title="Maior total de despesas declaradas"
            >
              Maior Despesa Total
            </button>
            <button
              className={ordem === 'votos' ? 'active' : ''}
              onClick={() => onOrdemChange('votos')}
              title="Maior número de votos nominais"
            >
              Mais Votados
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase' }}>
            RESULTADO:
          </span>
          <div className="q1-segmented">
            <button
              className={filtroResultado === 'todos' ? 'active' : ''}
              onClick={() => onFiltroResultadoChange('todos')}
            >
              Todos Definidos
            </button>
            <button
              className={filtroResultado === 'eleitos' ? 'active' : ''}
              onClick={() => onFiltroResultadoChange('eleitos')}
            >
              Somente Eleitos
            </button>
            <button
              className={filtroResultado === 'nao_eleitos' ? 'active' : ''}
              onClick={() => onFiltroResultadoChange('nao_eleitos')}
            >
              Não Eleitos / Suplentes
            </button>
          </div>
        </div>
      </div>

      {/* MESA DE INVESTIGAÇÃO (Comparações Lado a Lado) */}
      <AnimatePresence>
        {deskList.length > 0 && (
          <motion.div
            className="q1-investigation-desk"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="q1-desk-header">
              <div className="q1-desk-title">
                <Layers size={18} />
                MESA DE INVESTIGAÇÃO · COMPARANDO {deskList.length} DE 3 CANDIDATURAS
              </div>
              <button
                onClick={() => setDeskList([])}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(251,247,238,0.4)',
                  color: '#fbf7ee',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                Limpar Mesa
              </button>
            </div>

            <div className="q1-desk-cards">
              {deskList.map((cand) => (
                <motion.div
                  key={cand.id}
                  className="q1-desk-document"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <button
                    onClick={(e) => removeFromDesk(cand.id, e)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      border: 'none',
                      background: '#edf2f7',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#c84d38'
                    }}
                    title="Remover da mesa"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#174a8b', textTransform: 'uppercase' }}>
                      Nº {cand.numero || '—'} · {cand.partido || 'S/P'}
                    </span>
                    <h4 style={{ margin: '0.2rem 0', fontSize: '1.05rem', color: '#1a202c', fontWeight: 800 }}>
                      {cand.nome}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#718096' }}>
                      {cand.municipio ? `${cand.municipio} · ${cand.uf}` : cand.uf}
                    </span>
                  </div>

                  <div style={{ margin: '0.85rem 0', background: '#fff', padding: '0.6rem', borderRadius: '3px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: '#718096' }}>Resultado:</span>
                      <strong style={{ color: cand.eleito ? '#176b50' : '#4a5568' }}>{cand.resultado}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: '#718096' }}>Votos nominais:</span>
                      <strong>{cand.votos ? fNum(cand.votos) : '0'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: '#718096' }}>Despesas totais:</span>
                      <strong>{cand.gastos != null ? money(cand.gastos) : 'Não informado'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed #cbd5e0', paddingTop: '0.3rem' }}>
                      <span style={{ fontWeight: 700, color: '#c84d38' }}>Gasto por voto:</span>
                      <strong style={{ color: '#c84d38', fontWeight: 800 }}>
                        {cand.custo_voto ? money(cand.custo_voto) : '—'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="q1-btn-small"
                      onClick={() => onOpenCandidateModal?.(cand)}
                      title="Ver extrato de despesas detalhado"
                    >
                      <Eye size={12} style={{ display: 'inline', marginRight: '3px' }} /> Ver Despesas
                    </button>
                    <button
                      className="q1-btn-small"
                      onClick={() => onSelectCandidate?.(cand)}
                      title="Destacar no gráfico de dispersão"
                    >
                      Ver no Gráfico ↗
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de Santinhos Eleitorais */}
      {candidates.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid #cbd5e0', padding: '2.5rem', textAlign: 'center', borderRadius: '4px' }}>
          <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem' }}>
            Nenhuma candidatura encontrada com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="q1-candidate-grid">
          {candidates.map((cand) => {
            const isSelected = selectedCandidateId === cand.id;
            const isOnDesk = deskList.some((c) => c.id === cand.id);

            return (
              <motion.div
                key={cand.id}
                className={`q1-santinho ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectCandidate?.(cand)}
                layout
              >
                <div>
                  <div className="q1-santinho-top">
                    <div>
                      <span className="q1-santinho-number">
                        {cand.numero ? String(cand.numero) : '——'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>
                        {cand.partido || 'SEM PARTIDO'}
                      </span>
                    </div>

                    <span
                      className={`q1-santinho-status ${
                        cand.eleito
                          ? 'q1-status-eleito'
                          : cand.resultado === 'SUPLENTE'
                          ? 'q1-status-suplente'
                          : 'q1-status-nao'
                      }`}
                    >
                      {cand.resultado || (cand.eleito ? 'ELEITO' : 'NÃO ELEITO')}
                    </span>
                  </div>

                  <div className="q1-santinho-name">{cand.nome}</div>
                  <div className="q1-santinho-sub">
                    {cand.municipio ? `${cand.municipio} · ${cand.uf}` : `Estado: ${cand.uf}`}
                  </div>
                </div>

                <div>
                  <div className="q1-santinho-metrics">
                    <div className="q1-santinho-metric-row">
                      <span>Votos nominais:</span>
                      <strong>{cand.votos ? fNum(cand.votos) : '0'}</strong>
                    </div>
                    <div className="q1-santinho-metric-row">
                      <span>Despesas declaradas:</span>
                      <strong>{cand.gastos != null ? money(cand.gastos) : 'Não informado'}</strong>
                    </div>
                    <div className="q1-santinho-metric-row q1-santinho-metric-highlight">
                      <span>Despesa por voto:</span>
                      <strong>{cand.custo_voto ? money(cand.custo_voto) : '—'}</strong>
                    </div>
                  </div>

                  <div className="q1-santinho-actions">
                    <button
                      className={`q1-btn-small ${isOnDesk ? 'q1-btn-compare' : ''}`}
                      onClick={(e) => toggleDeskCandidate(cand, e)}
                    >
                      {isOnDesk ? '✓ Na Mesa' : '+ Comparar'}
                    </button>
                    <button
                      className="q1-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCandidateModal?.(cand);
                      }}
                      title="Abrir extrato de lançamentos"
                    >
                      Ficha ↗
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="q1-pagination">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            ← Anterior
          </button>
          <span className="q1-pagination-info">
            Página {page} de {totalPages} · ({fNum(totalCandidates)} candidaturas)
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Próxima →
          </button>
        </div>
      )}
    </section>
  );
}

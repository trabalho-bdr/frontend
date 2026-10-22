import React, { useState } from 'react';
import { X, User, Vote, MapPin, Award } from 'lucide-react';

const fNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
const money = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }));

export default function SantinhoModal({ faixaLabel, candidatos = [], onClose, onOpenCandidate }) {
  const [busca, setBusca] = useState('');

  const filtrados = candidatos.filter((c) => {
    if (!busca) return true;
    const s = busca.toLowerCase();
    return (
      (c.nome && c.nome.toLowerCase().includes(s)) ||
      (c.partido && c.partido.toLowerCase().includes(s)) ||
      (c.municipio && c.municipio.toLowerCase().includes(s)) ||
      String(c.numero).includes(s)
    );
  });

  return (
    <div
      className="j-santinho-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Santinhos da faixa ${faixaLabel}`}
    >
      <div className="j-santinho-modal" onClick={(e) => e.stopPropagation()}>
        <div className="j-santinho-modal-head">
          <div>
            <span style={{ font: '700 10px var(--j-mono)', textTransform: 'uppercase', color: 'var(--j-verde)' }}>
              FICHÁRIO ELEITORAL / AMOSTRA DE SANTINHOS
            </span>
            <h3>Candidaturas: {faixaLabel}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar gaveta de santinhos"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--j-azul-dark)',
              padding: '6px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar por nome, partido, município ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #77978b',
              background: '#ffffff',
              font: '500 12px var(--j-body)'
            }}
          />
          <span style={{ font: '600 11px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
            {filtrados.length} {filtrados.length === 1 ? 'candidatura' : 'candidaturas'}
          </span>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', background: '#fffcf5', border: '1px dashed #ccc' }}>
            <p style={{ font: '500 13px var(--j-body)', color: 'var(--j-texto-suave)' }}>
              Nenhuma candidatura encontrada para este filtro na amostra carregada.
            </p>
          </div>
        ) : (
          <div className="j-santinho-grid">
            {filtrados.map((c) => {
              const ehEleito = (c.resultado || '').toUpperCase().startsWith('ELEITO');
              return (
                <div className="j-santinho-card" key={c.id}>
                  <div>
                    <div className="j-santinho-top">
                      <span>{c.partido}</span>
                      <span>{c.idade != null ? `${c.idade} ANOS` : 'IDADE N/I'}</span>
                    </div>

                    <h4 className="j-santinho-name">{c.nome}</h4>
                    <div className="j-santinho-number">{c.numero}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', font: '600 11px var(--j-mono)', color: 'var(--j-texto-suave)', marginBottom: '8px' }}>
                      <MapPin size={12} />
                      <span>{c.municipio} · {c.uf}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 11px var(--j-mono)', margin: '6px 0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Vote size={12} /> {fNum(c.votos)} votos
                      </span>
                      {c.gastos != null && c.gastos > 0 && (
                        <span>{money(c.gastos)}</span>
                      )}
                    </div>

                    <div className="j-santinho-bottom">
                      <span className={`j-santinho-outcome ${ehEleito ? 'elected' : 'not-elected'}`}>
                        {c.resultado || 'RESULTADO N/D'}
                      </span>
                      {onOpenCandidate && (
                        <button
                          type="button"
                          onClick={() => onOpenCandidate(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--j-azul)',
                            font: '700 10px var(--j-mono)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          VER CONTA →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ font: '500 10px var(--j-mono)', color: 'var(--j-texto-suave)', margin: 0, borderTop: '1px solid #d8dfd5', paddingTop: '10px' }}>
          * Registros reais da base eleitoral. A idade informada corresponde à idade calculada na data de votação do pleito.
        </p>
      </div>
    </div>
  );
}

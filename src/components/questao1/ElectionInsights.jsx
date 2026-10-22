import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, DollarSign, Award, AlertCircle } from 'lucide-react';

export default function ElectionInsights({ insights, ano, cargo, uf, municipioNome }) {
  const local = municipioNome ? `${municipioNome}/${uf}` : uf ? `Estado de ${uf}` : '6 UFs auditadas';

  if (!insights || insights.length === 0) {
    return (
      <div style={{ background: '#fbf7ee', border: '1.5px dashed #cbd5e0', padding: '1.25rem', borderRadius: '4px', textAlign: 'center', margin: '1.5rem 0' }}>
        <AlertCircle size={24} color="#718096" style={{ margin: '0 auto 0.5rem' }} />
        <h4 style={{ margin: '0 0 0.25rem', color: '#2d3748' }}>Dados insuficientes para descobertas dinâmicas</h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>
          Não há registros suficientes com despesas e votos válidos no recorte de {cargo} ({ano} · {local}) para computar achados estatísticos robustos.
        </p>
      </div>
    );
  }

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'eleito_mais_economico':
        return <Award size={16} color="#176b50" />;
      case 'maior_gasto_nao_eleito':
        return <DollarSign size={16} color="#c84d38" />;
      case 'razao_medianas':
        return <Sparkles size={16} color="#edbf42" />;
      case 'variacao_temporal':
        return <TrendingUp size={16} color="#174a8b" />;
      default:
        return <Sparkles size={16} color="#174a8b" />;
    }
  };

  return (
    <div style={{ margin: '1.75rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e0', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="#174a8b" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Cinzel, serif', color: '#1a202c', letterSpacing: '0.04em' }}>
            O QUE OS NÚMEROS REVELAM?
          </h3>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>
          RECORTE: {cargo} · {ano} · {local}
        </span>
      </div>

      <div className="q1-insights-grid">
        {insights.map((item, idx) => (
          <motion.div
            key={idx}
            className="q1-insight-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="q1-insight-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {getIcon(item.tipo)}
                  {item.titulo}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#a0aec0', fontWeight: 700 }}>0{idx + 1}</span>
              </div>
              <div className="q1-insight-value">{item.destaque}</div>
              <div className="q1-insight-cand">{item.candidato}</div>
              <p className="q1-insight-detail">{item.detalhe}</p>
            </div>
            <div>
              <div className="q1-insight-criteria">
                <strong>Critério:</strong> {item.criterio}
              </div>
              {item.limitacao && (
                <div style={{ fontSize: '0.68rem', color: '#a0aec0', marginTop: '0.2rem' }}>
                  * {item.limitacao}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

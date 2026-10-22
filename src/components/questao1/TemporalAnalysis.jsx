import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { History, Map, TrendingUp, DollarSign, Award, Users } from 'lucide-react';

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

const COLORS = ['#174a8b', '#c84d38', '#edbf42', '#176b50', '#68718a', '#bb7847'];

export default function TemporalAnalysis({ serieTemporal, porUf, cargo, ano }) {
  const anosCargo = cargo === 'VEREADOR' ? '2020 e 2024' : '2018 e 2022';

  return (
    <section style={{ margin: '2rem 0' }}>
      <div className="q1-section-header">
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#176b50', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            COMPARAÇÕES TEMPORAIS E TERRITORIAIS
          </span>
          <h2>A EVOLUÇÃO DO CUSTO POR MANDATO</h2>
          <p>
            Compare pleitos equivalentes para o cargo de <strong>{cargo}</strong> ({anosCargo}). Os valores refletem despesas nominais declaradas e a cobertura de 6 estados auditados (CE, MA, MS, RJ, RN e RS).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Painel 1: Série Temporal do Cargo */}
        <div style={{ background: '#fff', border: '1.5px solid #2d3748', borderRadius: '4px', padding: '1.25rem', boxShadow: '3px 3px 0 rgba(45,55,72,0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#174a8b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={16} /> EVOLUÇÃO TEMPORAL ({anosCargo})
            </span>
            <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 700 }}>VALORES NOMINAIS</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieTemporal} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#2d3748', fontWeight: 700 }} />
                <YAxis
                  tickFormatter={(val) => val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}k` : String(val)}
                  width={50}
                  tick={{ fontSize: 10, fill: '#4a5568' }}
                />
                <Tooltip
                  formatter={(val, name) => [
                    money(val),
                    name === 'gasto_por_cadeira' ? 'Gasto por Cadeira' : 'Mediana Eleitos'
                  ]}
                  labelFormatter={(l) => `Eleição ${l} (${cargo})`}
                />
                <Bar dataKey="gasto_por_cadeira" name="gasto_por_cadeira" fill="#174a8b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mediana_eleitos" name="mediana_eleitos" fill="#edbf42" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#718096', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #edf2f7', paddingTop: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#174a8b', display: 'inline-block' }} /> Gasto Médio por Cadeira
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#edbf42', display: 'inline-block' }} /> Mediana das Candidaturas Eleitas
            </span>
          </div>
        </div>

        {/* Painel 2: Disparidade Territorial por UF */}
        <div style={{ background: '#fff', border: '1.5px solid #2d3748', borderRadius: '4px', padding: '1.25rem', boxShadow: '3px 3px 0 rgba(45,55,72,0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#176b50', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Map size={16} /> CUSTO POR CADEIRA POR ESTADO ({ano})
            </span>
            <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 700 }}>6 ESTADOS AUDITADOS</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {porUf && porUf.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porUf} layout="vertical" margin={{ top: 10, right: 25, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}k` : String(val)}
                    tick={{ fontSize: 10, fill: '#4a5568' }}
                  />
                  <YAxis dataKey="uf" type="category" width={30} tick={{ fontSize: 11, fontWeight: 700, fill: '#1a202c' }} />
                  <Tooltip
                    formatter={(val) => [money(val), 'Gasto por Cadeira']}
                    labelFormatter={(l) => `Estado: ${l}`}
                  />
                  <Bar dataKey="gasto_por_cadeira" radius={[0, 4, 4, 0]}>
                    {porUf.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#718096', fontSize: '0.8rem' }}>
                Dados por estado indisponíveis para o recorte selecionado.
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.5rem', fontSize: '0.73rem', color: '#718096', fontStyle: 'italic', borderTop: '1px solid #edf2f7', paddingTop: '0.5rem' }}>
            * Rio de Janeiro apresenta o maior custo agregado por cadeira tanto em eleições municipais quanto gerais, devido à magnitude orçamentária dos grandes centros urbanos.
          </div>
        </div>
      </div>
    </section>
  );
}

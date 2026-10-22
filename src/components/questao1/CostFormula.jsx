import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Landmark, Divide, HelpCircle, Check, ArrowRight } from 'lucide-react';

const money = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fNum = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

export default function CostFormula({ totalDespesas, eleitos, gastoPorCadeira, totalCandidaturas, candidaturasComGasto }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: 'Passo 1 · Levantamento das Despesas',
      text: 'Somamos todas as despesas nominais declaradas à Justiça Eleitoral por todas as candidaturas que disputaram o recorte, inclusive as que não se elegeram.'
    },
    {
      title: 'Passo 2 · Contagem das Cadeiras Conquistadas',
      text: 'Identificamos quantas candidaturas obtiveram êxito eleitoral (eleitos por quociente partidário ou por média). Suplentes e não eleitos não entram no denominador.'
    },
    {
      title: 'Passo 3 · Divisão Agregada',
      text: 'Dividimos o montante total declarado pelo número de mandatos. Isso revela o esforço financeiro coletivo por cadeira, e não o gasto de cada pessoa eleita.'
    }
  ];

  return (
    <div className="q1-formula-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#174a8b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          COMO CALCULAMOS O CUSTO POR CADEIRA
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1px solid #174a8b',
                background: activeStep === idx ? '#174a8b' : '#fff',
                color: activeStep === idx ? '#fff' : '#174a8b',
                fontSize: '0.65rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={steps[idx].title}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Representação Visual da Divisão */}
      <motion.div
        layout
        style={{
          background: '#fff',
          border: '1.5px solid #cbd5e0',
          borderRadius: '4px',
          padding: '0.85rem 1rem',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.06)'
        }}
      >
        {/* Numerador: Pilha de Despesas */}
        <motion.div
          animate={{ scale: activeStep === 0 ? 1.02 : 1, borderColor: activeStep === 0 ? '#174a8b' : '#cbd5e0' }}
          className="q1-formula-row"
        >
          <div className="q1-formula-item">
            <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#174a8b" style={{ position: 'absolute', top: 0, left: 0 }} />
              <FileText size={18} color="#c84d38" style={{ position: 'absolute', top: 2, left: 3, opacity: 0.7 }} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>
                Soma das Despesas Declaradas
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#174a8b' }}>
                {money(totalDespesas)}
              </strong>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#718096', fontWeight: 600 }}>
            {fNum(candidaturasComGasto || totalCandidaturas)} candidaturas c/ gasto
          </span>
        </motion.div>

        {/* Linha da Divisão */}
        <div className="q1-formula-divider">
          <span>÷ DIVIDIDO POR</span>
        </div>

        {/* Denominador: Cadeiras / Eleitos */}
        <motion.div
          animate={{ scale: activeStep === 1 ? 1.02 : 1, borderColor: activeStep === 1 ? '#176b50' : '#cbd5e0' }}
          className="q1-formula-row"
        >
          <div className="q1-formula-item">
            <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6f4ea', borderRadius: '4px' }}>
              <Landmark size={16} color="#176b50" />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', fontWeight: 700 }}>
                Cadeiras Conquistadas (Eleitos)
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#176b50' }}>
                {fNum(eleitos)} mandatos
              </strong>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#718096', fontWeight: 600 }}>
            Resultado definido (QP + Média)
          </span>
        </motion.div>

        {/* Resultado: Custo Agregado por Cadeira */}
        <motion.div
          animate={{ scale: activeStep === 2 ? 1.03 : 1 }}
          style={{
            borderTop: '2px solid #174a8b',
            paddingTop: '0.6rem',
            marginTop: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c84d38' }}>=</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a202c', textTransform: 'uppercase' }}>
              Gasto Agregado por Cadeira:
            </span>
          </div>
          <strong style={{ fontSize: '1.25rem', color: '#c84d38', fontWeight: 900, fontFamily: 'Cinzel, serif' }}>
            {money(gastoPorCadeira)}
          </strong>
        </motion.div>
      </motion.div>

      {/* Explicação Textual do Passo */}
      <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#2d3748', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
        <strong>{steps[activeStep].title}:</strong> {steps[activeStep].text}
      </div>

      {/* Alerta Metodológico Obrigatório */}
      <div className="q1-methodology-note">
        <strong>Explicação essencial:</strong> Dividimos todas as despesas declaradas no recorte pela quantidade de candidaturas eleitas. O resultado representa uma média agregada de gasto por cadeira, não o gasto individual de cada eleito.
      </div>
    </div>
  );
}

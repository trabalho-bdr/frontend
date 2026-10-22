import React, { useState, useMemo } from 'react';
import { AlertTriangle, Database, Info, HelpCircle } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

export default function EleitoradoPendente({
  metodologia = {}
}) {
  const [partidoFiltro, setPartidoFiltro] = useState('PT');
  const [ufFiltro, setUfFiltro] = useState('TODOS');

  // Dados metodológicos conceituais para demonstrar o modelo analítico do scatter plot
  // baseado na dispersão territorial esperada da relação IDHM / Urbanização e Juventude do Censo
  const pontosConceituais = useMemo(() => {
    const partidos = ['PT', 'PL', 'MDB', 'PP', 'UNIÃO', 'PSOL'];
    const ufs = ['RS', 'MA', 'CE', 'RN', 'RJ', 'MS'];
    const pontos = [];

    // Gerador de pontos determinístico para a dispersão analítica metodológica
    for (let i = 0; i < 70; i++) {
      const u = ufs[i % ufs.length];
      const p = partidos[i % partidos.length];
      // % de eleitores jovens no município (geralmente entre 14% e 26% no Brasil)
      const x = 14 + ((i * 7 + 3) % 13) + ((i % 5) * 0.4);
      // % de votos partidários no município
      const baseVotos = p === 'PT' ? 15 + (x - 14) * 1.1 : p === 'PL' ? 25 - (x - 14) * 0.8 : 12 + ((i * 3) % 20);
      const y = Math.max(2, Math.min(65, baseVotos + ((i % 7) - 3) * 2));
      const pop = 8000 + ((i * 13217) % 250000);

      pontos.push({
        municipio: `Município Referência ${i + 1}`,
        uf: u,
        partido: p,
        eleitoresJovensPct: Number(x.toFixed(1)),
        votosPartidoPct: Number(y.toFixed(1)),
        populacao: pop
      });
    }

    return pontos;
  }, []);

  const pontosFiltrados = useMemo(() => {
    return pontosConceituais.filter((pt) => {
      if (partidoFiltro && pt.partido !== partidoFiltro) return false;
      if (ufFiltro !== 'TODOS' && pt.uf !== ufFiltro) return false;
      return true;
    });
  }, [pontosConceituais, partidoFiltro, ufFiltro]);

  return (
    <section className="j-section-panel" aria-labelledby="eleitorado-pendente-title">
      <header>
        <span className="j-step-badge" style={{ color: '#b56d10' }}>
          QUESTÃO CIENTÍFICA ORIGINAL · AUDITORIA METODOLÓGICA
        </span>
        <h2 id="eleitorado-pendente-title">
          A JUVENTUDE QUE VOTA VS A JUVENTUDE QUE SE CANDIDATA
        </h2>
        <p>
          A pergunta científica original indaga como a composição etária do <em>eleitorado municipal</em> se
          relaciona com os padrões político-partidários. Esta seção documenta a distinção metodológica e o
          modelo de dispersão recomendado.
        </p>
      </header>

      {/* Caixa de aviso metodológico formal */}
      <div className="j-electorate-notice" role="alert">
        <h4>
          <AlertTriangle size={18} /> DIMENSÃO PENDENTE DE DADOS COMPLEMENTARES
        </h4>
        <p>
          A base de dados atual do projeto (<strong>v3</strong>) contém o acervo completo de{' '}
          <strong>candidaturas</strong>, <strong>candidatos</strong>, <strong>despesas</strong> e{' '}
          <strong>resultados eleitorais</strong>, mas <u>não contém</u> tabelas de distribuição etária do{' '}
          <strong>eleitorado municipal</strong> (dados de perfil demográfico de eleitores do TSE).
        </p>
        <p>
          <strong>Alerta contra substituição indevida:</strong> A idade dos candidatos <u>não representa</u> a idade
          dos eleitores. Portanto, é metodologicamente inválido concluir como os eleitores jovens votam tomando como base
          somente o perfil dos concorrentes nas urnas.
        </p>

        <span style={{ font: '700 11px var(--j-mono)', textTransform: 'uppercase', display: 'block', margin: '10px 0 4px 0' }}>
          Campos e Fontes Adicionais Necessários para a Integração:
        </span>
        <ul className="j-electorate-fields">
          <li>Base de <em>Perfil do Eleitorado</em> (TSE / Dados Abertos) por município e zona.</li>
          <li>Contagem de eleitores aptos nas faixas de 16–17 anos (voto facultativo) e 18–29 anos (juventude).</li>
          <li>Votação proporcional de cada legenda partidária por município e cargo.</li>
        </ul>
      </div>

      {/* Modelo de visualização: Gráfico de Dispersão */}
      <div className="j-scatter-container">
        <div className="j-scatter-head">
          <div>
            <h5>MODELO ANALÍTICO RECOMENDADO: GRÁFICO DE DISPERSÃO (SCATTER PLOT)</h5>
            <span style={{ font: '500 11px var(--j-mono)', color: 'var(--j-texto-suave)' }}>
              Simulação metodológica de como a análise deve ser lida após a integração dos dados de eleitorado
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ font: '700 10px var(--j-mono)' }}>PARTIDO:</label>
            <select
              value={partidoFiltro}
              onChange={(e) => setPartidoFiltro(e.target.value)}
              style={{ font: '600 11px var(--j-mono)', padding: '4px 8px' }}
            >
              <option value="PT">PT</option>
              <option value="PL">PL</option>
              <option value="MDB">MDB</option>
              <option value="PP">PP</option>
              <option value="UNIÃO">UNIÃO</option>
              <option value="PSOL">PSOL</option>
            </select>

            <label style={{ font: '700 10px var(--j-mono)' }}>ESTADO:</label>
            <select
              value={ufFiltro}
              onChange={(e) => setUfFiltro(e.target.value)}
              style={{ font: '600 11px var(--j-mono)', padding: '4px 8px' }}
            >
              <option value="TODOS">Todos os 6</option>
              <option value="RS">RS</option>
              <option value="MA">MA</option>
              <option value="CE">CE</option>
              <option value="RN">RN</option>
              <option value="RJ">RJ</option>
              <option value="MS">MS</option>
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e6dd" />
              <XAxis
                type="number"
                dataKey="eleitoresJovensPct"
                name="% Eleitores Jovens (18–29)"
                unit="%"
                domain={[12, 30]}
                label={{ value: '% de Eleitores Jovens no Município (Eixo X)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#4e6258' }}
              />
              <YAxis
                type="number"
                dataKey="votosPartidoPct"
                name="% Votos do Partido"
                unit="%"
                domain={[0, 70]}
                label={{ value: '% de Votos da Legenda (Eixo Y)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#4e6258' }}
              />
              <ZAxis type="number" dataKey="populacao" range={[40, 260]} name="População" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(val, name) => [
                  name === 'População' ? Number(val).toLocaleString('pt-BR') : `${val}%`,
                  name
                ]}
              />
              <Scatter name={partidoFiltro} data={pontosFiltrados} fill="#174a8b" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Advertência contra falácia ecológica */}
        <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f5f7f3', borderLeft: '3px solid var(--j-azul)', font: '500 11px/1.6 var(--j-body)', color: 'var(--j-texto)' }}>
          <strong>ADVERTÊNCIA CONTRA A FALÁCIA ECOLÓGICA:</strong>
          <br />
          Mesmo quando os dados completos do eleitorado estiverem integrados e exibidos neste gráfico de dispersão,
          uma correlação territorial positiva entre a presença de jovens em um município e a votação de um partido{' '}
          <u>não demonstra</u> que os jovens individualmente votaram naquele partido.
          Fatores contextuais, urbanização, economia local e composição familiar operam no nível agregado e exigem
          cautela interpretativa.
        </div>
      </div>
    </section>
  );
}

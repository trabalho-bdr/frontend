import { lazy, Suspense, useState } from 'react';
import { themes, fmt } from '../data/exhibition.js';
import { Explore, useEvidence } from '../components/exhibition/Story.jsx';
import './home-editorial.css';
const TV = lazy(() => import('../components/Televisao3D.jsx'));

export default function HomeEditorial({ onGo, onResearch, data, context }) {
  const [channel, setChannel] = useState(0);
  const prop = useEvidence('proporcional');
  const wealth = useEvidence('patrimonio', { ano: 2024, cargo: 'VEREADOR' });
  const pair = prop.data?.rows || [],
    quartiles = wealth.data?.rows || [];
  const hasPair = pair.length === 2;
  const channels = [
    {
      name: 'O nome e a sigla',
      value: 'Votos de legenda',
      detail: 'Consulte a comparação entre eleições equivalentes.',
      to: 5,
    },
    {
      name: 'O patrimônio e a eleição',
      value: quartiles.length
        ? fmt(quartiles[0].taxa) + '% → ' + fmt(quartiles.at(-1).taxa) + '%'
        : 'Dados indisponíveis',
      detail: 'Quartis de patrimônio · vereador 2024 · seis UFs',
      to: 2,
    },
    {
      name: 'Mais votos, outro resultado',
      value: pair.length ? pair.map((r) => fmt(r.votos, 0)).join(' / ') : 'Dados indisponíveis',
      detail: pair.map((r) => r.nome).join(' e '),
      to: 1,
    },
  ];
  const resultLabel = (value) =>
    ({
      SUPLENTE: 'Suplente',
      'ELEITO POR QP': 'Eleito por quociente partidário',
      'ELEITO POR MÉDIA': 'Eleito por média',
      ELEITO: 'Eleito',
    })[String(value).toUpperCase()] || value;
  return (
    <div className="br-home br-scope expo-home home-revised">
      <header className="home-intro">
        <div className="home-intro-badge">
          <img src="/logo.jpg" alt="Logotipo Arquivo da Democracia" className="home-intro-logo" />
          <div>
            <p className="expo-kicker">DADOS PÚBLICOS · DESCOBERTAS ELEITORAIS</p>
            <h1>
              Uma pergunta.
              <br />
              <em>Um novo olhar sobre as eleições.</em>
            </h1>
          </div>
        </div>
        <p>Explore histórias, compare candidaturas e entenda o que os números revelam.</p>
        <p className="home-coverage-inline">
          Cobertura parcial: CE, MA, MS, RJ, RN e RS.{' '}
          <button onClick={() => onGo('metodologia')}>Entenda os limites ↗</button>
        </p>
      </header>
      <section className="home-discovery" aria-labelledby="home-discovery-title">
        <div className="home-discovery-copy">
          <span className="expo-kicker">DESCOBERTA EM DESTAQUE / VOTOS E REPRESENTAÇÃO</span>
          <h2 id="home-discovery-title">
            Mais votos.
            <br />
            <em>Uma cadeira a menos?</em>
          </h2>
          <p>
            Na eleição proporcional, ter mais votos que outro candidato não garante uma vaga. Os
            votos do partido ou da federação também entram na conta.
          </p>
          <button
            className="home-primary-action"
            onClick={() => onGo('plenario', 'proporcional', 'voto')}
          >
            Entender a distribuição das vagas <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="home-discovery-evidence" aria-live="polite">
          {hasPair ? (
            <>
              <p className="home-evidence-label">DUAS CANDIDATURAS DA MESMA DISPUTA</p>
              <div className="home-vote-pair">
                {pair.map((row, index) => (
                  <article key={row.id || index}>
                    <h3>{row.nome}</h3>
                    <strong>
                      {fmt(row.votos, 0)} <small>votos</small>
                    </strong>
                    <span
                      className={`home-result ${String(row.resultado).startsWith('ELEITO') ? 'home-result-elected' : ''}`}
                    >
                      {resultLabel(row.resultado)}
                    </span>
                  </article>
                ))}
              </div>
              <p className="home-evidence-source">
                {[pair[0].municipio, pair[0].uf, pair[0].cargo, pair[0].ano]
                  .filter(Boolean)
                  .join(' · ')}
                <br />
                Fonte: Tribunal Superior Eleitoral · consulta ao acervo.
              </p>
              <p className="home-evidence-note">
                Exemplo selecionado pela maior diferença de votos observada. Confira as regras e o
                contexto na investigação.
              </p>
            </>
          ) : (
            <div className="home-evidence-state">
              <strong>O resultado vai além do voto individual.</strong>
              <p role="status">
                {prop.loading
                  ? 'Consultando duas candidaturas da mesma disputa…'
                  : 'O exemplo não está disponível agora. A investigação explica como as vagas são distribuídas.'}
              </p>
              {!prop.loading && <button onClick={prop.retry}>Tentar carregar o exemplo</button>}
            </div>
          )}
        </div>
      </section>

      <section className="expo-theme-guide" aria-labelledby="home-themes-title">
        <span className="expo-kicker">EXPLORE POR TEMA</span>
        <h2 id="home-themes-title">Qual assunto você quer investigar?</h2>
        <p className="home-section-description">
          Escolha um tema para conhecer as perguntas e consultar suas evidências.
        </p>
        <div className="expo-theme-grid">
          {themes.map((t, i) => (
            <button key={t.id} onClick={() => onGo(t.page, '', t.id)}>
              <span>0{i + 1}</span>
              <h3>{t.title}</h3>
              <p>{t.description}</p>
              <b>
                Explorar o tema <span aria-hidden="true">→</span>
              </b>
            </button>
          ))}
        </div>
      </section>
      <section className="research-home-entry">
        <span className="expo-kicker">A PESQUISA POR TRÁS DO ARQUIVO</span>
        <h2>Dez perguntas. Evidências para conferir.</h2>
        <p>Conheça as respostas disponíveis, os recortes e as lacunas de cada investigação.</p>
        <button onClick={() => onGo('perguntas')}>Abrir as dez perguntas →</button>
      </section>
      <section className="home-data-tools" aria-label="Consultar o acervo">
        <div>
          <span className="expo-kicker">CONSULTE OS DADOS</span>
          <h2>Pessoas, territórios e partidos.</h2>
          <p>
            Entre pelo nome de uma pessoa, pelo território ou pela legenda e acompanhe as conexões
            no acervo.
          </p>
          <div className="home-catalog-actions">
            <button onClick={() => onGo('candidatos')}>Pesquisar pessoas →</button>
            <button onClick={() => onGo('territorios')}>Consultar estados e municípios →</button>
            <button onClick={() => onGo('legendas')}>Explorar partidos →</button>
          </div>
        </div>
        {context}
      </section>
      <Explore title="Ver reportagens na TV Eleitoral">
        <div className="expo-tv">
          <Suspense fallback={<p>Carregando a TV Eleitoral…</p>}>
            <TV
              channel={channels[channel]}
              onNext={() => setChannel((n) => (n + 1) % channels.length)}
            />
          </Suspense>
          <h3>{channels[channel].name}</h3>
          <p>{channels[channel].detail}</p>
          <button onClick={() => setChannel((n) => (n + 1) % channels.length)}>
            Próxima reportagem
          </button>
          <button
            onClick={() =>
              channel === 2
                ? onGo('plenario', 'proporcional', 'voto')
                : onResearch(channels[channel].to)
            }
          >
            Conferir os dados ↗
          </button>
        </div>
      </Explore>
      <aside className="expo-home-coverage" aria-label="Cobertura e limites do acervo">
        <strong>Sobre o acervo</strong>
        <p>
          {data.coverage != null
            ? `${fmt(data.coverage, 0)} municípios de seis estados no acervo.`
            : 'O acervo reúne municípios de seis estados.'}{' '}
          A disponibilidade varia por ano, cargo e fonte; cada descoberta informa seu próprio
          recorte.
        </p>
        <button onClick={() => onGo('metodologia')}>
          Consultar fontes, critérios e limites ↗
        </button>
      </aside>
    </div>
  );
}

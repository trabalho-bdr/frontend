import ThemeSection from './pages/ThemeSection.jsx';
import { parseRoute, moneyDestination } from './data/routes.js';
import AcervoNav from './catalog/AcervoNav.jsx';
import './catalog/acervo.css';
import {
  isProportionalInvestigation,
  normalizeInvestigationScope,
  investigationFields,
} from './data/filterScope.js';
import { candidateContext } from './catalog/logic.js';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { readContext, normalizeContext } from './data/investigationContext.js';
import InvestigationContext from './components/InvestigationContext.jsx';
import { themes, questionDestinations } from './data/exhibition.js';
import { Explore } from './components/exhibition/Story.jsx';
import PaineisBDR from './components/PaineisBDR.jsx';
import gsap from 'gsap';
import { Menu, ChevronDown } from 'lucide-react';
import HomeEditorial from './pages/HomeEditorial.jsx';
import useMotionPreference from './hooks/useMotionPreference.js';
import { getOverview, request } from './data/client.js';
const Atlas = lazy(() => import('./pages/Atlas.jsx'));
const Descobertas = lazy(() => import('./pages/Descobertas.jsx'));
const ProportionalStory = lazy(() => import('./components/exhibition/ProportionalStory.jsx'));
const PeopleStory = lazy(() => import('./components/exhibition/PeopleStory.jsx'));
const PartyStory = lazy(() => import('./components/exhibition/PartyStory.jsx'));
const LegendaInvestigation = lazy(() => import('./components/exhibition/LegendaInvestigation.jsx'));
const ExhibitionMethod = lazy(() => import('./pages/ExhibitionMethod.jsx'));
const MoneySection = lazy(() => import('./pages/MoneySection.jsx'));
const ResearchPage = lazy(() => import('./pages/ResearchPage.jsx'));
const PartyCatalog = lazy(() => import('./pages/PartyCatalog.jsx'));
const CandidateCatalog = lazy(() => import('./pages/CandidateCatalog.jsx'));
const PersonProfile = lazy(() => import('./pages/PersonProfile.jsx'));
const TerritoryCatalog = lazy(() => import('./pages/TerritoryCatalog.jsx'));
const MuralCampanhas = lazy(() => import('./pages/MuralCampanhas.jsx'));
const PrestacaoDeContas = lazy(() => import('./pages/PrestacaoDeContas.jsx'));
function initialRoute() {
  return parseRoute(location.hash);
}
function Footer() {
  return (
    <footer>
      <div className="footer-brand-wrap">
        <img src="/logo.jpg" alt="Logotipo Arquivo da Democracia" className="footer-logo-img" />
        <div>
          <strong>ARQUIVO DA DEMOCRACIA</strong>
          <span>ACERVO INDEPENDENTE · SEM VÍNCULO COM A JUSTIÇA ELEITORAL</span>
        </div>
      </div>
      <p>
        Dados eleitorais de seis estados, consultados no acervo. Gráficos, filtros e definições
        devem ser acompanhados de documentação metodológica. Imagens e interfaces são interpretações
        autorais; nunca simulam canais oficiais.
      </p>
    </footer>
  );
}
export default function App() {
  const [route, setRoute] = useState(initialRoute),
    { page, story } = route;
  const [mode, setMode] = useState('live'),
    [counts, setCounts] = useState({}),
    [mobileMenu, setMobileMenu] = useState(false),
    [campaignCandidate, setCampaignCandidate] = useState(null),
    [archiveCandidate, setArchiveCandidate] = useState(null);
  const [campaignLookupError, setCampaignLookupError] = useState(false),
    [campaignLookupRevision, setCampaignLookupRevision] = useState(0);
  const mainRef = useRef();
  const reducedMotion = useMotionPreference();
  const currentTheme =
    themes.find((t) => t.id === route.theme) ||
    themes.find((t) => t.places.some(([id]) => id === page));
  const routeReader = useRef(parseRoute);
  routeReader.current = parseRoute;
  useEffect(() => {
    const sync = () => setRoute(routeReader.current(location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [parseRoute]);
  useEffect(() => {
    if (page !== 'inicio') return;
    let active = true;
    getOverview().then((data) => {
      if (!active) return;
      setCounts(data);
      if (data.mode === 'live') setMode('live');
    });
    return () => {
      active = false;
    };
  }, [page]);
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
    const a =
      mainRef.current && !reducedMotion
        ? gsap.fromTo(
            mainRef.current,
            {
              opacity: 0.5,
              y: 8,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.25,
            },
          )
        : null;
    return () => a?.kill();
  }, [page, story, reducedMotion]);
  const go = (page, story = '', theme = '', context = {}) => {
    ({ page, story, theme } = moneyDestination(page, story, theme));
    const raw = {
      ...readContext(),
      ...Object.fromEntries(
        Object.entries(context).map(([key, value]) => [key.replace(/^q1_/, ''), value]),
      ),
    };
    raw.etapa =
      ['arquivo', 'candidatos'].includes(page) && story === 'perfil'
        ? 'perfil'
        : ['candidatos', 'legendas', 'perguntas', 'investigacoes'].includes(page) ||
            (page === 'arquivo' && ['escolaridade', 'juventude', 'trajetorias'].includes(story)) ||
            (page === 'campanhas' && story !== 'candidatura') ||
            page === 'atlas'
          ? 'catalogo'
          : page === 'territorios'
            ? 'territorio'
            : 'investigacao';
    const normalized = normalizeContext(
      isProportionalInvestigation(page, story) ? normalizeInvestigationScope(raw) : raw,
    );
    if (raw.cargo && raw.cargo !== normalized.cargo)
      normalized.aviso = `Esta investigação compara cargos proporcionais. O recorte foi ajustado para ${normalized.cargo.toLowerCase()} em ${normalized.ano}.`;
    else if (raw.ano && String(raw.ano) !== String(normalized.ano))
      normalized.aviso = `A candidatura de origem é de ${raw.ano}. Esta investigação usa ${normalized.ano}, ano compatível com ${normalized.cargo}.`;
    else if (raw.municipioId && !normalized.municipioId)
      normalized.aviso =
        'Nesta investigação, a disputa é estadual. O município não delimita cadeiras de deputados.';
    else if (context.aviso) normalized.aviso = context.aviso;
    else delete normalized.aviso;
    context = Object.fromEntries(
      Object.entries(normalized).map(([key, value]) => ['q1_' + key, value]),
    );
    const next = {
      page,
      story,
      theme,
      context,
    };
    setRoute(next);
    const params = new URLSearchParams({
      page,
    });
    if (story) params.set('story', story);
    if (theme) params.set('theme', theme);
    for (const [key, value] of Object.entries(context))
      if (value != null && value !== '') params.set(key, String(value));
    location.hash = params.toString();
    setMobileMenu(false);
  };
  const openPerson = (candidate) => go('candidatos', 'perfil', '', candidateContext(candidate));
  const goResearch = (q) => {
    const [page, story] = questionDestinations[q] || questionDestinations[1];
    go(page, story);
  };
  const openCampaign = (c) => {
    setCampaignCandidate(c);
    go('campanhas', 'candidatura', '', candidateContext(c));
  };
  useEffect(() => {
    const id = route.context?.q1_candidaturaId;
    if (page !== 'campanhas' || story !== 'candidatura' || !id || campaignCandidate?.id === id)
      return;
    const ac = new AbortController();
    setCampaignCandidate(null);
    setCampaignLookupError(false);
    request('/catalogo/candidaturas/' + encodeURIComponent(id), {
      signal: ac.signal,
      timeout: 45000,
    })
      .then((data) => {
        if (!ac.signal.aborted) setCampaignCandidate(data.selecionada);
      })
      .catch(() => {
        if (!ac.signal.aborted) setCampaignLookupError(true);
      });
    return () => ac.abort();
  }, [page, story, route.context?.q1_candidaturaId, campaignLookupRevision]);
  return (
    <div className="site">
      <a
        className="expo-skip"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="site-header expo-site-header">
        <button
          className="brand"
          onClick={() => go('inicio')}
          aria-label="Arquivo da Democracia, início"
        >
          <img src="/logo.jpg" alt="Logotipo Arquivo da Democracia" className="brand-emblem" />
          <div>
            <strong>
              ARQUIVO <em>DA</em> DEMOCRACIA
            </strong>
            <small>PERGUNTAS · DESCOBERTAS · EVIDÊNCIAS</small>
          </div>
        </button>
        <nav
          id="main-navigation"
          className={mobileMenu ? 'mobile-open' : ''}
          aria-label="Navegação principal"
        >
          <details
            className="acervo-menu"
            onClick={(event) => {
              if (event.target.closest('button')) event.currentTarget.open = false;
            }}
          >
            <summary>
              <span>Consultar o acervo</span>
              <ChevronDown size={16} className="acervo-menu-chevron" aria-hidden="true" />
            </summary>
            <div className="acervo-menu-options">
              {[
                ['candidatos', 'Pessoas e candidatos'],
                ['territorios', 'Estados e municípios'],
                ['legendas', 'Partidos e suas candidaturas'],
                ['perguntas', 'Perguntas e método da pesquisa'],
              ].map(([target, label]) => (
                <button
                  key={target}
                  onClick={() => go(target)}
                  aria-current={page === target ? 'page' : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
          <div className="home-nav-group" role="group" aria-label="Explorar por tema">
            <span className="home-nav-label">EXPLORAR POR TEMA</span>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.page, '', t.id)}
                className={currentTheme?.id === t.id ? 'active' : ''}
                aria-current={currentTheme?.id === t.id ? 'page' : undefined}
              >
                {t.title}
              </button>
            ))}
          </div>
        </nav>
        <button
          className="menu-toggle"
          onClick={() => setMobileMenu((v) => !v)}
          aria-label={mobileMenu ? 'Fechar menu' : 'Abrir menu'}
          aria-controls="main-navigation"
          aria-expanded={mobileMenu}
        >
          <Menu size={21} />
        </button>
      </header>
      <div className="utility-ribbon">
        <span>EXPOSIÇÃO DE DESCOBERTAS ELEITORAIS</span>
        <button onClick={() => go('metodologia')}>FONTES E MÉTODO ↗</button>
      </div>

      <main id="main-content" tabIndex={-1} ref={mainRef} className="content-shell">
        {![
          'inicio',
          'candidatos',
          'territorios',
          'legendas',
          'perguntas',
          'adesivos',
          'metodologia',
          'investigacoes',
        ].includes(page) &&
          !(
            page === 'arquivo' &&
            ['perfil', 'fichario', 'trajetorias', 'juventude', 'escolaridade', ''].includes(
              story || '',
            )
          ) &&
          !['atlas', 'partidos', 'plenario'].includes(page) &&
          !(page === 'campanhas') && (
            <InvestigationContext
              fields={investigationFields(page, story)}
              onChange={(context) => go(page, story, route.theme, context)}
            />
          )}{' '}
        {route.context?.q1_aviso && (
          <p className="catalog-transition" role="status">
            {route.context.q1_aviso}
          </p>
        )}
        {['candidatos', 'territorios', 'legendas'].includes(page) && (
          <AcervoNav active={page} onGo={go} />
        )}
        <Suspense
          key={JSON.stringify(route.context)}
          fallback={
            <p className="expo-loading" role="status">
              Abrindo a próxima história…
            </p>
          }
        >
          {page === 'candidatos' && story !== 'perfil' && (
            <CandidateCatalog onGo={go} onOpenPerson={openPerson} />
          )}
          {page === 'perguntas' && <ResearchPage question={story} onGo={go} />}
          {page === 'legendas' && <PartyCatalog onGo={go} />}
          {page === 'territorios' && <TerritoryCatalog onGo={go} />}
          {['arquivo', 'candidatos'].includes(page) && story === 'perfil' && (
            <PersonProfile
              personId={route.context?.q1_pessoaId}
              candidateId={route.context?.q1_candidaturaId}
              onGo={go}
              onOpenCampaign={openCampaign}
            />
          )}
          {page === 'inicio' && (
            <HomeEditorial
              onGo={go}
              onResearch={goResearch}
              data={counts}
              mode={mode}
              context={
                <InvestigationContext
                  onChange={(context) => go(page, story, route.theme, context)}
                />
              }
            />
          )}
          {page === 'metodologia' && (
            <ExhibitionMethod
              onResearch={goResearch}
              onLegacy={(q) => go('investigacoes', String(q))}
            />
          )}
          {page === 'investigacoes' && <ResearchPage question={story} onGo={go} />}
          {page === 'plenario' && (
            <ThemeSection topic="voto" active="proporcional" onGo={go}>
              <InvestigationContext
                fields={investigationFields(page, story)}
                onChange={(context) => go(page, story, 'voto', context)}
              />
              <ProportionalStory onOpenCandidate={openCampaign} onGo={go} />
            </ThemeSection>
          )}
          {page === 'atlas' && (
            <ThemeSection
              topic="mapa"
              active={story === 'lideranca' ? 'lideranca' : 'territorio'}
              onGo={go}
            >
              <ResearchPage question={story === 'lideranca' ? 7 : 3} onGo={go} embedded />
              <Explore title="Atlas · explorar outros indicadores do território">
                <Atlas
                  mode={mode}
                  onResearch={goResearch}
                  onGo={go}
                  initialUf={route.context?.q1_uf || ''}
                  initialMunicipio={route.context?.q1_municipioId || ''}
                  initialMunicipioNome={route.context?.q1_municipioNome || ''}
                />
              </Explore>
              <div className="research-actions">
                <button onClick={() => go('descobertas', '', 'mapa')}>
                  Conferir rankings do acervo →
                </button>
              </div>
            </ThemeSection>
          )}
          {page === 'arquivo' && story === 'fichario' && (
            <PersonProfile
              personId={route.context?.q1_pessoaId}
              candidateId={route.context?.q1_candidaturaId}
              onGo={go}
              onOpenCampaign={openCampaign}
            />
          )}
          {page === 'arquivo' && !['perfil', 'fichario'].includes(story) && (
            <ThemeSection
              topic="pessoas"
              active={['escolaridade', 'juventude'].includes(story) ? story : 'trajetorias'}
              onGo={go}
            >
              {['escolaridade', 'juventude', 'trajetorias', ''].includes(story || '') ? (
                <ResearchPage
                  question={story === 'escolaridade' ? 4 : story === 'juventude' ? 6 : 10}
                  onGo={go}
                  embedded
                />
              ) : (
                <PeopleStory
                  story={story}
                  mode={mode}
                  onGo={go}
                  onStory={(next) => go('arquivo', next)}
                />
              )}
              {(!story || story === 'trajetorias') && (
                <Explore title="Consultar a trajetória de uma pessoa">
                  <p>
                    Encontre uma pessoa no acervo e consulte suas eleições em sequência no perfil,
                    com diferenças de partido, cargo e resultado.
                  </p>
                  <button className="catalog-back" onClick={() => go('candidatos')}>
                    Encontrar uma pessoa →
                  </button>
                </Explore>
              )}
            </ThemeSection>
          )}
          {page === 'partidos' && (
            <ThemeSection
              topic="voto"
              active={story === 'representacao' ? 'representacao' : 'legenda'}
              onGo={go}
            >
              {story === 'representacao' ? (
                <>
                  <InvestigationContext
                    fields={investigationFields(page, story)}
                    onChange={(context) => go(page, story, 'voto', context)}
                  />
                  <PartyStory onGo={go} />
                </>
              ) : (
                <>
                  <ResearchPage question={5} onGo={go} embedded />
                  <Explore title="Comparar as duas eleições mais recentes">
                    <LegendaInvestigation onGo={go} />
                  </Explore>
                </>
              )}
              <Explore title="Consultar candidaturas por partido">
                <MuralCampanhas
                  mode={mode}
                  onResearch={goResearch}
                  onOpenCandidate={openCampaign}
                  initialScope={{
                    ano: route.context?.q1_ano,
                    cargo: route.context?.q1_cargo,
                    uf: route.context?.q1_uf,
                    partido: route.context?.q1_partido,
                  }}
                />
                <Explore title="Ver os painéis BDR de legenda">
                  <PaineisBDR question={5} />
                </Explore>
              </Explore>
            </ThemeSection>
          )}
          {page === 'campanhas' && (
            <>
              {story !== 'candidatura' ? (
                <MoneySection
                  story={story}
                  onGo={go}
                  mode={mode}
                  onResearch={goResearch}
                  onOpenCandidate={openCampaign}
                  onOpenRecord={(candidate) => {
                    setArchiveCandidate(candidate);
                    openPerson(candidate);
                  }}
                />
              ) : (
                <>
                  <button
                    className="catalog-back"
                    onClick={() => go('campanhas', 'custo', 'dinheiro')}
                  >
                    ← Voltar a Dinheiro e poder
                  </button>
                  {route.context?.q1_candidaturaId &&
                  campaignCandidate?.id !== route.context.q1_candidaturaId ? (
                    <div className="catalog-state" role="status">
                      <p>
                        {campaignLookupError
                          ? 'Não foi possível abrir a candidatura selecionada.'
                          : 'Consultando a candidatura selecionada…'}
                      </p>
                      {campaignLookupError && (
                        <button onClick={() => setCampaignLookupRevision((n) => n + 1)}>
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  ) : (
                    <PrestacaoDeContas
                      key={route.context?.q1_candidaturaId || 'buscar-campanha'}
                      mode={mode}
                      onResearch={goResearch}
                      initialCandidate={route.context?.q1_candidaturaId ? campaignCandidate : null}
                    />
                  )}
                </>
              )}
            </>
          )}
          {page === 'descobertas' && <Descobertas mode={mode} onGo={go} />}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

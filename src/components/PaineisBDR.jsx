import { lazy, Suspense } from 'react';
import './paineis-bdr.css';
const Analise = lazy(() =>
  import('../../integrations/bdr/App.tsx').then((module) => ({ default: module.App })),
);
const panels = { 3: 'abstencao', 5: 'legenda', 7: 'legenda', 9: 'publicidade' };
export default function PaineisBDR({ question }) {
  const analysis = panels[question];
  if (!analysis) return null;
  return (
    <section className="bdr-native" aria-label="Dados da investiga??o">
      <Suspense fallback={<p role="status">Carregando os gr?ficos da investiga??o?</p>}>
        <Analise key={question} initialAnalise={analysis} />
      </Suspense>
    </section>
  );
}

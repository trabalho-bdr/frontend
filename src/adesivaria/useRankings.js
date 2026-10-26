import { useEffect, useMemo, useState } from 'react';
import { getAdesivaria } from '../data/client.js';
import { offlineData } from './model.js';

export default function useRankings(scope, pages, live, revision) {
  const key = JSON.stringify([scope, pages, revision]),
    ready = scope.abrangencia !== 'municipio' || !!scope.municipio;
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!live || !ready) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        getAdesivaria({ ...scope, ...pages }, { signal: controller.signal })
          .then((data) => {
            if (!controller.signal.aborted) setState({ key, data });
          })
          .catch(() => {
            if (!controller.signal.aborted) setState({ key, error: true });
          }),
      280,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, live, ready]);
  const offline = useMemo(
    () => (!live && ready ? offlineData(scope, pages) : null),
    [key, live, ready],
  );
  if (!ready) return { data: null, busy: false, error: false, waiting: true };
  if (!live) return { data: offline, busy: false, error: false };
  const current = state?.key === key ? state : null;
  return { data: current?.data || null, busy: !current, error: !!current?.error };
}

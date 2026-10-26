import { useEffect, useState } from 'react';
import { request } from '../../../data/client.js';

export default function useResearchData(question, query, retry) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    // Publicity has a distinct detailed API and owns its loading state.
    if (question === 9) return;
    const controller = new AbortController();
    setState({ loading: true });
    request('/pesquisa/' + question + '?' + query, { signal: controller.signal, timeout: 90000 })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ error: true });
      });
    return () => controller.abort();
  }, [question, query, retry]);
  return state;
}

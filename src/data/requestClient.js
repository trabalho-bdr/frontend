// Share identical GETs while preserving cancellation for each consumer.
export function createRequestClient({
  fetcher = (...args) => fetch(...args),
  ttl = 60000,
  capacity = 64,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  return async function request(path, { signal, timeout = 15000 } = {}) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const cached = cache.get(path);
    if (cached && Date.now() - cached.time < ttl) return structuredClone(cached.data);
    cache.delete(path);
    let entry = pending.get(path);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, consumers: 0, abortTimer: null };
      entry.promise = (async () => {
        const response = await fetcher('/api' + path, { signal: controller.signal });
        if (!response.ok) throw new Error('API ' + response.status);
        const data = await response.json();
        if (!controller.signal.aborted) {
          if (cache.size >= capacity) cache.delete(cache.keys().next().value);
          cache.set(path, { time: Date.now(), data });
        }
        return data;
      })().finally(() => {
        if (pending.get(path) === entry) pending.delete(path);
      });
      pending.set(path, entry);
    }
    clearTimeout(entry.abortTimer);
    entry.consumers++;
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        entry.consumers--;
        if (!entry.consumers && pending.get(path) === entry) {
          // Allow a StrictMode remount to reuse the request before cancelling it.
          entry.abortTimer = setTimeout(() => {
            if (!entry.consumers && pending.get(path) === entry) {
              pending.delete(path);
              entry.controller.abort();
            }
          }, 0);
        }
        callback(value);
      };
      const cancel = () => finish(reject, new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(cancel, timeout);
      entry.promise.then(
        (data) => finish(resolve, structuredClone(data)),
        (error) => finish(reject, error),
      );
    });
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestClient } from '../src/data/requestClient.js';

const response = (data) => ({ ok: true, json: async () => data });

test('identical requests share a fetch and cached results cannot be mutated by consumers', async () => {
  let calls = 0;
  const request = createRequestClient({
    fetcher: async () => {
      calls++;
      return response({ rows: [1] });
    },
  });
  const [a, b] = await Promise.all([request('/items'), request('/items')]);
  a.rows.push(2);
  assert.deepEqual(b.rows, [1]);
  assert.deepEqual((await request('/items')).rows, [1]);
  assert.equal(calls, 1);
  await request('/items?uf=CE');
  assert.equal(calls, 2);
});

test('one consumer cancelling does not cancel another consumer', async () => {
  let complete;
  let transportSignal;
  const request = createRequestClient({
    fetcher: (_, { signal }) => {
      transportSignal = signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  });
  const controller = new AbortController();
  const first = request('/shared', { signal: controller.signal });
  const second = request('/shared');
  const cancelled = assert.rejects(first, { name: 'AbortError' });
  controller.abort();
  await cancelled;
  assert.equal(transportSignal.aborted, false);
  complete(response({ ok: true }));
  assert.deepEqual(await second, { ok: true });
});

test('failed responses are retried and expired or evicted data is fetched again', async () => {
  let calls = 0;
  const request = createRequestClient({
    capacity: 1,
    fetcher: async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 503 };
      return response(calls);
    },
  });
  await assert.rejects(request('/a'), /API 503/);
  assert.equal(await request('/a'), 2);
  await request('/b');
  assert.equal(await request('/a'), 4);
  const expired = createRequestClient({ ttl: -1, fetcher: async () => response(++calls) });
  assert.notEqual(await expired('/a'), await expired('/a'));
});

test('timeouts release the underlying fetch when no consumers remain', async () => {
  let transportSignal;
  const request = createRequestClient({
    fetcher: (_, { signal }) => {
      transportSignal = signal;
      return new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    },
  });
  await assert.rejects(request('/slow', { timeout: 5 }), { name: 'AbortError' });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(transportSignal.aborted, true);
});

test('a remount reuses a request that was just cancelled', async () => {
  let complete;
  let calls = 0;
  const request = createRequestClient({
    fetcher: () => {
      calls++;
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
  });
  const controller = new AbortController();
  const cancelled = assert.rejects(request('/remount', { signal: controller.signal }), {
    name: 'AbortError',
  });
  controller.abort();
  const remount = request('/remount');
  await cancelled;
  complete(response([1]));
  assert.deepEqual(await remount, [1]);
  assert.equal(calls, 1);
});

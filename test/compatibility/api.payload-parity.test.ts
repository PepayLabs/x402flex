import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../../src/sdk/api-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/api');

function readFixture<T>(name: string): T {
  const content = readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return JSON.parse(content) as T;
}

function createMockClient(onRequest: (url: URL, init: RequestInit) => void) {
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const requestInit = init ?? { method: 'GET' };
    onRequest(url, requestInit);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  return createApiClient({
    baseUrl: 'https://api.bnbpay.org',
    fetchFn: fetchFn as unknown as typeof fetch,
  });
}

describe('api payload parity fixtures', () => {
  it('matches golden payload for payments.buildIntent', async () => {
    const fixture = readFixture<Record<string, unknown>>('payments.build-intent.request.json');
    let capturedBody: unknown;

    const client = createMockClient((url, init) => {
      expect(url.pathname).toBe('/payments/build-intent');
      expect(init.method).toBe('POST');
      capturedBody = init.body ? JSON.parse(String(init.body)) : undefined;
    });

    await client.payments.buildIntent(fixture as Parameters<typeof client.payments.buildIntent>[0]);
    expect(capturedBody).toEqual(fixture);
  });

  it('matches golden payload for relay.payment', async () => {
    const fixture = readFixture<Record<string, unknown>>('relay.payment.request.json');
    let capturedBody: unknown;

    const client = createMockClient((url, init) => {
      expect(url.pathname).toBe('/relay/payment');
      expect(init.method).toBe('POST');
      capturedBody = init.body ? JSON.parse(String(init.body)) : undefined;
    });

    await client.relay.payment(fixture as Parameters<typeof client.relay.payment>[0]);
    expect(capturedBody).toEqual(fixture);
  });

  it('matches golden query for payments.canPay', async () => {
    const fixture = readFixture<Record<string, string>>('payments.can-pay.query.json');

    const client = createMockClient((url, init) => {
      expect(url.pathname).toBe('/can-pay');
      expect(init.method).toBe('GET');
      for (const [key, value] of Object.entries(fixture)) {
        expect(url.searchParams.get(key)).toBe(value);
      }
    });

    await client.payments.canPay(fixture as Parameters<typeof client.payments.canPay>[0]);
  });

  it('matches golden query and path for sessions list/get', async () => {
    const fixture = readFixture<Record<string, string | number>>('sessions.list.query.json');
    const calls: URL[] = [];

    const client = createMockClient((url) => {
      calls.push(url);
    });

    await client.sessions.list(fixture as Parameters<typeof client.sessions.list>[0]);
    await client.sessions.get('0xfixture_session');

    expect(calls).toHaveLength(2);
    expect(calls[0].pathname).toBe('/sessions');
    for (const [key, value] of Object.entries(fixture)) {
      expect(calls[0].searchParams.get(key)).toBe(String(value));
    }
    expect(calls[1].pathname).toBe('/sessions/0xfixture_session');
  });
});

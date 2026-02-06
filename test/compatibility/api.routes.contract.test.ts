import { describe, expect, it, vi } from 'vitest';

import { createApiClient, type ApiClient } from '../../src/sdk/api-client.js';

interface RouteExpectation {
  method: string;
  path: string;
  query?: Record<string, string>;
}

interface RouteCase {
  name: string;
  invoke: (client: ApiClient) => Promise<unknown>;
  expected: RouteExpectation;
}

function makeClient() {
  const calls: Array<{ url: URL; method: string }> = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, method: init?.method ?? 'GET' });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  const client = createApiClient({
    baseUrl: 'https://api.bnbpay.org',
    fetchFn: fetchFn as unknown as typeof fetch,
  });

  return { client, calls, fetchFn };
}

const ROUTE_CASES: RouteCase[] = [
  {
    name: 'health',
    invoke: (client) => client.health(),
    expected: { method: 'GET', path: '/health' },
  },
  {
    name: 'payments.list',
    invoke: (client) => client.payments.list({ page: 2, pageSize: 10, network: 'bnbTestnet' }),
    expected: {
      method: 'GET',
      path: '/payments',
      query: { page: '2', pageSize: '10', network: 'bnbTestnet' },
    },
  },
  {
    name: 'payments.get',
    invoke: (client) => client.payments.get('pay_123'),
    expected: { method: 'GET', path: '/payments/pay_123' },
  },
  {
    name: 'payments.status',
    invoke: (client) => client.payments.status('pay_123', { network: 'bnbTestnet' }),
    expected: {
      method: 'GET',
      path: '/payments/pay_123/status',
      query: { network: 'bnbTestnet' },
    },
  },
  {
    name: 'payments.canPay',
    invoke: (client) =>
      client.payments.canPay({
        network: 'bnbTestnet',
        from: '0x0000000000000000000000000000000000000001',
        to: '0x0000000000000000000000000000000000000002',
        amount: '10',
      }),
    expected: {
      method: 'GET',
      path: '/can-pay',
      query: {
        network: 'bnbTestnet',
        from: '0x0000000000000000000000000000000000000001',
        to: '0x0000000000000000000000000000000000000002',
        amount: '10',
      },
    },
  },
  {
    name: 'payments.buildIntent',
    invoke: (client) =>
      client.payments.buildIntent({
        mode: 'minimal',
        network: 'bnbTestnet',
        merchant: '0x0000000000000000000000000000000000000001',
        token: '0x0000000000000000000000000000000000000002',
        amount: '1',
        scheme: 'permit2',
      }),
    expected: { method: 'POST', path: '/payments/build-intent' },
  },
  {
    name: 'wallets.payments',
    invoke: (client) => client.wallets.payments('0x0000000000000000000000000000000000000001', { page: 1 }),
    expected: {
      method: 'GET',
      path: '/wallets/0x0000000000000000000000000000000000000001/payments',
      query: { page: '1' },
    },
  },
  {
    name: 'sessions.list',
    invoke: (client) =>
      client.sessions.list({
        wallet: '0x0000000000000000000000000000000000000001',
        role: 'payer',
        network: 'bnbTestnet',
      }),
    expected: {
      method: 'GET',
      path: '/sessions',
      query: {
        wallet: '0x0000000000000000000000000000000000000001',
        role: 'payer',
        network: 'bnbTestnet',
      },
    },
  },
  {
    name: 'sessions.listByAgent',
    invoke: (client) =>
      client.sessions.listByAgent('0x0000000000000000000000000000000000000004', {
        network: 'bnbTestnet',
        page: 1,
      }),
    expected: {
      method: 'GET',
      path: '/sessions/agent/0x0000000000000000000000000000000000000004',
      query: { network: 'bnbTestnet', page: '1' },
    },
  },
  {
    name: 'sessions.get',
    invoke: (client) => client.sessions.get('0xsession'),
    expected: { method: 'GET', path: '/sessions/0xsession' },
  },
  {
    name: 'sessions.spends',
    invoke: (client) => client.sessions.spends('0xsession', { page: 2 }),
    expected: {
      method: 'GET',
      path: '/sessions/0xsession/spends',
      query: { page: '2' },
    },
  },
  {
    name: 'sessions.payments',
    invoke: (client) => client.sessions.payments('0xsession', { pageSize: 25 }),
    expected: {
      method: 'GET',
      path: '/sessions/0xsession/payments',
      query: { pageSize: '25' },
    },
  },
  {
    name: 'relay.payment',
    invoke: (client) =>
      client.relay.payment({
        network: 'bnbTestnet',
        scheme: 'push_signed',
        signedTx: '0xabc',
        intent: {
          paymentId: '0x1111111111111111111111111111111111111111111111111111111111111111',
          merchant: '0x0000000000000000000000000000000000000001',
          token: '0x0000000000000000000000000000000000000002',
          amount: '1',
          deadline: 1_900_000_000,
          resourceId: '0x2222222222222222222222222222222222222222222222222222222222222222',
        },
        witness: {
          schemeId: '0x3333333333333333333333333333333333333333333333333333333333333333',
          intentHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
          payer: '0x0000000000000000000000000000000000000005',
          salt: '0x5555555555555555555555555555555555555555555555555555555555555555',
        },
        witnessSignature: '0x66',
      }),
    expected: { method: 'POST', path: '/relay/payment' },
  },
  {
    name: 'relay.permit2Bundle',
    invoke: (client) =>
      client.relay.permit2Bundle({
        network: 'bnbTestnet',
        intent: {
          paymentId: '0x1111111111111111111111111111111111111111111111111111111111111111',
          merchant: '0x0000000000000000000000000000000000000001',
          token: '0x0000000000000000000000000000000000000002',
          amount: '1',
          deadline: 1_900_000_000,
          resourceId: '0x2222222222222222222222222222222222222222222222222222222222222222',
        },
        witness: {
          schemeId: '0x3333333333333333333333333333333333333333333333333333333333333333',
          intentHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
          payer: '0x0000000000000000000000000000000000000005',
          salt: '0x5555555555555555555555555555555555555555555555555555555555555555',
        },
        witnessSignature: '0x66',
        permit2: {
          permit: {
            permitted: {
              token: '0x0000000000000000000000000000000000000002',
              amount: '1',
            },
            nonce: '1',
            deadline: 1_900_000_000,
          },
          transferDetails: {
            to: '0x0000000000000000000000000000000000000001',
            requestedAmount: '1',
          },
          signature: '0x77',
        },
        approvalTx: '0x88',
      }),
    expected: { method: 'POST', path: '/relay/permit2/bundle' },
  },
  {
    name: 'relay.sessionRevoke',
    invoke: (client) =>
      client.relay.sessionRevoke({
        network: 'bnbTestnet',
        sessionId: '0xsession',
        deadline: 1_900_000_000,
        signature: '0x99',
      }),
    expected: { method: 'POST', path: '/relay/session/revoke' },
  },
  {
    name: 'relay.sessionOpen',
    invoke: (client) =>
      client.relay.sessionOpen({
        network: 'bnbTestnet',
        grant: {
          sessionId: '0x1111111111111111111111111111111111111111111111111111111111111111',
          payer: '0x0000000000000000000000000000000000000001',
          agent: '0x0000000000000000000000000000000000000002',
          merchantScope: '0x2222222222222222222222222222222222222222222222222222222222222222',
          deadline: 1_900_000_000,
          expiresAt: 1_900_000_010,
          epoch: 1,
          nonce: '1',
          rateLimit: { maxTxPerMinute: 1, maxTxPerDay: 2, coolDownSeconds: 3 },
          allowedSchemes: ['0x3333333333333333333333333333333333333333333333333333333333333333'],
          tokenCaps: [],
        },
        signature: '0xaaa',
      }),
    expected: { method: 'POST', path: '/relay/session/open' },
  },
  {
    name: 'tokens',
    invoke: (client) => client.tokens(),
    expected: { method: 'GET', path: '/tokens' },
  },
  {
    name: 'networks',
    invoke: (client) => client.networks(),
    expected: { method: 'GET', path: '/networks' },
  },
  {
    name: 'invoices.create',
    invoke: (client) =>
      client.invoices.create({
        title: 'Invoice #1',
        merchantId: 'merchant_1',
        amount: '25.00',
        currencyToken: 'USDC',
        network: 'bnbTestnet',
        tokenAllowlist: ['0x0000000000000000000000000000000000000001'],
      }),
    expected: { method: 'POST', path: '/invoices' },
  },
  {
    name: 'invoices.get',
    invoke: (client) => client.invoices.get('inv_1'),
    expected: { method: 'GET', path: '/invoices/inv_1' },
  },
  {
    name: 'invoices.status',
    invoke: (client) => client.invoices.status('inv_1'),
    expected: { method: 'GET', path: '/invoices/inv_1/status' },
  },
  {
    name: 'invoices.cancel',
    invoke: (client) => client.invoices.cancel('inv_1'),
    expected: { method: 'POST', path: '/invoices/inv_1/cancel' },
  },
];

describe('api compatibility route contract', () => {
  it('keeps client route matrix aligned to API paths', async () => {
    for (const testCase of ROUTE_CASES) {
      const { client, calls } = makeClient();
      await testCase.invoke(client);

      expect(calls).toHaveLength(1);
      const [{ url, method }] = calls;
      expect(method).toBe(testCase.expected.method);
      expect(url.pathname).toBe(testCase.expected.path);

      const expectedQuery = testCase.expected.query;
      if (expectedQuery) {
        for (const [key, value] of Object.entries(expectedQuery)) {
          expect(url.searchParams.get(key)).toBe(value);
        }
      } else {
        expect(url.search).toBe('');
      }
    }
  });
});

import { describe, expect, it, vi } from 'vitest';

import { createResourceServer } from '../../src/endpoint/resource-server.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe('endpoint e2e integration', () => {
  it('runs challenge -> payment -> retry success flow', async () => {
    const settle = vi.fn(async () => ({
      ok: true,
      txHash: '0xabc123',
      proof: { txHash: '0xabc123' },
    }));

    const server = createResourceServer({
      merchant: '0x0000000000000000000000000000000000000001',
      mode: 'facilitator',
      facilitator: {
        profile: 'bnbpay-v1-flex',
        headers: {
          paymentAuthorization: 'X-PAYMENT-AUTHORIZATION',
          paymentResponse: 'X-PAYMENT-RESPONSE',
          paymentRequired: 'X-PAYMENT-REQUIRED',
          supportedAuthorizationAliases: ['X-PAYMENT-AUTHORIZATION'],
        },
        verify: vi.fn(),
        settle,
      },
    });

    const middleware = server.paymentMiddleware({
      method: 'GET',
      path: '/paid',
      accepts: [
        {
          scheme: 'exact:evm:permit2',
          network: 'bnbTestnet',
          chainId: 97,
          amount: '25000000',
          asset: '0x0000000000000000000000000000000000000002',
          payTo: '0x0000000000000000000000000000000000000001',
          referenceId: 'order_123',
        },
      ],
    });

    const firstReq = {
      method: 'GET',
      path: '/paid',
      headers: {},
    };
    const firstRes = createMockResponse();
    const firstNext = vi.fn();

    await middleware(firstReq, firstRes, firstNext);

    expect(firstRes.statusCode).toBe(402);
    const paymentRequiredHeader =
      firstRes.headers['PAYMENT-REQUIRED']
      ?? firstRes.headers['payment-required']
      ?? firstRes.headers['X-PAYMENT-REQUIRED']
      ?? firstRes.headers['x-payment-required'];
    expect(paymentRequiredHeader).toBe('true');
    expect(firstRes.body).toMatchObject({
      x402Version: 1,
      accepts: expect.any(Array),
    });
    expect(firstNext).not.toHaveBeenCalled();

    const secondReq = {
      method: 'GET',
      path: '/paid',
      headers: {
        'x-payment-authorization': JSON.stringify({ network: 'bnbTestnet', txHash: '0xabc123' }),
      },
    };
    const secondRes = createMockResponse();
    const secondNext = vi.fn();

    await middleware(secondReq, secondRes, secondNext);

    expect(settle).toHaveBeenCalledTimes(1);
    const paymentResponseHeader =
      secondRes.headers['X-PAYMENT-RESPONSE'] ?? secondRes.headers['x-payment-response'];
    expect(paymentResponseHeader).toContain('0xabc123');
    expect(secondNext).toHaveBeenCalledTimes(1);
  });
});

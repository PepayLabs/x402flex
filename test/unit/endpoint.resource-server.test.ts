import { describe, expect, it } from 'vitest';

import { createResourceServer } from '../../src/endpoint/resource-server.js';

const MERCHANT = '0x000000000000000000000000000000000000dEaD';

describe('resource server middleware', () => {
  it('returns 402 challenge when authorization header is missing', async () => {
    const server = createResourceServer({
      merchant: MERCHANT,
      mode: 'facilitator',
      facilitator: {
        profile: 'bnbpay-v1-flex',
        headers: {
          paymentRequired: 'PAYMENT-REQUIRED',
          paymentAuthorization: 'X-PAYMENT-AUTHORIZATION',
          paymentResponse: 'X-PAYMENT-RESPONSE',
          supportedAuthorizationAliases: ['x-payment-authorization'],
        },
        verify: async () => ({ ok: true }),
        settle: async () => ({ ok: true, txHash: '0xabc' }),
      },
    });

    const middleware = server.paymentMiddleware({
      method: 'GET',
      path: '/paid',
      accepts: [
        { scheme: 'push:evm:direct', network: 'bnbTestnet', chainId: 97, amount: '1000', asset: 'native' },
      ],
    });

    const req: any = { method: 'GET', path: '/paid', headers: {} };
    const res: any = {
      statusCode: 200,
      payload: undefined,
      headers: {},
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      set(name: string, value: string) {
        this.headers[name] = value;
      },
      json(body: unknown) {
        this.payload = body;
        return this;
      },
      send(body: unknown) {
        this.payload = body;
        return this;
      },
    };
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    expect(res.statusCode).toBe(402);
    expect(nextCalled).toBe(false);
    expect((res.payload as any).accepts).toHaveLength(1);
  });

  it('settles through facilitator and calls next', async () => {
    const server = createResourceServer({
      merchant: MERCHANT,
      mode: 'facilitator',
      facilitator: {
        profile: 'bnbpay-v1-flex',
        headers: {
          paymentRequired: 'PAYMENT-REQUIRED',
          paymentAuthorization: 'X-PAYMENT-AUTHORIZATION',
          paymentResponse: 'X-PAYMENT-RESPONSE',
          supportedAuthorizationAliases: ['x-payment-authorization'],
        },
        verify: async () => ({ ok: true }),
        settle: async () => ({ ok: true, txHash: '0xabc', proof: { txHash: '0xabc' } }),
      },
    });

    const middleware = server.paymentMiddleware({
      method: 'POST',
      path: '/checkout',
      accepts: [
        { scheme: 'push:evm:direct', network: 'bnbTestnet', chainId: 97, amount: '1000', asset: 'native' },
      ],
    });

    const req: any = {
      method: 'POST',
      path: '/checkout',
      headers: { 'x-payment-authorization': '{"network":"bnbTestnet","txHash":"0xabc"}' },
    };
    const res: any = {
      statusCode: 200,
      headers: {},
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      set(name: string, value: string) {
        this.headers[name] = value;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
      send(body: unknown) {
        this.body = body;
        return this;
      },
    };
    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.headers['X-PAYMENT-RESPONSE']).toBeDefined();
  });
});


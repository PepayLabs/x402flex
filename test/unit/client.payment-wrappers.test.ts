import { describe, expect, it, vi } from 'vitest';

import { createPaymentClient } from '../../src/client/payment-client.js';
import { wrapFetchWithPayment } from '../../src/client/wrap-fetch.js';
import { wrapAxiosWithPayment } from '../../src/client/wrap-axios.js';

describe('buyer payment wrappers', () => {
  it('retries fetch automatically after 402', async () => {
    const wallet = {
      authorizePayment: vi.fn(async () => ({
        authorization: { network: 'bnbTestnet', txHash: '0xabc' },
      })),
    };
    const client = createPaymentClient({ wallet });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accepts: [] }), {
          status: 402,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const wrapped = wrapFetchWithPayment(fetchFn, client);

    const response = await wrapped('https://example.com/paid', { method: 'GET' });
    expect(response.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const retryInit = fetchFn.mock.calls[1][1];
    expect((retryInit.headers as any)['X-PAYMENT-AUTHORIZATION']).toBeDefined();
  });

  it('retries axios automatically after 402', async () => {
    const wallet = {
      authorizePayment: vi.fn(async () => ({
        authorization: { network: 'bnbTestnet', txHash: '0xabc' },
      })),
    };
    const client = createPaymentClient({ wallet });
    const axiosLike = {
      request: vi
        .fn()
        .mockRejectedValueOnce({
          response: {
            status: 402,
            data: { accepts: [] },
            headers: {},
            config: { method: 'get', url: '/paid', headers: {} },
          },
          config: { method: 'get', url: '/paid', headers: {} },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { ok: true },
          headers: {},
          config: { method: 'get', url: '/paid', headers: {} },
        }),
    };

    const wrapped = wrapAxiosWithPayment(axiosLike as any, client);
    const result = await wrapped.request({ method: 'get', url: '/paid', headers: {} });
    expect(result.status).toBe(200);
    expect(axiosLike.request).toHaveBeenCalledTimes(2);
    expect(axiosLike.request.mock.calls[1][0].headers['X-PAYMENT-AUTHORIZATION']).toBeDefined();
  });
});


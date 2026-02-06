import { describe, expect, it, vi } from 'vitest';

import { createFacilitatorClient } from '../../src/facilitator/client.js';

describe('facilitator adapters', () => {
  it('supports bnbpay relay profile adapter', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ txHash: '0xabc' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const facilitator = createFacilitatorClient({
      baseUrl: 'https://api.bnbpay.org',
      profile: 'bnbpay-v1-flex',
      fetchFn: fetchFn as any,
    });

    const result = await facilitator.settle({
      authorization: { network: 'bnbTestnet', txHash: '0xabc' },
      context: { network: 'bnbTestnet' },
    });
    expect(result.ok).toBe(true);
    expect(result.txHash).toBe('0xabc');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.bnbpay.org/relay/payment',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('supports x402 verify/settle profile adapter', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, proof: { accepted: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, txHash: '0xdef' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    const facilitator = createFacilitatorClient({
      baseUrl: 'https://facilitator.example',
      profile: 'x402-v2-caip',
      fetchFn: fetchFn as any,
    });

    const verify = await facilitator.verify({
      authorization: 'sig',
      challenge: { accepts: [] },
    });
    const settle = await facilitator.settle({
      authorization: 'sig',
      challenge: { accepts: [] },
    });

    expect(verify.ok).toBe(true);
    expect(settle.ok).toBe(true);
    expect(settle.txHash).toBe('0xdef');
    expect(fetchFn.mock.calls[0][0]).toBe('https://facilitator.example/verify');
    expect(fetchFn.mock.calls[1][0]).toBe('https://facilitator.example/settle');
  });
});


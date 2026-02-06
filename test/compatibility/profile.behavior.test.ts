import { describe, expect, it, vi } from 'vitest';

import { headersForProfile } from '../../src/profiles/headers.js';
import { createClient } from '../../src/create-client.js';

describe('protocol profile behavior', () => {
  it('uses bnbpay-v1-flex headers by default', () => {
    const headers = headersForProfile('bnbpay-v1-flex');
    expect(headers.paymentAuthorization).toBe('X-PAYMENT-AUTHORIZATION');
  });

  it('uses x402-v2-caip headers when pinned', () => {
    const headers = headersForProfile('x402-v2-caip');
    expect(headers.paymentAuthorization).toBe('PAYMENT-SIGNATURE');
    expect(headers.paymentResponse).toBe('PAYMENT-RESPONSE');
  });

  it('falls back to bnbpay-v1-flex when capability endpoint is unavailable', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );
    const sdk = createClient({
      mode: 'api',
      protocolProfile: 'auto',
      api: {
        baseUrl: 'https://api.bnbpay.org',
        fetchFn,
      },
    });
    await expect(sdk.protocolProfileRuntime.negotiated).resolves.toBe('bnbpay-v1-flex');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.bnbpay.org/x402/capabilities',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('resolves to x402-v2-caip when capability endpoint advertises it', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ protocolProfiles: ['x402-v2-caip'] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const sdk = createClient({
      mode: 'api',
      protocolProfile: 'auto',
      api: {
        baseUrl: 'https://api.bnbpay.org',
        fetchFn,
      },
    });
    await expect(sdk.protocolProfileRuntime.negotiated).resolves.toBe('x402-v2-caip');
  });

  it('keeps explicit profile pinning without capability lookup', async () => {
    const fetchFn = vi.fn();
    const sdk = createClient({
      mode: 'api',
      protocolProfile: 'x402-v2-caip',
      api: {
        baseUrl: 'https://api.bnbpay.org',
        fetchFn,
      },
    });
    expect(sdk.protocolProfile).toBe('x402-v2-caip');
    await expect(sdk.protocolProfileRuntime.negotiated).resolves.toBe('x402-v2-caip');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

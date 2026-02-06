import { describe, expect, it } from 'vitest';

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

  it('creates client with explicit profile pinning', () => {
    const sdk = createClient({
      mode: 'api',
      protocolProfile: 'x402-v2-caip',
      api: { baseUrl: 'https://api.bnbpay.org' },
    });
    expect(sdk.protocolProfile).toBe('x402-v2-caip');
  });
});


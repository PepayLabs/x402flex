import { describe, expect, it } from 'vitest';

import { createClient } from '../../src/create-client.js';

describe('api compatibility surface', () => {
  it('exposes bnbpay-api route groups', () => {
    const sdk = createClient({
      mode: 'api',
      api: { baseUrl: 'https://api.bnbpay.org' },
    });

    expect(typeof sdk.api?.health).toBe('function');
    expect(typeof sdk.payments.list).toBe('function');
    expect(typeof sdk.payments.status).toBe('function');
    expect(typeof sdk.sessions.list).toBe('function');
    expect(typeof sdk.relay.payment).toBe('function');
    expect(typeof sdk.invoices.create).toBe('function');
    expect(typeof sdk.giftcards.create).toBe('function');
  });
});


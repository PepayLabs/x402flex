import { describe, expectTypeOf, it } from 'vitest';

import { createClient } from '../../src/create-client.js';

describe('typescript consumer surface', () => {
  it('exposes typed namespaces', () => {
    const sdk = createClient({
      mode: 'api',
      api: { baseUrl: 'https://api.bnbpay.org' },
    });

    expectTypeOf(sdk.payments.buildIntent).toBeFunction();
    expectTypeOf(sdk.x402.buildResponse).toBeFunction();
    expectTypeOf(sdk.sessions.buildSessionContext).toBeFunction();
    expectTypeOf(sdk.subscriptions.buildCreateTypedData).toBeFunction();
  });
});


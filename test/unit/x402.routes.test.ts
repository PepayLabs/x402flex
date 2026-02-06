import { describe, expect, it } from 'vitest';

import { buildX402Route } from '../../src/x402/routes.js';

describe('x402 route construction', () => {
  it('builds a valid challenge payload', () => {
    const payload = buildX402Route({
      merchant: '0x000000000000000000000000000000000000dEaD',
      accepts: [
        {
          scheme: 'push:evm:direct',
          network: 'bnbTestnet',
          chainId: 97,
          amount: '1000',
          asset: 'native',
        },
      ],
    });
    expect(payload.x402Version).toBe(1);
    expect(payload.accepts).toHaveLength(1);
    expect(payload.accepts[0].schemeId).toMatch(/^0x[0-9a-f]{64}$/);
  });
});


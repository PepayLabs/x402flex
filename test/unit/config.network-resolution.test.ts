import { describe, expect, it } from 'vitest';

import { createClient } from '../../src/create-client.js';

describe('network resolution', () => {
  it('resolves CAIP, chain id, and alias references consistently', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
    });
    expect(sdk.networks.toCaip2('bnb-testnet')).toBe('eip155:97');
    expect(sdk.networks.toCaip2(97)).toBe('eip155:97');
    expect(sdk.networks.toChainId('eip155:97')).toBe(97);
  });
});


import { describe, expect, it } from 'vitest';

import { REQUIRED_CHAIN_IDS, toCaip2, toChainId } from '../../src/config/chains.js';

describe('chain registry coverage', () => {
  it('contains all required chain ids', () => {
    for (const chainId of REQUIRED_CHAIN_IDS) {
      const caip2 = toCaip2(chainId);
      expect(caip2).toMatch(/^eip155:\d+$/);
      expect(toChainId(caip2)).toBe(chainId);
    }
  });

  it('normalizes key aliases', () => {
    expect(toCaip2('bnbTestnet')).toBe('eip155:97');
    expect(toCaip2('base-sepolia')).toBe('eip155:84532');
    expect(toCaip2('optimism')).toBe('eip155:10');
  });
});


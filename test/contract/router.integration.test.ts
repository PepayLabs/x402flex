import { describe, expect, it } from 'vitest';

import { X402FlexRouter__factory } from '../../src/sdk/typechain/factories/X402FlexRouter__factory';
import { createClient } from '../../src/create-client.js';

describe('router integration contract surface', () => {
  it('exposes required router settlement methods in canonical ABI', () => {
    const functionNames = X402FlexRouter__factory.abi
      .filter((entry): entry is { type: string; name?: string } => entry && typeof entry === 'object')
      .filter((entry) => entry.type === 'function')
      .map((entry) => entry.name);

    expect(functionNames).toContain('payWithPermit2');
    expect(functionNames).toContain('payWithEIP2612');
    expect(functionNames).toContain('payWithEIP3009');
    expect(functionNames).toContain('depositAndSettleToken');
  });

  it('builds a contracts-mode client with router execution helpers', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
    });

    expect(typeof sdk.payments.sendRouterPayment).toBe('function');
    expect(typeof sdk.payments.payWithPermit2).toBe('function');
    expect(typeof sdk.payments.payWithEIP2612).toBe('function');
    expect(typeof sdk.payments.payWithEIP3009).toBe('function');
  });
});

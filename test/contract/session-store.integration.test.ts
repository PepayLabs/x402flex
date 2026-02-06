import { describe, expect, it } from 'vitest';

import { X402FlexSessionStore__factory } from '../../src/sdk/typechain/factories/X402FlexSessionStore__factory';
import { createClient } from '../../src/create-client.js';

describe('session store integration contract surface', () => {
  it('exposes required session lifecycle methods in canonical ABI', () => {
    const functionNames = X402FlexSessionStore__factory.abi
      .filter((entry): entry is { type: string; name?: string } => entry && typeof entry === 'object')
      .filter((entry) => entry.type === 'function')
      .map((entry) => entry.name);

    expect(functionNames).toContain('openSession');
    expect(functionNames).toContain('openClaimableSession');
    expect(functionNames).toContain('claimSession');
    expect(functionNames).toContain('spendFromSession');
    expect(functionNames).toContain('revokeSession');
  });

  it('builds contracts-mode session helpers against configured testnet', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
    });

    expect(typeof sdk.sessions.getContractSession).toBe('function');
    expect(typeof sdk.sessions.getContractSessionState).toBe('function');
    expect(typeof sdk.sessions.getContractSpendNonce).toBe('function');
  });
});

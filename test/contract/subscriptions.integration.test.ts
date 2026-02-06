import { describe, expect, it, vi } from 'vitest';
import { ethers } from 'ethers';

import { X402FlexSubscriptions__factory } from '../../src/sdk/typechain/factories/X402FlexSubscriptions__factory.js';
import { isSubscriptionDue } from '../../src/modules/subscriptions/execute.js';
import { createClient } from '../../src/create-client.js';

describe('subscriptions integration contract surface', () => {
  it('exposes required subscriptions methods in canonical ABI', () => {
    const functionNames = X402FlexSubscriptions__factory.abi
      .filter((entry): entry is { type: string; name?: string } => entry && typeof entry === 'object')
      .filter((entry) => entry.type === 'function')
      .map((entry) => entry.name);

    expect(functionNames).toContain('createSubscriptionWithSig');
    expect(functionNames).toContain('computeSubId');
    expect(functionNames).toContain('charge');
    expect(functionNames).toContain('cancel');
    expect(functionNames).toContain('cancelBySig');
  });

  it('computes due state through typed subscriptions binding', async () => {
    const mockContract = {
      getSubscription: vi.fn().mockResolvedValue({
        status: 0n,
        maxPayments: 0n,
        paymentsMade: 0n,
        nextChargeAt: 1n,
      }),
    };

    const connectSpy = vi
      .spyOn(X402FlexSubscriptions__factory, 'connect')
      .mockReturnValue(mockContract as unknown as ReturnType<typeof X402FlexSubscriptions__factory.connect>);

    const result = await isSubscriptionDue(
      {
        address: '0x0000000000000000000000000000000000000001',
        signerOrProvider: {} as unknown as ethers.Provider,
      },
      '0x1111111111111111111111111111111111111111111111111111111111111111'
    );

    expect(result.due).toBe(true);
    expect(result.nextChargeAt).toBe(1n);
    expect(mockContract.getSubscription).toHaveBeenCalledTimes(1);

    connectSpy.mockRestore();
  });

  it('builds contracts-mode subscription helpers against configured testnet', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
    });

    expect(typeof sdk.subscriptions.createWithSig).toBe('function');
    expect(typeof sdk.subscriptions.charge).toBe('function');
    expect(typeof sdk.subscriptions.cancel).toBe('function');
    expect(typeof sdk.subscriptions.computeId).toBe('function');
  });
});

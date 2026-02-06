import { describe, expect, it } from 'vitest';

import {
  buildCreateSubscriptionTypedData,
  buildCreateSubscriptionDigest,
  buildCancelSubscriptionTypedData,
  buildCancelSubscriptionDigest,
} from '../../src/modules/subscriptions/intents.js';

describe('subscription typed-data helpers', () => {
  const domain = {
    chainId: 97,
    verifyingContract: '0x000000000000000000000000000000000000beef',
  };

  const createRequest = {
    payer: '0x0000000000000000000000000000000000000001',
    merchant: '0x0000000000000000000000000000000000000002',
    token: '0x0000000000000000000000000000000000000003',
    amount: 1000n,
    startAt: 1_800_000_000,
    cadenceKind: 0 as const,
    cadence: 60,
    cancelWindow: 10,
    maxPayments: 0,
    pullMode: 0 as const,
    termsHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    salt: '0x2222222222222222222222222222222222222222222222222222222222222222',
    deadline: 1_900_000_000,
  };

  it('builds create typed data and digest', () => {
    const typedData = buildCreateSubscriptionTypedData(createRequest, domain);
    expect(typedData.primaryType).toBe('CreateSubscription');
    const digest = buildCreateSubscriptionDigest(createRequest, domain);
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('builds cancel typed data and digest', () => {
    const cancelRequest = {
      subId: '0x3333333333333333333333333333333333333333333333333333333333333333',
      deadline: 1_900_000_000,
    };
    const typedData = buildCancelSubscriptionTypedData(cancelRequest, domain);
    expect(typedData.primaryType).toBe('CancelSubscription');
    const digest = buildCancelSubscriptionDigest(cancelRequest, domain);
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
  });
});


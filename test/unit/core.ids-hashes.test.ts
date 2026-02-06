import { describe, expect, it } from 'vitest';
import { ethers } from 'ethers';

import { deriveResourceId, derivePaymentId } from '../../src/core/ids.js';
import { calculateReferenceHash, hashPaymentIntent } from '../../src/core/hashes.js';

describe('ids and hashes', () => {
  it('derives deterministic resource and payment ids', () => {
    const merchant = '0x000000000000000000000000000000000000beef';
    const token = ethers.ZeroAddress;
    const amount = ethers.parseEther('1');
    const referenceId = 'order_123';
    const chainId = 97;
    const salt = '0x1234000000000000000000000000000000000000000000000000000000000000';
    const { resourceId } = deriveResourceId({ merchant, token, amount, referenceId, chainId, salt });
    const referenceHash = calculateReferenceHash(referenceId);
    const nonce = '0xaaaa000000000000000000000000000000000000000000000000000000000000';
    const paymentId = derivePaymentId({
      token,
      amount,
      deadline: 1_800_000_000,
      resourceId,
      referenceHash,
      nonce,
    });
    expect(resourceId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(paymentId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(paymentId).toBe(
      derivePaymentId({
        token,
        amount,
        deadline: 1_800_000_000,
        resourceId,
        referenceHash,
        nonce,
      })
    );
  });

  it('hashes payment intents deterministically', () => {
    const intentHash = hashPaymentIntent({
      paymentId: '0x1111111111111111111111111111111111111111111111111111111111111111',
      merchant: '0x000000000000000000000000000000000000beef',
      token: ethers.ZeroAddress,
      amount: 1000n,
      deadline: 1_800_000_000,
      payer: ethers.ZeroAddress,
      resourceId: '0x2222222222222222222222222222222222222222222222222222222222222222',
      referenceHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      nonce: '0x4444444444444444444444444444444444444444444444444444444444444444',
    });
    expect(intentHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});


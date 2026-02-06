import { ethers } from 'ethers';

import type {
  SubscriptionCancelRequest,
  SubscriptionCreateRequest,
} from '../../core/types.js';

const CREATE_SUB_TYPES = {
  CreateSubscription: [
    { name: 'payer', type: 'address' },
    { name: 'merchant', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'startAt', type: 'uint64' },
    { name: 'cadenceKind', type: 'uint8' },
    { name: 'cadence', type: 'uint32' },
    { name: 'cancelWindow', type: 'uint32' },
    { name: 'maxPayments', type: 'uint16' },
    { name: 'pullMode', type: 'uint8' },
    { name: 'termsHash', type: 'bytes32' },
    { name: 'salt', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

const CANCEL_SUB_TYPES = {
  CancelSubscription: [
    { name: 'subId', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export interface SubscriptionTypedDataDomainInput {
  chainId: number;
  verifyingContract: string;
}

export function buildSubscriptionsDomain(input: SubscriptionTypedDataDomainInput) {
  return {
    name: 'X402FlexSubscriptions',
    version: '1',
    chainId: input.chainId,
    verifyingContract: ethers.getAddress(input.verifyingContract),
  };
}

export function buildCreateSubscriptionTypedData(
  input: SubscriptionCreateRequest,
  domain: SubscriptionTypedDataDomainInput
) {
  return {
    domain: buildSubscriptionsDomain(domain),
    primaryType: 'CreateSubscription' as const,
    types: CREATE_SUB_TYPES,
    message: {
      payer: ethers.getAddress(input.payer),
      merchant: ethers.getAddress(input.merchant),
      token: ethers.getAddress(input.token),
      amount: input.amount.toString(),
      startAt: input.startAt,
      cadenceKind: input.cadenceKind,
      cadence: input.cadence,
      cancelWindow: input.cancelWindow,
      maxPayments: input.maxPayments,
      pullMode: input.pullMode,
      termsHash: input.termsHash,
      salt: input.salt,
      deadline: input.deadline,
    },
  };
}

export function buildCreateSubscriptionDigest(
  input: SubscriptionCreateRequest,
  domain: SubscriptionTypedDataDomainInput
) {
  const typedData = buildCreateSubscriptionTypedData(input, domain);
  return ethers.TypedDataEncoder.hash(
    typedData.domain,
    typedData.types as unknown as Record<string, Array<{ name: string; type: string }>>,
    typedData.message
  );
}

export function buildCancelSubscriptionTypedData(
  input: SubscriptionCancelRequest,
  domain: SubscriptionTypedDataDomainInput
) {
  return {
    domain: buildSubscriptionsDomain(domain),
    primaryType: 'CancelSubscription' as const,
    types: CANCEL_SUB_TYPES,
    message: {
      subId: input.subId,
      deadline: input.deadline,
    },
  };
}

export function buildCancelSubscriptionDigest(
  input: SubscriptionCancelRequest,
  domain: SubscriptionTypedDataDomainInput
) {
  const typedData = buildCancelSubscriptionTypedData(input, domain);
  return ethers.TypedDataEncoder.hash(
    typedData.domain,
    typedData.types as unknown as Record<string, Array<{ name: string; type: string }>>,
    typedData.message
  );
}

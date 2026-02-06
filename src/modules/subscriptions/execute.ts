import { ethers } from 'ethers';

import type {
  SubscriptionChargeRequest,
  SubscriptionCancelRequest,
  SubscriptionCreateRequest,
  SubscriptionModuleConfig,
} from '../../core/types.js';

const SUBSCRIPTIONS_ABI = [
  'function domainSeparator() view returns (bytes32)',
  'function getSubscription(bytes32 subId) view returns (tuple(address payer,address merchant,address token,uint96 amount,uint64 nextChargeAt,uint64 lastChargedAt,uint32 cadence,uint32 cancelWindow,uint16 maxPayments,uint16 paymentsMade,uint8 status,uint8 cadenceKind,uint8 pullMode,uint8 monthAnchorDay,bytes32 termsHash))',
  'function isDue(bytes32 subId) view returns (bool due, uint64 nextChargeAt)',
  'function computeSubId(address payer,address merchant,address token,uint256 amount,uint64 startAt,uint8 cadenceKind,uint32 cadence,uint32 cancelWindow,uint16 maxPayments,uint8 pullMode,bytes32 termsHash,bytes32 salt) view returns (bytes32)',
  'function subscribeAndChargeWithSig((address payer,address merchant,address token,uint256 amount,uint64 startAt,uint8 cadenceKind,uint32 cadence,uint32 cancelWindow,uint16 maxPayments,uint8 pullMode,bytes32 termsHash,bytes32 salt,uint256 deadline) a, bytes payerSig) returns (bytes32)',
  'function charge(bytes32 subId)',
  'function cancel(bytes32 subId)',
  'function cancelBySig(bytes32 subId, uint256 deadline, bytes sig)',
] as const;

function contract(config: SubscriptionModuleConfig) {
  return new ethers.Contract(config.address, SUBSCRIPTIONS_ABI, config.signerOrProvider);
}

export interface SubscribeAndChargeWithSigInput {
  request: SubscriptionCreateRequest;
  payerSignature: string;
}

export async function subscribeAndChargeWithSig(
  config: SubscriptionModuleConfig,
  input: SubscribeAndChargeWithSigInput
) {
  const c = contract(config);
  return c.subscribeAndChargeWithSig(
    {
      payer: input.request.payer,
      merchant: input.request.merchant,
      token: input.request.token,
      amount: input.request.amount,
      startAt: input.request.startAt,
      cadenceKind: input.request.cadenceKind,
      cadence: input.request.cadence,
      cancelWindow: input.request.cancelWindow,
      maxPayments: input.request.maxPayments,
      pullMode: input.request.pullMode,
      termsHash: input.request.termsHash,
      salt: input.request.salt,
      deadline: input.request.deadline,
    },
    input.payerSignature
  );
}

export function chargeSubscription(config: SubscriptionModuleConfig, request: SubscriptionChargeRequest) {
  return contract(config).charge(request.subId);
}

export function cancelSubscription(config: SubscriptionModuleConfig, request: SubscriptionCancelRequest) {
  if (request.signature) {
    return contract(config).cancelBySig(request.subId, request.deadline, request.signature);
  }
  return contract(config).cancel(request.subId);
}

export function getSubscription(config: SubscriptionModuleConfig, subId: string) {
  return contract(config).getSubscription(subId);
}

export function isSubscriptionDue(config: SubscriptionModuleConfig, subId: string) {
  return contract(config).isDue(subId);
}

export function computeSubscriptionId(config: SubscriptionModuleConfig, request: SubscriptionCreateRequest) {
  return contract(config).computeSubId(
    request.payer,
    request.merchant,
    request.token,
    request.amount,
    request.startAt,
    request.cadenceKind,
    request.cadence,
    request.cancelWindow,
    request.maxPayments,
    request.pullMode,
    request.termsHash,
    request.salt
  );
}


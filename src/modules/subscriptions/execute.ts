import type {
  SubscriptionChargeRequest,
  SubscriptionCancelRequest,
  SubscriptionCreateRequest,
  SubscriptionModuleConfig,
} from '../../core/types.js';
import { X402FlexSubscriptions__factory } from '../../sdk/typechain/factories/X402FlexSubscriptions__factory.js';
import type { X402FlexSubscriptions } from '../../sdk/typechain/X402FlexSubscriptions.js';

function contract(config: SubscriptionModuleConfig): X402FlexSubscriptions {
  return X402FlexSubscriptions__factory.connect(config.address, config.signerOrProvider);
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
  return c.createSubscriptionWithSig(
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

export async function isSubscriptionDue(config: SubscriptionModuleConfig, subId: string) {
  const subscription = await contract(config).getSubscription(subId);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const due = subscription.status === 0n
    && (subscription.maxPayments === 0n || subscription.paymentsMade < subscription.maxPayments)
    && now >= subscription.nextChargeAt;
  return {
    due,
    nextChargeAt: subscription.nextChargeAt,
  };
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

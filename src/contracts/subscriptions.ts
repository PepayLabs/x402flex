import type { ContractsAdapter } from './adapter.js';
import { SdkError } from '../core/errors.js';
import type { SubscriptionModuleConfig } from '../core/types.js';

import {
  subscribeAndChargeWithSig,
  chargeSubscription,
  cancelSubscription,
  getSubscription,
  isSubscriptionDue,
  computeSubscriptionId,
  type SubscribeAndChargeWithSigInput,
} from '../modules/subscriptions/execute.js';

function subscriptionConfig(adapter: ContractsAdapter, network?: string | number): SubscriptionModuleConfig {
  const cfg = adapter.resolveNetwork(network);
  if (!cfg.contracts.subscriptions) {
    throw new SdkError(
      'UNCONFIGURED_NETWORK_CONTRACTS',
      `Missing subscriptions contract for network ${cfg.caip2}`
    );
  }
  return {
    address: cfg.contracts.subscriptions,
    signerOrProvider: adapter.providerFor(network),
  };
}

export function createSubscriptionWithSig(
  adapter: ContractsAdapter,
  request: SubscribeAndChargeWithSigInput,
  network?: string | number
) {
  return subscribeAndChargeWithSig(subscriptionConfig(adapter, network), request);
}

export function chargeExistingSubscription(adapter: ContractsAdapter, subId: string, network?: string | number) {
  return chargeSubscription(subscriptionConfig(adapter, network), { subId });
}

export function cancelExistingSubscription(
  adapter: ContractsAdapter,
  subId: string,
  deadline: number,
  signature?: string,
  network?: string | number
) {
  return cancelSubscription(subscriptionConfig(adapter, network), { subId, deadline, signature });
}

export function getSubscriptionState(adapter: ContractsAdapter, subId: string, network?: string | number) {
  return getSubscription(subscriptionConfig(adapter, network), subId);
}

export function isDueSubscription(adapter: ContractsAdapter, subId: string, network?: string | number) {
  return isSubscriptionDue(subscriptionConfig(adapter, network), subId);
}

export function computeSubId(
  adapter: ContractsAdapter,
  request: SubscribeAndChargeWithSigInput['request'],
  network?: string | number
) {
  return computeSubscriptionId(subscriptionConfig(adapter, network), request);
}


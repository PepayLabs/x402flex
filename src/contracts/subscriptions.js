import { SdkError } from '../core/errors.js';
import { subscribeAndChargeWithSig, chargeSubscription, cancelSubscription, getSubscription, isSubscriptionDue, computeSubscriptionId, } from '../modules/subscriptions/execute.js';
function subscriptionConfig(adapter, network) {
    const cfg = adapter.resolveNetwork(network);
    if (!cfg.contracts.subscriptions) {
        throw new SdkError('UNCONFIGURED_NETWORK_CONTRACTS', `Missing subscriptions contract for network ${cfg.caip2}`);
    }
    return {
        address: cfg.contracts.subscriptions,
        signerOrProvider: adapter.providerFor(network),
    };
}
export function createSubscriptionWithSig(adapter, request, network) {
    return subscribeAndChargeWithSig(subscriptionConfig(adapter, network), request);
}
export function chargeExistingSubscription(adapter, subId, network) {
    return chargeSubscription(subscriptionConfig(adapter, network), { subId });
}
export function cancelExistingSubscription(adapter, subId, deadline, signature, network) {
    return cancelSubscription(subscriptionConfig(adapter, network), { subId, deadline, signature });
}
export function getSubscriptionState(adapter, subId, network) {
    return getSubscription(subscriptionConfig(adapter, network), subId);
}
export function isDueSubscription(adapter, subId, network) {
    return isSubscriptionDue(subscriptionConfig(adapter, network), subId);
}
export function computeSubId(adapter, request, network) {
    return computeSubscriptionId(subscriptionConfig(adapter, network), request);
}

import { ethers } from 'ethers';
import {
  canPay,
  createFlexIntent,
  sendRouterPayment,
  payWithPermit2,
  payWithEIP2612,
  payWithEIP3009,
  type CreateFlexIntentParams,
  type PayWithPermit2Params,
  type PayWithEIP2612Params,
  type PayWithEIP3009Params,
} from '../sdk/index.js';

import { SdkError } from '../core/errors.js';

import type { ContractsAdapter } from './adapter.js';

type SendRouterPaymentParams = Parameters<typeof sendRouterPayment>[0];

function requireContract(
  adapter: ContractsAdapter,
  networkRef: string | number | undefined,
  field: 'router' | 'registry' | 'sessionStore' | 'subscriptions' | 'permit2'
): string {
  const network = adapter.resolveNetwork(networkRef);
  const value = network.contracts[field];
  if (!value) {
    throw new SdkError(
      'UNCONFIGURED_NETWORK_CONTRACTS',
      `Missing ${field} contract for network ${network.caip2}`
    );
  }
  return value;
}

export function createContractIntent(params: CreateFlexIntentParams) {
  return createFlexIntent(params);
}

export async function canPayOnContracts(adapter: ContractsAdapter, params: {
  network?: string | number;
  token?: string;
  from: string;
  to: string;
  amount: bigint;
}) {
  const network = adapter.resolveNetwork(params.network);
  const provider = adapter.providerFor(params.network);
  const registryAddress = requireContract(adapter, params.network, 'registry');
  return canPay({
    provider,
    registryAddress,
    token: params.token ?? ethers.ZeroAddress,
    from: params.from,
    to: params.to,
    amount: params.amount,
  });
}

export function sendContractRouterPayment(
  adapter: ContractsAdapter,
  params: Omit<SendRouterPaymentParams, 'routerAddress'> & { network?: string | number; routerAddress?: string }
) {
  const { network, routerAddress: overrideRouter, ...rest } = params;
  const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
  return sendRouterPayment({
    ...rest,
    routerAddress,
  });
}

export function sendContractPermit2Payment(
  adapter: ContractsAdapter,
  params: Omit<PayWithPermit2Params, 'routerAddress'> & { network?: string | number; routerAddress?: string }
) {
  const { network, routerAddress: overrideRouter, ...rest } = params;
  const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
  return payWithPermit2({
    ...rest,
    routerAddress,
  });
}

export function sendContractEip2612Payment(
  adapter: ContractsAdapter,
  params: Omit<PayWithEIP2612Params, 'routerAddress'> & { network?: string | number; routerAddress?: string }
) {
  const { network, routerAddress: overrideRouter, ...rest } = params;
  const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
  return payWithEIP2612({
    ...rest,
    routerAddress,
  });
}

export function sendContractEip3009Payment(
  adapter: ContractsAdapter,
  params: Omit<PayWithEIP3009Params, 'routerAddress'> & { network?: string | number; routerAddress?: string }
) {
  const { network, routerAddress: overrideRouter, ...rest } = params;
  const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
  return payWithEIP3009({
    ...rest,
    routerAddress,
  });
}

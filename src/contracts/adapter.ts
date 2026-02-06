import { ethers } from 'ethers';

import { SdkError } from '../core/errors.js';
import type { ContractNetworkConfig, ContractsConfig } from '../core/types.js';
import { findChain } from '../config/chains.js';

export interface ContractsAdapter {
  config: ContractsConfig;
  resolveNetwork: (ref?: string | number) => ContractNetworkConfig;
  providerFor: (ref?: string | number) => ethers.Provider;
}

export function createContractsAdapter(config: ContractsConfig): ContractsAdapter {
  const providerCache = new Map<string, ethers.Provider>();

  const resolveNetwork = (ref?: string | number): ContractNetworkConfig => {
    const networkRef = ref ?? config.defaultNetwork;
    const chain = findChain(networkRef ?? config.defaultNetwork);
    const caip2 = chain?.caip2 ?? String(networkRef);
    const network = config.networks[caip2];
    if (!network) {
      throw new SdkError(
        'UNCONFIGURED_NETWORK',
        `No contracts network config found for ${String(networkRef)}`
      );
    }
    return network;
  };

  const providerFor = (ref?: string | number): ethers.Provider => {
    const network = resolveNetwork(ref);
    const cached = providerCache.get(network.caip2);
    if (cached) {
      return cached;
    }
    const provider = new ethers.JsonRpcProvider(network.rpc.http[0], network.chainId);
    providerCache.set(network.caip2, provider);
    return provider;
  };

  return {
    config,
    resolveNetwork,
    providerFor,
  };
}


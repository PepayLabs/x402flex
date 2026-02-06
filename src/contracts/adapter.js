import { ethers } from 'ethers';
import { SdkError } from '../core/errors.js';
import { findChain } from '../config/chains.js';
export function createContractsAdapter(config) {
    const providerCache = new Map();
    const resolveNetwork = (ref) => {
        const networkRef = ref ?? config.defaultNetwork;
        const chain = findChain(networkRef ?? config.defaultNetwork);
        const caip2 = chain?.caip2 ?? String(networkRef);
        const network = config.networks[caip2];
        if (!network) {
            throw new SdkError('UNCONFIGURED_NETWORK', `No contracts network config found for ${String(networkRef)}`);
        }
        return network;
    };
    const providerFor = (ref) => {
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

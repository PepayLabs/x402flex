import { CHAIN_REGISTRY } from './chains.js';
export const RPC_DEFAULTS = Object.values(CHAIN_REGISTRY).reduce((acc, chain) => {
    acc[chain.caip2] = {
        caip2: chain.caip2,
        rpcHttpPublic: [...chain.rpcHttpPublic],
        rpcWsPublic: chain.rpcWsPublic ? [...chain.rpcWsPublic] : undefined,
        quality: 'public-default',
    };
    return acc;
}, {});

import { CHAIN_REGISTRY } from './chains.js';

export interface RpcDefaultsEntry {
  caip2: string;
  rpcHttpPublic: string[];
  rpcWsPublic?: string[];
  quality: 'public-default';
}

export const RPC_DEFAULTS: Record<string, RpcDefaultsEntry> = Object.values(CHAIN_REGISTRY).reduce(
  (acc, chain) => {
    acc[chain.caip2] = {
      caip2: chain.caip2,
      rpcHttpPublic: [...chain.rpcHttpPublic],
      rpcWsPublic: chain.rpcWsPublic ? [...chain.rpcWsPublic] : undefined,
      quality: 'public-default',
    };
    return acc;
  },
  {} as Record<string, RpcDefaultsEntry>
);


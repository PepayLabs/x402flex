import type { NetworkDescriptor } from '../core/types.js';

export const CHAIN_REGISTRY: Record<string, NetworkDescriptor> = {
  'eip155:56': {
    key: 'bnb',
    chainId: 56,
    caip2: 'eip155:56',
    name: 'BNB Smart Chain',
    testnet: false,
    aliases: ['bnb', 'bsc', 'binance-smart-chain', '56'],
    rpcHttpPublic: ['https://bsc-dataseed.binance.org'],
    rpcQuality: 'public-default',
  },
  'eip155:97': {
    key: 'bnbTestnet',
    chainId: 97,
    caip2: 'eip155:97',
    name: 'BNB Smart Chain Testnet',
    testnet: true,
    aliases: ['bnbtestnet', 'bnb-testnet', 'bsc-testnet', '97'],
    rpcHttpPublic: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    rpcQuality: 'public-default',
  },
  'eip155:1': {
    key: 'ethereum',
    chainId: 1,
    caip2: 'eip155:1',
    name: 'Ethereum Mainnet',
    testnet: false,
    aliases: ['eth', 'ethereum', 'mainnet', '1'],
    rpcHttpPublic: ['https://rpc.ankr.com/eth'],
    rpcQuality: 'public-default',
  },
  'eip155:11155111': {
    key: 'ethereumSepolia',
    chainId: 11155111,
    caip2: 'eip155:11155111',
    name: 'Ethereum Sepolia',
    testnet: true,
    aliases: ['eth-sepolia', 'ethereum-sepolia', 'sepolia', '11155111'],
    rpcHttpPublic: ['https://rpc.sepolia.org'],
    rpcQuality: 'public-default',
  },
  'eip155:43114': {
    key: 'avalanche',
    chainId: 43114,
    caip2: 'eip155:43114',
    name: 'Avalanche C-Chain',
    testnet: false,
    aliases: ['avax', 'avalanche', '43114'],
    rpcHttpPublic: ['https://api.avax.network/ext/bc/C/rpc'],
    rpcQuality: 'public-default',
  },
  'eip155:43113': {
    key: 'avalancheFuji',
    chainId: 43113,
    caip2: 'eip155:43113',
    name: 'Avalanche Fuji',
    testnet: true,
    aliases: ['avax-fuji', 'avalanche-fuji', '43113'],
    rpcHttpPublic: ['https://api.avax-test.network/ext/bc/C/rpc'],
    rpcQuality: 'public-default',
  },
  'eip155:8453': {
    key: 'base',
    chainId: 8453,
    caip2: 'eip155:8453',
    name: 'Base',
    testnet: false,
    aliases: ['base', '8453'],
    rpcHttpPublic: ['https://mainnet.base.org'],
    rpcQuality: 'public-default',
  },
  'eip155:84532': {
    key: 'baseSepolia',
    chainId: 84532,
    caip2: 'eip155:84532',
    name: 'Base Sepolia',
    testnet: true,
    aliases: ['base-sepolia', '84532'],
    rpcHttpPublic: ['https://sepolia.base.org'],
    rpcQuality: 'public-default',
  },
  'eip155:42161': {
    key: 'arbitrum',
    chainId: 42161,
    caip2: 'eip155:42161',
    name: 'Arbitrum One',
    testnet: false,
    aliases: ['arbitrum', 'arb', '42161'],
    rpcHttpPublic: ['https://arb1.arbitrum.io/rpc'],
    rpcQuality: 'public-default',
  },
  'eip155:421614': {
    key: 'arbitrumSepolia',
    chainId: 421614,
    caip2: 'eip155:421614',
    name: 'Arbitrum Sepolia',
    testnet: true,
    aliases: ['arbitrum-sepolia', 'arb-sepolia', '421614'],
    rpcHttpPublic: ['https://sepolia-rollup.arbitrum.io/rpc'],
    rpcQuality: 'public-default',
  },
  'eip155:10': {
    key: 'optimism',
    chainId: 10,
    caip2: 'eip155:10',
    name: 'Optimism',
    testnet: false,
    aliases: ['optimism', 'op', '10'],
    rpcHttpPublic: ['https://mainnet.optimism.io'],
    rpcQuality: 'public-default',
  },
  'eip155:11155420': {
    key: 'optimismSepolia',
    chainId: 11155420,
    caip2: 'eip155:11155420',
    name: 'Optimism Sepolia',
    testnet: true,
    aliases: ['optimism-sepolia', 'op-sepolia', '11155420'],
    rpcHttpPublic: ['https://sepolia.optimism.io'],
    rpcQuality: 'public-default',
  },
  'eip155:10143': {
    key: 'monadTestnet',
    chainId: 10143,
    caip2: 'eip155:10143',
    name: 'Monad Testnet',
    testnet: true,
    aliases: ['monad-testnet', 'monadtestnet', '10143'],
    rpcHttpPublic: ['https://testnet-rpc.monad.xyz'],
    rpcQuality: 'public-default',
  },
  'eip155:0': {
    key: 'monad',
    chainId: 0,
    caip2: 'eip155:0',
    name: 'Monad Mainnet',
    testnet: false,
    aliases: ['monad', 'monad-mainnet', '0'],
    rpcHttpPublic: [],
    rpcQuality: 'public-default',
  },
};

export const REQUIRED_CHAIN_IDS = [
  56,
  97,
  1,
  11155111,
  43114,
  43113,
  8453,
  84532,
  42161,
  421614,
  10,
  11155420,
  10143,
] as const;

function canonicalize(ref: string | number): string {
  if (typeof ref === 'number') return `eip155:${ref}`;
  const trimmed = ref.trim();
  if (/^eip155:\d+$/i.test(trimmed)) return trimmed.toLowerCase();
  return trimmed.toLowerCase();
}

export function findChain(ref: string | number): NetworkDescriptor | undefined {
  const key = canonicalize(ref);
  if (key.startsWith('eip155:')) {
    return CHAIN_REGISTRY[key];
  }
  return Object.values(CHAIN_REGISTRY).find((chain) => chain.aliases.includes(key));
}

export function requireChain(ref: string | number): NetworkDescriptor {
  const chain = findChain(ref);
  if (!chain) {
    throw new Error(`Unsupported chain reference: ${String(ref)}`);
  }
  return chain;
}

export function toCaip2(ref: string | number): string {
  return requireChain(ref).caip2;
}

export function toChainId(ref: string | number): number {
  return requireChain(ref).chainId;
}


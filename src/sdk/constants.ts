/**
 * BNBPay SDK Constants
 */

export const PROTOCOL_VERSION = 1;

export const CHAINS = {
  BNB: 56,
  BNB_TESTNET: 97,
  OPBNB: 204,
  OPBNB_TESTNET: 5611,
  AVAX: 43114,
  AVAX_TESTNET: 43113,
  ARBITRUM: 42161,
  ARBITRUM_TESTNET: 421614,
  POLYGON: 137,
  POLYGON_TESTNET: 80002, // Amoy
  MONAD: 0, // placeholder until mainnet is live
  MONAD_TESTNET: 10143,
} as const;

export const SUPPORTED_CHAIN_IDS = Object.values(CHAINS).filter((id) => id !== 0);

export const RPC_ENDPOINTS = {
  [CHAINS.BNB]: 'https://bsc-dataseed.binance.org',
  [CHAINS.BNB_TESTNET]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [CHAINS.OPBNB]: 'https://opbnb-mainnet-rpc.bnbchain.org',
  [CHAINS.OPBNB_TESTNET]: 'https://opbnb-testnet-rpc.bnbchain.org',
  [CHAINS.AVAX]: 'https://api.avax.network/ext/bc/C/rpc',
  [CHAINS.AVAX_TESTNET]: 'https://api.avax-test.network/ext/bc/C/rpc',
  [CHAINS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [CHAINS.ARBITRUM_TESTNET]: 'https://sepolia-rollup.arbitrum.io/rpc',
  [CHAINS.POLYGON]: 'https://polygon-rpc.com',
  [CHAINS.POLYGON_TESTNET]: 'https://rpc-amoy.polygon.technology',
  [CHAINS.MONAD_TESTNET]: 'https://testnet-rpc.monad.xyz',
} as const;

export const NETWORK_METADATA: Record<number, {
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}> = {
  [CHAINS.BNB]: {
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.BNB]],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  [CHAINS.BNB_TESTNET]: {
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.BNB_TESTNET]],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
  [CHAINS.OPBNB]: {
    chainName: 'opBNB',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.OPBNB]],
    blockExplorerUrls: ['https://mainnet.opbnbscan.com'],
  },
  [CHAINS.OPBNB_TESTNET]: {
    chainName: 'opBNB Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.OPBNB_TESTNET]],
    blockExplorerUrls: ['https://testnet.opbnbscan.com'],
  },
  [CHAINS.AVAX]: {
    chainName: 'Avalanche C-Chain',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.AVAX]],
    blockExplorerUrls: ['https://snowtrace.io'],
  },
  [CHAINS.AVAX_TESTNET]: {
    chainName: 'Avalanche Fuji',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.AVAX_TESTNET]],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
  },
  [CHAINS.ARBITRUM]: {
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.ARBITRUM]],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  [CHAINS.ARBITRUM_TESTNET]: {
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.ARBITRUM_TESTNET]],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
  },
  [CHAINS.POLYGON]: {
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.POLYGON]],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  [CHAINS.POLYGON_TESTNET]: {
    chainName: 'Polygon Amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.POLYGON_TESTNET]],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
  },
  [CHAINS.MONAD_TESTNET]: {
    chainName: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: [RPC_ENDPOINTS[CHAINS.MONAD_TESTNET]],
  },
};

// Token addresses on mainnet
export const MAINNET_TOKENS = {
  BNB: '0x0000000000000000000000000000000000000000', // Native
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  FDUSD: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
  BNBUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  USD1: '0x8d0d000ee44948Fc98c9b98A4Fa4921476F08B0d',
  WUSD: '', // not deployed on mainnet
  XUSD: '', // not deployed on mainnet
} as const;

// Token addresses on testnet
export const TESTNET_TOKENS = {
  BNB: '0x0000000000000000000000000000000000000000', // Native
  USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  USDC: '', // TO BE DEPLOYED
  BUSD: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee',
  USD1: '0xE71Ad4C949dF74c229697b3A8414A0833ABd4165',
  WUSD: '0x5e5ecf5e2512719DE778b88191062114Aa771BCf',
  XUSD: '0xBCa3782BC181446a0bdB87356Bde326559a4FAb2',
} as const;

// Contract addresses (TO BE DEPLOYED)
export const CONTRACTS = {
  [CHAINS.BNB]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.BNB_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.OPBNB]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.OPBNB_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.AVAX]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.AVAX_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.ARBITRUM]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.ARBITRUM_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.POLYGON]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.POLYGON_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.MONAD]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
  [CHAINS.MONAD_TESTNET]: {
    X402FlexRegistry: '',
    SubscriptionManager: '',
    PriceOracle: '',
  },
} as const;

export const TOKEN_DECIMALS: Record<string, number> = {
  BNB: 18,
  USDT: 18,
  USDC: 18,
  FDUSD: 18,
  BNBUSD: 18,
  BUSD: 18,
  USD1: 18,
  XUSD: 18,
  WUSD: 18,
  AVAX: 18,
  MATIC: 18,
  ETH: 18,
};

export const DEFAULT_CONFIRMATION_BLOCKS = {
  [CHAINS.BNB]: 3,
  [CHAINS.BNB_TESTNET]: 1,
  [CHAINS.OPBNB]: 1,
  [CHAINS.OPBNB_TESTNET]: 1,
  [CHAINS.AVAX]: 3,
  [CHAINS.AVAX_TESTNET]: 1,
  [CHAINS.ARBITRUM]: 12,
  [CHAINS.ARBITRUM_TESTNET]: 2,
  [CHAINS.POLYGON]: 64,
  [CHAINS.POLYGON_TESTNET]: 8,
  [CHAINS.MONAD]: 0,
  [CHAINS.MONAD_TESTNET]: 1,
} as const;

export const MAX_REFERENCE_LENGTH = 256;
export const MIN_NONCE_LENGTH = 16;
export const DEFAULT_EXPIRY_SECONDS = 86400; // 24 hours

export const SESSION_EIP712_DOMAIN_NAME = 'X402Flex Session';
export const SESSION_EIP712_DOMAIN_VERSION = '1';

export const CAPABILITIES = {
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  MCP: 'mcp',
  PERMITS: 'permits',
  MULTISIG: 'multisig',
} as const;

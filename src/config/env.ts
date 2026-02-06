import type { ApiConfig, ContractNetworkConfig, RuntimeEnvironment, SdkMode } from '../core/types.js';

import { findChain } from './chains.js';

function splitList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function readEnvironment(env: NodeJS.ProcessEnv): RuntimeEnvironment | undefined {
  const value = env.BNBPAY_SDK_ENVIRONMENT ?? env.NODE_ENV;
  if (!value) return undefined;
  if (value === 'production' || value === 'staging' || value === 'development' || value === 'test') {
    return value;
  }
  return undefined;
}

function readMode(env: NodeJS.ProcessEnv): SdkMode | undefined {
  const mode = env.BNBPAY_SDK_MODE;
  if (mode === 'api' || mode === 'contracts' || mode === 'hybrid') return mode;
  return undefined;
}

function readApi(env: NodeJS.ProcessEnv): ApiConfig | undefined {
  const baseUrl = env.BNBPAY_API_BASE_URL ?? env.BNBPAY_API_URL;
  if (!baseUrl) return undefined;
  const timeoutMs = env.BNBPAY_API_TIMEOUT_MS ? Number(env.BNBPAY_API_TIMEOUT_MS) : undefined;
  return {
    baseUrl,
    apiKey: env.BNBPAY_API_KEY,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
  };
}

interface ChainEnvSpec {
  caip2: string;
  envPrefix: string;
}

const CHAIN_ENV_SPECS: ChainEnvSpec[] = [
  { caip2: 'eip155:56', envPrefix: 'BNB' },
  { caip2: 'eip155:97', envPrefix: 'BNB_TESTNET' },
  { caip2: 'eip155:1', envPrefix: 'ETH' },
  { caip2: 'eip155:11155111', envPrefix: 'ETH_SEPOLIA' },
  { caip2: 'eip155:43114', envPrefix: 'AVAX' },
  { caip2: 'eip155:43113', envPrefix: 'AVAX_TESTNET' },
  { caip2: 'eip155:8453', envPrefix: 'BASE' },
  { caip2: 'eip155:84532', envPrefix: 'BASE_TESTNET' },
  { caip2: 'eip155:42161', envPrefix: 'ARBITRUM' },
  { caip2: 'eip155:421614', envPrefix: 'ARBITRUM_TESTNET' },
  { caip2: 'eip155:10', envPrefix: 'OPTIMISM' },
  { caip2: 'eip155:11155420', envPrefix: 'OPTIMISM_TESTNET' },
  { caip2: 'eip155:10143', envPrefix: 'MONAD_TESTNET' },
  { caip2: 'eip155:0', envPrefix: 'MONAD' },
];

function readChainConfig(
  env: NodeJS.ProcessEnv,
  spec: ChainEnvSpec
): Partial<ContractNetworkConfig> | undefined {
  const chain = findChain(spec.caip2);
  if (!chain) return undefined;
  const http = splitList(env[`${spec.envPrefix}_RPC_HTTP`]) ?? splitList(env[`${spec.envPrefix}_RPC`]);
  const ws = splitList(env[`${spec.envPrefix}_RPC_WS`]);

  const router = env[`${spec.envPrefix}_ROUTER`];
  const registry = env[`${spec.envPrefix}_REGISTRY`];
  const sessionStore = env[`${spec.envPrefix}_SESSION_STORE`];
  const subscriptions = env[`${spec.envPrefix}_SUBSCRIPTIONS`];
  const permit2 = env[`${spec.envPrefix}_PERMIT2`];
  const confirmationsRaw = env[`${spec.envPrefix}_CONFIRMATIONS`];

  const hasContract = Boolean(router || registry || sessionStore || subscriptions || permit2);
  if (!http && !ws && !hasContract && !confirmationsRaw) {
    return undefined;
  }

  const confirmations = confirmationsRaw ? Number(confirmationsRaw) : undefined;
  return {
    chainId: chain.chainId,
    caip2: chain.caip2,
    rpc: {
      http: http ?? chain.rpcHttpPublic,
      ws,
      selection: 'priority',
      quality: 'public-default',
    },
    contracts: {
      router,
      registry,
      sessionStore,
      subscriptions,
      permit2,
    },
    confirmations: Number.isFinite(confirmations) ? confirmations : undefined,
  };
}

export interface EnvConfigResult {
  mode?: SdkMode;
  environment?: RuntimeEnvironment;
  api?: ApiConfig;
  contracts?: {
    defaultNetwork?: string;
    networks?: Record<string, Partial<ContractNetworkConfig>>;
  };
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfigResult {
  const mode = readMode(env);
  const environment = readEnvironment(env);
  const api = readApi(env);

  const networks: Record<string, Partial<ContractNetworkConfig>> = {};
  for (const spec of CHAIN_ENV_SPECS) {
    const chainConfig = readChainConfig(env, spec);
    if (chainConfig) {
      networks[spec.caip2] = chainConfig;
    }
  }

  let defaultNetwork = env.BNBPAY_DEFAULT_NETWORK;
  if (defaultNetwork && !defaultNetwork.startsWith('eip155:')) {
    const chain = findChain(defaultNetwork);
    defaultNetwork = chain?.caip2 ?? defaultNetwork;
  }

  return {
    mode,
    environment,
    api,
    contracts: Object.keys(networks).length > 0 || defaultNetwork
      ? {
          defaultNetwork,
          networks,
        }
      : undefined,
  };
}


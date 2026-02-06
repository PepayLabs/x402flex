import { ethers } from 'ethers';

import type {
  ContractNetworkConfig,
  ResolvedSdkConfig,
  SdkConfig,
  RuntimeEnvironment,
} from '../core/types.js';
import { sdkConfigError } from '../core/errors.js';

import { CHAIN_REGISTRY, findChain, toCaip2 } from './chains.js';
import { buildPreset } from './presets.js';
import { loadEnvConfig } from './env.js';

function mergeContracts(
  base: ResolvedSdkConfig['contracts'] | undefined,
  incoming: { defaultNetwork?: string; networks?: Record<string, Partial<ContractNetworkConfig>> } | undefined
): ResolvedSdkConfig['contracts'] | undefined {
  if (!base && !incoming) return undefined;
  const networks: Record<string, ContractNetworkConfig> = {};

  if (base?.networks) {
    for (const [caip2, cfg] of Object.entries(base.networks)) {
      networks[caip2] = {
        ...cfg,
        rpc: {
          ...cfg.rpc,
          http: [...cfg.rpc.http],
          ws: cfg.rpc.ws ? [...cfg.rpc.ws] : undefined,
        },
        contracts: { ...cfg.contracts },
      };
    }
  }

  if (incoming?.networks) {
    for (const [networkRef, partial] of Object.entries(incoming.networks)) {
      const caip2 = toCaip2(networkRef);
      const chain = CHAIN_REGISTRY[caip2] ?? findChain(caip2);
      const existing = networks[caip2];

      const chainId = partial.chainId ?? chain?.chainId;
      if (!chainId) {
        throw sdkConfigError(`Missing chainId for network ${networkRef}`);
      }

      const merged: ContractNetworkConfig = {
        chainId,
        caip2,
        aliases: chain?.aliases ?? existing?.aliases,
        confirmations: partial.confirmations ?? existing?.confirmations ?? (chain?.testnet ? 1 : 3),
        rpc: {
          http: partial.rpc?.http ?? existing?.rpc.http ?? chain?.rpcHttpPublic ?? [],
          ws: partial.rpc?.ws ?? existing?.rpc.ws ?? chain?.rpcWsPublic,
          selection: partial.rpc?.selection ?? existing?.rpc.selection ?? 'priority',
          quality: partial.rpc?.quality ?? existing?.rpc.quality ?? 'public-default',
        },
        contracts: {
          router: partial.contracts?.router ?? existing?.contracts.router,
          registry: partial.contracts?.registry ?? existing?.contracts.registry,
          sessionStore: partial.contracts?.sessionStore ?? existing?.contracts.sessionStore,
          subscriptions: partial.contracts?.subscriptions ?? existing?.contracts.subscriptions,
          permit2: partial.contracts?.permit2 ?? existing?.contracts.permit2,
        },
      };
      networks[caip2] = merged;
    }
  }

  const defaultNetwork = incoming?.defaultNetwork
    ? toCaip2(incoming.defaultNetwork)
    : base?.defaultNetwork;

  return defaultNetwork || Object.keys(networks).length > 0
    ? {
        defaultNetwork: defaultNetwork ?? Object.keys(networks)[0] ?? 'eip155:97',
        networks,
      }
    : undefined;
}

function normalizeEnvironment(
  explicit?: RuntimeEnvironment,
  inferred?: RuntimeEnvironment
): RuntimeEnvironment {
  return explicit ?? inferred ?? 'development';
}

function normalizeApi(api: SdkConfig['api'] | undefined, envApi: SdkConfig['api'] | undefined) {
  if (!api && !envApi) return undefined;
  return {
    baseUrl: api?.baseUrl ?? envApi?.baseUrl ?? '',
    apiKey: api?.apiKey ?? envApi?.apiKey,
    timeoutMs: api?.timeoutMs ?? envApi?.timeoutMs,
  };
}

function validateResolvedConfig(config: ResolvedSdkConfig): void {
  if (config.mode === 'api') {
    if (!config.api?.baseUrl) {
      throw sdkConfigError('api mode requires api.baseUrl');
    }
  }

  if (config.mode === 'hybrid') {
    if (!config.api?.baseUrl) {
      throw sdkConfigError('hybrid mode requires api.baseUrl');
    }
  }

  if (config.mode === 'contracts') {
    if (!config.contracts || Object.keys(config.contracts.networks).length === 0) {
      throw sdkConfigError('contracts mode requires at least one configured network');
    }
  }

  if (config.contracts) {
    const defaultNetwork = config.contracts.defaultNetwork;
    if (!config.contracts.networks[defaultNetwork]) {
      throw sdkConfigError(`Default network ${defaultNetwork} is not configured`);
    }

    for (const [network, cfg] of Object.entries(config.contracts.networks)) {
      if (!cfg.rpc?.http || cfg.rpc.http.length === 0) {
        throw sdkConfigError(`Network ${network} requires at least one rpc.http endpoint`);
      }
    }
  }
}

export function resolveConfig(input: SdkConfig): ResolvedSdkConfig {
  const env = loadEnvConfig();
  const presetResult = buildPreset(input.preset);
  const contractsFromPreset = presetResult.contracts;
  const contractsFromEnv = env.contracts;
  const contractsMergedPresetEnv = mergeContracts(contractsFromPreset, contractsFromEnv);
  const contracts = mergeContracts(contractsMergedPresetEnv, input.contracts);

  const resolved: ResolvedSdkConfig = {
    mode: input.mode ?? env.mode ?? 'api',
    preset: input.preset ?? presetResult.preset ?? 'none',
    protocolProfile: input.protocolProfile ?? 'auto',
    environment: normalizeEnvironment(input.environment, env.environment),
    api: normalizeApi(input.api, env.api),
    contracts,
  };

  validateResolvedConfig(resolved);
  return resolved;
}

export function networkProvider(config: ContractNetworkConfig): ethers.JsonRpcProvider {
  const endpoint = config.rpc.http[0];
  return new ethers.JsonRpcProvider(endpoint, config.chainId);
}


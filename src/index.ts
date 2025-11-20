import { ethers } from 'ethers';
import {
  FlexAcceptInput,
  FlexAuthorization,
  FlexResponse,
  FlexResponseInput,
  FlexSettlementResult,
  PAYMENT_REGISTRY_ABI,
  PaymentRegistry__factory,
  buildFlexResponse as sdkBuildFlexResponse,
  decodePaymentSettledEvent,
  buildSessionContext as sdkBuildSessionContext,
  auditSessionReceipts,
  formatSessionReference,
  type SessionContextInput,
} from '@bnbpay/sdk';

const PAYMENT_REGISTRY_INTERFACE = PaymentRegistry__factory.createInterface();
const PAYMENT_SETTLED_TOPIC = PAYMENT_REGISTRY_INTERFACE.getEvent('PaymentSettledV2').topicHash;

const SCHEME_REGISTRY: Record<string, { id: string; type: string; sessionCapable: boolean }> = {
  'exact:evm:permit2': { id: 'exact:evm:permit2', type: 'permit2', sessionCapable: true },
  'exact:evm:eip2612': { id: 'exact:evm:eip2612', type: 'eip2612', sessionCapable: true },
  'exact:evm:eip3009': { id: 'exact:evm:eip3009', type: 'eip3009', sessionCapable: true },
  'push:evm:aa4337': { id: 'push:evm:aa4337', type: 'push', sessionCapable: true },
  'push:evm:direct': { id: 'push:evm:direct', type: 'push', sessionCapable: true },
};

export interface RelayConfig {
  endpoint: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export interface FlexResponseOptions extends FlexResponseInput {
  session?: SessionContextInput;
  autoTagReference?: boolean;
}

export interface FlexNetworkConfig {
  provider: ethers.Provider | string;
  registry: string;
  router?: string;
  chainId?: number;
  confirmations?: number;
  relay?: RelayConfig;
}

interface NormalizedNetworkConfig {
  provider: ethers.Provider;
  registry: string;
  router?: string;
  chainId?: number;
  confirmations: number;
  relay?: RelayConfig;
}

export interface FlexMiddlewareContext {
  merchant: string;
  networks: Record<string, FlexNetworkConfig>;
  referenceBuilder?: () => string;
}

export interface SettleWithRouterParams {
  authorization: string | FlexAuthorization;
  paymentIntent?: {
    paymentId: string;
    merchant: string;
    token: string;
    amount: string;
    deadline: number;
    resourceId: string;
  };
  network?: string;
  minConfirmations?: number;
}

export interface FlexMiddlewareHelpers {
  buildFlexResponse: (input: FlexResponseOptions) => FlexResponse;
  settleWithRouter: (params: SettleWithRouterParams) => Promise<FlexSettlementResult>;
  parseAuthorization: (auth: string | FlexAuthorization) => FlexAuthorization;
  buildSessionContext: typeof sdkBuildSessionContext;
  auditSessionReceipts: typeof auditSessionReceipts;
  attachSessionToResponse: (
    response: FlexResponse,
    session: SessionContextInput,
    options?: { defaultAgent?: string; autoTagReference?: boolean }
  ) => FlexResponse;
}

export function createFlexMiddleware(context: FlexMiddlewareContext): FlexMiddlewareHelpers {
  const merchant = ethers.getAddress(context.merchant);
  const networks = normalizeNetworks(context.networks);
  const referenceBuilder = context.referenceBuilder ?? (() => `order_${Date.now()}`);

  function buildFlexResponse(input: FlexResponseOptions): FlexResponse {
    const acceptsWithDefaults: FlexAcceptInput[] = input.accepts.map((accept) => {
      const networkDefaults = networks[accept.network];
      const payTo = accept.payTo ?? merchant;
      const chainId = accept.chainId ?? networkDefaults?.chainId;

      if (!chainId) {
        throw new Error(`Missing chainId for network ${accept.network}`);
      }

      const routerAddress = accept.router?.address ?? networkDefaults?.router;
      const router = routerAddress
        ? {
            ...accept.router,
            address: routerAddress,
          }
        : accept.router;

      const schemeMeta = getSchemeMetadata(accept.scheme);
      return {
        ...accept,
        payTo,
        chainId,
        router,
        metadata: {
          ...accept.metadata,
          scheme: schemeMeta,
        },
      };
    });

    const baseResponse = sdkBuildFlexResponse({
      ...input,
      merchant: input.merchant ?? merchant,
      referenceId: input.referenceId ?? referenceBuilder(),
      accepts: acceptsWithDefaults,
    });

    const enriched = enrichSchemeMetadata(baseResponse);
    if (input.session) {
      return attachSessionToResponse(enriched, input.session, {
        autoTagReference: input.autoTagReference,
      });
    }
    return enriched;
  }

  async function _settleWithRouter(
    params: SettleWithRouterParams & { authorization: FlexAuthorization }
  ): Promise<FlexSettlementResult> {
    const authorization = params.authorization;
    const networkKey = params.network ?? authorization.network;
    const network = networks[networkKey];

    if (!network) {
      throw new Error(`No network configuration found for ${networkKey}`);
    }

    const receipt = await network.provider.getTransactionReceipt(authorization.txHash);
    if (!receipt) {
      return {
        success: false,
        network: networkKey,
        error: 'TX_NOT_FOUND',
        proof: {
          txHash: authorization.txHash,
          network: networkKey,
          blockNumber: 0,
          confirmations: 0,
        },
      };
    }

    const currentBlock = await network.provider.getBlockNumber();
    const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);

    const status = (receipt as any).status;
    const isSuccess = status === 1 || status === 'success';
    if (!isSuccess) {
      return {
        success: false,
        network: networkKey,
        error: 'TX_REVERTED',
        proof: {
          txHash: authorization.txHash,
          network: networkKey,
          blockNumber: receipt.blockNumber,
          confirmations,
        },
      };
    }

    const requiredConfirmations = params.minConfirmations ?? network.confirmations;
    if (confirmations < requiredConfirmations) {
      return {
        success: false,
        network: networkKey,
        error: 'INSUFFICIENT_CONFIRMATIONS',
        proof: {
          txHash: authorization.txHash,
          network: networkKey,
          blockNumber: receipt.blockNumber,
          confirmations,
        },
      };
    }

    const eventLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === network.registry.toLowerCase() &&
        log.topics[0] === PAYMENT_SETTLED_TOPIC
    );

    if (!eventLog) {
      return {
        success: false,
        network: networkKey,
        error: 'PAYMENT_EVENT_NOT_FOUND',
        proof: {
          txHash: authorization.txHash,
          network: networkKey,
          blockNumber: receipt.blockNumber,
          confirmations,
        },
      };
    }

    const decoded = decodePaymentSettledEvent({
      data: eventLog.data,
      topics: eventLog.topics,
      blockNumber: receipt.blockNumber,
      transactionHash: authorization.txHash,
    });

    if (params.paymentIntent && decoded.paymentId !== params.paymentIntent.paymentId) {
      return {
        success: false,
        network: networkKey,
        error: 'PAYMENT_ID_MISMATCH',
        proof: {
          txHash: authorization.txHash,
          network: networkKey,
          blockNumber: receipt.blockNumber,
          confirmations,
          paymentId: decoded.paymentId,
        },
      };
    }

    return {
      success: true,
      network: networkKey,
      paymentId: decoded.paymentId,
      schemeId: decoded.schemeId,
      resourceId: decoded.resourceId,
      reference: decoded.referenceData,
      session: decoded.session,
      proof: {
        txHash: authorization.txHash,
        network: networkKey,
        blockNumber: receipt.blockNumber,
        confirmations,
        paymentId: decoded.paymentId,
        schemeId: decoded.schemeId,
        resourceId: decoded.resourceId,
        reference: decoded.referenceData,
        session: decoded.session,
        merchant: decoded.merchant,
        payer: decoded.payer,
        token: decoded.token,
        amount: typeof decoded.amount === 'bigint'
          ? decoded.amount.toString()
          : decoded.amount?.toString?.() ?? decoded.amount,
      },
    };
  }

  function parseAuthorization(auth: string | FlexAuthorization): FlexAuthorization {
    if (typeof auth === 'string') {
      const parsed = JSON.parse(auth);
      return {
        network: parsed.network,
        txHash: parsed.txHash,
        blockNumber: parsed.blockNumber,
        timestamp: parsed.timestamp,
        relayPayload: parsed.relayPayload,
      } as FlexAuthorization;
    }
    return auth;
  }

  function normalizeAuthorization(auth: FlexAuthorization, network: string): FlexAuthorization {
    return {
      ...auth,
      network: auth.network ?? network,
    };
  }

  return {
    buildFlexResponse,
    settleWithRouter: async (params) => {
      const parsed = parseAuthorization(params.authorization);
      const networkKey = params.network ?? parsed.network;
      if (!networkKey) {
        throw new Error('Authorization payload must include network');
      }
      const network = networks[networkKey];
      if (!network) {
        throw new Error(`No network configuration found for ${networkKey}`);
      }

      const normalizedAuth = normalizeAuthorization(parsed, networkKey);
      const authWithHash = await ensureAuthorizationTxHash(normalizedAuth, networkKey, network);
      return _settleWithRouter({ ...params, authorization: authWithHash, network: networkKey });
    },
    parseAuthorization,
    buildSessionContext: sdkBuildSessionContext,
    auditSessionReceipts,
    attachSessionToResponse: (
      response: FlexResponse,
      sessionInput: SessionContextInput,
      options?: { defaultAgent?: string; autoTagReference?: boolean }
    ) => attachSessionToResponse(response, sessionInput, options),
  };
}

export { createFlexExpressMiddleware } from './express.js';

function normalizeNetworks(networks: Record<string, FlexNetworkConfig>): Record<string, NormalizedNetworkConfig> {
  return Object.entries(networks).reduce<Record<string, NormalizedNetworkConfig>>((acc, [key, cfg]) => {
    const provider = typeof cfg.provider === 'string'
      ? new ethers.JsonRpcProvider(cfg.provider)
      : cfg.provider;
    acc[key] = {
      provider,
      registry: ethers.getAddress(cfg.registry),
      router: cfg.router ? ethers.getAddress(cfg.router) : undefined,
      chainId: cfg.chainId,
      confirmations: cfg.confirmations ?? 1,
      relay: cfg.relay,
    };
    return acc;
  }, {});
}

async function ensureAuthorizationTxHash(
  authorization: FlexAuthorization,
  networkKey: string,
  network: NormalizedNetworkConfig
): Promise<FlexAuthorization> {
  if (authorization.txHash) {
    return authorization;
  }

  if (!network.relay) {
    throw new Error(
      `Authorization for network ${networkKey} is missing txHash and no relay configuration is available`
    );
  }

  if (!authorization.relayPayload) {
    throw new Error('Relay payload required when txHash is missing');
  }

  const relayResponse = await invokeRelay(network.relay, {
    network: networkKey,
    payload: authorization.relayPayload,
  });

  if (!relayResponse.txHash) {
    throw new Error('Relay did not return a transaction hash');
  }

  return {
    ...authorization,
    txHash: relayResponse.txHash,
    blockNumber: relayResponse.blockNumber ?? authorization.blockNumber,
    timestamp: relayResponse.timestamp ?? authorization.timestamp,
  };
}

async function invokeRelay(relay: RelayConfig, body: Record<string, unknown>) {
  const fetchFn = relay.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!fetchFn) {
    throw new Error('Relay fetch implementation not available');
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (relay.apiKey) {
    headers['x-api-key'] = relay.apiKey;
  }
  const response = await fetchFn(relay.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Relay request failed (${response.status}): ${text}`);
  }
  return response.json();
}

function attachSessionToResponse(
  response: FlexResponse,
  sessionInput: SessionContextInput,
  options?: { defaultAgent?: string; autoTagReference?: boolean }
): FlexResponse {
  const sessionCtx = sdkBuildSessionContext(sessionInput, { defaultAgent: options?.defaultAgent });
  const autoTag = options?.autoTagReference ?? true;

  const accepts = response.accepts.map((option) => {
    let reference = option.reference;
    if (autoTag && option.router?.intent?.resourceId) {
      reference = formatSessionReference(reference, sessionCtx.sessionId, option.router.intent.resourceId);
    }

    const metadata = {
      ...option.metadata,
      session: {
        sessionId: sessionCtx.sessionId,
        agent: sessionCtx.agent,
      },
    };

    return {
      ...option,
      reference,
      metadata,
    };
  });

  return {
    ...response,
    accepts,
  };
}

function getSchemeMetadata(scheme: string) {
  const key = scheme.toLowerCase();
  return SCHEME_REGISTRY[key] ?? { id: scheme, type: 'custom', sessionCapable: true };
}

function enrichSchemeMetadata(response: FlexResponse): FlexResponse {
  const accepts = response.accepts.map((option) => ({
    ...option,
    metadata: {
      ...option.metadata,
      scheme: getSchemeMetadata(option.scheme),
    },
  }));
  return { ...response, accepts };
}

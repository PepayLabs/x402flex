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

export interface FlexNetworkConfig {
  provider: ethers.Provider | string;
  registry: string;
  router?: string;
  chainId?: number;
  confirmations?: number;
}

interface NormalizedNetworkConfig {
  provider: ethers.Provider;
  registry: string;
  router?: string;
  chainId?: number;
  confirmations: number;
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
  buildFlexResponse: (input: FlexResponseInput) => FlexResponse;
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

  function buildFlexResponse(input: FlexResponseInput): FlexResponse {
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

      return {
        ...accept,
        payTo,
        chainId,
        router,
      };
    });

    return sdkBuildFlexResponse({
      ...input,
      merchant: input.merchant ?? merchant,
      referenceId: input.referenceId ?? referenceBuilder(),
      accepts: acceptsWithDefaults,
    });
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
      } as FlexAuthorization;
    }
    return auth;
  }

  function ensureAuthorizationPayload(auth: FlexAuthorization): FlexAuthorization {
    if (!auth.network || !auth.txHash) {
      throw new Error('Authorization payload must include network and txHash');
    }
    return auth;
  }

  return {
    buildFlexResponse,
    settleWithRouter: async (params) => {
      const parsed = ensureAuthorizationPayload(parseAuthorization(params.authorization));
      return _settleWithRouter({ ...params, authorization: parsed });
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
    };
    return acc;
  }, {});
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

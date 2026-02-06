import { ethers } from 'ethers';
import {
  createFlexIntent,
  buildFlexResponse,
  decodePaymentSettledEvent,
  getFlexSchemeId,
  buildSessionContext,
  auditSessionReceipts,
  formatSessionReference,
  parseSessionReference,
  buildSessionGrantTypedData,
  buildSessionGrantDigest,
  buildClaimableSessionGrantTypedData,
  buildClaimableSessionGrantDigest,
  buildClaimSessionTypedData,
  buildClaimSessionDigest,
} from './sdk/index.js';

import type { SdkConfig, ResolvedSdkConfig } from './core/types.js';
import { SdkError } from './core/errors.js';
import { resolveSchemeId } from './core/schemes.js';
import { resolveConfig } from './config/resolve.js';
import { CHAIN_REGISTRY, findChain, toCaip2, toChainId } from './config/chains.js';
import { resolveProtocolProfile } from './profiles/protocol-profiles.js';
import { headersForProfile } from './profiles/headers.js';
import { createContractsAdapter } from './contracts/adapter.js';
import {
  canPayOnContracts,
  sendContractRouterPayment,
  sendContractPermit2Payment,
  sendContractEip2612Payment,
  sendContractEip3009Payment,
} from './contracts/payments.js';
import {
  getSession,
  getSessionState,
  getSessionSpendNonce,
} from './contracts/sessions.js';
import {
  createSubscriptionWithSig,
  chargeExistingSubscription,
  cancelExistingSubscription,
  getSubscriptionState,
  isDueSubscription,
  computeSubId,
} from './contracts/subscriptions.js';
import {
  buildCreateSubscriptionTypedData,
  buildCreateSubscriptionDigest,
  buildCancelSubscriptionTypedData,
  buildCancelSubscriptionDigest,
} from './modules/subscriptions/intents.js';
import { createResourceServer } from './endpoint/resource-server.js';
import { createPaymentClient } from './client/payment-client.js';
import { wrapFetchWithPayment } from './client/wrap-fetch.js';
import { wrapAxiosWithPayment } from './client/wrap-axios.js';
import { createFacilitatorClient } from './facilitator/client.js';
import { createFlexMiddleware } from './flex-middleware.js';
import { createBnbpayApiAdapter } from './api/adapter.js';

type ApiClient = any;
type BuildIntentRequest = any;

function warnPublicRpcUsage(config: ResolvedSdkConfig): void {
  if (!config.contracts) return;
  if (config.environment === 'test' || config.environment === 'development') return;
  if (process.env.BNBPAY_SDK_SUPPRESS_PUBLIC_RPC_WARNING === '1') return;
  const usesPublic = Object.values(config.contracts.networks).some(
    (network) => network.rpc.quality !== 'recommended-production'
  );
  if (usesPublic) {
    console.warn(
      '[x402flex] Public RPC defaults are best-effort only. For production, configure dedicated provider endpoints.'
    );
  }
}

function requireApi(api: ApiClient | undefined): ApiClient {
  if (!api) {
    throw new SdkError('MISSING_API_CLIENT', 'This operation requires api mode or hybrid mode with api.baseUrl');
  }
  return api;
}

function requireContracts<T>(contracts: T | undefined): T {
  if (!contracts) {
    throw new SdkError(
      'UNSUPPORTED_MODE',
      'This operation requires contracts mode or hybrid mode with contracts configuration'
    );
  }
  return contracts;
}

function mapMinimalSchemeToCanonical(scheme: string): string {
  if (scheme === 'aa_push') return 'push:evm:direct';
  if (scheme === 'permit2') return 'exact:evm:permit2';
  if (scheme === 'eip2612') return 'exact:evm:eip2612';
  if (scheme === 'eip3009') return 'exact:evm:eip3009';
  return scheme;
}

function mapNetworkToApiKey(network?: string | number): string | undefined {
  if (network === undefined || network === null) return undefined;
  const chain = findChain(network);
  return chain?.key ?? (typeof network === 'string' ? network : undefined);
}

function localBuildIntent(
  request: BuildIntentRequest,
  networkResolver: (network?: string | number) => {
    chainId: number;
    caip2: string;
    contracts: { router?: string };
  }
) {
  const now = Math.floor(Date.now() / 1000);
  if ((request as any).mode === 'minimal') {
    const minimal = request as any;
    const network = networkResolver(minimal.network);
    const decimals = minimal.decimals ?? 18;
    const amountWei = ethers.parseUnits(minimal.amount, decimals);
    const intentResult = createFlexIntent({
      merchant: minimal.merchant,
      token: minimal.token,
      amount: amountWei,
      chainId: network.chainId,
      referenceId: minimal.referenceId ?? minimal.baseReference,
      scheme: mapMinimalSchemeToCanonical(minimal.scheme),
      sessionId: minimal.sessionId,
      payer: minimal.payer,
      salt: minimal.salt,
      deadlineSeconds: minimal.deadlineSeconds ?? 3600,
    } as any);
    const intentNonce = (intentResult.intent as any).nonce ?? ethers.ZeroHash;
    const schemeId = resolveSchemeId(mapMinimalSchemeToCanonical(minimal.scheme));
    return {
      input: {
        chainId: network.chainId,
        merchant: ethers.getAddress(minimal.merchant),
        token: ethers.getAddress(minimal.token),
        amount: minimal.amount,
        amountWei: amountWei.toString(),
        decimals,
        scheme: mapMinimalSchemeToCanonical(minimal.scheme),
        schemeRequested: minimal.scheme,
        deadline: intentResult.intent.deadline,
        sessionId: minimal.sessionId ?? null,
        payer: minimal.payer ?? ethers.ZeroAddress,
        referenceId: intentResult.referenceId,
        baseReference: minimal.baseReference ?? intentResult.referenceId,
        salt: intentResult.witness.salt,
      },
      derived: {
        resourceId: intentResult.resourceId,
        referenceDataTagged: minimal.sessionId
          ? formatSessionReference(intentResult.referenceId, minimal.sessionId, intentResult.resourceId)
          : intentResult.referenceId,
        referenceHash: intentResult.intent.referenceHash,
        paymentId: intentResult.paymentId,
        intent: {
          paymentId: intentResult.intent.paymentId,
          merchant: intentResult.intent.merchant,
          token: intentResult.intent.token,
          amount: intentResult.intent.amount.toString(),
          deadline: intentResult.intent.deadline,
          payer: intentResult.intent.payer,
          resourceId: intentResult.intent.resourceId,
          referenceHash: intentResult.intent.referenceHash,
          nonce: intentNonce,
        },
        intentHash: intentResult.witness.intentHash,
      },
      signing: {
        routerDomain: {
          name: 'X402FlexRouter',
          version: '1',
          chainId: network.chainId,
          verifyingContract: network.contracts.router ?? ethers.ZeroAddress,
        },
        permit2WitnessTypeString:
          'FlexWitness witness)PaymentIntent(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 deadline,address payer,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)',
        permit2WitnessMode: 'struct_hash',
      },
      hints: {
        deadlineSecondsDefaulted: minimal.deadlineSeconds == null,
        saltAutoGenerated: minimal.salt == null,
        referenceAutoGenerated: minimal.referenceId == null && minimal.baseReference == null,
        canonicalReference: intentResult.referenceId,
        schemeSelected: schemeId,
        schemeRequested: minimal.scheme ?? null,
        requiresBundle: minimal.scheme === 'permit2',
      },
      paymentId: intentResult.paymentId,
      intent: {
        paymentId: intentResult.intent.paymentId,
        merchant: intentResult.intent.merchant,
        token: intentResult.intent.token,
        amount: intentResult.intent.amount.toString(),
        deadline: intentResult.intent.deadline,
        resourceId: intentResult.intent.resourceId,
        payer: intentResult.intent.payer,
        referenceHash: intentResult.intent.referenceHash,
        nonce: intentNonce,
      },
      witness: {
        schemeId: intentResult.witness.schemeId,
        intentHash: intentResult.witness.intentHash,
        payer: intentResult.witness.payer,
        salt: intentResult.witness.salt,
      },
      deadline: intentResult.intent.deadline,
      resourceId: intentResult.resourceId,
    };
  }

  const advanced = request as any;
  const network = networkResolver(advanced.chainId);
  const amountWei = BigInt(advanced.amountWei);
    const intentResult = createFlexIntent({
      merchant: advanced.merchant,
      token: advanced.token,
      amount: amountWei,
      chainId: network.chainId,
    referenceId: advanced.referenceId,
    scheme: advanced.schemeId,
    payer: advanced.payer,
      sessionId: advanced.sessionId,
      salt: advanced.salt,
      deadline: advanced.deadline ?? now + 3600,
    } as any);
    const intentNonce = (intentResult.intent as any).nonce ?? ethers.ZeroHash;
  return {
    input: {
      chainId: network.chainId,
      merchant: ethers.getAddress(advanced.merchant),
      token: ethers.getAddress(advanced.token),
      amount: ethers.formatUnits(amountWei, 18),
      amountWei: amountWei.toString(),
      decimals: 18,
      scheme: advanced.schemeId,
      schemeRequested: advanced.schemeId,
      deadline: intentResult.intent.deadline,
      sessionId: advanced.sessionId ?? null,
      payer: advanced.payer ?? ethers.ZeroAddress,
      referenceId: advanced.referenceId,
      baseReference: advanced.baseReference ?? advanced.referenceId,
      salt: advanced.salt,
    },
    derived: {
      resourceId: intentResult.resourceId,
      referenceDataTagged: advanced.sessionId
        ? formatSessionReference(advanced.referenceId, advanced.sessionId, intentResult.resourceId)
        : advanced.referenceId,
      referenceHash: intentResult.intent.referenceHash,
      paymentId: intentResult.paymentId,
      intent: {
        paymentId: intentResult.intent.paymentId,
        merchant: intentResult.intent.merchant,
        token: intentResult.intent.token,
        amount: intentResult.intent.amount.toString(),
        deadline: intentResult.intent.deadline,
        payer: intentResult.intent.payer,
        resourceId: intentResult.intent.resourceId,
        referenceHash: intentResult.intent.referenceHash,
        nonce: intentNonce,
      },
      intentHash: intentResult.witness.intentHash,
    },
    signing: {
      routerDomain: {
        name: 'X402FlexRouter',
        version: '1',
        chainId: network.chainId,
        verifyingContract: network.contracts.router ?? ethers.ZeroAddress,
      },
      permit2WitnessTypeString:
        'FlexWitness witness)PaymentIntent(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 deadline,address payer,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)',
      permit2WitnessMode: 'struct_hash',
    },
    hints: {
      deadlineSecondsDefaulted: false,
      saltAutoGenerated: false,
      referenceAutoGenerated: false,
      canonicalReference: advanced.referenceId,
      schemeSelected: advanced.schemeId,
      schemeRequested: advanced.schemeId,
      requiresBundle: false,
    },
    paymentId: intentResult.paymentId,
    intent: {
      paymentId: intentResult.intent.paymentId,
      merchant: intentResult.intent.merchant,
      token: intentResult.intent.token,
      amount: intentResult.intent.amount.toString(),
      deadline: intentResult.intent.deadline,
      resourceId: intentResult.intent.resourceId,
      payer: intentResult.intent.payer,
      referenceHash: intentResult.intent.referenceHash,
      nonce: intentNonce,
    },
    witness: {
      schemeId: intentResult.witness.schemeId,
      intentHash: intentResult.witness.intentHash,
      payer: intentResult.witness.payer,
      salt: intentResult.witness.salt,
    },
    deadline: intentResult.intent.deadline,
    resourceId: intentResult.resourceId,
  };
}

export function createClient(input: SdkConfig) {
  const resolved = resolveConfig(input);
  const api = resolved.api
    ? createBnbpayApiAdapter({
        baseUrl: resolved.api.baseUrl,
        apiKey: resolved.api.apiKey,
      })
    : undefined;
  const contracts = resolved.contracts ? createContractsAdapter(resolved.contracts) : undefined;
  const protocolProfile = resolveProtocolProfile(resolved.protocolProfile);
  const headerPolicy = headersForProfile(protocolProfile);
  warnPublicRpcUsage(resolved);

  const resolveContractNetwork = (network?: string | number) => {
    return requireContracts(contracts).resolveNetwork(network);
  };

  const sdk = {
    config: resolved,
    protocolProfile,
    headers: headerPolicy,
    networks: {
      listSupported: () => Object.values(CHAIN_REGISTRY),
      toCaip2,
      toChainId,
      resolve: (network: string | number) => findChain(network),
      configured: () => (contracts ? Object.values(contracts.config.networks) : []),
    },
    intents: {
      create: createFlexIntent,
      build: async (request: BuildIntentRequest) => {
        if (resolved.mode === 'api') {
          return requireApi(api).payments.buildIntent(request);
        }
        if (resolved.mode === 'hybrid') {
          try {
            return await requireApi(api).payments.buildIntent(request);
          } catch {
            if (!contracts) throw new SdkError('UNSUPPORTED_OPERATION', 'No contracts adapter available');
            return localBuildIntent(request, resolveContractNetwork);
          }
        }
        return localBuildIntent(request, resolveContractNetwork);
      },
    },
    payments: {
      canPay: async (params: {
        network?: string | number;
        from: string;
        to: string;
        token?: string;
        amount?: string | number;
        amountWei?: bigint;
        decimals?: number;
      }) => {
        if (resolved.mode === 'api') {
          const network = mapNetworkToApiKey(params.network);
          return requireApi(api).payments.canPay({
            network: (network ?? 'bnbTestnet') as any,
            from: params.from,
            to: params.to,
            token: params.token,
            amount: params.amountWei
              ? ethers.formatUnits(params.amountWei, params.decimals ?? 18)
              : String(params.amount ?? '0'),
          } as any);
        }

        if (resolved.mode === 'hybrid') {
          const networkKey = mapNetworkToApiKey(params.network);
          if (api && networkKey) {
            try {
              return await api.payments.canPay({
                network: networkKey as any,
                from: params.from,
                to: params.to,
                token: params.token,
                amount: params.amountWei
                  ? ethers.formatUnits(params.amountWei, params.decimals ?? 18)
                  : String(params.amount ?? '0'),
              } as any);
            } catch {
              // fallback to direct contracts
            }
          }
        }

        if (!contracts) {
          throw new SdkError('UNSUPPORTED_OPERATION', 'No contracts adapter available for canPay');
        }
        const amount = params.amountWei ?? (() => {
          if (params.amount == null) {
            throw new SdkError('SDK_CONFIG_ERROR', 'canPay requires amount or amountWei');
          }
          const decimals = params.decimals ?? 18;
          return ethers.parseUnits(String(params.amount), decimals);
        })();
        return canPayOnContracts(contracts, {
          network: params.network,
          token: params.token,
          from: params.from,
          to: params.to,
          amount,
        });
      },
      list: (params?: Record<string, unknown>) => requireApi(api).payments.list(params as any),
      get: (paymentId: string) => requireApi(api).payments.get(paymentId),
      status: (paymentId: string, network?: string | number) =>
        requireApi(api).payments.status(paymentId, network ? ({ network: mapNetworkToApiKey(network) } as any) : undefined),
      buildIntent: async (request: BuildIntentRequest) => sdk.intents.build(request),
      sendRouterPayment: (params: any) => sendContractRouterPayment(requireContracts(contracts), params),
      payWithPermit2: (params: any) => sendContractPermit2Payment(requireContracts(contracts), params),
      payWithEIP2612: (params: any) => sendContractEip2612Payment(requireContracts(contracts), params),
      payWithEIP3009: (params: any) => sendContractEip3009Payment(requireContracts(contracts), params),
    },
    x402: {
      buildRoute: buildFlexResponse,
      buildResponse: buildFlexResponse,
      createIntent: createFlexIntent,
      getSchemeId: getFlexSchemeId,
      decodePaymentSettledEvent,
      createResourceServer,
      createPaymentClient,
      wrapFetchWithPayment,
      wrapAxiosWithPayment,
      createFacilitatorClient,
      createMiddleware: createFlexMiddleware,
    },
    sessions: {
      buildSessionContext,
      buildSessionGrantTypedData,
      buildSessionGrantDigest,
      buildClaimableSessionGrantTypedData,
      buildClaimableSessionGrantDigest,
      buildClaimSessionTypedData,
      buildClaimSessionDigest,
      formatSessionReference,
      parseSessionReference,
      auditSessionReceipts,
      list: (params: any) => requireApi(api).sessions.list(params),
      listByAgent: (address: string, params?: any) => requireApi(api).sessions.listByAgent(address, params),
      get: (sessionId: string) => requireApi(api).sessions.get(sessionId),
      spends: (sessionId: string, params?: any) => requireApi(api).sessions.spends(sessionId, params),
      payments: (sessionId: string, params?: any) => requireApi(api).sessions.payments(sessionId, params),
      getContractSession: (sessionId: string, network?: string | number) =>
        getSession(requireContracts(contracts), sessionId, network),
      getContractSessionState: (sessionId: string, network?: string | number) =>
        getSessionState(requireContracts(contracts), sessionId, network),
      getContractSpendNonce: (sessionId: string, network?: string | number) =>
        getSessionSpendNonce(requireContracts(contracts), sessionId, network),
    },
    subscriptions: {
      buildCreateTypedData: buildCreateSubscriptionTypedData,
      buildCreateDigest: buildCreateSubscriptionDigest,
      buildCancelTypedData: buildCancelSubscriptionTypedData,
      buildCancelDigest: buildCancelSubscriptionDigest,
      createWithSig: (request: any, network?: string | number) =>
        createSubscriptionWithSig(requireContracts(contracts), request, network),
      charge: (subId: string, network?: string | number) =>
        chargeExistingSubscription(requireContracts(contracts), subId, network),
      cancel: (subId: string, deadline: number, signature?: string, network?: string | number) =>
        cancelExistingSubscription(requireContracts(contracts), subId, deadline, signature, network),
      get: (subId: string, network?: string | number) =>
        getSubscriptionState(requireContracts(contracts), subId, network),
      isDue: (subId: string, network?: string | number) =>
        isDueSubscription(requireContracts(contracts), subId, network),
      computeId: (request: any, network?: string | number) =>
        computeSubId(requireContracts(contracts), request, network),
    },
    relay: {
      payment: (payload: any) => requireApi(api).relay.payment(payload),
      permit2Bundle: (payload: any) => requireApi(api).relay.permit2Bundle(payload),
      sessionOpen: (payload: any) => requireApi(api).relay.sessionOpen(payload),
      sessionOpenClaimable: (payload: any) => requireApi(api).relay.sessionOpenClaimable(payload),
      sessionClaim: (payload: any) => requireApi(api).relay.sessionClaim(payload),
      sessionRevoke: (payload: any) => requireApi(api).relay.sessionRevoke(payload),
    },
    invoices: {
      create: (payload: any) => requireApi(api).invoices.create(payload),
      get: (invoiceId: string) => requireApi(api).invoices.get(invoiceId),
      status: (invoiceId: string) => requireApi(api).invoices.status(invoiceId),
      cancel: (invoiceId: string) => requireApi(api).invoices.cancel(invoiceId),
      confirmPayment: (invoiceId: string, payload: any) => requireApi(api).invoices.confirmPayment(invoiceId, payload),
      streamSseUrl: (invoiceId: string) => requireApi(api).invoices.streamSseUrl(invoiceId),
      streamWsUrl: (invoiceId: string) => requireApi(api).invoices.streamWsUrl(invoiceId),
    },
    giftcards: {
      create: (payload: any) => requireApi(api).giftcards.create(payload),
      claim: (payload: any) => requireApi(api).giftcards.claim(payload),
      redeem: (payload: any) => requireApi(api).giftcards.redeem(payload),
      cancel: (cardId: string) => requireApi(api).giftcards.cancel(cardId),
      get: (cardId: string) => requireApi(api).giftcards.get(cardId),
      list: (params?: any) => requireApi(api).giftcards.list(params),
    },
    api,
  };

  return sdk;
}

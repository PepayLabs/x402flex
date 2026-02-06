import { ethers } from 'ethers';
import { createFlexIntent, buildFlexResponse, decodePaymentSettledEvent, getFlexSchemeId, buildSessionContext, auditSessionReceipts, formatSessionReference, parseSessionReference, buildSessionGrantTypedData, buildSessionGrantDigest, buildClaimableSessionGrantTypedData, buildClaimableSessionGrantDigest, buildClaimSessionTypedData, buildClaimSessionDigest, } from './sdk/index.js';
import { SdkError } from './core/errors.js';
import { resolveSchemeId } from './core/schemes.js';
import { resolveConfig } from './config/resolve.js';
import { CHAIN_REGISTRY, findChain, toCaip2, toChainId } from './config/chains.js';
import { DEFAULT_PROTOCOL_PROFILE, resolveProtocolProfile } from './profiles/protocol-profiles.js';
import { headersForProfile } from './profiles/headers.js';
import { createContractsAdapter } from './contracts/adapter.js';
import { canPayOnContracts, sendContractRouterPayment, sendContractPermit2Payment, sendContractEip2612Payment, sendContractEip3009Payment, } from './contracts/payments.js';
import { getSession, getSessionState, getSessionSpendNonce, } from './contracts/sessions.js';
import { createSubscriptionWithSig, chargeExistingSubscription, cancelExistingSubscription, getSubscriptionState, isDueSubscription, computeSubId, } from './contracts/subscriptions.js';
import { buildCreateSubscriptionTypedData, buildCreateSubscriptionDigest, buildCancelSubscriptionTypedData, buildCancelSubscriptionDigest, } from './modules/subscriptions/intents.js';
import { createResourceServer } from './endpoint/resource-server.js';
import { createPaymentClient } from './client/payment-client.js';
import { wrapFetchWithPayment } from './client/wrap-fetch.js';
import { wrapAxiosWithPayment } from './client/wrap-axios.js';
import { createFacilitatorClient } from './facilitator/client.js';
import { createFlexMiddleware } from './flex-middleware.js';
import { createBnbpayApiAdapter } from './api/adapter.js';
function warnPublicRpcUsage(config) {
    if (!config.contracts)
        return;
    if (config.environment === 'test' || config.environment === 'development')
        return;
    if (process.env.BNBPAY_SDK_SUPPRESS_PUBLIC_RPC_WARNING === '1')
        return;
    const usesPublic = Object.values(config.contracts.networks).some((network) => network.rpc.quality !== 'recommended-production');
    if (usesPublic) {
        console.warn('[x402flex] Public RPC defaults are best-effort only. For production, configure dedicated provider endpoints.');
    }
}
function requireApi(api) {
    if (!api) {
        throw new SdkError('MISSING_API_CLIENT', 'This operation requires api mode or hybrid mode with api.baseUrl');
    }
    return api;
}
function requireContracts(contracts) {
    if (!contracts) {
        throw new SdkError('UNSUPPORTED_MODE', 'This operation requires contracts mode or hybrid mode with contracts configuration');
    }
    return contracts;
}
function mapMinimalSchemeToCanonical(scheme) {
    if (scheme === 'aa_push')
        return 'push:evm:direct';
    if (scheme === 'permit2')
        return 'exact:evm:permit2';
    if (scheme === 'eip2612')
        return 'exact:evm:eip2612';
    if (scheme === 'eip3009')
        return 'exact:evm:eip3009';
    return scheme;
}
function mapNetworkToApiKey(network) {
    if (network === undefined || network === null)
        return undefined;
    const chain = findChain(network);
    return chain?.key ?? (typeof network === 'string' ? network : undefined);
}
function toApiNetworkKey(network) {
    const key = mapNetworkToApiKey(network);
    if (key === 'bnb' || key === 'bnbTestnet') {
        return key;
    }
    return undefined;
}
function normalizeCapabilities(capabilities) {
    if (!capabilities?.protocolProfiles || capabilities.protocolProfiles.length === 0) {
        return undefined;
    }
    return { protocolProfiles: capabilities.protocolProfiles };
}
async function negotiateProtocolProfile(configuredProfile, api) {
    if (configuredProfile && configuredProfile !== 'auto') {
        return configuredProfile;
    }
    if (!api) {
        return DEFAULT_PROTOCOL_PROFILE;
    }
    try {
        const capabilities = await api.getCapabilities();
        return resolveProtocolProfile('auto', normalizeCapabilities(capabilities));
    }
    catch {
        return DEFAULT_PROTOCOL_PROFILE;
    }
}
function localBuildIntent(request, networkResolver) {
    const now = Math.floor(Date.now() / 1000);
    if (request.mode === 'minimal') {
        const minimal = request;
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
        });
        const intentNonce = intentResult.intent.nonce;
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
                permit2WitnessTypeString: 'FlexWitness witness)PaymentIntent(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 deadline,address payer,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)',
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
    const advanced = request;
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
    });
    const intentNonce = intentResult.intent.nonce;
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
            permit2WitnessTypeString: 'FlexWitness witness)PaymentIntent(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 deadline,address payer,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)',
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
export function createClient(input) {
    const resolved = resolveConfig(input);
    const api = resolved.api
        ? createBnbpayApiAdapter({
            baseUrl: resolved.api.baseUrl,
            apiKey: resolved.api.apiKey,
            fetchFn: resolved.api.fetchFn,
        })
        : undefined;
    const contracts = resolved.contracts ? createContractsAdapter(resolved.contracts) : undefined;
    const protocolProfile = resolveProtocolProfile(resolved.protocolProfile);
    const headerPolicy = headersForProfile(protocolProfile);
    const protocolProfileRuntime = Object.freeze({
        configured: resolved.protocolProfile,
        negotiated: negotiateProtocolProfile(resolved.protocolProfile, api),
    });
    warnPublicRpcUsage(resolved);
    const resolveContractNetwork = (network) => {
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
            resolve: (network) => findChain(network),
            configured: () => (contracts ? Object.values(contracts.config.networks) : []),
        },
        intents: {
            create: createFlexIntent,
            build: async (request) => {
                if (resolved.mode === 'api') {
                    return requireApi(api).payments.buildIntent(request);
                }
                if (resolved.mode === 'hybrid') {
                    try {
                        return await requireApi(api).payments.buildIntent(request);
                    }
                    catch {
                        if (!contracts)
                            throw new SdkError('UNSUPPORTED_OPERATION', 'No contracts adapter available');
                        return localBuildIntent(request, resolveContractNetwork);
                    }
                }
                return localBuildIntent(request, resolveContractNetwork);
            },
        },
        payments: {
            canPay: async (params) => {
                if (resolved.mode === 'api') {
                    const network = toApiNetworkKey(params.network) ?? 'bnbTestnet';
                    return requireApi(api).payments.canPay({
                        network,
                        from: params.from,
                        to: params.to,
                        token: params.token,
                        amount: params.amountWei
                            ? ethers.formatUnits(params.amountWei, params.decimals ?? 18)
                            : String(params.amount ?? '0'),
                    });
                }
                if (resolved.mode === 'hybrid') {
                    const networkKey = toApiNetworkKey(params.network);
                    if (api && networkKey !== undefined) {
                        try {
                            return await api.payments.canPay({
                                network: networkKey,
                                from: params.from,
                                to: params.to,
                                token: params.token,
                                amount: params.amountWei
                                    ? ethers.formatUnits(params.amountWei, params.decimals ?? 18)
                                    : String(params.amount ?? '0'),
                            });
                        }
                        catch {
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
            list: (params) => requireApi(api).payments.list(params),
            get: (paymentId) => requireApi(api).payments.get(paymentId),
            status: (paymentId, network) => requireApi(api).payments.status(paymentId, network ? { network: toApiNetworkKey(network) } : undefined),
            buildIntent: async (request) => sdk.intents.build(request),
            sendRouterPayment: (params) => sendContractRouterPayment(requireContracts(contracts), params),
            payWithPermit2: (params) => sendContractPermit2Payment(requireContracts(contracts), params),
            payWithEIP2612: (params) => sendContractEip2612Payment(requireContracts(contracts), params),
            payWithEIP3009: (params) => sendContractEip3009Payment(requireContracts(contracts), params),
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
            list: (params) => requireApi(api).sessions.list(params),
            listByAgent: (address, params) => requireApi(api).sessions.listByAgent(address, params),
            get: (sessionId) => requireApi(api).sessions.get(sessionId),
            spends: (sessionId, params) => requireApi(api).sessions.spends(sessionId, params),
            payments: (sessionId, params) => requireApi(api).sessions.payments(sessionId, params),
            getContractSession: (sessionId, network) => getSession(requireContracts(contracts), sessionId, network),
            getContractSessionState: (sessionId, network) => getSessionState(requireContracts(contracts), sessionId, network),
            getContractSpendNonce: (sessionId, network) => getSessionSpendNonce(requireContracts(contracts), sessionId, network),
        },
        subscriptions: {
            buildCreateTypedData: buildCreateSubscriptionTypedData,
            buildCreateDigest: buildCreateSubscriptionDigest,
            buildCancelTypedData: buildCancelSubscriptionTypedData,
            buildCancelDigest: buildCancelSubscriptionDigest,
            createWithSig: (request, network) => createSubscriptionWithSig(requireContracts(contracts), request, network),
            charge: (subId, network) => chargeExistingSubscription(requireContracts(contracts), subId, network),
            cancel: (subId, deadline, signature, network) => cancelExistingSubscription(requireContracts(contracts), subId, deadline, signature, network),
            get: (subId, network) => getSubscriptionState(requireContracts(contracts), subId, network),
            isDue: (subId, network) => isDueSubscription(requireContracts(contracts), subId, network),
            computeId: (request, network) => computeSubId(requireContracts(contracts), request, network),
        },
        relay: {
            payment: (payload) => requireApi(api).relay.payment(payload),
            permit2Bundle: (payload) => requireApi(api).relay.permit2Bundle(payload),
            sessionOpen: (payload) => requireApi(api).relay.sessionOpen(payload),
            sessionOpenClaimable: (payload) => requireApi(api).relay.sessionOpenClaimable(payload),
            sessionClaim: (payload) => requireApi(api).relay.sessionClaim(payload),
            sessionRevoke: (payload) => requireApi(api).relay.sessionRevoke(payload),
        },
        invoices: {
            create: (payload) => requireApi(api).invoices.create(payload),
            get: (invoiceId) => requireApi(api).invoices.get(invoiceId),
            status: (invoiceId) => requireApi(api).invoices.status(invoiceId),
            cancel: (invoiceId) => requireApi(api).invoices.cancel(invoiceId),
            confirmPayment: (invoiceId, payload) => requireApi(api).invoices.confirmPayment(invoiceId, payload),
            streamSseUrl: (invoiceId) => requireApi(api).invoices.streamSseUrl(invoiceId),
            streamWsUrl: (invoiceId) => requireApi(api).invoices.streamWsUrl(invoiceId),
        },
        giftcards: {
            create: (payload) => requireApi(api).giftcards.create(payload),
            claim: (payload) => requireApi(api).giftcards.claim(payload),
            redeem: (payload) => requireApi(api).giftcards.redeem(payload),
            cancel: (cardId) => requireApi(api).giftcards.cancel(cardId),
            get: (cardId) => requireApi(api).giftcards.get(cardId),
            list: (params) => requireApi(api).giftcards.list(params),
        },
        protocolProfileRuntime,
        api,
    };
    return sdk;
}

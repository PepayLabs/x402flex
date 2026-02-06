import { ethers } from 'ethers';
import { X402FlexRegistry__factory, buildFlexResponse as sdkBuildFlexResponse, decodePaymentSettledEvent, buildSessionContext as sdkBuildSessionContext, auditSessionReceipts, formatSessionReference, canPay as sdkCanPay, } from './sdk/index.js';
const PAYMENT_REGISTRY_INTERFACE = X402FlexRegistry__factory.createInterface();
const PAYMENT_SETTLED_TOPIC = PAYMENT_REGISTRY_INTERFACE.getEvent('PaymentSettledV2').topicHash;
const SCHEME_REGISTRY = {
    'exact:evm:permit2': { id: 'exact:evm:permit2', type: 'permit2', sessionCapable: true },
    'exact:evm:eip2612': { id: 'exact:evm:eip2612', type: 'eip2612', sessionCapable: true },
    'exact:evm:eip3009': { id: 'exact:evm:eip3009', type: 'eip3009', sessionCapable: true },
    'push:evm:aa4337': { id: 'push:evm:aa4337', type: 'push', sessionCapable: true },
    'push:evm:direct': { id: 'push:evm:direct', type: 'push', sessionCapable: true },
};
export function createFlexMiddleware(context) {
    const merchant = ethers.getAddress(context.merchant);
    const networks = normalizeNetworks(context.networks);
    const referenceBuilder = context.referenceBuilder ?? (() => `order_${Date.now()}`);
    function buildFlexResponse(input) {
        const acceptsWithDefaults = input.accepts.map((accept) => {
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
    async function _settleWithRouter(params) {
        const authorization = params.authorization;
        const networkKey = params.network ?? authorization.network;
        const network = networks[networkKey];
        const txHash = authorization.txHash;
        if (!network) {
            throw new Error(`No network configuration found for ${networkKey}`);
        }
        if (!txHash) {
            throw new Error('Authorization payload must include txHash');
        }
        const receipt = await network.provider.getTransactionReceipt(txHash);
        if (!receipt) {
            return {
                success: false,
                network: networkKey,
                error: 'TX_NOT_FOUND',
                proof: {
                    txHash,
                    network: networkKey,
                    blockNumber: 0,
                    confirmations: 0,
                },
            };
        }
        const currentBlock = await network.provider.getBlockNumber();
        const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
        const status = receipt.status;
        const isSuccess = status === 1 || status === 'success';
        if (!isSuccess) {
            return {
                success: false,
                network: networkKey,
                error: 'TX_REVERTED',
                proof: {
                    txHash,
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
                    txHash,
                    network: networkKey,
                    blockNumber: receipt.blockNumber,
                    confirmations,
                },
            };
        }
        const eventLog = receipt.logs.find((log) => log.address.toLowerCase() === network.registry.toLowerCase() &&
            log.topics[0] === PAYMENT_SETTLED_TOPIC);
        if (!eventLog) {
            return {
                success: false,
                network: networkKey,
                error: 'PAYMENT_EVENT_NOT_FOUND',
                proof: {
                    txHash,
                    network: networkKey,
                    blockNumber: receipt.blockNumber,
                    confirmations,
                },
            };
        }
        const decoded = decodePaymentSettledEvent({
            data: eventLog.data,
            topics: [...eventLog.topics],
            blockNumber: receipt.blockNumber,
            transactionHash: txHash,
        });
        if (params.paymentIntent && decoded.paymentId !== params.paymentIntent.paymentId) {
            return {
                success: false,
                network: networkKey,
                error: 'PAYMENT_ID_MISMATCH',
                proof: {
                    txHash,
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
                txHash,
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
                amount: decoded.amount.toString(),
            },
        };
    }
    function parseAuthorization(auth) {
        if (typeof auth === 'string') {
            const parsed = JSON.parse(auth);
            return {
                network: parsed.network,
                txHash: parsed.txHash,
                blockNumber: parsed.blockNumber,
                timestamp: parsed.timestamp,
                relayPayload: parsed.relayPayload,
            };
        }
        return auth;
    }
    function normalizeAuthorization(auth, network) {
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
        canPay: (params) => canPayOnNetwork({ ...params, networks }),
        auditSessionReceipts,
        attachSessionToResponse: (response, sessionInput, options) => attachSessionToResponse(response, sessionInput, options),
    };
}
export { createFlexExpressMiddleware } from './express.js';
function normalizeNetworks(networks) {
    return Object.entries(networks).reduce((acc, [key, cfg]) => {
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
const ERC20_DECIMALS_ABI = ['function decimals() view returns (uint8)'];
async function canPayOnNetwork(params) {
    const networks = params.networks;
    const network = networks[params.network];
    if (!network) {
        throw new Error(`No network configuration found for ${params.network}`);
    }
    if (!network.registry) {
        throw new Error(`Registry not configured for network ${params.network}`);
    }
    const token = params.token ? ethers.getAddress(params.token) : ethers.ZeroAddress;
    let amountWei;
    if (params.amountWei !== undefined) {
        amountWei = params.amountWei;
    }
    else if (params.amount !== undefined) {
        if (token === ethers.ZeroAddress) {
            amountWei = ethers.parseEther(params.amount.toString());
        }
        else {
            const decimals = params.decimals ??
                (await new ethers.Contract(token, ERC20_DECIMALS_ABI, network.provider).decimals().catch(() => 18));
            amountWei = ethers.parseUnits(params.amount.toString(), decimals);
        }
    }
    else {
        throw new Error('amount or amountWei is required');
    }
    return sdkCanPay({
        provider: network.provider,
        registryAddress: network.registry,
        token,
        from: ethers.getAddress(params.from),
        to: ethers.getAddress(params.to),
        amount: amountWei,
    });
}
async function ensureAuthorizationTxHash(authorization, networkKey, network) {
    if (authorization.txHash) {
        return authorization;
    }
    if (!network.relay) {
        throw new Error(`Authorization for network ${networkKey} is missing txHash and no relay configuration is available`);
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
async function invokeRelay(relay, body) {
    const fetchFn = relay.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!fetchFn) {
        throw new Error('Relay fetch implementation not available');
    }
    const headers = { 'content-type': 'application/json' };
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
function attachSessionToResponse(response, sessionInput, options) {
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
function getSchemeMetadata(scheme) {
    const key = scheme.toLowerCase();
    return SCHEME_REGISTRY[key] ?? { id: scheme, type: 'custom', sessionCapable: true };
}
function enrichSchemeMetadata(response) {
    const accepts = response.accepts.map((option) => ({
        ...option,
        metadata: {
            ...option.metadata,
            scheme: getSchemeMetadata(option.scheme),
        },
    }));
    return { ...response, accepts };
}

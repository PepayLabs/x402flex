import { ethers } from 'ethers';
import { derivePaymentId, deriveResourceId, normalizeReference, hashPaymentIntent, calculateReferenceHash, resolveFlexSchemeId, } from './utils.js';
import { X402FlexRegistry__factory } from './typechain/factories/X402FlexRegistry__factory.js';
import { formatSessionReference, parseSessionReference } from './session.js';
const DEFAULT_ROUTER_DEADLINE_SECONDS = 3600;
export function getFlexSchemeId(scheme) {
    return resolveFlexSchemeId(scheme);
}
export function buildFlexResponse(input) {
    if (!input.accepts || input.accepts.length === 0) {
        throw new Error('At least one accept option is required');
    }
    const version = input.version ?? 1;
    const referenceFallback = () => normalizeReference(input.referenceId ?? `flex_${Date.now()}`);
    const accepts = input.accepts.map((accept) => buildFlexAcceptOption(accept, {
        referenceId: input.referenceId,
        referenceFallback,
        merchant: input.merchant,
    }));
    return {
        x402Version: version,
        resourceId: input.resourceId,
        expiresAt: input.expiresAt ?? (input.ttlSeconds
            ? Math.floor(Date.now() / 1000) + input.ttlSeconds
            : undefined),
        memo: input.memo,
        accepts,
    };
}
export function createFlexIntent(params) {
    const scheme = params.scheme ?? 'push:evm:direct';
    const schemeId = getFlexSchemeId(scheme);
    const referenceId = normalizeReference(params.referenceId ?? `flex_${Date.now()}`);
    const merchant = ethers.getAddress(params.merchant);
    const token = params.token ? ethers.getAddress(params.token) : ethers.ZeroAddress;
    const deadline = params.deadline ?? (Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? DEFAULT_ROUTER_DEADLINE_SECONDS));
    const { resourceId } = deriveResourceId({
        merchant,
        referenceId,
        token,
        amount: params.amount,
        chainId: params.chainId,
        salt: params.salt,
    });
    const referenceData = params.sessionId
        ? formatSessionReference(referenceId, params.sessionId, resourceId)
        : referenceId;
    const referenceHash = calculateReferenceHash(referenceData);
    const nonce = params.nonce ?? ethers.hexlify(ethers.randomBytes(32));
    const paymentId = derivePaymentId({
        token,
        amount: params.amount,
        deadline,
        resourceId,
        referenceHash,
        nonce,
    });
    const intent = {
        paymentId,
        merchant,
        token,
        amount: params.amount,
        deadline,
        payer: params.payer ? ethers.getAddress(params.payer) : ethers.ZeroAddress,
        resourceId,
        referenceHash,
        nonce,
    };
    const intentHash = hashPaymentIntent(intent);
    const witness = {
        schemeId,
        intentHash,
        payer: params.payer ? ethers.getAddress(params.payer) : ethers.ZeroAddress,
        salt: params.salt ?? ethers.ZeroHash,
    };
    return {
        intent,
        witness,
        paymentId,
        resourceId,
        referenceId,
        schemeId,
    };
}
function buildFlexAcceptOption(option, context) {
    const schemeId = getFlexSchemeId(option.scheme);
    const network = option.network;
    const chainId = option.chainId;
    if (!chainId) {
        throw new Error(`chainId is required for accept option on ${network}`);
    }
    const payTo = ethers.getAddress(option.payTo ?? context.merchant ?? (() => {
        throw new Error('payTo address is required for each accept option');
    })());
    const asset = normalizeAsset(option.asset);
    const amount = typeof option.amount === 'bigint'
        ? option.amount
        : BigInt(option.amount);
    const reference = normalizeReference(option.referenceId ?? context.referenceId ?? context.referenceFallback());
    const routerPayload = option.router?.address
        ? buildRouterPayload({
            scheme: option.scheme,
            schemeId,
            router: option.router,
            chainId,
            payTo,
            asset,
            amount,
            reference,
        })
        : undefined;
    return {
        scheme: option.scheme,
        schemeId,
        network,
        chainId,
        amount: amount.toString(),
        payTo,
        asset,
        reference,
        amountUsd: option.amountUsd,
        metadata: option.metadata,
        router: routerPayload,
    };
}
const PAYMENT_REGISTRY_INTERFACE = X402FlexRegistry__factory.createInterface();
export function decodePaymentSettledEvent(log) {
    const decoded = PAYMENT_REGISTRY_INTERFACE.decodeEventLog('PaymentSettledV2', log.data, log.topics);
    const referenceData = decoded.referenceData;
    const sessionDetails = parseSessionReference(referenceData);
    return {
        paymentId: decoded.paymentId,
        payer: decoded.payer,
        merchant: decoded.merchant,
        token: decoded.token,
        amount: BigInt(decoded.amount),
        feeAmount: BigInt(decoded.feeAmount),
        schemeId: decoded.schemeId,
        referenceData,
        referenceHash: decoded.referenceHash,
        resourceId: decoded.resourceId,
        timestamp: BigInt(decoded.timestamp),
        session: sessionDetails,
        blockNumber: 'blockNumber' in log ? log.blockNumber : undefined,
        txHash: 'transactionHash' in log ? log.transactionHash : undefined,
    };
}
function normalizeAsset(asset) {
    if (!asset || asset.toLowerCase() === 'native') {
        return ethers.ZeroAddress;
    }
    return ethers.getAddress(asset);
}
function buildRouterPayload(params) {
    const { router } = params;
    const merchant = router.merchant ? ethers.getAddress(router.merchant) : params.payTo;
    const token = router.token ? ethers.getAddress(router.token) : params.asset;
    const deadline = router.deadline ??
        (router.deadlineSeconds
            ? Math.floor(Date.now() / 1000) + router.deadlineSeconds
            : Math.floor(Date.now() / 1000) + DEFAULT_ROUTER_DEADLINE_SECONDS);
    const { resourceId } = router.resourceId
        ? { resourceId: router.resourceId }
        : deriveResourceId({
            merchant,
            referenceId: params.reference,
            token,
            amount: params.amount,
            chainId: params.chainId,
            salt: router.resourceSalt,
        });
    const referenceData = router.sessionId
        ? formatSessionReference(params.reference, router.sessionId, resourceId)
        : params.reference;
    const referenceHash = calculateReferenceHash(referenceData);
    if (router.paymentId && !router.nonce) {
        throw new Error('router.nonce is required when router.paymentId is provided');
    }
    const nonce = router.nonce ?? ethers.hexlify(ethers.randomBytes(32));
    const expectedPaymentId = derivePaymentId({
        token,
        amount: params.amount,
        deadline,
        resourceId,
        referenceHash,
        nonce,
    });
    if (router.paymentId && router.paymentId.toLowerCase() !== expectedPaymentId.toLowerCase()) {
        throw new Error('router.paymentId does not match intent fields');
    }
    const paymentId = router.paymentId ?? expectedPaymentId;
    const intent = {
        paymentId,
        merchant,
        token,
        amount: params.amount,
        deadline,
        payer: router.witness?.payer
            ? ethers.getAddress(router.witness.payer)
            : ethers.ZeroAddress,
        resourceId,
        referenceHash,
        nonce,
    };
    const intentHash = hashPaymentIntent(intent);
    const witness = router.witness
        ? {
            schemeId: router.witness.schemeId ?? params.schemeId,
            intentHash,
            payer: router.witness.payer
                ? ethers.getAddress(router.witness.payer)
                : ethers.ZeroAddress,
            salt: router.witness.salt ?? ethers.ZeroHash,
        }
        : undefined;
    return {
        address: router.address,
        schemeId: params.schemeId,
        intent: {
            paymentId: intent.paymentId,
            merchant: intent.merchant,
            token: intent.token,
            amount: intent.amount.toString(),
            deadline: intent.deadline,
            payer: intent.payer,
            resourceId: intent.resourceId,
            referenceHash: intent.referenceHash,
            nonce: intent.nonce,
        },
        witness,
        signature: router.witness?.signature,
    };
}

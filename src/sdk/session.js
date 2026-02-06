import { ethers } from 'ethers';
import { MAX_REFERENCE_LENGTH, SESSION_EIP712_DOMAIN_NAME, SESSION_EIP712_DOMAIN_VERSION, } from './constants.js';
import { normalizeReference, resolveFlexSchemeId } from './utils.js';
const abi = ethers.AbiCoder.defaultAbiCoder();
const TOKEN_CAP_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes('TokenCap(address token,uint128 cap,uint128 dailyCap)'));
const RATE_LIMIT_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes('RateLimit(uint32 maxTxPerMinute,uint32 maxTxPerDay,uint32 coolDownSeconds)'));
const FLEX_SESSION_GRANT_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes('FlexSessionGrant(bytes32 sessionId,address payer,address agent,bytes32 merchantScope,uint32 deadline,uint32 expiresAt,uint32 epoch,uint256 nonce,RateLimit rateLimit,bytes32 schemesHash,bytes32 tokenCapsHash)'
    + 'RateLimit(uint32 maxTxPerMinute,uint32 maxTxPerDay,uint32 coolDownSeconds)'
    + 'TokenCap(address token,uint128 cap,uint128 dailyCap)'));
const CLAIMABLE_SESSION_GRANT_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes('ClaimableSessionGrant(bytes32 sessionId,address payer,bytes32 merchantScope,uint32 deadline,uint32 expiresAt,uint32 epoch,uint256 nonce,address claimSigner,RateLimit rateLimit,bytes32 schemesHash,bytes32 tokenCapsHash)'
    + 'RateLimit(uint32 maxTxPerMinute,uint32 maxTxPerDay,uint32 coolDownSeconds)'
    + 'TokenCap(address token,uint128 cap,uint128 dailyCap)'));
const SESSION_MARKER = '|session:';
const RESOURCE_MARKER = '|resource:';
const ZERO_AGENT = ethers.ZeroAddress;
export const SESSION_TYPED_DATA_TYPES = {
    RateLimit: [
        { name: 'maxTxPerMinute', type: 'uint32' },
        { name: 'maxTxPerDay', type: 'uint32' },
        { name: 'coolDownSeconds', type: 'uint32' },
    ],
    FlexSessionGrant: [
        { name: 'sessionId', type: 'bytes32' },
        { name: 'payer', type: 'address' },
        { name: 'agent', type: 'address' },
        { name: 'merchantScope', type: 'bytes32' },
        { name: 'deadline', type: 'uint32' },
        { name: 'expiresAt', type: 'uint32' },
        { name: 'epoch', type: 'uint32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'rateLimit', type: 'RateLimit' },
        { name: 'schemesHash', type: 'bytes32' },
        { name: 'tokenCapsHash', type: 'bytes32' },
    ],
};
export const CLAIMABLE_SESSION_TYPED_DATA_TYPES = {
    RateLimit: SESSION_TYPED_DATA_TYPES.RateLimit,
    ClaimableSessionGrant: [
        { name: 'sessionId', type: 'bytes32' },
        { name: 'payer', type: 'address' },
        { name: 'merchantScope', type: 'bytes32' },
        { name: 'deadline', type: 'uint32' },
        { name: 'expiresAt', type: 'uint32' },
        { name: 'epoch', type: 'uint32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'claimSigner', type: 'address' },
        { name: 'rateLimit', type: 'RateLimit' },
        { name: 'schemesHash', type: 'bytes32' },
        { name: 'tokenCapsHash', type: 'bytes32' },
    ],
};
export const CLAIM_SESSION_TYPED_DATA_TYPES = {
    ClaimSession: [
        { name: 'sessionId', type: 'bytes32' },
        { name: 'agent', type: 'address' },
        { name: 'epoch', type: 'uint32' },
        { name: 'deadline', type: 'uint256' },
    ],
};
function toBytes32(value, label) {
    if (!value)
        throw new Error(`${label} is required`);
    if (ethers.isHexString(value)) {
        return ethers.hexlify(ethers.zeroPadValue(value, 32));
    }
    const bytes = ethers.toUtf8Bytes(value);
    if (bytes.length > 32) {
        throw new Error(`${label} must be ≤ 32 bytes`);
    }
    return ethers.hexlify(ethers.zeroPadValue(bytes, 32));
}
function toHexBytes32(value, label) {
    if (!value)
        throw new Error(`${label} is required`);
    if (!ethers.isHexString(value)) {
        throw new Error(`${label} must be a 0x-prefixed hex string`);
    }
    return ethers.hexlify(ethers.zeroPadValue(ethers.getBytes(value), 32));
}
function normalizeRateLimit(limit = {}) {
    return {
        maxTxPerMinute: limit.maxTxPerMinute ?? 0,
        maxTxPerDay: limit.maxTxPerDay ?? 0,
        coolDownSeconds: limit.coolDownSeconds ?? 0,
    };
}
function normalizeTokenCap(cap) {
    return {
        token: ethers.getAddress(cap.token),
        cap: BigInt(cap.cap).toString(),
        dailyCap: BigInt(cap.dailyCap).toString(),
    };
}
function normalizeAgent(agent, fallback) {
    const target = agent ?? fallback ?? ZERO_AGENT;
    return ethers.getAddress(target);
}
function normalizeSessionIdHex(value) {
    return toHexBytes32(value, 'sessionId');
}
function normalizeScheme(value) {
    return resolveFlexSchemeId(value);
}
function normalizeGrantBase(grant) {
    return {
        sessionId: toBytes32(grant.sessionId, 'sessionId'),
        payer: ethers.getAddress(grant.payer),
        merchantScope: toBytes32(grant.merchantScope, 'merchantScope'),
        deadline: Number(grant.deadline),
        expiresAt: Number(grant.expiresAt),
        epoch: Number(grant.epoch),
        nonce: BigInt(grant.nonce).toString(),
        rateLimit: normalizeRateLimit(grant.rateLimit),
        allowedSchemes: grant.allowedSchemes.map(normalizeScheme),
        tokenCaps: grant.tokenCaps.map(normalizeTokenCap),
    };
}
function normalizeGrant(grant) {
    return {
        ...normalizeGrantBase(grant),
        agent: ethers.getAddress(grant.agent),
    };
}
function normalizeClaimableGrant(grant) {
    return {
        ...normalizeGrantBase(grant),
        claimSigner: ethers.getAddress(grant.claimSigner),
    };
}
function hashRateLimit(limit) {
    return ethers.keccak256(abi.encode(['bytes32', 'uint32', 'uint32', 'uint32'], [RATE_LIMIT_TYPEHASH, limit.maxTxPerMinute, limit.maxTxPerDay, limit.coolDownSeconds]));
}
function hashTokenCaps(caps) {
    if (caps.length === 0) {
        return ethers.keccak256('0x');
    }
    const encoded = caps.map((cap) => ethers.keccak256(abi.encode(['bytes32', 'address', 'uint128', 'uint128'], [TOKEN_CAP_TYPEHASH, cap.token, cap.cap, cap.dailyCap])));
    return ethers.keccak256(ethers.concat(encoded));
}
function hashSchemes(schemes) {
    if (schemes.length === 0) {
        return ethers.keccak256('0x');
    }
    return ethers.keccak256(ethers.concat(schemes));
}
function buildGrantHashes(normalized) {
    return {
        schemesHash: hashSchemes(normalized.allowedSchemes),
        tokenCapsHash: hashTokenCaps(normalized.tokenCaps),
    };
}
function buildFlexGrantTypedMessage(normalized) {
    const hashes = buildGrantHashes(normalized);
    return {
        sessionId: normalized.sessionId,
        payer: normalized.payer,
        agent: normalized.agent,
        merchantScope: normalized.merchantScope,
        deadline: normalized.deadline,
        expiresAt: normalized.expiresAt,
        epoch: normalized.epoch,
        nonce: normalized.nonce,
        rateLimit: normalized.rateLimit,
        schemesHash: hashes.schemesHash,
        tokenCapsHash: hashes.tokenCapsHash,
    };
}
function buildClaimableGrantTypedMessage(normalized) {
    const hashes = buildGrantHashes(normalized);
    return {
        sessionId: normalized.sessionId,
        payer: normalized.payer,
        merchantScope: normalized.merchantScope,
        deadline: normalized.deadline,
        expiresAt: normalized.expiresAt,
        epoch: normalized.epoch,
        nonce: normalized.nonce,
        claimSigner: normalized.claimSigner,
        rateLimit: normalized.rateLimit,
        schemesHash: hashes.schemesHash,
        tokenCapsHash: hashes.tokenCapsHash,
    };
}
export function hashFlexSessionGrant(grant) {
    const normalized = normalizeGrant(grant);
    const rateLimitHash = hashRateLimit(normalized.rateLimit);
    const tokenCapsHash = hashTokenCaps(normalized.tokenCaps);
    const schemesHash = hashSchemes(normalized.allowedSchemes);
    return ethers.keccak256(abi.encode([
        'bytes32',
        'bytes32',
        'address',
        'address',
        'bytes32',
        'uint32',
        'uint32',
        'uint32',
        'uint256',
        'bytes32',
        'bytes32',
        'bytes32',
    ], [
        FLEX_SESSION_GRANT_TYPEHASH,
        normalized.sessionId,
        normalized.payer,
        normalized.agent,
        normalized.merchantScope,
        normalized.deadline,
        normalized.expiresAt,
        normalized.epoch,
        normalized.nonce,
        rateLimitHash,
        schemesHash,
        tokenCapsHash,
    ]));
}
export function hashClaimableSessionGrant(grant) {
    const normalized = normalizeClaimableGrant(grant);
    const rateLimitHash = hashRateLimit(normalized.rateLimit);
    const tokenCapsHash = hashTokenCaps(normalized.tokenCaps);
    const schemesHash = hashSchemes(normalized.allowedSchemes);
    return ethers.keccak256(abi.encode([
        'bytes32',
        'bytes32',
        'address',
        'bytes32',
        'uint32',
        'uint32',
        'uint32',
        'uint256',
        'address',
        'bytes32',
        'bytes32',
        'bytes32',
    ], [
        CLAIMABLE_SESSION_GRANT_TYPEHASH,
        normalized.sessionId,
        normalized.payer,
        normalized.merchantScope,
        normalized.deadline,
        normalized.expiresAt,
        normalized.epoch,
        normalized.nonce,
        normalized.claimSigner,
        rateLimitHash,
        schemesHash,
        tokenCapsHash,
    ]));
}
export function buildSessionContext(input, options) {
    if (!input || !input.sessionId) {
        throw new Error('sessionId is required to build a SessionContext');
    }
    const sessionId = normalizeSessionIdHex(input.sessionId);
    const agent = normalizeAgent(input.agent, options?.defaultAgent);
    return {
        sessionId,
        agent,
    };
}
export function buildSessionGrantTypedData(grant, options) {
    const domain = {
        name: SESSION_EIP712_DOMAIN_NAME,
        version: SESSION_EIP712_DOMAIN_VERSION,
        chainId: Number(options.chainId),
        verifyingContract: ethers.getAddress(options.verifyingContract),
    };
    const normalized = normalizeGrant(grant);
    const message = buildFlexGrantTypedMessage(normalized);
    return {
        domain,
        types: SESSION_TYPED_DATA_TYPES,
        message,
    };
}
export function buildSessionGrantDigest(grant, options) {
    const typedData = buildSessionGrantTypedData(grant, options);
    return ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
}
export function buildClaimableSessionGrantTypedData(grant, options) {
    const domain = {
        name: SESSION_EIP712_DOMAIN_NAME,
        version: SESSION_EIP712_DOMAIN_VERSION,
        chainId: Number(options.chainId),
        verifyingContract: ethers.getAddress(options.verifyingContract),
    };
    const normalized = normalizeClaimableGrant(grant);
    const message = buildClaimableGrantTypedMessage(normalized);
    return {
        domain,
        types: CLAIMABLE_SESSION_TYPED_DATA_TYPES,
        message,
    };
}
export function buildClaimableSessionGrantDigest(grant, options) {
    const typedData = buildClaimableSessionGrantTypedData(grant, options);
    return ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
}
export function buildClaimSessionTypedData(claim, options) {
    const domain = {
        name: SESSION_EIP712_DOMAIN_NAME,
        version: SESSION_EIP712_DOMAIN_VERSION,
        chainId: Number(options.chainId),
        verifyingContract: ethers.getAddress(options.verifyingContract),
    };
    const message = {
        sessionId: toBytes32(claim.sessionId, 'sessionId'),
        agent: ethers.getAddress(claim.agent),
        epoch: Number(claim.epoch),
        deadline: Number(claim.deadline),
    };
    return {
        domain,
        types: CLAIM_SESSION_TYPED_DATA_TYPES,
        message,
    };
}
export function buildClaimSessionDigest(claim, options) {
    const typedData = buildClaimSessionTypedData(claim, options);
    return ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
}
export function formatSessionReference(baseReference, sessionId, resourceId) {
    const sanitizedBase = normalizeReference(baseReference);
    const normalizedSessionId = toBytes32(sessionId, 'sessionId');
    const normalizedResourceId = toBytes32(resourceId, 'resourceId');
    const suffix = `${SESSION_MARKER}${normalizedSessionId}${RESOURCE_MARKER}${normalizedResourceId}`;
    const finalLength = sanitizedBase.length + suffix.length;
    if (finalLength > MAX_REFERENCE_LENGTH) {
        throw new Error(`Reference exceeds max length (${finalLength}/${MAX_REFERENCE_LENGTH}) after session tagging`);
    }
    return `${sanitizedBase}${suffix}`;
}
export function parseSessionReference(reference) {
    if (!reference) {
        return {
            fullReference: '',
            baseReference: '',
            hasSessionTag: false,
        };
    }
    const sessionIdx = reference.lastIndexOf(SESSION_MARKER);
    if (sessionIdx === -1) {
        return {
            fullReference: reference,
            baseReference: reference,
            hasSessionTag: false,
        };
    }
    const resourceIdx = reference.indexOf(RESOURCE_MARKER, sessionIdx + SESSION_MARKER.length);
    if (resourceIdx === -1) {
        return {
            fullReference: reference,
            baseReference: reference,
            hasSessionTag: false,
        };
    }
    const sessionId = reference.substring(sessionIdx + SESSION_MARKER.length, resourceIdx);
    const resourceTag = reference.substring(resourceIdx + RESOURCE_MARKER.length);
    if (!sessionId || !resourceTag) {
        return {
            fullReference: reference,
            baseReference: reference,
            hasSessionTag: false,
        };
    }
    const baseReference = reference.substring(0, sessionIdx);
    return {
        fullReference: reference,
        baseReference,
        sessionId,
        resourceTag,
        hasSessionTag: true,
    };
}
export function auditSessionReceipts(events, sessionId) {
    const normalizedTarget = normalizeSessionIdHex(sessionId);
    const payments = events.filter((event) => {
        const sessionTag = event.session?.sessionId;
        if (!sessionTag)
            return false;
        try {
            return normalizeSessionIdHex(sessionTag) === normalizedTarget;
        }
        catch (err) {
            return false;
        }
    });
    const totalAmount = payments.reduce((sum, event) => sum + event.amount, 0n);
    return {
        sessionId: normalizedTarget,
        payments,
        totalAmount,
    };
}

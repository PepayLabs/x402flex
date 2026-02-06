import { ethers } from 'ethers';
const CREATE_SUB_TYPES = {
    CreateSubscription: [
        { name: 'payer', type: 'address' },
        { name: 'merchant', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'startAt', type: 'uint64' },
        { name: 'cadenceKind', type: 'uint8' },
        { name: 'cadence', type: 'uint32' },
        { name: 'cancelWindow', type: 'uint32' },
        { name: 'maxPayments', type: 'uint16' },
        { name: 'pullMode', type: 'uint8' },
        { name: 'termsHash', type: 'bytes32' },
        { name: 'salt', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
    ],
};
const CANCEL_SUB_TYPES = {
    CancelSubscription: [
        { name: 'subId', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
    ],
};
export function buildSubscriptionsDomain(input) {
    return {
        name: 'X402FlexSubscriptions',
        version: '1',
        chainId: input.chainId,
        verifyingContract: ethers.getAddress(input.verifyingContract),
    };
}
export function buildCreateSubscriptionTypedData(input, domain) {
    return {
        domain: buildSubscriptionsDomain(domain),
        primaryType: 'CreateSubscription',
        types: CREATE_SUB_TYPES,
        message: {
            payer: ethers.getAddress(input.payer),
            merchant: ethers.getAddress(input.merchant),
            token: ethers.getAddress(input.token),
            amount: input.amount.toString(),
            startAt: input.startAt,
            cadenceKind: input.cadenceKind,
            cadence: input.cadence,
            cancelWindow: input.cancelWindow,
            maxPayments: input.maxPayments,
            pullMode: input.pullMode,
            termsHash: input.termsHash,
            salt: input.salt,
            deadline: input.deadline,
        },
    };
}
export function buildCreateSubscriptionDigest(input, domain) {
    const typedData = buildCreateSubscriptionTypedData(input, domain);
    return ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
}
export function buildCancelSubscriptionTypedData(input, domain) {
    return {
        domain: buildSubscriptionsDomain(domain),
        primaryType: 'CancelSubscription',
        types: CANCEL_SUB_TYPES,
        message: {
            subId: input.subId,
            deadline: input.deadline,
        },
    };
}
export function buildCancelSubscriptionDigest(input, domain) {
    const typedData = buildCancelSubscriptionTypedData(input, domain);
    return ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
}

import { ethers } from 'ethers';
import { X402FlexRouter__factory } from './typechain/factories/X402FlexRouter__factory.js';
import { buildSessionContext, formatSessionReference } from './session.js';
import { calculateReferenceHash, hashPaymentIntent, derivePaymentId } from './utils.js';
import { RpcTransport } from './transport.js';
const ROUTER_INTERFACE = X402FlexRouter__factory.createInterface();
export async function sendRouterPayment({ signer, transport, routerAddress, intent, witness, reference, session, sessionAuth, sessionAuthSignature, witnessSignature, valueOverride, autoTagReference = true, }) {
    if (!reference) {
        throw new Error('reference is required');
    }
    const payload = await buildPayload({
        signer,
        intent,
        witness,
        witnessSignature,
        reference,
        session,
        sessionAuth,
        sessionAuthSignature,
        autoTagReference,
    });
    const isNative = intent.token === ethers.ZeroAddress;
    const func = resolveRouterFunction(isNative, !!payload.session);
    const args = buildFunctionArgs(func, payload);
    return sendRouterFunction({
        routerAddress,
        functionName: func,
        args,
        value: isNative ? valueOverride ?? intent.amount : undefined,
        signer,
        transport,
    }).then((result) => ({ ...result, payload }));
}
export async function payWithPermit2({ permit, transferDetails, permitSignature, ...base }) {
    if (!base.reference)
        throw new Error('reference is required');
    const normalizedPermit = normalizePermitStruct(permit);
    const normalizedDetails = normalizeTransferDetails(transferDetails);
    const payload = await buildPayload({
        ...base,
        schemeData: {
            permit: normalizedPermit,
            transferDetails: normalizedDetails,
        },
    });
    const functionName = payload.session ? 'payWithPermit2Session' : 'payWithPermit2';
    const args = payload.session
        ? [
            payload.intent,
            payload.witness,
            payload.witnessSignature,
            payload.sessionAuth,
            payload.sessionAuthSignature,
            normalizedPermit,
            normalizedDetails,
            permitSignature,
            payload.session,
            payload.referenceData,
        ]
        : [
            payload.intent,
            payload.witness,
            payload.witnessSignature,
            normalizedPermit,
            normalizedDetails,
            permitSignature,
            payload.referenceData,
        ];
    return sendRouterFunction({
        routerAddress: base.routerAddress,
        functionName,
        args,
        signer: base.signer,
        transport: base.transport,
    }).then((result) => ({ ...result, payload }));
}
export async function payWithEIP2612({ permitSignature, ...base }) {
    if (!base.reference)
        throw new Error('reference is required');
    const signature = normalizeEip2612Signature(permitSignature);
    const payload = await buildPayload({
        ...base,
        schemeData: { permitSignature: signature },
    });
    const functionName = payload.session ? 'payWithEIP2612Session' : 'payWithEIP2612';
    const sharedArgs = [
        payload.intent,
        payload.witness,
        payload.witnessSignature,
        signature.deadline,
        signature.v,
        signature.r,
        signature.s,
    ];
    const args = payload.session
        ? [...sharedArgs, payload.sessionAuth, payload.sessionAuthSignature, payload.session, payload.referenceData]
        : [...sharedArgs, payload.referenceData];
    return sendRouterFunction({
        routerAddress: base.routerAddress,
        functionName,
        args,
        signer: base.signer,
        transport: base.transport,
    }).then((result) => ({ ...result, payload }));
}
export async function payWithEIP3009({ authorization, ...base }) {
    if (!base.reference)
        throw new Error('reference is required');
    const auth = normalizeEip3009Authorization(authorization);
    const payload = await buildPayload({
        ...base,
        schemeData: { authorization: auth },
    });
    const functionName = payload.session ? 'payWithEIP3009Session' : 'payWithEIP3009';
    const sharedArgs = [
        payload.intent,
        payload.witness,
        payload.witnessSignature,
        auth.validAfter,
        auth.validBefore,
        auth.authNonce,
        auth.v,
        auth.r,
        auth.s,
    ];
    const args = payload.session
        ? [...sharedArgs, payload.sessionAuth, payload.sessionAuthSignature, payload.session, payload.referenceData]
        : [...sharedArgs, payload.referenceData];
    return sendRouterFunction({
        routerAddress: base.routerAddress,
        functionName,
        args,
        signer: base.signer,
        transport: base.transport,
    }).then((result) => ({ ...result, payload }));
}
function resolveRouterFunction(isNative, hasSession) {
    if (isNative) {
        return hasSession ? 'depositAndSettleNativeSession' : 'depositAndSettleNative';
    }
    return hasSession ? 'depositAndSettleTokenSession' : 'depositAndSettleToken';
}
function buildFunctionArgs(func, payload) {
    const { intent, witness, witnessSignature, session, sessionAuth, sessionAuthSignature, referenceData } = payload;
    if (func === 'depositAndSettleNative') {
        return [intent, witness, witnessSignature, referenceData];
    }
    if (func === 'depositAndSettleNativeSession') {
        if (!session || !sessionAuth || !sessionAuthSignature)
            throw new Error('session context required');
        return [intent, witness, witnessSignature, sessionAuth, sessionAuthSignature, session, referenceData];
    }
    if (func === 'depositAndSettleToken') {
        return [intent, witness, witnessSignature, referenceData];
    }
    if (func === 'depositAndSettleTokenSession') {
        if (!session || !sessionAuth || !sessionAuthSignature)
            throw new Error('session context required');
        return [intent, witness, witnessSignature, sessionAuth, sessionAuthSignature, session, referenceData];
    }
    throw new Error(`Unsupported router function: ${func}`);
}
async function sendRouterFunction({ routerAddress, functionName, args, signer, transport, value, }) {
    const txTransport = transport ?? (signer ? new RpcTransport(signer) : undefined);
    if (!txTransport) {
        throw new Error('sendRouterFunction requires either a signer or a transport');
    }
    const data = ROUTER_INTERFACE.encodeFunctionData(functionName, args);
    const tx = {
        to: ethers.getAddress(routerAddress),
        data,
    };
    if (value !== undefined) {
        tx.value = value;
    }
    return txTransport.send(tx);
}
async function buildPayload(base) {
    if (base.session &&
        base.autoTagReference !== false &&
        base.witnessSignature &&
        base.witnessSignature !== '0x') {
        throw new Error('Auto-tagging references cannot be combined with witness signatures. Pre-tag the reference via formatSessionReference() and recompute the PaymentIntent + witness signature.');
    }
    const signerAddress = base.signer ? await base.signer.getAddress() : undefined;
    return normalizeRouterPayload({
        intent: base.intent,
        witness: base.witness,
        witnessSignature: base.witnessSignature,
        reference: base.reference,
        session: base.session,
        sessionAuth: base.sessionAuth,
        sessionAuthSignature: base.sessionAuthSignature,
        autoTagReference: base.autoTagReference,
        signerAddress,
        schemeData: base.schemeData,
    });
}
function normalizeRouterPayload(input) {
    const witnessSig = input.witnessSignature ?? '0x';
    const sessionCtx = input.session
        ? buildSessionContext(input.session, { defaultAgent: input.signerAddress })
        : undefined;
    if (sessionCtx && (!input.sessionAuth || !input.sessionAuthSignature)) {
        throw new Error('Session auth and signature are required for session-based payments');
    }
    let referenceData = input.reference;
    if (sessionCtx && input.autoTagReference !== false) {
        referenceData = formatSessionReference(input.reference, sessionCtx.sessionId, input.intent.resourceId);
    }
    if (!input.intent.nonce) {
        throw new Error('intent.nonce is required');
    }
    const normalizedIntent = {
        ...input.intent,
        payer: input.intent.payer ? ethers.getAddress(input.intent.payer) : ethers.ZeroAddress,
        referenceHash: calculateReferenceHash(referenceData),
    };
    const expectedPaymentId = derivePaymentId({
        token: normalizedIntent.token,
        amount: normalizedIntent.amount,
        deadline: normalizedIntent.deadline,
        resourceId: normalizedIntent.resourceId,
        referenceHash: normalizedIntent.referenceHash,
        nonce: normalizedIntent.nonce,
    });
    if (normalizedIntent.paymentId.toLowerCase() !== expectedPaymentId.toLowerCase()) {
        throw new Error('intent.paymentId does not match intent fields');
    }
    const intentHash = hashPaymentIntent(normalizedIntent);
    const normalizedWitness = input.witness
        ? { ...input.witness, intentHash }
        : input.witness;
    return {
        intent: normalizedIntent,
        witness: normalizedWitness,
        witnessSignature: witnessSig,
        referenceData,
        session: sessionCtx,
        sessionAuth: input.sessionAuth,
        sessionAuthSignature: input.sessionAuthSignature,
        schemeData: input.schemeData,
    };
}
function normalizePermitStruct(permit) {
    return {
        permitted: {
            token: ethers.getAddress(permit.permitted.token),
            amount: BigInt(permit.permitted.amount),
        },
        nonce: typeof permit.nonce === 'bigint' ? permit.nonce : BigInt(permit.nonce),
        deadline: Number(permit.deadline),
    };
}
function normalizeTransferDetails(details) {
    return {
        to: ethers.getAddress(details.to),
        requestedAmount: BigInt(details.requestedAmount),
    };
}
function normalizeEip2612Signature(sig) {
    return {
        deadline: Number(sig.deadline),
        v: Number(sig.v),
        r: normalizeBytes32(sig.r, 'r'),
        s: normalizeBytes32(sig.s, 's'),
    };
}
function normalizeEip3009Authorization(auth) {
    return {
        validAfter: Number(auth.validAfter),
        validBefore: Number(auth.validBefore),
        authNonce: normalizeBytes32(auth.authNonce, 'authNonce'),
        v: Number(auth.v),
        r: normalizeBytes32(auth.r, 'r'),
        s: normalizeBytes32(auth.s, 's'),
    };
}
function normalizeBytes32(value, label) {
    if (!value)
        throw new Error(`${label} is required`);
    if (!ethers.isHexString(value)) {
        throw new Error(`${label} must be a hex string`);
    }
    return ethers.hexlify(ethers.zeroPadValue(value, 32));
}

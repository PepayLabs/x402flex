import { ethers, type Signer } from 'ethers';
import { X402FlexRouter__factory } from './typechain/factories/X402FlexRouter__factory.js';
import type {
  SessionContextInput,
  FlexPaymentIntentStruct,
  FlexWitnessStruct,
} from './types.js';
import type { SessionTypes } from './typechain/X402FlexRouter.js';
import { buildSessionContext, formatSessionReference } from './session.js';
import { calculateReferenceHash, hashPaymentIntent, derivePaymentId } from './utils.js';
import type { Transport, TransportReceipt } from './transport.js';
import { RpcTransport } from './transport.js';

const ROUTER_INTERFACE = X402FlexRouter__factory.createInterface();

export interface SendRouterPaymentParams {
  signer?: Signer;
  transport?: Transport;
  routerAddress: string;
  intent: FlexPaymentIntentStruct;
  witness: FlexWitnessStruct;
  reference: string;
  session?: SessionContextInput;
  sessionAuth?: SessionTypes.SessionSpendAuthStruct;
  sessionAuthSignature?: string;
  witnessSignature?: string;
  valueOverride?: bigint;
  autoTagReference?: boolean;
}

export interface NormalizedRouterPayload {
  intent: FlexPaymentIntentStruct;
  witness: FlexWitnessStruct;
  witnessSignature: string;
  referenceData: string;
  session?: ReturnType<typeof buildSessionContext>;
  sessionAuth?: SessionTypes.SessionSpendAuthStruct;
  sessionAuthSignature?: string;
  schemeData?: Record<string, unknown>;
}

export interface PermitTokenPermissionsStruct {
  token: string;
  amount: bigint;
}

export interface PermitTransferFromStruct {
  permitted: PermitTokenPermissionsStruct;
  nonce: bigint | number;
  deadline: number;
}

export interface PermitSignatureTransferDetailsStruct {
  to: string;
  requestedAmount: bigint;
}

export interface Eip2612Signature {
  deadline: number;
  v: number;
  r: string;
  s: string;
}

export interface Eip3009Authorization {
  validAfter: number;
  validBefore: number;
  authNonce: string;
  v: number;
  r: string;
  s: string;
}

type BaseSchemeParams = Omit<SendRouterPaymentParams, 'valueOverride'>;

export interface PayWithPermit2Params extends BaseSchemeParams {
  permit: PermitTransferFromStruct;
  transferDetails: PermitSignatureTransferDetailsStruct;
  permitSignature: string;
}

export interface PayWithEIP2612Params extends BaseSchemeParams {
  permitSignature: Eip2612Signature;
}

export interface PayWithEIP3009Params extends BaseSchemeParams {
  authorization: Eip3009Authorization;
}

export async function sendRouterPayment({
  signer,
  transport,
  routerAddress,
  intent,
  witness,
  reference,
  session,
  sessionAuth,
  sessionAuthSignature,
  witnessSignature,
  valueOverride,
  autoTagReference = true,
}: SendRouterPaymentParams): Promise<TransportReceipt & { payload: NormalizedRouterPayload }> {
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

export async function payWithPermit2({
  permit,
  transferDetails,
  permitSignature,
  ...base
}: PayWithPermit2Params): Promise<TransportReceipt & { payload: NormalizedRouterPayload }> {
  if (!base.reference) throw new Error('reference is required');
  const normalizedPermit = normalizePermitStruct(permit);
  const normalizedDetails = normalizeTransferDetails(transferDetails);
  const payload = await buildPayload({
    ...base,
    schemeData: {
      permit: normalizedPermit,
      transferDetails: normalizedDetails,
    },
  });
  const functionName: RouterFunction = payload.session ? 'payWithPermit2Session' : 'payWithPermit2';
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

export async function payWithEIP2612({
  permitSignature,
  ...base
}: PayWithEIP2612Params): Promise<TransportReceipt & { payload: NormalizedRouterPayload }> {
  if (!base.reference) throw new Error('reference is required');
  const signature = normalizeEip2612Signature(permitSignature);
  const payload = await buildPayload({
    ...base,
    schemeData: { permitSignature: signature },
  });
  const functionName: RouterFunction = payload.session ? 'payWithEIP2612Session' : 'payWithEIP2612';
  const sharedArgs: unknown[] = [
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

export async function payWithEIP3009({
  authorization,
  ...base
}: PayWithEIP3009Params): Promise<TransportReceipt & { payload: NormalizedRouterPayload }> {
  if (!base.reference) throw new Error('reference is required');
  const auth = normalizeEip3009Authorization(authorization);
  const payload = await buildPayload({
    ...base,
    schemeData: { authorization: auth },
  });
  const functionName: RouterFunction = payload.session ? 'payWithEIP3009Session' : 'payWithEIP3009';
  const sharedArgs: unknown[] = [
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

type RouterFunction =
  | 'depositAndSettleNative'
  | 'depositAndSettleNativeSession'
  | 'depositAndSettleToken'
  | 'depositAndSettleTokenSession'
  | 'payWithPermit2'
  | 'payWithPermit2Session'
  | 'payWithEIP2612'
  | 'payWithEIP2612Session'
  | 'payWithEIP3009'
  | 'payWithEIP3009Session';

function resolveRouterFunction(isNative: boolean, hasSession: boolean): RouterFunction {
  if (isNative) {
    return hasSession ? 'depositAndSettleNativeSession' : 'depositAndSettleNative';
  }
  return hasSession ? 'depositAndSettleTokenSession' : 'depositAndSettleToken';
}

function buildFunctionArgs(func: RouterFunction, payload: NormalizedRouterPayload): unknown[] {
  const { intent, witness, witnessSignature, session, sessionAuth, sessionAuthSignature, referenceData } = payload;
  if (func === 'depositAndSettleNative') {
    return [intent, witness, witnessSignature, referenceData];
  }
  if (func === 'depositAndSettleNativeSession') {
    if (!session || !sessionAuth || !sessionAuthSignature) throw new Error('session context required');
    return [intent, witness, witnessSignature, sessionAuth, sessionAuthSignature, session, referenceData];
  }
  if (func === 'depositAndSettleToken') {
    return [intent, witness, witnessSignature, referenceData];
  }
  if (func === 'depositAndSettleTokenSession') {
    if (!session || !sessionAuth || !sessionAuthSignature) throw new Error('session context required');
    return [intent, witness, witnessSignature, sessionAuth, sessionAuthSignature, session, referenceData];
  }
  throw new Error(`Unsupported router function: ${func}`);
}

interface RouterFunctionCall {
  routerAddress: string;
  functionName: RouterFunction;
  args: unknown[];
  signer?: Signer;
  transport?: Transport;
  value?: bigint;
}

async function sendRouterFunction({
  routerAddress,
  functionName,
  args,
  signer,
  transport,
  value,
}: RouterFunctionCall): Promise<TransportReceipt> {
  const txTransport = transport ?? (signer ? new RpcTransport(signer) : undefined);
  if (!txTransport) {
    throw new Error('sendRouterFunction requires either a signer or a transport');
  }

  const data = (ROUTER_INTERFACE as any).encodeFunctionData(functionName, args);
  const tx: ethers.TransactionRequest = {
    to: ethers.getAddress(routerAddress),
    data,
  };
  if (value !== undefined) {
    tx.value = value;
  }
  return txTransport.send(tx);
}

interface NormalizePayloadInput {
  intent: FlexPaymentIntentStruct;
  witness: FlexWitnessStruct;
  witnessSignature?: string;
  reference: string;
  session?: SessionContextInput;
  sessionAuth?: SessionTypes.SessionSpendAuthStruct;
  sessionAuthSignature?: string;
  autoTagReference?: boolean;
  signerAddress?: string;
  schemeData?: Record<string, unknown>;
}

async function buildPayload(base: {
  signer?: Signer;
  intent: FlexPaymentIntentStruct;
  witness: FlexWitnessStruct;
  witnessSignature?: string;
  reference: string;
  session?: SessionContextInput;
  sessionAuth?: SessionTypes.SessionSpendAuthStruct;
  sessionAuthSignature?: string;
  autoTagReference?: boolean;
  schemeData?: Record<string, unknown>;
}): Promise<NormalizedRouterPayload> {
  if (
    base.session &&
    base.autoTagReference !== false &&
    base.witnessSignature &&
    base.witnessSignature !== '0x'
  ) {
    throw new Error(
      'Auto-tagging references cannot be combined with witness signatures. Pre-tag the reference via formatSessionReference() and recompute the PaymentIntent + witness signature.'
    );
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

function normalizeRouterPayload(input: NormalizePayloadInput): NormalizedRouterPayload {
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
  const normalizedIntent: FlexPaymentIntentStruct = {
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

function normalizePermitStruct(permit: PermitTransferFromStruct): PermitTransferFromStruct {
  return {
    permitted: {
      token: ethers.getAddress(permit.permitted.token),
      amount: BigInt(permit.permitted.amount),
    },
    nonce: typeof permit.nonce === 'bigint' ? permit.nonce : BigInt(permit.nonce),
    deadline: Number(permit.deadline),
  };
}

function normalizeTransferDetails(details: PermitSignatureTransferDetailsStruct): PermitSignatureTransferDetailsStruct {
  return {
    to: ethers.getAddress(details.to),
    requestedAmount: BigInt(details.requestedAmount),
  };
}

function normalizeEip2612Signature(sig: Eip2612Signature): Eip2612Signature {
  return {
    deadline: Number(sig.deadline),
    v: Number(sig.v),
    r: normalizeBytes32(sig.r, 'r'),
    s: normalizeBytes32(sig.s, 's'),
  };
}

function normalizeEip3009Authorization(auth: Eip3009Authorization): Eip3009Authorization {
  return {
    validAfter: Number(auth.validAfter),
    validBefore: Number(auth.validBefore),
    authNonce: normalizeBytes32(auth.authNonce, 'authNonce'),
    v: Number(auth.v),
    r: normalizeBytes32(auth.r, 'r'),
    s: normalizeBytes32(auth.s, 's'),
  };
}

function normalizeBytes32(value: string, label: string): string {
  if (!value) throw new Error(`${label} is required`);
  if (!ethers.isHexString(value)) {
    throw new Error(`${label} must be a hex string`);
  }
  return ethers.hexlify(ethers.zeroPadValue(value as ethers.BytesLike, 32));
}

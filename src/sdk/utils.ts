/**
 * BNBPay SDK Utilities
 */

import { ethers } from 'ethers';
import { 
  PROTOCOL_VERSION, 
  MAX_REFERENCE_LENGTH, 
  MIN_NONCE_LENGTH,
  TOKEN_DECIMALS 
} from './constants.js';
import { PaymentRequest, FlexPaymentIntentStruct, FlexWitnessStruct } from './types.js';

const FLEX_SCHEME_ALIASES: Record<string, string> = {
  'push:evm:direct': 'aa_push',
  'push:evm:aa4337': 'aa_push',
  'exact:evm:permit2': 'permit2',
  'exact:evm:eip2612': 'eip2612',
  'exact:evm:eip3009': 'eip3009',
  aa_push: 'aa_push',
  permit2: 'permit2',
  eip2612: 'eip2612',
  eip3009: 'eip3009',
};

export function resolveFlexSchemeId(scheme: string): string {
  if (!scheme) throw new Error('scheme is required');
  if (ethers.isHexString(scheme, 32)) {
    return ethers.hexlify(ethers.zeroPadValue(scheme as ethers.BytesLike, 32));
  }
  const normalized = scheme.toLowerCase();
  const alias = FLEX_SCHEME_ALIASES[normalized] ?? scheme;
  return ethers.keccak256(ethers.toUtf8Bytes(alias));
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(length: number = MIN_NONCE_LENGTH): string {
  const bytes = ethers.randomBytes(length);
  return ethers.encodeBase64(bytes).replace(/[+/]/g, '').substring(0, length);
}

/**
 * Generate a unique reference ID
 */
export function generateReferenceId(prefix: string = 'order'): string {
  const timestamp = Date.now();
  const random = generateNonce(8);
  return `${prefix}_${timestamp}_${random}`;
}

const PAYMENT_INTENT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'PaymentIntent(bytes32 paymentId,address merchant,address token,uint256 amount,uint256 deadline,address payer,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)'
  )
);

const PAYMENT_ID_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'PaymentId(address token,uint256 amount,uint256 deadline,bytes32 resourceId,bytes32 referenceHash,bytes32 nonce)'
  )
);

const FLEX_WITNESS_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes('FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)')
);

export function hashPaymentIntent(intent: FlexPaymentIntentStruct): string {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const payer = intent.payer ? ethers.getAddress(intent.payer) : ethers.ZeroAddress;
  return ethers.keccak256(
    abi.encode(
      [
        'bytes32',
        'bytes32',
        'address',
        'address',
        'uint256',
        'uint256',
        'address',
        'bytes32',
        'bytes32',
        'bytes32',
      ],
      [
        PAYMENT_INTENT_TYPEHASH,
        intent.paymentId,
        ethers.getAddress(intent.merchant),
        ethers.getAddress(intent.token),
        intent.amount,
        BigInt(intent.deadline),
        payer,
        intent.resourceId,
        intent.referenceHash,
        intent.nonce,
      ]
    )
  );
}

export function hashFlexWitness(witness: FlexWitnessStruct): string {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  return ethers.keccak256(
    abi.encode(
      ['bytes32', 'bytes32', 'bytes32', 'address', 'bytes32'],
      [
        FLEX_WITNESS_TYPEHASH,
        witness.schemeId,
        witness.intentHash,
        ethers.getAddress(witness.payer),
        witness.salt,
      ]
    )
  );
}

export function deriveEip3009Nonce(params: {
  intentHash: string;
  router: string;
  chainId: number | bigint;
}): string {
  const intentHash = normalizeBytes32(params.intentHash, 'intentHash');
  const router = ethers.getAddress(params.router);
  const chainId = typeof params.chainId === 'bigint' ? params.chainId : BigInt(params.chainId);
  return ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'address', 'uint256'],
    ['X402Flex', intentHash, router, chainId]
  );
}

export function normalizeReference(reference?: string): string {
  const trimmed = reference?.trim();
  const base = trimmed && trimmed.length > 0 ? trimmed : generateReferenceId();
  if (base.length <= MAX_REFERENCE_LENGTH) {
    return base;
  }
  return base.slice(0, MAX_REFERENCE_LENGTH);
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate payment request
 */
export function validatePaymentRequest(request: PaymentRequest): void {
  if (request.v !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${request.v}`);
  }

  if (!request.chainId) {
    throw new Error('Chain ID is required');
  }

  if (!isValidAddress(request.recipient)) {
    throw new Error('Invalid recipient address');
  }

  if (request.amount && !request.currency) {
    throw new Error('Currency is required when amount is specified');
  }

  if (request.referenceId && request.referenceId.length > MAX_REFERENCE_LENGTH) {
    throw new Error(`Reference ID exceeds maximum length of ${MAX_REFERENCE_LENGTH}`);
  }

  if (request.expires && request.expires < Date.now() / 1000) {
    throw new Error('Payment request has expired');
  }

  if (request.token && !isValidAddress(request.token)) {
    throw new Error('Invalid token address');
  }
}

/**
 * Encode payment request as URI
 */
export function encodePaymentURI(request: PaymentRequest): string {
  validatePaymentRequest(request);

  const params = new URLSearchParams();
  params.append('v', request.v.toString());
  params.append('chainId', request.chainId.toString());
  
  if (request.amount) params.append('amount', request.amount);
  if (request.currency) params.append('currency', request.currency);
  if (request.token) params.append('token', request.token);
  if (request.referenceId) params.append('referenceId', request.referenceId);
  if (request.label) params.append('label', request.label);
  if (request.message) params.append('message', request.message);
  if (request.expires) params.append('expires', request.expires.toString());
  
  if (request.metadata) {
    const metadataStr = ethers.encodeBase64(
      ethers.toUtf8Bytes(JSON.stringify(request.metadata))
    );
    params.append('metadata', metadataStr);
  }
  
  if (request.capabilities && request.capabilities.length > 0) {
    params.append('capabilities', request.capabilities.join(','));
  }

  return `bnbpay:${request.recipient}?${params.toString()}`;
}

/**
 * Decode payment URI to request object
 */
export function decodePaymentURI(uri: string): PaymentRequest {
  if (!uri.startsWith('bnbpay:')) {
    throw new Error('Invalid BNBPay URI');
  }

  const [recipientPart, queryPart] = uri.substring(7).split('?');
  
  if (!recipientPart || !isValidAddress(recipientPart)) {
    throw new Error('Invalid recipient in URI');
  }

  const params = new URLSearchParams(queryPart || '');
  
  const request: PaymentRequest = {
    v: parseInt(params.get('v') || '1'),
    chainId: parseInt(params.get('chainId') || '0'),
    recipient: recipientPart,
  };

  if (params.has('amount')) request.amount = params.get('amount')!;
  if (params.has('currency')) request.currency = params.get('currency')!;
  if (params.has('token')) request.token = params.get('token')!;
  if (params.has('referenceId')) request.referenceId = params.get('referenceId')!;
  if (params.has('label')) request.label = params.get('label')!;
  if (params.has('message')) request.message = params.get('message')!;
  if (params.has('expires')) request.expires = parseInt(params.get('expires')!);
  
  if (params.has('metadata')) {
    try {
      const metadataStr = ethers.toUtf8String(
        ethers.decodeBase64(params.get('metadata')!)
      );
      request.metadata = JSON.parse(metadataStr);
    } catch {
      // Invalid metadata, ignore
    }
  }
  
  if (params.has('capabilities')) {
    request.capabilities = params.get('capabilities')!.split(',');
  }

  validatePaymentRequest(request);
  return request;
}

function normalizeBytes32(value: string, label: string): string {
  if (!value) throw new Error(`${label} is required`);
  if (!ethers.isHexString(value)) {
    throw new Error(`${label} must be a hex string`);
  }
  return ethers.hexlify(ethers.zeroPadValue(value as ethers.BytesLike, 32));
}


/**
 * Format token amount with decimals
 */
export function formatTokenAmount(
  amount: string | bigint,
  tokenSymbol: string
): string {
  const decimals = TOKEN_DECIMALS[tokenSymbol] || 18;
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parse token amount to smallest units
 */
export function parseTokenAmount(
  amount: string,
  tokenSymbol: string
): bigint {
  const decimals = TOKEN_DECIMALS[tokenSymbol] || 18;
  return ethers.parseUnits(amount, decimals);
}

/**
 * Calculate payment reference hash
 */
export function calculateReferenceHash(reference: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(reference));
}

/**
 * Check if address is zero address
 */
export function isNativeToken(address: string): boolean {
  return address === ethers.ZeroAddress || 
         address === '0x0000000000000000000000000000000000000000';
}

/**
 * Derive a deterministic resourceId for router settlements
 */
export function deriveResourceId(params: {
  merchant: string;
  referenceId: string;
  token?: string;
  amount: bigint;
  chainId: number;
  salt?: string;
}): { resourceId: string; salt: string } {
  const salt = params.salt ?? ethers.hexlify(ethers.randomBytes(32));
  const normalizedReference = normalizeReference(params.referenceId);
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abi.encode(
    ['address', 'string', 'address', 'uint256', 'uint64', 'bytes32'],
    [
      ethers.getAddress(params.merchant),
      normalizedReference,
      params.token ? ethers.getAddress(params.token) : ethers.ZeroAddress,
      params.amount,
      BigInt(params.chainId),
      salt,
    ]
  );
  return {
    resourceId: ethers.keccak256(encoded),
    salt,
  };
}

/**
 * Derive paymentId from resourceId and merchant context
 */
export function derivePaymentId(params: {
  token: string;
  amount: bigint;
  deadline: number;
  resourceId: string;
  referenceHash: string;
  nonce: string;
}): string {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abi.encode(
    ['bytes32', 'address', 'uint256', 'uint256', 'bytes32', 'bytes32', 'bytes32'],
    [
      PAYMENT_ID_TYPEHASH,
      ethers.getAddress(params.token),
      params.amount,
      BigInt(params.deadline),
      params.resourceId,
      params.referenceHash,
      params.nonce,
    ]
  );
  return ethers.keccak256(encoded);
}

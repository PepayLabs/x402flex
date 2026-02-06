/**
 * BNBPay SDK Types
 */

import { ethers } from 'ethers';

export interface PaymentRequest {
  v: number;
  chainId: number;
  recipient: string;
  amount?: string;
  currency?: string;
  token?: string;
  referenceId?: string;
  label?: string;
  message?: string;
  expires?: number;
  feeBps?: number; // Optional fee in basis points (100 = 1%)
  metadata?: Record<string, any>;
  capabilities?: string[];
}

export interface PaymentRequestURI {
  uri: string;
  qrCode?: string;
}

export interface VerificationOptions {
  provider: ethers.Provider;
  txHash: string;
  expectedAmount?: string;
  expectedCurrency?: string;
  expectedToken?: string;
  referenceId?: string;
  minConfirmations?: number;
}

export interface PaymentReceipt {
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
  confirmations: number;
  chainId: number;
  from: string;
  to: string;
  token: string;
  amount: string;
  paymentId?: string;
  schemeId?: string;
  feeAmount?: string; // Fee charged on this payment
  netAmount?: string; // Amount received by merchant (amount - fee)
  referenceId?: string;
  referenceHash?: string;
  resourceId?: string;
  blockNumber?: number;
  timestamp?: number;
  error?: string;
}

export interface FlexPaymentIntentStruct {
  paymentId: string;
  merchant: string;
  token: string;
  amount: bigint;
  deadline: number;
  payer: string; // address(0) for open push flows
  resourceId: string;
  referenceHash: string;
  nonce: string;
}

export interface FlexPaymentIntentJSON extends Omit<FlexPaymentIntentStruct, 'amount'> {
  amount: string;
}

export interface FlexWitnessJSON {
  schemeId: string;
  intentHash: string;
  payer: string;
  salt: string;
}

export interface FlexWitnessStruct {
  schemeId: string;
  intentHash: string;
  payer: string;
  salt: string;
}

export interface SessionRateLimit {
  maxTxPerMinute?: number;
  maxTxPerDay?: number;
  coolDownSeconds?: number;
}

export interface SessionTokenCap {
  token: string;
  cap: bigint;
  dailyCap: bigint;
}

export interface FlexSessionGrantStruct {
  sessionId: string;
  payer: string;
  agent: string;
  merchantScope: string;
  deadline: number;
  expiresAt: number;
  epoch: number;
  nonce: bigint;
  rateLimit: SessionRateLimit;
  allowedSchemes: string[];
  tokenCaps: SessionTokenCap[];
}

export interface ClaimableSessionGrantStruct {
  sessionId: string;
  payer: string;
  merchantScope: string;
  deadline: number;
  expiresAt: number;
  epoch: number;
  nonce: bigint;
  claimSigner: string;
  rateLimit: SessionRateLimit;
  allowedSchemes: string[];
  tokenCaps: SessionTokenCap[];
}

export interface ClaimSessionStruct {
  sessionId: string;
  agent: string;
  epoch: number;
  deadline: number;
}

export interface SessionContextInput {
  sessionId: string;
  agent?: string;
}

export interface SessionContextStruct {
  sessionId: string;
  agent: string;
}

export interface CreateFlexIntentParams {
  merchant: string;
  token?: string;
  amount: bigint;
  chainId: number;
  referenceId?: string;
  scheme?: string;
  salt?: string;
  nonce?: string;
  sessionId?: string;
  deadlineSeconds?: number;
  deadline?: number;
  payer?: string;
}

export interface FlexIntentResult {
  intent: FlexPaymentIntentStruct;
  witness: FlexWitnessStruct;
  paymentId: string;
  resourceId: string;
  referenceId: string;
  schemeId: string;
}

export interface SessionReferenceDetails {
  fullReference: string;
  baseReference: string;
  sessionId?: string;
  resourceTag?: string;
  hasSessionTag: boolean;
}

export interface PaymentSettledEvent {
  paymentId: string;
  payer: string;
  merchant: string;
  token: string;
  amount: bigint;
  feeAmount: bigint;
  schemeId: string;
  referenceData: string;
  referenceHash: string;
  resourceId: string;
  timestamp: bigint;
  session?: SessionReferenceDetails;
  blockNumber?: number;
  txHash?: string;
}

export interface SessionReceiptSummary {
  sessionId: string;
  payments: PaymentSettledEvent[];
  totalAmount: bigint;
}

export interface FlexRouterWitnessInput {
  payer?: string;
  salt?: string;
  signature?: string;
  schemeId?: string;
}

export interface FlexRouterInput {
  address: string;
  merchant?: string;
  token?: string;
  deadline?: number;
  deadlineSeconds?: number;
  resourceId?: string;
  resourceSalt?: string;
  paymentId?: string;
  nonce?: string;
  sessionId?: string;
  witness?: FlexRouterWitnessInput;
}

export interface FlexAcceptInput {
  scheme: string;
  network: string;
  chainId?: number;
  amount: string | number | bigint;
  asset?: string;
  payTo?: string;
  referenceId?: string;
  amountUsd?: string;
  metadata?: Record<string, any>;
  router?: FlexRouterInput;
}

export interface FlexRouterPayload {
  address: string;
  schemeId: string;
  intent: FlexPaymentIntentJSON;
  witness?: FlexWitnessJSON;
  signature?: string;
}

export interface FlexAcceptOption {
  scheme: string;
  schemeId: string;
  network: string;
  chainId: number;
  amount: string;
  payTo: string;
  asset: string;
  reference: string;
  amountUsd?: string;
  metadata?: Record<string, any>;
  router?: FlexRouterPayload;
}

export interface FlexResponse {
  x402Version: number;
  resourceId?: string;
  expiresAt?: number;
  memo?: string;
  accepts: FlexAcceptOption[];
}

export interface FlexResponseInput {
  version?: number;
  referenceId?: string;
  merchant?: string;
  resourceId?: string;
  memo?: string;
  expiresAt?: number;
  ttlSeconds?: number;
  accepts: FlexAcceptInput[];
}

export interface FlexAuthorization {
  network: string;
  txHash?: string;
  blockNumber?: number;
  timestamp?: number;
  relayPayload?: Record<string, any>;
}

export interface FlexSettlementProof {
  txHash: string;
  network: string;
  blockNumber: number;
  confirmations: number;
  paymentId?: string;
  schemeId?: string;
  resourceId?: string;
  reference?: string;
  session?: SessionReferenceDetails;
  merchant?: string;
  payer?: string;
  token?: string;
  amount?: string;
}

export interface FlexSettlementResult {
  success: boolean;
  network: string;
  paymentId?: string;
  schemeId?: string;
  resourceId?: string;
  reference?: string;
  session?: SessionReferenceDetails;
  proof: FlexSettlementProof;
  error?: string;
}

export interface QuoteRequest {
  amount: string;
  currency: string;
  token: string;
  chainId: number;
}

export interface QuoteResponse {
  tokenAmount: string;
  rate: number;
  slippage: number;
  expires: number;
}

export interface SubscriptionPlan {
  planId: number;
  token: string;
  amount: string;
  interval: number;
  receiver: string;
  feeBps?: number; // Optional fee in basis points for this plan
}

export interface Subscription {
  id: number;
  planId: number;
  user: string;
  startTime: number;
  lastCharge?: number;
  nextCharge?: number;
  status: 'active' | 'paused' | 'canceled';
}

export interface TransactionOptions {
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export type PaymentMode = 'direct' | 'contract';

export interface SDKConfig {
  chainId: number;
  provider?: ethers.Provider;
  rpcUrl?: string;
  paymentRegistry?: string;
  subscriptionManager?: string;
  defaultConfirmations?: number;
  defaultFeeBps?: number; // Default fee in basis points
  maxFeeBps?: number; // Maximum allowed fee (default 1000 = 10%)
}

// Fee calculation helper types
export interface FeeCalculation {
  totalAmount: string;
  merchantAmount: string;
  feeAmount: string;
  feeBps: number;
  feePercentage: string;
}

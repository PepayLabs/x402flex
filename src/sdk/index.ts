/**
 * BNBPay SDK
 * 
 * An open standard for instant, low-fee payments on BNB Chain
 */

// Re-export constants
export * from './constants.js';

// Re-export types
export * from './types.js';

// Re-export utilities
export {
  generateNonce,
  generateReferenceId,
  isValidAddress,
  validatePaymentRequest,
  encodePaymentURI,
  decodePaymentURI,
  formatTokenAmount,
  parseTokenAmount,
  calculateReferenceHash,
  isNativeToken,
  normalizeReference,
  deriveResourceId,
  derivePaymentId,
  deriveEip3009Nonce,
  hashPaymentIntent,
  hashFlexWitness,
} from './utils.js';

// Re-export QR code functions
export {
  generateQRCode,
  generateQRCodeSVG,
  generateBrandedQRCode,
} from './qrcode.js';

// Re-export wallet functions
export {
  detectWallets,
  connectInjectedWallet,
  switchNetwork,
  createProvider,
  checkNetwork,
} from './wallets.js';

export {
  detectPermit2WalletLane,
  buildPermit2ApprovalTx,
  buildPermit2WitnessTypedData,
  PERMIT2_WITNESS_TYPESTRING,
  type Permit2WalletLane,
  type WalletLaneDetection,
} from './permit2.js';

// Typechain factories (useful for advanced integrations)
export * from './typechain/index.js';

// Re-export payment functions
export {
  createPaymentRequest,
  createPaymentRequestWithQR,
  parsePaymentURI,
  buildPaymentTransaction,
  canPay,
  verifyPayment,
  isPaymentSettled,
  approveToken,
  checkAllowance,
  getTokenBalance,
  PAYMENT_REGISTRY_ABI,
} from './payment.js';

export {
  buildFlexResponse,
  getFlexSchemeId,
  createFlexIntent,
  decodePaymentSettledEvent,
} from './x402.js';

export {
  buildSessionGrantTypedData,
  buildSessionGrantDigest,
  buildClaimableSessionGrantTypedData,
  buildClaimableSessionGrantDigest,
  buildClaimSessionTypedData,
  buildClaimSessionDigest,
  formatSessionReference,
  parseSessionReference,
  hashFlexSessionGrant,
  hashClaimableSessionGrant,
  buildSessionContext,
  auditSessionReceipts,
} from './session.js';

export {
  sendRouterPayment,
  payWithPermit2,
  payWithEIP2612,
  payWithEIP3009,
  type PermitTransferFromStruct,
  type PermitSignatureTransferDetailsStruct,
  type Eip2612Signature,
  type Eip3009Authorization,
  type NormalizedRouterPayload,
  type PayWithPermit2Params,
  type PayWithEIP2612Params,
  type PayWithEIP3009Params,
} from './router.js';

export { tokens, tokenAliases, type TokenInfo, type TokenSymbol, type ChainId, type TokenCapabilities } from './tokens.js';

export { RpcTransport, RelayTransport, type Transport, type TransportReceipt } from './transport.js';

export { fetchSessionsByWallet, fetchPayments } from './indexer.js';

export * from './api-client.js';

// Re-export fee utilities
export {
  calculateFee,
  calculateTotalWithFee,
  isValidFeeBps,
  formatFee,
  parseFeePercentage,
  getFeeBreakdownMessage,
} from './fees.js';

// Gas utilities
export { computeGasFees, applyGasLimitBuffer, type GasFees, type GasStyle, type GasEstimationOptions } from './gas.js';

// SDK version
export const VERSION = '0.1.1';

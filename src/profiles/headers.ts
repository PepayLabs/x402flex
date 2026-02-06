import type { ProtocolProfile } from '../core/types.js';

export interface ProtocolHeaders {
  paymentRequired: string;
  paymentAuthorization: string;
  paymentResponse: string;
  supportedAuthorizationAliases: string[];
}

const BNBPAY_HEADERS: ProtocolHeaders = {
  paymentRequired: 'PAYMENT-REQUIRED',
  paymentAuthorization: 'X-PAYMENT-AUTHORIZATION',
  paymentResponse: 'X-PAYMENT-RESPONSE',
  supportedAuthorizationAliases: ['x-payment-authorization', 'payment-signature', 'payment'],
};

const X402_V2_HEADERS: ProtocolHeaders = {
  paymentRequired: 'PAYMENT-REQUIRED',
  paymentAuthorization: 'PAYMENT-SIGNATURE',
  paymentResponse: 'PAYMENT-RESPONSE',
  supportedAuthorizationAliases: ['payment-signature', 'x-payment-authorization', 'payment'],
};

export function headersForProfile(profile: ProtocolProfile | Exclude<ProtocolProfile, 'auto'>): ProtocolHeaders {
  if (profile === 'x402-v2-caip') {
    return X402_V2_HEADERS;
  }
  return BNBPAY_HEADERS;
}


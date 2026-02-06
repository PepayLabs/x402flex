import { SdkError } from '../core/errors.js';
import type {
  BuyerAuthorizationResult,
  PaymentClientConfig,
  PaymentTransportChallenge,
  PaymentTransportRequest,
  ProtocolProfile,
} from '../core/types.js';
import { headersForProfile } from '../profiles/headers.js';

export interface PaymentClient {
  profile: Exclude<ProtocolProfile, 'auto'>;
  maxRetries: number;
  authorize: (
    challenge: PaymentTransportChallenge,
    request: PaymentTransportRequest
  ) => Promise<Record<string, string>>;
}

function resolveProfile(profile?: ProtocolProfile): Exclude<ProtocolProfile, 'auto'> {
  return profile === 'x402-v2-caip' ? 'x402-v2-caip' : 'bnbpay-v1-flex';
}

function normalizeAuthorization(
  value: string | Record<string, unknown>
): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function mergeAuthorizationHeaders(
  headers: ReturnType<typeof headersForProfile>,
  authorizationResult: BuyerAuthorizationResult
): Record<string, string> {
  const output: Record<string, string> = {
    [headers.paymentAuthorization]: normalizeAuthorization(authorizationResult.authorization),
  };
  for (const alias of headers.supportedAuthorizationAliases) {
    output[alias] = output[headers.paymentAuthorization];
  }
  if (authorizationResult.headers) {
    for (const [key, value] of Object.entries(authorizationResult.headers)) {
      output[key] = value;
    }
  }
  return output;
}

export function createPaymentClient(config: PaymentClientConfig): PaymentClient {
  const profile = resolveProfile(config.protocolProfile);
  const headerPolicy = headersForProfile(profile);
  const maxRetries = config.maxRetries ?? 1;
  if (maxRetries < 1) {
    throw new SdkError('SDK_CONFIG_ERROR', 'maxRetries must be at least 1');
  }

  return {
    profile,
    maxRetries,
    authorize: async (challenge: PaymentTransportChallenge, request: PaymentTransportRequest) => {
      const result = await config.wallet.authorizePayment(challenge, request);
      if (!result?.authorization) {
        throw new SdkError('PAYMENT_AUTHORIZATION_FAILED', 'wallet did not return authorization payload');
      }
      return mergeAuthorizationHeaders(headerPolicy, result);
    },
  };
}


export type SdkErrorCode =
  | 'SDK_CONFIG_ERROR'
  | 'UNSUPPORTED_MODE'
  | 'UNCONFIGURED_NETWORK'
  | 'UNCONFIGURED_NETWORK_CONTRACTS'
  | 'MISSING_API_CLIENT'
  | 'UNSUPPORTED_OPERATION'
  | 'PAYMENT_AUTHORIZATION_FAILED'
  | 'FACILITATOR_ERROR';

export class SdkError extends Error {
  public readonly code: SdkErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: SdkErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SdkError';
    this.code = code;
    this.details = details;
  }
}

export function sdkConfigError(message: string, details?: Record<string, unknown>): SdkError {
  return new SdkError('SDK_CONFIG_ERROR', message, details);
}

export function ensure(condition: unknown, code: SdkErrorCode, message: string): asserts condition {
  if (!condition) {
    throw new SdkError(code, message);
  }
}


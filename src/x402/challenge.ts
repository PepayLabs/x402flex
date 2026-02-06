import type { FlexResponse } from '../sdk/index.js';

export function isPaymentChallenge(value: unknown): value is FlexResponse {
  if (!value || typeof value !== 'object') return false;
  const cast = value as any;
  return typeof cast.x402Version === 'number' && Array.isArray(cast.accepts);
}

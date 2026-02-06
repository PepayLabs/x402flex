import type { FlexAuthorization } from '../sdk/index.js';

export function parseAuthorizationHeader(value: string): FlexAuthorization {
  try {
    return JSON.parse(value) as FlexAuthorization;
  } catch {
    return {
      network: '',
      txHash: value,
    };
  }
}

export function formatAuthorizationHeader(value: FlexAuthorization | string): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

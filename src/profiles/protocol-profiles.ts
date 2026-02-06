import type { ProtocolProfile } from '../core/types.js';

export const DEFAULT_PROTOCOL_PROFILE: Exclude<ProtocolProfile, 'auto'> = 'bnbpay-v1-flex';

export function resolveProtocolProfile(
  profile: ProtocolProfile | undefined,
  capabilities?: { protocolProfiles?: string[] }
): Exclude<ProtocolProfile, 'auto'> {
  if (!profile || profile === 'auto') {
    if (capabilities?.protocolProfiles?.includes('x402-v2-caip')) {
      return 'x402-v2-caip';
    }
    return DEFAULT_PROTOCOL_PROFILE;
  }
  return profile;
}


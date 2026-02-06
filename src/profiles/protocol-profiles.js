export const DEFAULT_PROTOCOL_PROFILE = 'bnbpay-v1-flex';
export function resolveProtocolProfile(profile, capabilities) {
    if (!profile || profile === 'auto') {
        if (capabilities?.protocolProfiles?.includes('x402-v2-caip')) {
            return 'x402-v2-caip';
        }
        return DEFAULT_PROTOCOL_PROFILE;
    }
    return profile;
}

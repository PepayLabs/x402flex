import { SdkError } from '../core/errors.js';
import { headersForProfile } from '../profiles/headers.js';
function resolveProfile(profile) {
    return profile === 'x402-v2-caip' ? 'x402-v2-caip' : 'bnbpay-v1-flex';
}
function normalizeAuthorization(value) {
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value);
}
function mergeAuthorizationHeaders(headers, authorizationResult) {
    const output = {
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
export function createPaymentClient(config) {
    const profile = resolveProfile(config.protocolProfile);
    const headerPolicy = headersForProfile(profile);
    const maxRetries = config.maxRetries ?? 1;
    if (maxRetries < 1) {
        throw new SdkError('SDK_CONFIG_ERROR', 'maxRetries must be at least 1');
    }
    return {
        profile,
        maxRetries,
        authorize: async (challenge, request) => {
            const result = await config.wallet.authorizePayment(challenge, request);
            if (!result?.authorization) {
                throw new SdkError('PAYMENT_AUTHORIZATION_FAILED', 'wallet did not return authorization payload');
            }
            return mergeAuthorizationHeaders(headerPolicy, result);
        },
    };
}

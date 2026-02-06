export function isPaymentChallenge(value) {
    if (!value || typeof value !== 'object')
        return false;
    const cast = value;
    return typeof cast.x402Version === 'number' && Array.isArray(cast.accepts);
}

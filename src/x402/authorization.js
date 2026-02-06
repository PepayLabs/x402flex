export function parseAuthorizationHeader(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return {
            network: '',
            txHash: value,
        };
    }
}
export function formatAuthorizationHeader(value) {
    return typeof value === 'string' ? value : JSON.stringify(value);
}

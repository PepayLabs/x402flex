export function relayPayment(api, request) {
    return api.relay.payment(request);
}
export function relayPermit2Bundle(api, request) {
    return api.relay.permit2Bundle(request);
}
export function relaySessionRevoke(api, request) {
    return api.relay.sessionRevoke(request);
}
export function relaySessionOpen(api, request) {
    return api.relay.sessionOpen(request);
}
export function relaySessionOpenClaimable(api, request) {
    return api.relay.sessionOpenClaimable(request);
}
export function relaySessionClaim(api, request) {
    return api.relay.sessionClaim(request);
}

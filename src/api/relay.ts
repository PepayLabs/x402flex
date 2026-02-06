import type { ApiClient } from './adapter.js';

export function relayPayment(api: ApiClient, request: any) {
  return api.relay.payment(request);
}

export function relayPermit2Bundle(api: ApiClient, request: any) {
  return api.relay.permit2Bundle(request);
}

export function relaySessionRevoke(api: ApiClient, request: any) {
  return api.relay.sessionRevoke(request);
}

export function relaySessionOpen(api: ApiClient, request: any) {
  return api.relay.sessionOpen(request);
}

export function relaySessionOpenClaimable(api: ApiClient, request: any) {
  return api.relay.sessionOpenClaimable(request);
}

export function relaySessionClaim(api: ApiClient, request: any) {
  return api.relay.sessionClaim(request);
}

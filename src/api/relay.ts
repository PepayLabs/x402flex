import type { ApiClient } from './adapter.js';

type RelayPaymentRequest = Parameters<ApiClient['relay']['payment']>[0];
type RelayPermit2BundleRequest = Parameters<ApiClient['relay']['permit2Bundle']>[0];
type RelaySessionRevokeRequest = Parameters<ApiClient['relay']['sessionRevoke']>[0];
type RelaySessionOpenRequest = Parameters<ApiClient['relay']['sessionOpen']>[0];
type RelaySessionOpenClaimableRequest = Parameters<ApiClient['relay']['sessionOpenClaimable']>[0];
type RelaySessionClaimRequest = Parameters<ApiClient['relay']['sessionClaim']>[0];

export function relayPayment(api: ApiClient, request: RelayPaymentRequest) {
  return api.relay.payment(request);
}

export function relayPermit2Bundle(api: ApiClient, request: RelayPermit2BundleRequest) {
  return api.relay.permit2Bundle(request);
}

export function relaySessionRevoke(api: ApiClient, request: RelaySessionRevokeRequest) {
  return api.relay.sessionRevoke(request);
}

export function relaySessionOpen(api: ApiClient, request: RelaySessionOpenRequest) {
  return api.relay.sessionOpen(request);
}

export function relaySessionOpenClaimable(api: ApiClient, request: RelaySessionOpenClaimableRequest) {
  return api.relay.sessionOpenClaimable(request);
}

export function relaySessionClaim(api: ApiClient, request: RelaySessionClaimRequest) {
  return api.relay.sessionClaim(request);
}

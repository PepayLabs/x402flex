import type {
  ApiClient,
  Permit2BundleRequest,
  RelayPaymentRequest,
  RelaySessionClaimRequest,
  RelaySessionOpenClaimableRequest,
  RelaySessionOpenRequest,
  RelaySessionRevokeRequest,
} from '@bnbpay/sdk';

export function relayPayment(api: ApiClient, request: RelayPaymentRequest) {
  return api.relay.payment(request);
}

export function relayPermit2Bundle(api: ApiClient, request: Permit2BundleRequest) {
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


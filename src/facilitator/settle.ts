import type { FacilitatorClient, FacilitatorSettleRequest } from './client.js';

export async function settlePaymentWithFacilitator(
  client: FacilitatorClient,
  request: FacilitatorSettleRequest
) {
  return client.settle(request);
}


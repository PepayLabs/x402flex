import type { FacilitatorClient, FacilitatorVerifyRequest } from './client.js';

export async function verifyPaymentWithFacilitator(
  client: FacilitatorClient,
  request: FacilitatorVerifyRequest
) {
  return client.verify(request);
}


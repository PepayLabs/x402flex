import { createFlexIntent, type CreateFlexIntentParams } from '../../sdk/index.js';

export function createPaymentIntent(params: CreateFlexIntentParams) {
  return createFlexIntent(params);
}

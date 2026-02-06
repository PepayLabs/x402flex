import {
  sendRouterPayment,
  payWithPermit2,
  payWithEIP2612,
  payWithEIP3009,
  type PayWithPermit2Params,
  type PayWithEIP2612Params,
  type PayWithEIP3009Params,
} from '../../sdk/index.js';

type SendRouterPaymentParams = Parameters<typeof sendRouterPayment>[0];

export function executeRouterPayment(params: SendRouterPaymentParams) {
  return sendRouterPayment(params);
}

export function executePermit2Payment(params: PayWithPermit2Params) {
  return payWithPermit2(params);
}

export function executeEip2612Payment(params: PayWithEIP2612Params) {
  return payWithEIP2612(params);
}

export function executeEip3009Payment(params: PayWithEIP3009Params) {
  return payWithEIP3009(params);
}

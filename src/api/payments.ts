import type { ApiClient } from './adapter.js';

type ListPaymentsParams = Parameters<ApiClient['payments']['list']>[0];
type PaymentStatusParams = Parameters<ApiClient['payments']['status']>[1];
type BuildIntentPayload = Parameters<ApiClient['payments']['buildIntent']>[0];
type CanPayPayload = Parameters<ApiClient['payments']['canPay']>[0];
type WalletPaymentsParams = Parameters<ApiClient['wallets']['payments']>[1];

export function listPayments(api: ApiClient, params?: ListPaymentsParams) {
  return api.payments.list(params);
}

export function getPayment(api: ApiClient, paymentId: string) {
  return api.payments.get(paymentId);
}

export function getPaymentStatus(api: ApiClient, paymentId: string, params?: PaymentStatusParams) {
  return api.payments.status(paymentId, params);
}

export function buildPaymentIntent(api: ApiClient, request: BuildIntentPayload) {
  return api.payments.buildIntent(request);
}

export function canPayViaApi(api: ApiClient, params: CanPayPayload) {
  return api.payments.canPay(params);
}

export function listWalletPayments(api: ApiClient, address: string, params?: WalletPaymentsParams) {
  return api.wallets.payments(address, params);
}

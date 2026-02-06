import type { ApiClient } from './adapter.js';

export function listPayments(api: ApiClient, params?: any) {
  return api.payments.list(params);
}

export function getPayment(api: ApiClient, paymentId: string) {
  return api.payments.get(paymentId);
}

export function getPaymentStatus(api: ApiClient, paymentId: string, network?: string) {
  return api.payments.status(paymentId, network ? ({ network } as any) : undefined);
}

export function buildPaymentIntent(api: ApiClient, request: any) {
  return api.payments.buildIntent(request);
}

export function canPayViaApi(api: ApiClient, params: any) {
  return api.payments.canPay(params as any);
}

export function listWalletPayments(api: ApiClient, address: string, params?: any) {
  return api.wallets.payments(address, params as any);
}

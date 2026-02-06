import type {
  ApiClient,
  BuildIntentRequest,
  CanPayParams,
  PaymentsParams,
  WalletPaymentsParams,
} from '@bnbpay/sdk';

export function listPayments(api: ApiClient, params?: PaymentsParams) {
  return api.payments.list(params);
}

export function getPayment(api: ApiClient, paymentId: string) {
  return api.payments.get(paymentId);
}

export function getPaymentStatus(api: ApiClient, paymentId: string, network?: string) {
  return api.payments.status(paymentId, network ? ({ network } as any) : undefined);
}

export function buildPaymentIntent(api: ApiClient, request: BuildIntentRequest) {
  return api.payments.buildIntent(request);
}

export function canPayViaApi(api: ApiClient, params: CanPayParams) {
  return api.payments.canPay(params as any);
}

export function listWalletPayments(api: ApiClient, address: string, params?: WalletPaymentsParams) {
  return api.wallets.payments(address, params as any);
}


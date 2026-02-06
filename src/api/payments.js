export function listPayments(api, params) {
    return api.payments.list(params);
}
export function getPayment(api, paymentId) {
    return api.payments.get(paymentId);
}
export function getPaymentStatus(api, paymentId, params) {
    return api.payments.status(paymentId, params);
}
export function buildPaymentIntent(api, request) {
    return api.payments.buildIntent(request);
}
export function canPayViaApi(api, params) {
    return api.payments.canPay(params);
}
export function listWalletPayments(api, address, params) {
    return api.wallets.payments(address, params);
}

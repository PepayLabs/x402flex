export function createInvoice(api, request) {
    return api.invoices.create(request);
}
export function getInvoice(api, invoiceId) {
    return api.invoices.get(invoiceId);
}
export function getInvoiceStatus(api, invoiceId) {
    return api.invoices.status(invoiceId);
}
export function cancelInvoice(api, invoiceId) {
    return api.invoices.cancel(invoiceId);
}
export function confirmInvoicePayment(api, invoiceId, payload) {
    return api.invoices.confirmPayment(invoiceId, payload);
}
export function invoiceStreamSseUrl(api, invoiceId) {
    return api.invoices.streamSseUrl(invoiceId);
}
export function invoiceStreamWsUrl(api, invoiceId) {
    return api.invoices.streamWsUrl(invoiceId);
}

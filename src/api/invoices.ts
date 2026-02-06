import type { ApiClient } from './adapter.js';

export function createInvoice(api: ApiClient, request: any) {
  return api.invoices.create(request);
}

export function getInvoice(api: ApiClient, invoiceId: string) {
  return api.invoices.get(invoiceId);
}

export function getInvoiceStatus(api: ApiClient, invoiceId: string) {
  return api.invoices.status(invoiceId);
}

export function cancelInvoice(api: ApiClient, invoiceId: string) {
  return api.invoices.cancel(invoiceId);
}

export function confirmInvoicePayment(
  api: ApiClient,
  invoiceId: string,
  payload: any
) {
  return api.invoices.confirmPayment(invoiceId, payload);
}

export function invoiceStreamSseUrl(api: ApiClient, invoiceId: string) {
  return api.invoices.streamSseUrl(invoiceId);
}

export function invoiceStreamWsUrl(api: ApiClient, invoiceId: string) {
  return api.invoices.streamWsUrl(invoiceId);
}

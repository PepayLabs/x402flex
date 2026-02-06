export async function settlePaymentWithFacilitator(client, request) {
    return client.settle(request);
}

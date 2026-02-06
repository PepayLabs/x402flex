export async function verifyPaymentWithFacilitator(client, request) {
    return client.verify(request);
}

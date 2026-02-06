export async function fetchSessionsByWallet(options) {
    if (!options?.baseUrl)
        throw new Error('baseUrl is required');
    if (!options?.wallet)
        throw new Error('wallet is required');
    const url = new URL('/sessions', options.baseUrl);
    url.searchParams.set('wallet', options.wallet);
    const payload = await requestJson(url.toString(), options.fetchFn, options.signal);
    return (payload.sessions ?? payload.data ?? payload);
}
export async function fetchPayments(options) {
    if (!options?.baseUrl)
        throw new Error('baseUrl is required');
    const url = new URL('/payments', options.baseUrl);
    if (options.sessionId)
        url.searchParams.set('session_id', options.sessionId);
    if (options.resourceId)
        url.searchParams.set('resource_id', options.resourceId);
    if (options.paymentId)
        url.searchParams.set('payment_id', options.paymentId);
    const payload = await requestJson(url.toString(), options.fetchFn, options.signal);
    return (payload.payments ?? payload.data ?? payload);
}
async function requestJson(url, fetchImpl, signal) {
    const fetchFn = fetchImpl ?? fetch;
    if (!fetchFn)
        throw new Error('fetch implementation required');
    const response = await fetchFn(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Indexer request failed (${response.status}): ${text}`);
    }
    return response.json();
}

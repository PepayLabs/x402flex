export const DEFAULT_API_BASE_URL = 'https://api.bnbpay.org';
export class BnbpayApiError extends Error {
    constructor(message, statusCode, details) {
        super(message);
        this.name = 'BnbpayApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
export function serializeBigInt(value) {
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'bigint')
        return value.toString();
    if (Array.isArray(value))
        return value.map(serializeBigInt);
    if (typeof value === 'object') {
        const result = {};
        for (const [key, entry] of Object.entries(value)) {
            result[key] = serializeBigInt(entry);
        }
        return result;
    }
    return value;
}
export function safeStringify(value, space) {
    return JSON.stringify(serializeBigInt(value), null, space);
}
function buildUrl(baseUrl, path, query) {
    const url = new URL(path, baseUrl);
    if (query) {
        Object.entries(query).forEach(([key, val]) => {
            if (val === undefined || val === null || val === '')
                return;
            url.searchParams.set(key, String(val));
        });
    }
    return url.toString();
}
function buildWsUrl(baseUrl, path) {
    const url = new URL(path, baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
}
function splitOptions(params) {
    if (!params) {
        return { query: undefined, options: undefined };
    }
    const { signal, headers, ...query } = params;
    const options = signal || headers ? { signal, headers } : undefined;
    return {
        query: query,
        options,
    };
}
async function requestJson(fetchFn, url, options) {
    const response = await fetchFn(url, options);
    if (!response.ok) {
        let errorDetails;
        let errorText;
        try {
            const text = await response.text();
            errorText = text;
            errorDetails = JSON.parse(text);
        }
        catch {
            // fall through
        }
        throw new BnbpayApiError(errorDetails?.message || errorDetails?.error || errorText || `HTTP ${response.status}: ${response.statusText}`, response.status, errorDetails);
    }
    return response.json();
}
export function createApiClient(options = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL;
    const fetchFn = options.fetchFn ?? fetch;
    if (!fetchFn) {
        throw new Error('fetch implementation is required');
    }
    const baseHeaders = {
        ...(options.headers ?? {}),
    };
    if (options.apiKey) {
        baseHeaders['x-api-key'] = options.apiKey;
    }
    const request = async (path, method, body, query, requestOptions) => {
        const headers = {
            ...baseHeaders,
            ...(requestOptions?.headers ?? {}),
        };
        const init = {
            method,
            headers,
            signal: requestOptions?.signal,
        };
        if (body !== undefined) {
            headers['content-type'] = 'application/json';
            init.body = safeStringify(body);
        }
        const url = buildUrl(baseUrl, path, query);
        return requestJson(fetchFn, url, init);
    };
    return {
        health: () => request('/health', 'GET'),
        getCapabilities: async () => {
            try {
                return await request('/x402/capabilities', 'GET');
            }
            catch (error) {
                if (error instanceof BnbpayApiError
                    && (error.statusCode === 404 || error.statusCode === 501)) {
                    return undefined;
                }
                throw error;
            }
        },
        networks: () => request('/networks', 'GET'),
        tokens: () => request('/tokens', 'GET'),
        getNetworkByChainId: async (chainId) => {
            const { networks } = await request('/networks', 'GET');
            return networks.find((network) => network.chainId === chainId);
        },
        getNetworkByKey: async (key) => {
            const { networks } = await request('/networks', 'GET');
            return networks.find((network) => network.key === key);
        },
        getTokensByNetwork: async (network) => {
            const tokens = await request('/tokens', 'GET');
            return tokens[network] || [];
        },
        getTokenCapabilities: async (symbol, network) => {
            const tokens = await request('/tokens', 'GET');
            const list = tokens[network] || [];
            return list.find((token) => token.symbol.toUpperCase() === symbol.toUpperCase());
        },
        payments: {
            list: (params) => {
                const { query, options } = splitOptions(params);
                return request('/payments', 'GET', undefined, query, options);
            },
            get: (paymentId, opts) => request(`/payments/${paymentId}`, 'GET', undefined, undefined, opts),
            status: (paymentId, params) => {
                const { query, options } = splitOptions(params);
                return request(`/payments/${paymentId}/status`, 'GET', undefined, query, options);
            },
            canPay: async (params) => {
                const { query, options } = splitOptions(params);
                const response = await request('/can-pay', 'GET', undefined, query, options);
                return {
                    ...response,
                    canPay: response.ok,
                };
            },
            buildIntent: (payload, opts) => request('/payments/build-intent', 'POST', payload, undefined, opts),
        },
        wallets: {
            payments: (address, params) => {
                const { query, options } = splitOptions(params);
                return request(`/wallets/${address}/payments`, 'GET', undefined, query, options);
            },
        },
        sessions: {
            list: (params) => {
                const { query, options } = splitOptions(params);
                return request('/sessions', 'GET', undefined, query, options);
            },
            listByAgent: (address, params) => {
                const { query, options } = splitOptions(params);
                return request(`/sessions/agent/${address}`, 'GET', undefined, query, options);
            },
            get: (sessionId, opts) => request(`/sessions/${sessionId}`, 'GET', undefined, undefined, opts),
            spends: (sessionId, params) => {
                const { query, options } = splitOptions(params);
                return request(`/sessions/${sessionId}/spends`, 'GET', undefined, query, options);
            },
            payments: (sessionId, params) => {
                const { query, options } = splitOptions(params);
                return request(`/sessions/${sessionId}/payments`, 'GET', undefined, query, options);
            },
        },
        invoices: {
            create: (payload, opts) => request('/invoices', 'POST', payload, undefined, opts),
            get: (invoiceId, opts) => request(`/invoices/${invoiceId}`, 'GET', undefined, undefined, opts),
            status: (invoiceId, opts) => request(`/invoices/${invoiceId}/status`, 'GET', undefined, undefined, opts),
            cancel: (invoiceId, opts) => request(`/invoices/${invoiceId}/cancel`, 'POST', undefined, undefined, opts),
            confirmPayment: (invoiceId, payload, opts) => request(`/invoices/${invoiceId}/confirm-payment`, 'POST', payload, undefined, opts),
            streamSseUrl: (invoiceId) => buildUrl(baseUrl, `/invoices/${invoiceId}/stream-sse`),
            streamWsUrl: (invoiceId) => buildWsUrl(baseUrl, `/invoices/${invoiceId}/stream`),
        },
        relay: {
            payment: (payload, opts) => request('/relay/payment', 'POST', payload, undefined, opts),
            permit2Bundle: (payload, opts) => request('/relay/permit2/bundle', 'POST', payload, undefined, opts),
            sessionRevoke: (payload, opts) => request('/relay/session/revoke', 'POST', payload, undefined, opts),
            sessionOpen: (payload, opts) => request('/relay/session/open', 'POST', payload, undefined, opts),
            sessionOpenClaimable: (payload, opts) => request('/relay/session/open-claimable', 'POST', payload, undefined, opts),
            sessionClaim: (payload, opts) => request('/relay/session/claim', 'POST', payload, undefined, opts),
        },
        giftcards: {
            create: (payload, opts) => request('/giftcards/create', 'POST', payload, undefined, opts),
            claim: (payload, opts) => request('/giftcards/claim', 'POST', payload, undefined, opts),
            redeem: (payload, opts) => request('/giftcards/redeem', 'POST', payload, undefined, opts),
            cancel: (cardId, opts) => request(`/giftcards/${cardId}/cancel`, 'POST', undefined, undefined, opts),
            get: (cardId, opts) => request(`/giftcards/${cardId}`, 'GET', undefined, undefined, opts),
            list: (params) => {
                const { query, options } = splitOptions(params);
                return request('/giftcards', 'GET', undefined, query, options);
            },
        },
    };
}

function toObjectHeaders(headers) {
    if (!headers)
        return {};
    if (headers instanceof Headers) {
        const result = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }
    return { ...headers };
}
async function parseChallenge(response) {
    const cloned = response.clone();
    let body;
    try {
        body = await cloned.json();
    }
    catch {
        body = await cloned.text().catch(() => undefined);
    }
    return {
        status: response.status,
        headers: toObjectHeaders(response.headers),
        body,
    };
}
function buildTransportRequest(input, init) {
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const url = input instanceof Request
        ? input.url
        : typeof input === 'string'
            ? input
            : input.toString();
    const headers = {
        ...(input instanceof Request ? toObjectHeaders(input.headers) : {}),
        ...toObjectHeaders(init?.headers),
    };
    return {
        method,
        url,
        headers,
        body: init?.body,
    };
}
export function wrapFetchWithPayment(fetchFn, client) {
    return async (input, init) => {
        let attempt = 0;
        let requestInit = init ? { ...init } : undefined;
        let response = await fetchFn(input, requestInit);
        while (response.status === 402 && attempt < client.maxRetries) {
            const challenge = await parseChallenge(response);
            const transportRequest = buildTransportRequest(input, requestInit);
            const authHeaders = await client.authorize(challenge, transportRequest);
            requestInit = {
                ...(requestInit ?? {}),
                headers: {
                    ...transportRequest.headers,
                    ...authHeaders,
                },
            };
            response = await fetchFn(input, requestInit);
            attempt += 1;
        }
        return response;
    };
}

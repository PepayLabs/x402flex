import { SdkError } from '../core/errors.js';
import { headersForProfile } from '../profiles/headers.js';
async function fetchJson(fetchFn, url, method, payload, apiKey) {
    const headers = {
        'content-type': 'application/json',
    };
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }
    const response = await fetchFn(url, {
        method,
        headers,
        body: JSON.stringify(payload),
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
        throw new SdkError('FACILITATOR_ERROR', `Facilitator request failed: ${response.status}`, {
            status: response.status,
            body,
        });
    }
    return body;
}
function resolveProfile(profile) {
    return profile === 'x402-v2-caip' ? 'x402-v2-caip' : 'bnbpay-v1-flex';
}
export function createFacilitatorClient(options) {
    const fetchFn = options.fetchFn ?? globalThis.fetch;
    if (!fetchFn) {
        throw new SdkError('FACILITATOR_ERROR', 'fetch implementation is required for facilitator client');
    }
    const profile = resolveProfile(options.profile);
    const headers = headersForProfile(profile);
    const verifyPath = options.endpoints?.verify ?? '/verify';
    const settlePath = options.endpoints?.settle ?? '/settle';
    const relayPath = options.endpoints?.relayPayment ?? '/relay/payment';
    if (!options.baseUrl) {
        throw new SdkError('FACILITATOR_ERROR', 'baseUrl is required for facilitator client');
    }
    const baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
    const verify = async (request) => {
        if (profile === 'bnbpay-v1-flex') {
            const raw = await fetchJson(fetchFn, `${baseUrl}${relayPath}`, 'POST', request.context ?? request, options.apiKey);
            const txHash = raw?.txHash;
            return {
                ok: Boolean(txHash),
                txHash,
                raw,
                proof: txHash ? { txHash } : undefined,
            };
        }
        const raw = await fetchJson(fetchFn, `${baseUrl}${verifyPath}`, 'POST', request, options.apiKey);
        return {
            ok: Boolean(raw?.ok ?? raw?.verified ?? true),
            proof: raw?.proof,
            txHash: raw?.txHash,
            raw,
        };
    };
    const settle = async (request) => {
        if (profile === 'bnbpay-v1-flex') {
            const raw = await fetchJson(fetchFn, `${baseUrl}${relayPath}`, 'POST', request.context ?? request, options.apiKey);
            return {
                ok: Boolean(raw?.txHash),
                txHash: raw?.txHash,
                raw,
                proof: raw?.proof ?? (raw?.txHash ? { txHash: raw.txHash } : undefined),
            };
        }
        const raw = await fetchJson(fetchFn, `${baseUrl}${settlePath}`, 'POST', request, options.apiKey);
        return {
            ok: Boolean(raw?.ok ?? raw?.settled ?? true),
            proof: raw?.proof,
            txHash: raw?.txHash,
            raw,
        };
    };
    return {
        profile,
        headers,
        verify,
        settle,
    };
}

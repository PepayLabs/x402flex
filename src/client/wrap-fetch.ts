import type { PaymentClient } from './payment-client.js';

import type { PaymentTransportChallenge, PaymentTransportRequest } from '../core/types.js';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function toObjectHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
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

async function parseChallenge(response: Response): Promise<PaymentTransportChallenge> {
  const cloned = response.clone();
  let body: unknown;
  try {
    body = await cloned.json();
  } catch {
    body = await cloned.text().catch(() => undefined);
  }
  return {
    status: response.status,
    headers: toObjectHeaders(response.headers),
    body,
  };
}

function buildTransportRequest(input: RequestInfo | URL, init?: RequestInit): PaymentTransportRequest {
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

export function wrapFetchWithPayment(fetchFn: FetchLike, client: PaymentClient): FetchLike {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
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

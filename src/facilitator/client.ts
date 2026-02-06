import type { ProtocolProfile } from '../core/types.js';
import { SdkError } from '../core/errors.js';

import { headersForProfile } from '../profiles/headers.js';

export interface FacilitatorClientOptions {
  baseUrl: string;
  apiKey?: string;
  profile?: ProtocolProfile;
  fetchFn?: typeof fetch;
  endpoints?: {
    verify?: string;
    settle?: string;
    relayPayment?: string;
  };
}

export interface FacilitatorVerifyRequest {
  authorization: string | Record<string, unknown>;
  challenge?: unknown;
  context?: Record<string, unknown>;
}

export interface FacilitatorSettleRequest {
  authorization: string | Record<string, unknown>;
  challenge?: unknown;
  context?: Record<string, unknown>;
}

export interface FacilitatorResult {
  ok: boolean;
  proof?: Record<string, unknown>;
  txHash?: string;
  error?: string;
  raw?: unknown;
}

export interface FacilitatorClient {
  profile: Exclude<ProtocolProfile, 'auto'>;
  headers: ReturnType<typeof headersForProfile>;
  verify: (request: FacilitatorVerifyRequest) => Promise<FacilitatorResult>;
  settle: (request: FacilitatorSettleRequest) => Promise<FacilitatorResult>;
}

async function fetchJson(
  fetchFn: typeof fetch,
  url: string,
  method: string,
  payload: unknown,
  apiKey?: string
): Promise<unknown> {
  const headers: Record<string, string> = {
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

function resolveProfile(profile?: ProtocolProfile): Exclude<ProtocolProfile, 'auto'> {
  return profile === 'x402-v2-caip' ? 'x402-v2-caip' : 'bnbpay-v1-flex';
}

export function createFacilitatorClient(options: FacilitatorClientOptions): FacilitatorClient {
  const fetchFn = options.fetchFn ?? (globalThis.fetch as typeof fetch | undefined);
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

  const verify = async (request: FacilitatorVerifyRequest): Promise<FacilitatorResult> => {
    if (profile === 'bnbpay-v1-flex') {
      const raw = await fetchJson(fetchFn, `${baseUrl}${relayPath}`, 'POST', request.context ?? request, options.apiKey);
      const txHash = (raw as any)?.txHash as string | undefined;
      return {
        ok: Boolean(txHash),
        txHash,
        raw,
        proof: txHash ? { txHash } : undefined,
      };
    }

    const raw = await fetchJson(fetchFn, `${baseUrl}${verifyPath}`, 'POST', request, options.apiKey);
    return {
      ok: Boolean((raw as any)?.ok ?? (raw as any)?.verified ?? true),
      proof: (raw as any)?.proof,
      txHash: (raw as any)?.txHash,
      raw,
    };
  };

  const settle = async (request: FacilitatorSettleRequest): Promise<FacilitatorResult> => {
    if (profile === 'bnbpay-v1-flex') {
      const raw = await fetchJson(fetchFn, `${baseUrl}${relayPath}`, 'POST', request.context ?? request, options.apiKey);
      return {
        ok: Boolean((raw as any)?.txHash),
        txHash: (raw as any)?.txHash,
        raw,
        proof: (raw as any)?.proof ?? ((raw as any)?.txHash ? { txHash: (raw as any).txHash } : undefined),
      };
    }

    const raw = await fetchJson(fetchFn, `${baseUrl}${settlePath}`, 'POST', request, options.apiKey);
    return {
      ok: Boolean((raw as any)?.ok ?? (raw as any)?.settled ?? true),
      proof: (raw as any)?.proof,
      txHash: (raw as any)?.txHash,
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


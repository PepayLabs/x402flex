import type { PaymentClient } from './payment-client.js';

import type { PaymentTransportChallenge, PaymentTransportRequest } from '../core/types.js';

export interface AxiosRequestConfigLike {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
  [key: string]: unknown;
}

export interface AxiosResponseLike<T = unknown> {
  status: number;
  data: T;
  headers?: Record<string, string>;
  config: AxiosRequestConfigLike;
}

export interface AxiosErrorLike<T = unknown> extends Error {
  response?: AxiosResponseLike<T>;
  config?: AxiosRequestConfigLike & { __x402RetryCount?: number };
}

export interface AxiosLike {
  request: (config: AxiosRequestConfigLike) => Promise<AxiosResponseLike>;
  interceptors?: {
    response: {
      use: (
        onFulfilled?: (value: AxiosResponseLike) => AxiosResponseLike | Promise<AxiosResponseLike>,
        onRejected?: (error: AxiosErrorLike) => unknown
      ) => unknown;
    };
  };
}

function parseChallengeFromAxios(error: AxiosErrorLike): PaymentTransportChallenge | undefined {
  const response = error.response;
  if (!response || response.status !== 402) return undefined;
  return {
    status: response.status,
    headers: response.headers,
    body: response.data,
  };
}

function toTransportRequest(config: AxiosRequestConfigLike): PaymentTransportRequest {
  return {
    method: (config.method ?? 'get').toUpperCase(),
    url: config.url,
    headers: config.headers ?? {},
    body: config.data,
  };
}

export function wrapAxiosWithPayment(instance: AxiosLike, client: PaymentClient): AxiosLike {
  if (!instance.interceptors?.response?.use) {
    return {
      ...instance,
      request: async (config: AxiosRequestConfigLike) => {
        let retryCount = 0;
        let currentConfig = { ...config };
        for (;;) {
          try {
            return await instance.request(currentConfig);
          } catch (error) {
            const challenge = parseChallengeFromAxios(error as AxiosErrorLike);
            if (!challenge || retryCount >= client.maxRetries) {
              throw error;
            }
            const authHeaders = await client.authorize(challenge, toTransportRequest(currentConfig));
            currentConfig = {
              ...currentConfig,
              headers: {
                ...(currentConfig.headers ?? {}),
                ...authHeaders,
              },
            };
            retryCount += 1;
          }
        }
      },
    };
  }

  instance.interceptors.response.use(
    (value) => value,
    async (error: AxiosErrorLike) => {
      const challenge = parseChallengeFromAxios(error);
      if (!challenge) {
        throw error;
      }

      const config = (error.config ?? error.response?.config) as AxiosRequestConfigLike & {
        __x402RetryCount?: number;
      };
      const retryCount = config.__x402RetryCount ?? 0;
      if (retryCount >= client.maxRetries) {
        throw error;
      }

      const authHeaders = await client.authorize(challenge, toTransportRequest(config));
      return instance.request({
        ...config,
        __x402RetryCount: retryCount + 1,
        headers: {
          ...(config.headers ?? {}),
          ...authHeaders,
        },
      });
    }
  );

  return instance;
}


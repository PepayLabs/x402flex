import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
} from '@bnbpay/sdk';

export function createBnbpayApiAdapter(options: ApiClientOptions): ApiClient {
  return createApiClient(options);
}

export type { ApiClient, ApiClientOptions };


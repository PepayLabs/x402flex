import type { ApiClient } from './adapter.js';

export function listTokens(api: ApiClient) {
  return api.tokens();
}


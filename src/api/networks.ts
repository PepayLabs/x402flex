import type { ApiClient } from './adapter.js';

export function listNetworks(api: ApiClient) {
  return api.networks();
}


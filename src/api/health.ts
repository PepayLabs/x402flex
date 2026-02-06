import type { ApiClient } from './adapter.js';

export function getHealth(api: ApiClient) {
  return api.health();
}


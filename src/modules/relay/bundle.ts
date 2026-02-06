import type { ApiClient } from '../../api/adapter.js';

export function submitPermit2Bundle(api: ApiClient, request: any) {
  return api.relay.permit2Bundle(request);
}

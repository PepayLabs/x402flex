import type { ApiClient } from './adapter.js';

type SessionsListParams = Parameters<ApiClient['sessions']['list']>[0];
type SessionsByAgentParams = Parameters<ApiClient['sessions']['listByAgent']>[1];
type SessionSpendsParams = Parameters<ApiClient['sessions']['spends']>[1];
type SessionPaymentsParams = Parameters<ApiClient['sessions']['payments']>[1];

export function listSessions(api: ApiClient, params: SessionsListParams) {
  return api.sessions.list(params);
}

export function listSessionsByAgent(api: ApiClient, address: string, params?: SessionsByAgentParams) {
  return api.sessions.listByAgent(address, params);
}

export function getSession(api: ApiClient, sessionId: string) {
  return api.sessions.get(sessionId);
}

export function getSessionSpends(api: ApiClient, sessionId: string, params?: SessionSpendsParams) {
  return api.sessions.spends(sessionId, params);
}

export function getSessionPayments(api: ApiClient, sessionId: string, params?: SessionPaymentsParams) {
  return api.sessions.payments(sessionId, params);
}

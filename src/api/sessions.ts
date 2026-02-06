import type { ApiClient } from './adapter.js';

export function listSessions(api: ApiClient, params: any) {
  return api.sessions.list(params as any);
}

export function listSessionsByAgent(api: ApiClient, address: string, params?: Record<string, unknown>) {
  return api.sessions.listByAgent(address, params as any);
}

export function getSession(api: ApiClient, sessionId: string) {
  return api.sessions.get(sessionId);
}

export function getSessionSpends(api: ApiClient, sessionId: string, params?: Record<string, unknown>) {
  return api.sessions.spends(sessionId, params as any);
}

export function getSessionPayments(api: ApiClient, sessionId: string, params?: Record<string, unknown>) {
  return api.sessions.payments(sessionId, params as any);
}

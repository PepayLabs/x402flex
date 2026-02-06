export function listSessions(api, params) {
    return api.sessions.list(params);
}
export function listSessionsByAgent(api, address, params) {
    return api.sessions.listByAgent(address, params);
}
export function getSession(api, sessionId) {
    return api.sessions.get(sessionId);
}
export function getSessionSpends(api, sessionId, params) {
    return api.sessions.spends(sessionId, params);
}
export function getSessionPayments(api, sessionId, params) {
    return api.sessions.payments(sessionId, params);
}

# Changelog

## 0.2.1 - 2026-02-06

### Added
- Deterministic API bootstrap for `createClient({ mode: 'api' })` and `createClient({ mode: 'hybrid' })` via default `api.baseUrl` fallback.
- Protocol profile auto-negotiation support through `GET /x402/capabilities`.
- `protocolProfileRuntime.negotiated` async runtime value on the SDK client.
- Canonical `X402FlexSubscriptions` ABI + typechain/factory exports.
- Fastify subpath export: `@pepay/x402flex/fastify`.
- Route matrix, payload parity fixtures, and OpenAPI drift compatibility tests.
- Executable contract-surface and endpoint flow tests in `test/contract`.
- CI workflow lanes for SDK unit, compatibility, build, nightly contract, and OpenAPI drift gates.

### Changed
- Subscriptions execution path now uses typed `X402FlexSubscriptions__factory` contract bindings.
- Documentation updated to canonical package imports (`@pepay/x402flex`) and auto-profile negotiation behavior.
- API service derivation paths in `bnbpay-api` now use canonical SDK helpers for scheme/resource/reference derivation.

### Removed
- Inline subscriptions ABI binding in `modules/subscriptions/execute.ts`.

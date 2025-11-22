# @bnbpay/x402flex Implementation Guide

## Package Overview
**Name**: @bnbpay/x402flex  
**Description**: Node/Express helper utilities for building x402 Flex responses and verifying router settlements server-side.  
**Path**: packages/x402flex

## Guardrails
- Always source canonical builders (resource/payment IDs, scheme IDs) from `@bnbpay/sdk/src/x402.ts`. Do not fork logic here—import and wrap the SDK helpers.
- Require explicit network configuration (provider, registry, router, confirmations). Never assume defaults beyond basic RPC parsing.
- Enforce deterministic references/identifiers by normalizing `referenceId` inputs via the SDK utilities.
- Verification must parse `PaymentSettledV2` events and confirm confirmations ≥ configured thresholds. Never trust raw signatures alone.
- Preserve SessionGuard telemetry: expose `reference` + `session` details from `@bnbpay/sdk.decodePaymentSettledEvent` so downstream middleware can tag dashboards and entitlements. Session contexts now only carry `{sessionId, agent?}`; removal of `usdDebit`/`scope` must cascade to every middleware response and metadata payload. When documenting how merchants mint grants, call out that `FlexSessionGrant` now signs `deadline`, `expiresAt`, and monotonic `nonce` fields—TTL durations are gone, and middleware should refuse payloads missing those fields.
- Keep types exported from `@bnbpay/sdk` in sync; when they change, update this package plus docs referencing it.
- `canPay` helper must mirror registry guards (support, paused, recipient, amount, balance) without enforcing allowance; use SDK `canPay` internally and convert human amounts via token decimals when supplied.

## Testing
- Unit tests use Vitest with stub providers. Add regression coverage whenever settlement or response logic changes.
- Reference Foundry shard commands in docs when settlement verification depends on router changes (`FOUNDRY_TEST_TIMEOUT=1200 forge test --match-path test/router/RouterSessionGuard.t.sol -vvv` and related shards) so contributors remember to run the same targeted suites that protect SessionGuard flows.

## Documentation Hooks
- Any change here requires README + relevant docs (`docs/402PAY_INTEGRATION.md`, root `README.md`) updates so narrative stays aligned.
- Express/Koa helper samples (`createFlexExpressMiddleware`) should remain consistent with `docs/402PAY_INTEGRATION.md` and the merchant server example.

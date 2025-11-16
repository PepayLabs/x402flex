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
- Keep types exported from `@bnbpay/sdk` in sync; when they change, update this package plus docs referencing it.

## Testing
- Unit tests use Vitest with stub providers. Add regression coverage whenever settlement or response logic changes.
- Reference Foundry shard commands in docs when settlement verification depends on router changes (`FOUNDRY_TEST_TIMEOUT=1800 forge test --match-path test/shards/FlexRouterPush.t.sol -vvv`).

## Documentation Hooks
- Any change here requires README + relevant docs (`docs/402PAY_INTEGRATION.md`, root `README.md`) updates so narrative stays aligned.

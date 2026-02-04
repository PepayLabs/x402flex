# BNBPay x402flex

Published as `@pepaylabs/x402flex` (recommended). `@bnbpay/x402flex` remains as a compatibility alias.

Helper package for building HTTP 402 (x402 Flex) responses and verifying settlements on Node/Express servers. Wraps the shared SDK logic so merchants can generate `accepts[]` payloads and confirm router-settled payments in a few lines.

## Installation

```bash
npm install @pepaylabs/x402flex @pepaylabs/bnbpay ethers
```

## Quick Start

```ts
import { ethers } from 'ethers';
import { createFlexMiddleware, createFlexExpressMiddleware } from '@pepaylabs/x402flex';

const middleware = createFlexMiddleware({
  merchant: process.env.MERCHANT_ADDRESS!,
  networks: {
    opbnb: {
      provider: new ethers.JsonRpcProvider(process.env.OPBNB_RPC_URL!),
      registry: process.env.OPBNB_PAYMENT_REGISTRY!,
      router: process.env.OPBNB_PAY_ROUTER!,
      chainId: 204,
      confirmations: 1,
      relay: process.env.RELAY_ENDPOINT
        ? { endpoint: process.env.RELAY_ENDPOINT!, apiKey: process.env.RELAY_API_KEY }
        : undefined,
    },
    bnb: {
      provider: new ethers.JsonRpcProvider(process.env.BNB_RPC_URL!),
      registry: process.env.BNB_PAYMENT_REGISTRY!,
      router: process.env.BNB_PAY_ROUTER!,
      chainId: 56,
      confirmations: 3,
    },
  },
});
// Express/Koa-style middleware
export const flexHandler = createFlexExpressMiddleware(middleware, {
  '/api/generate': {
    buildResponse: () => ({
      accepts: [
        { scheme: 'exact:evm:permit2', network: 'opbnb', chainId: 204, amount: '1000000', asset: tokens.USDT },
        { scheme: 'push:evm:direct', network: 'bnb', chainId: 56, amount: '2000000000000000', asset: 'native' },
      ],
    }),
  },
});
```

```ts
// Build HTTP 402 payload
const requirements = middleware.buildFlexResponse({
  session: { sessionId: '0xabc...def' },
  accepts: [
    { scheme: 'exact:evm:permit2', network: 'opbnb', chainId: 204, amount: '1000000', asset: tokens.USDT },
    { scheme: 'push:evm:direct', network: 'bnb', chainId: 56, amount: '2000000000000000', asset: 'native' },
  ],
});

// Each accept now carries metadata.session + tagged reference strings

// Verify settlement when client retries with X-Payment-Authorization
const settlement = await middleware.settleWithRouter({
  authorization: req.headers['x-payment-authorization'],
  paymentIntent: requirements.accepts[0].router?.intent,
});
```

Returned `settlement` includes `success`, `paymentId`, `schemeId`, `resourceId`, and a proof object with tx hash + confirmations so you can emit entitlements. SessionGuard telemetry (`reference`, `sessionId`, `baseReference`) is preserved on both `settlement` and `settlement.proof`.

When a client sends a gasless payload (no `txHash`) in `X-PAYMENT-AUTHORIZATION` and the network configuration supplies a `relay`, the middleware automatically forwards the payload to that relay endpoint, receives the resulting `txHash`, and then performs the standard on-chain verification. No extra code is required—just include the relay configuration in `createFlexMiddleware`.

```ts
if (settlement.session?.hasSessionTag) {
  console.log('Session', settlement.session.sessionId, 'base reference', settlement.session.baseReference);
}
```

> **Reminder:** When you mint SessionGuard grants for these flows, use the SDK’s builders so every payload includes the new `deadline`, `expiresAt`, and strictly increasing `nonce` fields. Sessions signed with legacy TTL-only structs are now rejected by `X402FlexSessionStore`.

## API

- `createFlexMiddleware(context)` → `{ buildFlexResponse, settleWithRouter, parseAuthorization, buildSessionContext, canPay, auditSessionReceipts, attachSessionToResponse }`
- `buildFlexResponse({ session })` auto-tags references and metadata; use `attachSessionToResponse` if you need to add a session after the fact.
- `context.networks` entries accept either `ethers.Provider` or RPC URLs plus registry/router addresses.
- `context.networks[].relay` lets you specify `{ endpoint, apiKey }` so gasless payloads get forwarded to your relay before verification.
- `settleWithRouter` parses the authorization header, forwards payloads to the relay when `txHash` is missing, fetches the transaction receipt, enforces confirmations, and decodes `PaymentSettledV2` logs to prove the payment.
- `createFlexExpressMiddleware(flex, routes)` returns an Express-compatible handler that automatically serves 402 responses and verifies settlements before calling `next()`.
- `buildSessionContext(input, { defaultAgent })` wraps `@pepaylabs/bnbpay`’s helper so middleware callers can normalize `{ sessionId, agent? }` before hitting router session entry points.
- `canPay({ network, token, from, to, amount | amountWei })` runs the registry’s `canPay` preflight with the configured provider/registry; converts human amounts using token decimals when provided.
- `auditSessionReceipts(events, sessionId)` is re-exported so you can reconcile entire sessions (by replaying decoded `PaymentSettledV2` logs) without reaching for the SDK directly.
- `attachSessionToResponse(response, session)` rewrites every accept’s `reference` string with the `|session:...|resource:...` suffix (using the router intent’s resourceId) and stores the normalized session metadata under `accept.metadata.session` so clients know which SessionGuard context to apply.

### SessionGuard usage

```ts
const ctx = middleware.buildSessionContext({ sessionId }, { defaultAgent: agentAddress });
const sessionized = middleware.attachSessionToResponse(requirements, { sessionId });
await router.depositAndSettleTokenSession(intent, witness, '0x', ctx, sessionized.accepts[0].reference);

const logs = await provider.getLogs(filter);
const events = logs.map(decodePaymentSettledEvent);
const summary = middleware.auditSessionReceipts(events, sessionId);
console.log('session total', summary.totalAmount.toString());
```

Hook into `onAuthorized` if you want to persist receipts:

```ts
createFlexExpressMiddleware(middleware, {
  '/api/resource': {
    buildResponse: () => requirements,
    onAuthorized: async (_req, settlement) => {
      if (settlement.session?.sessionId) {
        await db.sessions.upsert({
          sessionId: settlement.session.sessionId,
          paymentId: settlement.paymentId,
          reference: settlement.reference,
        });
      }
    },
  },
});
```

## Testing

```bash
npm run test
```

Vitest specs cover response building and settlement verification logic (with stub providers). Add more cases for custom witnesses or alternative confirmations when extending.

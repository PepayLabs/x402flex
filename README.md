# @bnbpay/x402flex

Helper package for building HTTP 402 (x402 Flex) responses and verifying settlements on Node/Express servers. Wraps the shared SDK logic so merchants can generate `accepts[]` payloads and confirm router-settled payments in a few lines.

## Installation

```bash
npm install @bnbpay/x402flex @bnbpay/sdk ethers
```

## Quick Start

```ts
import { ethers } from 'ethers';
import { createFlexMiddleware, createFlexExpressMiddleware } from '@bnbpay/x402flex';

const middleware = createFlexMiddleware({
  merchant: process.env.MERCHANT_ADDRESS!,
  networks: {
    opbnb: {
      provider: new ethers.JsonRpcProvider(process.env.OPBNB_RPC_URL!),
      registry: process.env.OPBNB_PAYMENT_REGISTRY!,
      router: process.env.OPBNB_PAY_ROUTER!,
      chainId: 204,
      confirmations: 1,
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
  accepts: [
    { scheme: 'exact:evm:permit2', network: 'opbnb', chainId: 204, amount: '1000000', asset: tokens.USDT },
    { scheme: 'push:evm:direct', network: 'bnb', chainId: 56, amount: '2000000000000000', asset: 'native' },
  ],
});

const sessionReady = middleware.attachSessionToResponse(requirements, {
  sessionId: '0xabc...def',
});

// Each accept now carries metadata.session + tagged reference strings

// Verify settlement when client retries with X-Payment-Authorization
const settlement = await middleware.settleWithRouter({
  authorization: req.headers['x-payment-authorization'],
  paymentIntent: requirements.accepts[0].router?.intent,
});
```

Returned `settlement` includes `success`, `paymentId`, `schemeId`, `resourceId`, and a proof object with tx hash + confirmations so you can emit entitlements. SessionGuard telemetry (`reference`, `sessionId`, `baseReference`) is preserved on both `settlement` and `settlement.proof`.

```ts
if (settlement.session?.hasSessionTag) {
  console.log('Session', settlement.session.sessionId, 'base reference', settlement.session.baseReference);
}
```

## API

- `createFlexMiddleware(context)` → `{ buildFlexResponse, settleWithRouter, parseAuthorization, buildSessionContext, auditSessionReceipts, attachSessionToResponse }`
- `context.networks` entries accept either `ethers.Provider` or RPC URLs plus registry/router addresses.
- `settleWithRouter` parses the authorization header, fetches the transaction receipt, enforces confirmations, and decodes `PaymentSettledV2` logs to prove the payment.
- `createFlexExpressMiddleware(flex, routes)` returns an Express-compatible handler that automatically serves 402 responses and verifies settlements before calling `next()`.
- `buildSessionContext(input, { defaultAgent })` wraps `@bnbpay/sdk`’s helper so middleware callers can normalize `{ sessionId, agent? }` before hitting router session entry points.
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

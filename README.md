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

- `createFlexMiddleware(context)` → `{ buildFlexResponse, settleWithRouter, parseAuthorization }`
- `context.networks` entries accept either `ethers.Provider` or RPC URLs plus registry/router addresses.
- `settleWithRouter` parses the authorization header, fetches the transaction receipt, enforces confirmations, and decodes `PaymentSettledV2` logs to prove the payment.
- `createFlexExpressMiddleware(flex, routes)` returns an Express-compatible handler that automatically serves 402 responses and verifies settlements before calling `next()`.

## Testing

```bash
npm run test
```

Vitest specs cover response building and settlement verification logic (with stub providers). Add more cases for custom witnesses or alternative confirmations when extending.

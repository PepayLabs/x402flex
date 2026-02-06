# @pepay/x402flex

Canonical SDK for BNBPay + x402Flex.

- Single package: `npm i @pepay/x402flex`
- Works with `bnbpay-api` out of the box (`api` mode)
- Supports direct contract execution (`contracts` mode)
- Supports combined rollout (`hybrid` mode)
- Includes endpoint and buyer wrappers (`createResourceServer`, `wrapFetchWithPayment`, `wrapAxiosWithPayment`)

## Quickstart

```ts
import { createClient } from '@pepay/x402flex';

const sdk = createClient({
  mode: 'hybrid',
  preset: 'bnbpay-testnets',
  api: { baseUrl: 'https://api.bnbpay.org' },
  contracts: { defaultNetwork: 'eip155:97' },
});
```

## Subpath exports

- `@pepay/x402flex/core`
- `@pepay/x402flex/evm`
- `@pepay/x402flex/api`
- `@pepay/x402flex/fetch`
- `@pepay/x402flex/axios`
- `@pepay/x402flex/express`

## Modes

- `api`: typed client for `bnbpay-api`.
- `contracts`: direct RPC + contract interactions.
- `hybrid`: API-first with contract fallback for compatible operations.

## Presets

`preset: 'bnbpay-testnets'` preloads:
- supported testnet chain IDs and public RPC defaults
- current working BNB testnet contracts from `bnbpay-api`

Runtime config overrides preset values.

## License and Attribution

Licensed under the MIT License.

Copyright (c) 2025-2026 Pepay Labs, Inc.

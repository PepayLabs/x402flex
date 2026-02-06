# @pepaylabs/x402flex

Canonical SDK for BNBPay + x402Flex.

- Single package: `npm i @pepaylabs/x402flex`
- Works with `bnbpay-api` out of the box (`api` mode)
- Supports direct contract execution (`contracts` mode)
- Supports combined rollout (`hybrid` mode)
- Includes endpoint and buyer wrappers (`createResourceServer`, `wrapFetchWithPayment`, `wrapAxiosWithPayment`)

## Quickstart

```ts
import { createClient } from '@pepaylabs/x402flex';

const sdk = createClient({
  mode: 'hybrid',
  preset: 'bnbpay-testnets',
  api: { baseUrl: 'https://api.bnbpay.org' },
  contracts: { defaultNetwork: 'eip155:97' },
});
```

## Subpath exports

- `@pepaylabs/x402flex/core`
- `@pepaylabs/x402flex/evm`
- `@pepaylabs/x402flex/api`
- `@pepaylabs/x402flex/fetch`
- `@pepaylabs/x402flex/axios`
- `@pepaylabs/x402flex/express`

## Modes

- `api`: typed client for `bnbpay-api`.
- `contracts`: direct RPC + contract interactions.
- `hybrid`: API-first with contract fallback for compatible operations.

## Presets

`preset: 'bnbpay-testnets'` preloads:
- supported testnet chain IDs and public RPC defaults
- current working BNB testnet contracts from `bnbpay-api`

Runtime config overrides preset values.


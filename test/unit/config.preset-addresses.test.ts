import { describe, expect, it } from 'vitest';

import { buildBnbpayTestnetsPreset } from '../../src/config/presets.js';
import { createClient } from '../../src/create-client.js';

describe('bnbpay-testnets preset', () => {
  it('contains bnb testnet contract defaults from bnbpay-api', () => {
    const preset = buildBnbpayTestnetsPreset();
    const bnbTestnet = preset.contracts?.networks['eip155:97'];
    expect(bnbTestnet?.contracts.router).toBe('0xf14f56A54E0540768b7bC9877BDa7a3FB9e66E91');
    expect(bnbTestnet?.contracts.registry).toBe('0xeF00A0C85F8D36A9E68B1b1808ef4286F0f836Cd');
    expect(bnbTestnet?.contracts.sessionStore).toBe('0x4396ace32183FDd7812e62978a8FA0F7Ae11B775');
    expect(bnbTestnet?.contracts.permit2).toBe('0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768');
  });

  it('allows runtime override precedence', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
      contracts: {
        networks: {
          'eip155:97': {
            contracts: {
              router: '0x0000000000000000000000000000000000000001',
            },
          },
        },
      },
    });

    const configured = sdk.networks.configured().find((entry) => entry.caip2 === 'eip155:97');
    expect(configured?.contracts.router).toBe('0x0000000000000000000000000000000000000001');
  });
});


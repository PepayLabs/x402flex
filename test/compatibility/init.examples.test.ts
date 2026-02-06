import { describe, expect, it } from 'vitest';

import { createClient } from '../../src/create-client.js';

describe('init examples compatibility', () => {
  it('supports api mode example', () => {
    const sdk = createClient({
      mode: 'api',
      protocolProfile: 'auto',
      api: { baseUrl: 'https://api.bnbpay.org', apiKey: 'test' },
    });
    expect(sdk.config.mode).toBe('api');
    expect(sdk.api).toBeDefined();
  });

  it('supports contracts mode preset example', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
      contracts: {
        defaultNetwork: 'eip155:97',
      },
    });
    expect(sdk.config.mode).toBe('contracts');
    expect(sdk.networks.configured().length).toBeGreaterThan(0);
  });

  it('supports hybrid mode example', () => {
    const sdk = createClient({
      mode: 'hybrid',
      preset: 'bnbpay-testnets',
      api: { baseUrl: 'https://api.bnbpay.org' },
      contracts: {
        defaultNetwork: 'eip155:97',
      },
    });
    expect(sdk.config.mode).toBe('hybrid');
    expect(sdk.api).toBeDefined();
  });
});


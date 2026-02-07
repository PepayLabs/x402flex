import { describe, expect, it } from 'vitest';

import { createClient } from '../../src/create-client.js';
import { DEFAULT_API_BASE_URL } from '../../src/sdk/api-client.js';

describe('config initialization', () => {
  it('bootstraps api mode with default baseUrl', () => {
    const sdk = createClient({ mode: 'api' as const });
    expect(sdk.config.api?.baseUrl).toBe(DEFAULT_API_BASE_URL);
  });

  it('bootstraps hybrid mode with default baseUrl', () => {
    const sdk = createClient({
      mode: 'hybrid' as const,
      preset: 'bnbpay-testnets',
    });
    expect(sdk.config.api?.baseUrl).toBe(DEFAULT_API_BASE_URL);
  });

  it('uses env api baseUrl when runtime config is not set', () => {
    const previous = process.env.BNBPAY_API_BASE_URL;
    process.env.BNBPAY_API_BASE_URL = 'https://env.example.com';
    try {
      const sdk = createClient({ mode: 'api' as const });
      expect(sdk.config.api?.baseUrl).toBe('https://env.example.com');
    } finally {
      if (previous === undefined) delete process.env.BNBPAY_API_BASE_URL;
      else process.env.BNBPAY_API_BASE_URL = previous;
    }
  });

  it('prefers runtime api baseUrl over env and defaults', () => {
    const previous = process.env.BNBPAY_API_BASE_URL;
    process.env.BNBPAY_API_BASE_URL = 'https://env.example.com';
    try {
      const sdk = createClient({
        mode: 'api' as const,
        api: { baseUrl: 'https://runtime.example.com' },
      });
      expect(sdk.config.api?.baseUrl).toBe('https://runtime.example.com');
    } finally {
      if (previous === undefined) delete process.env.BNBPAY_API_BASE_URL;
      else process.env.BNBPAY_API_BASE_URL = previous;
    }
  });

  it('requires contract networks for contracts mode', () => {
    expect(() =>
      createClient({
        mode: 'contracts',
        preset: 'none',
        contracts: {
          defaultNetwork: 'eip155:97',
          networks: {},
        },
      })
    ).toThrow(/at least one configured network/i);
  });

  it('loads preset defaults for contracts mode', () => {
    const sdk = createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
    });
    expect(sdk.config.contracts?.defaultNetwork).toBe('eip155:97');
    expect(sdk.networks.configured().length).toBeGreaterThan(0);
  });
});

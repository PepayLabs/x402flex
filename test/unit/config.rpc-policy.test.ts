import { describe, expect, it, vi } from 'vitest';

import { createClient } from '../../src/create-client.js';

describe('rpc policy', () => {
  it('warns in production when public rpc defaults are used', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
      environment: 'production',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createClient({
      mode: 'contracts',
      preset: 'bnbpay-testnets',
      environment: 'development',
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});


import { describe, expect, it } from 'vitest';

describe('esm import smoke', () => {
  it('imports canonical entrypoint', async () => {
    const mod = await import('../../src/index.ts');
    expect(typeof mod.createClient).toBe('function');
  }, 30000);
});

import { describe, expect, it } from 'vitest';

describe('fastify subpath export', () => {
  it('exports fastify middleware entrypoint', async () => {
    const mod = await import('../../src/fastify/index.ts');
    expect(typeof mod.createFastifyPaymentMiddleware).toBe('function');
  });
});

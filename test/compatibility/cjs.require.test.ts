import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';

describe('cjs require smoke', () => {
  it('declares require export entries', () => {
    expect((pkg as any).exports['.'].require).toBe('./dist/cjs/index.js');
    expect((pkg as any).exports['./core'].require).toBe('./dist/cjs/core/index.js');
    expect((pkg as any).exports['./api'].require).toBe('./dist/cjs/api/index.js');
  });
});


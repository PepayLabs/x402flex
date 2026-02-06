import { describe, expect, it } from 'vitest';

import { canonicalSchemeName, resolveSchemeId } from '../../src/core/schemes.js';

describe('scheme normalization', () => {
  it('normalizes aliases to canonical names', () => {
    expect(canonicalSchemeName('push:evm:direct')).toBe('aa_push');
    expect(canonicalSchemeName('exact:evm:permit2')).toBe('permit2');
  });

  it('returns deterministic 32-byte scheme ids', () => {
    const id = resolveSchemeId('exact:evm:permit2');
    expect(id).toMatch(/^0x[0-9a-f]{64}$/);
    expect(resolveSchemeId('permit2')).toBe(id);
  });
});


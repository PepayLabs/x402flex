import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { ethers } from 'ethers';

import { getFlexSchemeId } from '../../src/sdk/x402.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const VECTORS_DIR = path.resolve(REPO_ROOT, 'docs/X402_FLEX_REFERENCE_VECTORS');

function normalizeVectorSchemeId(value: string): string {
  if (!value.startsWith('0x')) {
    throw new Error('schemeId must be a 0x-prefixed hex string');
  }
  const body = value.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(body)) {
    throw new Error('schemeId contains non-hex characters');
  }
  const evenHex = body.length % 2 === 0 ? body : `0${body}`;
  return ethers.hexlify(ethers.zeroPadValue(`0x${evenHex}`, 32));
}

describe('vector parity', () => {
  it('keeps canonical vector fixtures parseable and scheme-aligned', () => {
    const files = readdirSync(VECTORS_DIR).filter((fileName) => fileName.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    const fixtureSchemeIds = new Map<string, Set<string>>();

    for (const fileName of files) {
      const raw = readFileSync(path.join(VECTORS_DIR, fileName), 'utf8');
      const vector = JSON.parse(raw) as {
        description?: string;
        accepts?: { scheme?: string };
        xPaymentHeader?: {
          decoded?: {
            payload?: {
              witness?: { schemeId?: string };
            };
          };
        };
      };

      expect(typeof vector.description).toBe('string');
      expect(vector.description && vector.description.length).toBeGreaterThan(0);
      expect(typeof vector.accepts?.scheme).toBe('string');

      const scheme = vector.accepts?.scheme as string;
      expect(ethers.isHexString(getFlexSchemeId(scheme), 32)).toBe(true);
      const witnessSchemeId = vector.xPaymentHeader?.decoded?.payload?.witness?.schemeId;
      const seen = fixtureSchemeIds.get(scheme) ?? new Set<string>();
      fixtureSchemeIds.set(scheme, seen);
      if (witnessSchemeId === undefined) {
        expect(scheme.startsWith('push:')).toBe(true);
        continue;
      }

      expect(typeof witnessSchemeId).toBe('string');
      const normalizedSchemeId = normalizeVectorSchemeId(witnessSchemeId);
      seen.add(normalizedSchemeId.toLowerCase());
    }

    for (const [scheme, ids] of fixtureSchemeIds.entries()) {
      if (scheme === 'push:evm:direct') {
        expect(ids.size).toBe(0);
      } else {
        expect(ids.size).toBe(1);
      }
    }
  });
});

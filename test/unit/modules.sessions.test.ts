import { describe, expect, it } from 'vitest';

import { buildSessionContext } from '../../src/modules/sessions/grants.js';
import { formatSessionReference, parseSessionReference } from '../../src/modules/sessions/references.js';

describe('session module helpers', () => {
  it('builds and parses tagged references', () => {
    const sessionId = '0x6f6f000000000000000000000000000000000000000000000000000000000000';
    const resourceId = '0x7f7f000000000000000000000000000000000000000000000000000000000000';
    const reference = formatSessionReference('order_1', sessionId, resourceId);
    const parsed = parseSessionReference(reference);
    expect(parsed.sessionId).toBe(sessionId);
    expect(parsed.resourceTag).toBe(resourceId);
  });

  it('normalizes session context', () => {
    const context = buildSessionContext({
      sessionId: '0x8f8f000000000000000000000000000000000000000000000000000000000000',
    });
    expect(context.sessionId).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

import { describe, expect, it } from 'vitest';

import { findQuotePosition } from '../src/inline-comment/anchor.js';

describe('inline comment quote anchoring', () => {
  it('finds an exact quote', () => {
    expect(
      findQuotePosition('before selected after', {
        exact: 'selected',
        prefix: 'before ',
        suffix: ' after',
      }),
    ).toBe(7);
  });

  it('uses context to disambiguate repeated text', () => {
    expect(
      findQuotePosition('first same middle second same end', {
        exact: 'same',
        prefix: 'second ',
        suffix: ' end',
      }),
    ).toBe(25);
  });

  it('returns null when the quote no longer exists', () => {
    expect(
      findQuotePosition('updated article', {
        exact: 'missing',
        prefix: '',
        suffix: '',
      }),
    ).toBeNull();
  });
});

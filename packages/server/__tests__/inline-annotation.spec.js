import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  formatInlineAnnotation,
  normalizeInlineAnnotation,
} = require('../src/service/inline-annotation');

const validAnnotation = {
  annotationType: 'thought',
  articleFingerprint: 'a'.repeat(64),
  selector: {
    quote: { exact: 'selected', prefix: 'before ', suffix: ' after' },
    position: { start: 7, end: 15 },
    range: {
      startPath: [0, 1],
      startOffset: 2,
      endPath: [0, 1],
      endOffset: 10,
    },
  },
};

describe('inline annotation', () => {
  it('normalizes a valid anchor', () => {
    expect(normalizeInlineAnnotation(validAnnotation)).toStrictEqual(validAnnotation);
  });

  it('rejects inconsistent text positions', () => {
    expect(
      normalizeInlineAnnotation({
        ...validAnnotation,
        selector: {
          ...validAnnotation.selector,
          position: { start: 0, end: 4 },
        },
      }),
    ).toBeNull();
  });

  it('formats storage fields for the client', () => {
    expect(
      formatInlineAnnotation({
        objectId: 3,
        comment_id: 8,
        url: '/post/',
        selector: JSON.stringify(validAnnotation.selector),
        article_fingerprint: validAnnotation.articleFingerprint,
        annotation_type: 'thought',
      }),
    ).toMatchObject({
      objectId: 3,
      commentId: 8,
      url: '/post/',
      selector: validAnnotation.selector,
    });
  });
});

const MAX_EXACT_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 256;
const MAX_PATH_DEPTH = 64;

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

const normalizeContext = (value) =>
  typeof value === 'string' ? value.slice(0, MAX_CONTEXT_LENGTH) : '';

const normalizePath = (value) => {
  if (
    !Array.isArray(value) ||
    value.length > MAX_PATH_DEPTH ||
    !value.every(isNonNegativeInteger)
  ) {
    return null;
  }

  return value;
};

const normalizeInlineAnnotation = (annotation) => {
  if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) return null;

  const { articleFingerprint, annotationType = 'thought', selector } = annotation;
  const { position, quote, range } = selector || {};

  if (
    !quote ||
    typeof quote.exact !== 'string' ||
    quote.exact.length === 0 ||
    quote.exact.length > MAX_EXACT_LENGTH ||
    !position ||
    !isNonNegativeInteger(position.start) ||
    !isNonNegativeInteger(position.end) ||
    position.end <= position.start ||
    position.end - position.start !== quote.exact.length ||
    annotationType !== 'thought'
  ) {
    return null;
  }

  const normalized = {
    annotationType,
    selector: {
      quote: {
        exact: quote.exact,
        prefix: normalizeContext(quote.prefix),
        suffix: normalizeContext(quote.suffix),
      },
      position: {
        start: position.start,
        end: position.end,
      },
    },
  };

  if (range) {
    const startPath = normalizePath(range.startPath);
    const endPath = normalizePath(range.endPath);

    if (
      !startPath ||
      !endPath ||
      !isNonNegativeInteger(range.startOffset) ||
      !isNonNegativeInteger(range.endOffset)
    ) {
      return null;
    }

    normalized.selector.range = {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    };
  }

  if (articleFingerprint !== undefined) {
    if (typeof articleFingerprint !== 'string' || !/^[a-f\d]{64}$/iu.test(articleFingerprint)) {
      return null;
    }

    normalized.articleFingerprint = articleFingerprint.toLowerCase();
  }

  return normalized;
};

const formatInlineAnnotation = (annotation) => {
  if (!annotation) return null;

  let { selector } = annotation;

  if (typeof selector === 'string') {
    try {
      selector = JSON.parse(selector);
    } catch {
      return null;
    }
  }

  return {
    objectId: annotation.objectId,
    commentId: annotation.comment_id,
    url: annotation.url,
    selector,
    ...(annotation.article_fingerprint
      ? { articleFingerprint: annotation.article_fingerprint }
      : {}),
    annotationType: annotation.annotation_type || 'thought',
  };
};

module.exports = {
  formatInlineAnnotation,
  normalizeInlineAnnotation,
};

import type { WalineTextAnchor, WalineTextQuoteSelector } from '@waline/api';

const CONTEXT_LENGTH = 48;

const getNodePath = (root: Node, node: Node): number[] | null => {
  const path: number[] = [];
  let current: Node | null = node;

  while (current !== null && current !== root) {
    const parent: Node | null = current.parentNode;

    if (parent === null) return null;

    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === root ? path : null;
};

const getNodeFromPath = (root: Node, path: number[]): Node | null => {
  let current = root;

  for (const index of path) {
    const next: Node | undefined = current.childNodes[index];

    if (next === undefined) return null;
    current = next;
  }

  return current;
};

const getTextOffset = (root: HTMLElement, node: Node, offset: number): number => {
  const range = root.ownerDocument.createRange();

  range.selectNodeContents(root);
  range.setEnd(node, offset);

  return range.toString().length;
};

const createRangeFromOffsets = (root: HTMLElement, start: number, end: number): Range | null => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = root.ownerDocument.createRange();
  let position = 0;
  let startSet = false;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    const nextPosition = position + length;

    if (!startSet && start >= position && start <= nextPosition) {
      range.setStart(node, start - position);
      startSet = true;
    }

    if (startSet && end >= position && end <= nextPosition) {
      range.setEnd(node, end - position);
      return range;
    }

    position = nextPosition;
  }

  return null;
};

export const findQuotePosition = (
  text: string,
  quote: WalineTextQuoteSelector,
  preferredStart = 0,
): number | null => {
  const candidates: number[] = [];
  let position = text.indexOf(quote.exact);

  while (position !== -1) {
    candidates.push(position);
    position = text.indexOf(quote.exact, position + 1);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const score = (candidate: number): number => {
    const prefix = text.slice(Math.max(0, candidate - quote.prefix.length), candidate);
    const suffix = text.slice(
      candidate + quote.exact.length,
      candidate + quote.exact.length + quote.suffix.length,
    );
    let value = 0;

    if (quote.prefix && prefix === quote.prefix) value += 2;
    if (quote.suffix && suffix === quote.suffix) value += 2;
    value -= Math.abs(candidate - preferredStart) / Math.max(text.length, 1);

    return value;
  };

  return candidates.sort((a, b) => score(b) - score(a))[0];
};

export const createTextAnchor = (root: HTMLElement, range: Range): WalineTextAnchor | null => {
  if (
    range.collapsed ||
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  ) {
    return null;
  }

  const exact = range.toString();

  if (!exact.trim()) return null;

  const text = root.textContent ?? '';
  const start = getTextOffset(root, range.startContainer, range.startOffset);
  const end = getTextOffset(root, range.endContainer, range.endOffset);
  const startPath = getNodePath(root, range.startContainer);
  const endPath = getNodePath(root, range.endContainer);
  const anchor: WalineTextAnchor = {
    quote: {
      exact,
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
    },
    position: { start, end },
  };

  if (startPath !== null && endPath !== null) {
    anchor.range = {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    };
  }

  return anchor;
};

export const restoreTextAnchor = (root: HTMLElement, anchor: WalineTextAnchor): Range | null => {
  const { quote, position, range: domRange } = anchor;

  if (domRange !== undefined) {
    const startNode = getNodeFromPath(root, domRange.startPath);
    const endNode = getNodeFromPath(root, domRange.endPath);

    if (startNode !== null && endNode !== null) {
      try {
        const range = root.ownerDocument.createRange();

        range.setStart(startNode, domRange.startOffset);
        range.setEnd(endNode, domRange.endOffset);

        if (range.toString() === quote.exact) return range;
      } catch {
        // Continue with the text selectors.
      }
    }
  }

  const positionRange = createRangeFromOffsets(root, position.start, position.end);

  if (positionRange?.toString() === quote.exact) return positionRange;

  const text = root.textContent ?? '';
  const quoteStart = findQuotePosition(text, quote, position.start);

  return quoteStart === null
    ? null
    : createRangeFromOffsets(root, quoteStart, quoteStart + quote.exact.length);
};

export const getArticleFingerprint = async (root: HTMLElement): Promise<string | undefined> => {
  const subtle = globalThis.crypto?.subtle;

  if (subtle === undefined) return undefined;

  const bytes = new TextEncoder().encode(root.textContent ?? '');
  const digest = await subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

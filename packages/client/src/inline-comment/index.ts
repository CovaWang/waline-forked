import type { WalineComment, WalineInlineAnnotation, WalineTextAnchor } from '@waline/api';
import { addComment, getComment } from '@waline/api';

import { createTextAnchor, getArticleFingerprint, restoreTextAnchor } from './anchor.js';

export interface InlineCommentOptions {
  /** Article content root or selector. */
  content?: HTMLElement | string;
  serverURL: string;
  path?: string;
  lang?: string;
  onError?: (error: Error) => void;
  onSubmitted?: (comment: WalineComment) => void;
}

export interface InlineCommentInstance {
  refresh: () => Promise<void>;
  destroy: () => void;
}

interface StoredUserMeta {
  nick?: string;
  mail?: string;
}

interface StoredUser {
  display_name?: string;
  email?: string;
  token?: string;
}

interface HighlightRegistry {
  delete: (name: string) => boolean;
  set: (name: string, value: unknown) => void;
}

type HighlightConstructor = new (...ranges: Range[]) => unknown;

const HIGHLIGHT_NAME = 'waline-inline-comment';

const readStorage = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as unknown;
  } catch {
    return {};
  }
};

const resolveContent = (content: HTMLElement | string): HTMLElement | null =>
  typeof content === 'string' ? document.querySelector<HTMLElement>(content) : content;

const flattenComments = (comments: WalineComment[]): WalineComment[] =>
  comments.flatMap((comment) =>
    'children' in comment ? [comment, ...comment.children] : [comment],
  );

const renderHighlights = (root: HTMLElement, annotations: WalineInlineAnnotation[]): void => {
  const ranges = annotations
    .map(({ selector }) => restoreTextAnchor(root, selector))
    .filter((range): range is Range => Boolean(range));
  const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined)
    ?.highlights;
  const HighlightClass = (globalThis as unknown as { Highlight?: HighlightConstructor }).Highlight;

  if (!registry || !HighlightClass) return;

  registry.delete(HIGHLIGHT_NAME);
  if (ranges.length > 0) registry.set(HIGHLIGHT_NAME, new HighlightClass(...ranges));
};

const createActionButton = (): HTMLButtonElement => {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'wl-inline-action';
  button.textContent = '写想法';
  button.hidden = true;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
  });
  document.body.append(button);

  return button;
};

// oxlint-disable-next-line eslint/max-statements
const createComposer = (): {
  dialog: HTMLDialogElement;
  form: HTMLFormElement;
  quote: HTMLElement;
  nick: HTMLInputElement;
  mail: HTMLInputElement;
  thought: HTMLTextAreaElement;
  submit: HTMLButtonElement;
} => {
  const dialog = document.createElement('dialog');
  const form = document.createElement('form');
  const title = document.createElement('h3');
  const quote = document.createElement('blockquote');
  const nick = document.createElement('input');
  const mail = document.createElement('input');
  const thought = document.createElement('textarea');
  const actions = document.createElement('div');
  const cancel = document.createElement('button');
  const submit = document.createElement('button');

  dialog.className = 'wl-inline-composer';
  form.method = 'dialog';
  title.textContent = '写下你的想法';
  quote.className = 'wl-inline-quote';
  nick.name = 'nick';
  nick.placeholder = '昵称';
  nick.required = true;
  mail.name = 'mail';
  mail.type = 'email';
  mail.placeholder = '邮箱';
  mail.required = true;
  thought.name = 'thought';
  thought.placeholder = '针对这段文字写点什么…';
  thought.required = true;
  thought.rows = 5;
  actions.className = 'wl-inline-composer-actions';
  cancel.type = 'button';
  cancel.textContent = '取消';
  submit.type = 'submit';
  submit.textContent = '发布想法';

  cancel.addEventListener('click', () => {
    dialog.close();
  });
  actions.append(cancel, submit);
  form.append(title, quote, nick, mail, thought, actions);
  dialog.append(form);
  document.body.append(dialog);

  return { dialog, form, quote, nick, mail, thought, submit };
};

const reportInlineCommentError = (err: Error): void => {
  window.dispatchEvent(new CustomEvent('waline:inline-comment-error', { detail: err }));
};

// oxlint-disable-next-line eslint/max-lines-per-function
export const initInlineComment = ({
  content = '.post-content, article',
  serverURL,
  path = window.location.pathname,
  lang = 'zh-CN',
  onError = reportInlineCommentError,
  onSubmitted,
}: InlineCommentOptions): InlineCommentInstance => {
  const root = resolveContent(content);

  if (!root) throw new Error("Option 'content' does not match an element");
  if (!serverURL) throw new Error("Option 'serverURL' is missing");

  const action = createActionButton();
  const composer = createComposer();
  const meta = readStorage('WALINE_USER_META') as StoredUserMeta;
  const user = readStorage('WALINE_USER') as StoredUser;
  let currentAnchor: WalineTextAnchor | null = null;
  let annotations: WalineInlineAnnotation[] = [];
  let destroyed = false;

  composer.nick.value = user.display_name ?? meta.nick ?? '';
  composer.mail.value = user.email ?? meta.mail ?? '';

  const hideAction = (): void => {
    action.hidden = true;
  };

  const updateSelection = (): void => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideAction();
      return;
    }

    const range = selection.getRangeAt(0);
    const anchor = createTextAnchor(root, range);

    if (!anchor) {
      hideAction();
      return;
    }

    const rect = range.getBoundingClientRect();

    currentAnchor = anchor;
    action.style.left = `${Math.min(window.innerWidth - 96, Math.max(8, rect.left + rect.width / 2 - 40))}px`;
    action.style.top = `${Math.max(8, rect.top - 44)}px`;
    action.hidden = false;
  };

  const refresh = async (): Promise<void> => {
    const response = await getComment({
      serverURL,
      lang,
      path,
      page: 1,
      pageSize: 100,
      sortBy: 'insertedAt_desc',
      token: user.token,
    });

    annotations = flattenComments(response.data)
      .map(({ annotation }) => annotation)
      .filter((annotation): annotation is WalineInlineAnnotation => Boolean(annotation));
    renderHighlights(root, annotations);
  };

  const openComposer = (): void => {
    if (!currentAnchor) return;

    composer.quote.textContent = currentAnchor.quote.exact;
    composer.thought.value = '';
    hideAction();
    composer.dialog.showModal();
    composer.thought.focus();
  };

  const submitThought = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!currentAnchor) return;

    composer.submit.disabled = true;

    try {
      const articleFingerprint = await getArticleFingerprint(root);
      const response = await addComment({
        serverURL,
        lang,
        token: user.token,
        comment: {
          nick: composer.nick.value.trim(),
          mail: composer.mail.value.trim(),
          comment: composer.thought.value.trim(),
          ua: navigator.userAgent,
          url: path,
          annotation: {
            selector: currentAnchor,
            articleFingerprint,
            annotationType: 'thought',
          },
        },
      });

      if (response.errno || !response.data) {
        throw new Error(response.errmsg || '发布想法失败');
      }

      localStorage.setItem(
        'WALINE_USER_META',
        JSON.stringify({
          nick: composer.nick.value.trim(),
          mail: composer.mail.value.trim(),
          link: '',
        }),
      );
      composer.dialog.close();
      currentAnchor = null;
      window.getSelection()?.removeAllRanges();
      await refresh();
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      onSubmitted?.(response.data);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      composer.submit.disabled = false;
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key.startsWith('Arrow') || event.key === 'Shift') updateSelection();
  };

  const onSubmit = (event: SubmitEvent): void => {
    void submitThought(event);
  };

  const initialRefresh = async (): Promise<void> => {
    try {
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  action.addEventListener('click', openComposer);
  composer.form.addEventListener('submit', onSubmit);
  root.addEventListener('pointerup', updateSelection);
  root.addEventListener('keyup', onKeyUp);
  window.addEventListener('scroll', hideAction, { passive: true });

  void initialRefresh();

  return {
    refresh,
    destroy: (): void => {
      if (destroyed) return;
      destroyed = true;
      action.removeEventListener('click', openComposer);
      composer.form.removeEventListener('submit', onSubmit);
      root.removeEventListener('pointerup', updateSelection);
      root.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('scroll', hideAction);
      action.remove();
      composer.dialog.remove();
      const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined)
        ?.highlights;

      registry?.delete(HIGHLIGHT_NAME);
    },
  };
};

export * from './anchor.js';

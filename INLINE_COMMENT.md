# waline-with-inline-comment

This fork adds a first vertical slice for text-anchored thoughts while keeping ordinary Waline
comments intact.

## What is implemented

- A browser text anchor with three recovery strategies:
  - DOM range path;
  - text position;
  - exact quote plus surrounding context.
- A selection action and a small thought composer.
- An optional annotation payload on the existing comment API.
- Atomic cleanup of the comment when annotation storage fails.
- Annotation metadata returned with the related Waline comment.
- PostgreSQL storage in a separate `wl_annotation` table.
- A dedicated `waline-with-inline-comment.js` build artifact.

## Build

```bash
pnpm api:build
pnpm client:build
```

The browser files are:

```text
packages/client/dist/waline-with-inline-comment.js
packages/client/dist/waline-with-inline-comment.umd.js
packages/client/dist/waline.css
```

Pushes to the `inline-comment` branch also create one GitHub Actions artifact named
`waline-with-inline-comment`. It contains the browser files, PostgreSQL migration, and a packed
server package.

## Database and server

Run `assets/waline-with-inline-comment.pgsql` once against the same PostgreSQL database used by
Waline. Then set this environment variable in the server deployment:

```text
INLINE_COMMENT_ENABLED=true
```

The flag prevents an unchanged Waline database from being queried for the new table.

For a Vercel deployment that uses the workflow artifact, copy
`waline-with-inline-comment-server.tgz` into the deployment repository and use:

```json
{
  "dependencies": {
    "@waline/vercel": "file:./waline-with-inline-comment-server.tgz"
  }
}
```

This pins Vercel to the server code produced by this fork rather than npm `latest`.

## Hugo initialization

Use the new entry for both the ordinary comment area and inline thoughts:

```html
<link rel="stylesheet" href="/waline-forked/waline.css" />
<script type="module">
  import { init, initInlineComment } from '/waline-forked/waline-with-inline-comment.js';

  const serverURL = '{{ .Site.Params.waline.serverURL }}';

  init({
    el: '#waline',
    serverURL,
    lang: 'zh-CN',
    pageview: true,
    search: false,
    meta: ['nick', 'mail'],
    emoji: ['https://unpkg.com/@waline/emojis@1.1.0/tw-emoji'],
  });

  initInlineComment({
    content: '.post-content',
    serverURL,
    lang: 'zh-CN',
  });
</script>
```

Change `.post-content` if the Hugo theme uses a different article-content element.

## Current milestone limits

This is the anchor-storage MVP, not the finished WeChat Read-style interface. The next milestone
still needs:

- a side thought panel and highlight-to-thought interaction;
- mobile selection and bottom-sheet refinement;
- CAPTCHA integration in the inline composer;
- pagination beyond the first 100 comments;
- overlapping-highlight interaction and a fallback for browsers without the CSS Highlight API;
- end-to-end tests against PostgreSQL and Vercel;
- the planned client feature trimming.

# markawesome-js

Framework-agnostic Markdown → [Web Awesome](https://webawesome.com/) component
transformer. A TypeScript port of the [markawesome](https://github.com/jannewaren/markawesome)
Ruby gem, for the Node / Eleventy ecosystem.

> **🔗 See it live — [hosted examples site](https://jannewaren.github.io/eleventy-plugin-webawesome/).** Every supported component shown side by side: the markawesome markdown on the left, the live Web Awesome component it renders on the right. The clearest way to see what this project does.

It turns a terse custom Markdown dialect into Web Awesome web components:

```md
:::info
This becomes a **callout**.
:::

%%%brand large
[Get started](https://example.com)
%%%
```

→

```html
<wa-callout variant="brand">
  <wa-icon slot="icon" name="circle-info" variant="solid"></wa-icon>
  <p>This becomes a <strong>callout</strong>.</p>
</wa-callout>
<wa-button variant="brand" size="large" href="https://example.com">Get started</wa-button>
```

This package is the transformation **engine**. To wire it into Eleventy, use
[`eleventy-plugin-webawesome`](https://github.com/jannewaren/eleventy-plugin-webawesome).

## Install

```bash
npm install markawesome-js
```

Requires Node >= 18. Ships dual ESM + CJS with type definitions.

## Usage

```ts
import { process, configure } from 'markawesome-js';

// Optionally override callout icons globally (last-write-wins).
configure({ calloutIcons: { brand: 'lightbulb' } });

const html = process(markdownString, {
  imageDialog: { defaultWidth: '90vh' }, // optional; off by default
});
```

`process(content, options?)` protects fenced code blocks, runs the component
transformers in a fixed (load-bearing) order, and restores the code blocks. The
surrounding markdown is left untouched — render it with your host's markdown
processor (e.g. Eleventy's markdown-it with `html: true`).

### Options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `imageDialog` | `boolean \| { defaultWidth?: string }` | `false` | Wrap standalone images in click-to-zoom dialogs. |

### Configuration

`configure({ calloutIcons, customComponents })` merges into a global singleton
(last-write-wins). `calloutIcons` is keyed by variant (`brand`/`success`/
`neutral`/`warning`/`danger`). It is applied globally, not per call.

## Supported components

`callout` · `badge` · `button` · `tag` · `icon` · `card` · `copy-button` ·
`comparison` · `details` · `dialog` · `popover` · `tooltip` · `layout`
(grid/stack/cluster/split/flank/frame) · `tabs` · `carousel` · `accordion` ·
`image-dialog`.

See the [markawesome README](https://github.com/jannewaren/markawesome) for the
full syntax reference — this port is behaviour-compatible.

## Parity with the Ruby engine

Output is verified byte-for-byte against the Ruby engine across a cross-engine
corpus, including deterministic MD5 ids for dialogs/popovers/tooltips. The only
intentional divergences are cosmetic whitespace differences between Kramdown and
markdown-it (markdown list indentation and the wrapping of a standalone raw
`<img>`), which produce visually identical HTML.

## License

MIT

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`markawesome-js` is a framework-agnostic transformation **engine**: it turns a
terse custom Markdown dialect (`:::callout`, `%%%button`, `@@@tag`, etc.) into
[Web Awesome](https://webawesome.com/) web-component HTML. It is a behaviour-
compatible TypeScript port of the [markawesome](https://github.com/jannewaren/markawesome)
Ruby gem. The Eleventy integration lives in a separate package
(`eleventy-plugin-webawesome`); this repo is only the engine.

## Commands

```bash
npm test                       # full Vitest suite (vitest run)
npm run test:watch             # watch mode
npx vitest run test/callout.test.ts   # single test file
npx vitest run -t "transforms info"   # single test by name

npm run typecheck              # tsc --noEmit (strict)
npm run lint                   # eslint .
npm run format                 # prettier --write .
npm run build                  # tsup -> dist/ (dual ESM+CJS + .d.ts)
npm run check                  # typecheck + lint + test + build (run before any release/PR)
```

Node >= 18. `npm run check` is also the `prepublishOnly` gate. Release process
is in `RELEASING.md` (publishes to npm; the plugin depends on a release here).

## Architecture

The public entry is `process(content, options?)` in `src/transformer.ts`. The
pipeline is fixed and **load-bearing — do not reorder it**:

1. `code-block-protector.ts` replaces fenced ``` blocks with opaque HTML-comment
   placeholders so component regexes never match syntax inside example code.
2. Each transformer in `src/transformers/` runs in a hard-coded order. Order
   matters: `image-dialog` must run before `dialog`; `tabs` and `accordion` run
   last so their bodies can contain already-transformed components.
3. The code blocks are restored.

The surrounding plain markdown is **left untouched** — the host site renders it
with its own markdown processor. Only the *inner* content of components (callout
bodies, card content, tab panels…) is rendered to HTML internally, via
`src/markdown.ts`.

### Transformer structure

Every file in `src/transformers/` exports a `transform(content: string): string`.
Transformers are regex-based string rewrites built on `src/transformers/base.ts`:

- `applyPatterns(content, patterns)` — Ruby's `apply_multiple_patterns`.
- `dualSyntaxPatterns(primary, alternative, proc)` — most components accept both
  a terse syntax (`:::info`) and an explicit one (`:::wa-callout info`).
- Capture groups are passed positionally to the transform proc.

Shared helpers consumed by transformers:

- `attribute-parser.ts` — space-separated tokens → attribute map, with
  **rightmost-wins** semantics (so `"pill pulse brand"` is order-independent).
- `icon-slot-parser.ts` / `icon-attributes.ts` — parse `icon:name` and
  `icon:slot:name` tokens and emit `<wa-icon>`.
- `config.ts` — a **global mutable singleton** (`configure`/`getConfiguration`/
  `resetConfiguration`), mirroring Ruby's `Markawesome.configure`. It starts
  `null` and is created lazily on first `configure()`. Tests must call
  `resetConfiguration()` in `beforeEach`.

## Ruby parity — the core constraint

This is a port whose job is to match the Ruby engine **byte-for-byte**. When
changing transformer behaviour, parity is the spec, not the local tests alone.

- `test/parity-corpus.test.ts` holds cross-engine inputs locked with inline
  snapshots verified against Ruby output. Treat these as a guardrail; do not
  update a parity snapshot to make a change pass unless you have confirmed the
  Ruby engine produces the new output.
- Regex translation rules from Ruby are documented at the top of
  `base.ts` and `code-block-protector.ts` — notably: Ruby `gsub`→`g` flag,
  line-anchored `^`/`$`→`m` flag, and Ruby `/m` DOTALL → `[\s\S]*?` for
  newline-spanning body captures (single-line param captures stay `.*?`).
- `md5Hex8` in `base.ts` produces the deterministic ids Ruby uses for
  dialog/popover/tooltip; `kramdownSlug` in `markdown.ts` replicates Kramdown's
  heading-id algorithm. These must stay byte-identical.
- The internal renderer (`markdown.ts`) is markdown-it tuned to match Kramdown
  (`xhtmlOut: true`, typographer off, custom heading-id core rule). It is
  bundled (not externalized) so inner rendering stays deterministic regardless
  of the host's markdown-it.
- Known intentional divergences (cosmetic only): markdown list `<li>`
  indentation and standalone-`<img>` wrapping differ from Kramdown but render
  identically. See README "Parity with the Ruby engine".

## Conventions

- ESM source; **relative imports must use the `.js` extension** (e.g.
  `import … from './config.js'`) even though the files are `.ts` — required by
  the `Bundler` moduleResolution + ESM output.
- Strict TypeScript including `noUncheckedIndexedAccess` (hence the `!`/`?? ''`
  guards you'll see around capture groups and array indexing).
- Prettier: single quotes, trailing commas, 100-col, semicolons.
- Tests live in `test/*.test.ts`, one per transformer plus `process`/`config`/
  `parity-corpus`; they import from `../src/...js`.

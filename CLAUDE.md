# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`markawesome-js` is a framework-agnostic transformation **engine**: it turns a
terse custom Markdown dialect (`:::callout`, `%%%button`, `@@@tag`, etc.) into
[Web Awesome](https://webawesome.com/) web-component HTML. It is a behaviour-
compatible TypeScript port of the [markawesome](https://github.com/jannewaren/markawesome)
Ruby gem. The Eleventy integration lives in a separate package
(`eleventy-plugin-webawesome`); this repo is only the engine.

## The markawesome ecosystem — keep the syntax in sync

The Markawesome-flavoured Markdown syntax spans **six repositories that must
stay in lockstep**:

| Repo | Role | Stack | Registry |
|------|------|-------|----------|
| `markawesome` | **Authors** the syntax (engine) | Ruby | RubyGems |
| `markawesome-js` | **Authors** the syntax (engine) | TypeScript / Node | npm |
| `jekyll-webawesome` | **Uses** it (Jekyll integration) | Ruby | RubyGems |
| `eleventy-plugin-webawesome` | **Uses** it (Eleventy integration) | Node | npm |
| `markawesome-vscode` | **Produces** it (snippets/completions/validation) | TypeScript | VS Code Marketplace |
| `markawesome-skill` | **Teaches** it (AI authoring skill) | Markdown | npm |

**This repo's role:** **authors** the syntax — the Node engine, kept byte-for-byte
compatible with the Ruby `markawesome` engine (see "Ruby parity" below). Mirror any
syntax change in `markawesome` and reflect it in `markawesome-vscode`.

**Sync rule:** any change to the Markawesome Markdown syntax must land in **both
engines** (`markawesome` *and* `markawesome-js`) so the Ruby and Node worlds accept
identical input, **and** in `markawesome-vscode` so the editor emits it. The VS Code
extension is shared across both worlds, so it may only produce syntax that **both**
engines support. Confirm the engines still agree via this repo's
`test/parity-corpus.test.ts` plus the Ruby specs in `markawesome/spec/`.

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
  - **wa-block rule (`wa-block-rule.ts`):** markdown-it doesn't recognise an
    already-transformed block `<wa-*>` component (a callout nested in an
    accordion item, etc.) as an HTML block, so it wrapped it in a `<p>` — which
    Kramdown does not. This rule treats block-level `<wa-*>` as a pass-through
    HTML block so nested components stay byte-identical to Ruby (and don't render
    empty in the browser, where the stray `<p>` ejects the component body). It
    fires only on a line that *starts* with an opening `<wa-NAME>` tag, balances
    the same tag name to find the close, bails for inline components spliced into
    prose, and restores Kramdown's trailing newline on the final block. Locked by
    the `*-in-accordion`/`-card`/`-tab-panel`/`-details` parity-corpus cases and
    `test/markdown.test.ts`.
- Known intentional divergences (cosmetic only): markdown list `<li>`
  indentation, standalone-`<img>` wrapping, and blank lines *between* sibling
  blocks (markdown-it collapses `\n\n`→`\n`; Kramdown keeps the blank line)
  differ from Kramdown but render identically. See README "Parity with the Ruby
  engine".

## Conventions

- ESM source; **relative imports must use the `.js` extension** (e.g.
  `import … from './config.js'`) even though the files are `.ts` — required by
  the `Bundler` moduleResolution + ESM output.
- Strict TypeScript including `noUncheckedIndexedAccess` (hence the `!`/`?? ''`
  guards you'll see around capture groups and array indexing).
- Prettier: single quotes, trailing commas, 100-col, semicolons.
- Tests live in `test/*.test.ts`, one per transformer plus `process`/`config`/
  `parity-corpus`; they import from `../src/...js`.

## Web Awesome manifest coverage — keeping the enum lists honest

The transformers accept curated enum values (e.g. `BADGE_ATTRIBUTES.variant`)
hand-transcribed from Web Awesome's docs. `test/webawesome-manifest-coverage.test.ts`
guards those `*_ATTRIBUTES` consts against Web Awesome's machine-readable **Custom
Elements Manifest**, pinned to a single WA release (`WA_VERSION`, currently **3.10.0**).
For each `(constant → wa-tag/attribute)` mapping it fails on **DRIFT** (a value we
accept that WA no longer lists) and **GAP** (a WA value we don't expose, gated by
`INTENTIONALLY_OMITTED`, which starts empty). Entries WA can't describe as an inline
enum are surfaced as `it.skip`. To read the live values, the mapped consts carry an
`export` — additive only; `index.ts` and the published bundle are untouched.

The fixture `test/fixtures/webawesome-enums.json` is a **derived artifact — never
hand-edit it.** It is a distilled slice of WA's `custom-elements.json`, byte-identical
to `markawesome`'s copy (`diff` them to confirm), produced only by the generator.

### Refreshing when Web Awesome releases a new version

When WA ships e.g. 3.11.0:

1. Regenerate the fixture: `npm run update-wa-manifest 3.11.0`. This fetches that
   version's manifest from unpkg and overwrites `test/fixtures/webawesome-enums.json`
   in place. Do the same in `markawesome` (`bundle exec rake wa:manifest[3.11.0]`) so
   both fixtures stay byte-identical.
2. Bump `WA_VERSION` to `'3.11.0'` in the test (and in `markawesome`'s spec).
3. Re-run the tests. **Green ⇒ nothing enum-relevant changed, done.** **Red is the
   point** — the git diff of `webawesome-enums.json` shows exactly what moved:
   - **GAP** (WA added a value) → implement the new option in *both* engines (and,
     per the six-repo lockstep rule, `markawesome-vscode` + `markawesome-skill`), or
     record it in `INTENTIONALLY_OMITTED` with a one-line reason.
   - **DRIFT** (WA removed/renamed a value) → update/remove it from the transformer
     constants in both engines.
4. Commit the regenerated fixture and any transformer changes together.

The human decision is only *how to react to the diff*; extraction stays mechanical.

## Branching & Commits

This repo works directly on `main` — there is **no feature-branch convention**.
Commit changes, including version bumps, straight to `main`; do not create a branch
when asked to commit. Releases are then taken as **tags from `main`** (see "Releases
are tagged to match the published version" below).

## Releases are tagged to match the published version

The full publish steps are in `RELEASING.md`. In addition, every version
published to npm gets a matching **GitHub Release**, so the repo's releases line
up 1:1 with what's installable:

1. Tag the released commit `vX.Y.Z` — the same version as `package.json`.
2. Push the commit and the tag.
3. `gh release create vX.Y.Z` with notes drawn from `CHANGELOG.md`.

The GitHub Release tag **must equal** the version published to npm.

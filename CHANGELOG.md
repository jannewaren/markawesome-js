# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-26

### Added

- New `video` transformer producing Web Awesome's two media components — `<wa-video>` (a single embedded video) and `<wa-video-playlist>` (a playlist of `<wa-video>` children). A byte-for-byte mirror of the Ruby `VideoTransformer` (parity locked by `test/parity-corpus.test.ts` and exact-string assertions in `test/video.test.ts`); it runs in the pipeline immediately after `comparison`.
  - **Single video**: `;;;<tokens>` … `;;;`. **Playlist**: a `;;;;;;<tokens>` container wrapping bare `;;;` items (mirroring the carousel `~~~`/`~~~~~~` structure). Block alternatives `:::wa-video` / `:::wa-video-playlist`.
  - **Body**: the first markdown link `[text](url)` → `title`/`src`; the first markdown image `![alt](url)` → `poster` (a negative lookbehind keeps the image from being read as the link). A block with no link is left untransformed.
  - **Tokens**: `controls:none|standard|full`, `preload:auto|metadata|none` (enum-validated, invalid values dropped), and the boolean flags `autoplay`, `autoplay-muted`, `autoplay-on-visible`, `loop`, `muted` (whole-token matched). The playlist forwards `controls` to the container only; children omit it. Emission order, HTML-escaping, and the "no link ⇒ untransformed" guard match the Ruby engine exactly. (No `renderAsMarkdown`, matching the rest of this engine.)
- New `date` transformer producing Web Awesome's two declarative timestamp components — `<wa-format-date>` (an absolute, locale-formatted date) and `<wa-relative-time>` ("3 days ago", optionally live-ticking). A byte-for-byte mirror of the Ruby `DateTransformer` (parity locked by `test/parity-corpus.test.ts`), it runs in the pipeline right after `tooltip`.
  - **Inline syntax** (primary): `[[[ <date> <tokens> ]]]` — triple square brackets, single-line, transformed before the host markdown processor.
  - **Block alternative**: `:::wa-format-date <date> <tokens>` / `:::wa-relative-time <date> <tokens>` with an empty body closed by `:::`; the selector name chooses the mode.
  - **format-date**: `style:`/`time:` presets (`short|medium|long|full`) expand to granular WA attributes, with granular overrides (`weekday`, `era`, `year`, `month`, `day`, `hour`, `minute`, `second`, `hour-format`, `time-zone-name`, `time-zone`, `lang`/`locale` → `lang`) winning per key. Enum values validated; unknown/invalid tokens dropped. A bare date defaults to `style:long`. Deterministic emission order matches the Ruby engine exactly.
  - **relative-time**: `format` (`long|short|narrow`, default omitted), `numeric` (`auto|always`, default omitted), `sync` (boolean), `lang`/`locale` → `lang`. The `relative` flag switches the inline form into relative mode.
  - The ISO 8601 date/datetime token (omitted ⇒ runtime now) is escaped into `date="…"`. Like `<wa-icon>`, both components render generated text into shadow DOM with no light-DOM fallback.
- Aligned placements + `skidding` for the `popover` and `tooltip` transformers, and a per-tab `disabled` flag for `tabs` — a byte-for-byte mirror of the Ruby engine (parity locked by `test/parity-corpus.test.ts` and an exact-string assertion per transformer). `<wa-popover>`/`<wa-tooltip>` now accept all twelve Web Awesome placements (the four primary plus the eight aligned variants `top-start`, `bottom-end`, …) and a `skidding:N` token (offset *along* the target; negative allowed) alongside the existing `distance:N` (offset *away*). A leading `disabled` token on a `+++ ` tab item header (e.g. `+++ disabled Coming soon`) emits `<wa-tab disabled>` and strips the flag from the label, leaving non-disabled tabs byte-identical. Emission order matches the Ruby engine exactly.

### Fixed

- **Block components nested inside a container's item body are no longer wrapped in a `<p>`**, restoring byte-for-byte parity with the Ruby engine. The internal renderer (`src/markdown.ts`) uses markdown-it, which — unlike the Ruby engine's Kramdown — did not recognise an already-transformed `<wa-callout>` (etc.) as an HTML block and wrapped it in a paragraph. So a callout nested in an accordion item rendered as `<wa-accordion-item …><p><wa-callout>…</wa-callout></p>` in the Node engine but `<wa-accordion-item …><wa-callout>…</wa-callout>` in Ruby. The stray `<p>` was also user-visible: in the browser it auto-closes *through* the custom element and ejects the nested component's body, so the component rendered **empty**. A new markdown-it block rule (`src/wa-block-rule.ts`) treats block-level `<wa-*>` components as pass-through HTML blocks, matching Kramdown. New parity-corpus cases (callout nested in accordion / card / tab panel / details) lock the Ruby-identical output, and `test/markdown.test.ts` covers the rule directly. Pre-existing cosmetic whitespace divergences (blank lines *between* sibling blocks, list `<li>` indentation) are unchanged — they render identically and were already accepted divergences.

## [0.1.0] - 2026-06-26

Initial release — a TypeScript port of the markawesome Ruby engine (parity
target `markawesome` 0.16.0).

### Added

- `process(content, options)` pipeline mirroring the Ruby transformer order
  exactly (layout → popover → tooltip → badge → button → callout → card →
  carousel → comparison → copy-button → details → image-dialog → dialog → icon →
  tag → tabs → accordion), with internal fenced-code-block protection.
- All 17 component transformers: callout, badge, button, tag, icon, card,
  copy-button, comparison, details, dialog, popover, tooltip, layout, tabs,
  carousel, accordion, image-dialog.
- `configure()` / `getConfiguration()` / `resetConfiguration()` global config
  (callout icons, custom components).
- Internal markdown-it renderer tuned for Kramdown parity (`xhtmlOut`, no
  smart quotes, Kramdown-style heading auto-ids).
- Deterministic MD5 ids for dialog/popover/tooltip, byte-identical to the Ruby
  engine.
- Dual ESM + CJS build with bundled type definitions (tsup); Vitest suite;
  cross-engine parity corpus.

### Known divergences from the Ruby engine

- Cosmetic only: markdown list-item indentation and the wrapping of a standalone
  raw `<img>` differ between markdown-it and Kramdown. The rendered HTML is
  visually identical.

### Deferred

- `renderAsMarkdown()` / plain-markdown rendering parity (Phase 3) is not yet
  ported.

[Unreleased]: https://github.com/jannewaren/markawesome-js/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jannewaren/markawesome-js/releases/tag/v0.2.0
[0.1.0]: https://github.com/jannewaren/markawesome-js/releases/tag/v0.1.0

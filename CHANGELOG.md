# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New `date` transformer producing Web Awesome's two declarative timestamp components — `<wa-format-date>` (an absolute, locale-formatted date) and `<wa-relative-time>` ("3 days ago", optionally live-ticking). A byte-for-byte mirror of the Ruby `DateTransformer` (parity locked by `test/parity-corpus.test.ts`), it runs in the pipeline right after `tooltip`.
  - **Inline syntax** (primary): `[[[ <date> <tokens> ]]]` — triple square brackets, single-line, transformed before the host markdown processor.
  - **Block alternative**: `:::wa-format-date <date> <tokens>` / `:::wa-relative-time <date> <tokens>` with an empty body closed by `:::`; the selector name chooses the mode.
  - **format-date**: `style:`/`time:` presets (`short|medium|long|full`) expand to granular WA attributes, with granular overrides (`weekday`, `era`, `year`, `month`, `day`, `hour`, `minute`, `second`, `hour-format`, `time-zone-name`, `time-zone`, `lang`/`locale` → `lang`) winning per key. Enum values validated; unknown/invalid tokens dropped. A bare date defaults to `style:long`. Deterministic emission order matches the Ruby engine exactly.
  - **relative-time**: `format` (`long|short|narrow`, default omitted), `numeric` (`auto|always`, default omitted), `sync` (boolean), `lang`/`locale` → `lang`. The `relative` flag switches the inline form into relative mode.
  - The ISO 8601 date/datetime token (omitted ⇒ runtime now) is escaped into `date="…"`. Like `<wa-icon>`, both components render generated text into shadow DOM with no light-DOM fallback.

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

[Unreleased]: https://github.com/jannewaren/markawesome-js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jannewaren/markawesome-js/releases/tag/v0.1.0

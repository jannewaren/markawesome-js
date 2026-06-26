# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

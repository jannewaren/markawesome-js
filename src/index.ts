/**
 * markawesome-js — framework-agnostic Markdown to Web Awesome component
 * transformer. A TypeScript port of the markawesome Ruby gem.
 */
export { process, type ProcessOptions } from './transformer.js';

// Markawesome -> plain Markdown degradation (mirrors the Ruby
// `Markawesome::PlainMarkdownRenderer`). Namespaced: `plainMarkdown.process(…)`,
// `plainMarkdown.registerOverride(…)`, `plainMarkdown.resetOverrides()`.
export * as plainMarkdown from './plain-markdown-renderer.js';
export type { PlainMarkdownOptions, PlainMarkdownOverride } from './plain-markdown-renderer.js';
export {
  configure,
  getConfiguration,
  resetConfiguration,
  type Configuration,
  type ConfigureOptions,
} from './config.js';

export type { ImageDialogConfig } from './transformers/image-dialog.js';

// Lower-level building blocks, exposed for advanced use / parity testing.
export { renderMarkdown, kramdownSlug } from './markdown.js';
export {
  parseAttributes,
  type AttributeSchema,
  type ParsedAttributes,
} from './attribute-parser.js';
export {
  parseIconSlots,
  iconsToHtml,
  type SlotConfig,
  type IconParseResult,
} from './icon-slot-parser.js';
export { ICON_ATTRIBUTE_SCHEMA, iconAttributePairs } from './icon-attributes.js';

// Individual transformers (each exposes `transform`).
export * as transformers from './transformers/index.js';

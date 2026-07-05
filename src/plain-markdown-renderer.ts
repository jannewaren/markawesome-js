import * as codeBlockProtector from './code-block-protector.js';
import * as accordion from './transformers/accordion.js';
import * as badge from './transformers/badge.js';
import * as button from './transformers/button.js';
import * as callout from './transformers/callout.js';
import * as card from './transformers/card.js';
import * as carousel from './transformers/carousel.js';
import * as comparison from './transformers/comparison.js';
import * as copyButton from './transformers/copy-button.js';
import * as date from './transformers/date.js';
import * as details from './transformers/details.js';
import * as dialog from './transformers/dialog.js';
import * as icon from './transformers/icon.js';
import * as imageDialog from './transformers/image-dialog.js';
import type { ImageDialogConfig } from './transformers/image-dialog.js';
import * as layout from './transformers/layout.js';
import * as popover from './transformers/popover.js';
import * as randomContent from './transformers/random-content.js';
import * as tabs from './transformers/tabs.js';
import * as tag from './transformers/tag.js';
import * as tooltip from './transformers/tooltip.js';
import * as tree from './transformers/tree.js';
import * as video from './transformers/video.js';

/**
 * Renders Markawesome-flavored markdown into "clean" plain markdown by degrading
 * each Web Awesome component to its closest GFM equivalent. Used to serve
 * per-page `.md` endpoints and to generate llms.txt content that LLM consumers
 * can read without having to understand `<wa-*>` tags.
 *
 * Mirrors {@link import('./transformer.js').process}, but dispatches to each
 * transformer's `renderAsMarkdown` instead of `transform`. Byte-for-byte
 * compatible with the Ruby `Markawesome::PlainMarkdownRenderer`.
 */

export interface PlainMarkdownOptions {
  /**
   * Enable the image-dialog degradation step. `true` uses defaults; an object
   * can supply a `defaultWidth`. Applied before the dialog step — matching the
   * `process` pipeline — though its degradation is a no-op.
   */
  imageDialog?: boolean | ImageDialogConfig;
}

/**
 * A per-component override registered by a host application: receives the full
 * source content and the renderer options and returns the content with that
 * component's syntax replaced.
 */
export type PlainMarkdownOverride = (content: string, options: PlainMarkdownOptions) => string;

// Each pipeline step degrades one component. `render` closes over its
// transformer's `renderAsMarkdown`; the `imageDialog` step additionally gates on
// `options.imageDialog` (mirroring the Ruby engine). The order is the exact Ruby
// PIPELINE order and is load-bearing.
interface PipelineStep {
  name: string;
  render: (content: string, options: PlainMarkdownOptions) => string;
}

const PIPELINE: PipelineStep[] = [
  { name: 'layout', render: (c) => layout.renderAsMarkdown(c) },
  { name: 'popover', render: (c) => popover.renderAsMarkdown(c) },
  { name: 'tooltip', render: (c) => tooltip.renderAsMarkdown(c) },
  { name: 'date', render: (c) => date.renderAsMarkdown(c) },
  { name: 'badge', render: (c) => badge.renderAsMarkdown(c) },
  { name: 'button', render: (c) => button.renderAsMarkdown(c) },
  { name: 'callout', render: (c) => callout.renderAsMarkdown(c) },
  { name: 'card', render: (c) => card.renderAsMarkdown(c) },
  { name: 'carousel', render: (c) => carousel.renderAsMarkdown(c) },
  { name: 'comparison', render: (c) => comparison.renderAsMarkdown(c) },
  { name: 'video', render: (c) => video.renderAsMarkdown(c) },
  { name: 'copyButton', render: (c) => copyButton.renderAsMarkdown(c) },
  { name: 'details', render: (c) => details.renderAsMarkdown(c) },
  {
    name: 'imageDialog',
    render: (c, options) => {
      // Only degrade image-dialogs when the host enables the step (matching
      // `process`); otherwise leave the content untouched. The degradation
      // itself is a no-op, but the gate keeps ordering + host overrides in sync.
      if (!options.imageDialog) return c;
      const config: ImageDialogConfig =
        typeof options.imageDialog === 'object' ? options.imageDialog : {};
      return imageDialog.renderAsMarkdown(c, config);
    },
  },
  { name: 'dialog', render: (c) => dialog.renderAsMarkdown(c) },
  { name: 'icon', render: (c) => icon.renderAsMarkdown(c) },
  { name: 'tag', render: (c) => tag.renderAsMarkdown(c) },
  { name: 'tabs', render: (c) => tabs.renderAsMarkdown(c) },
  { name: 'accordion', render: (c) => accordion.renderAsMarkdown(c) },
  { name: 'tree', render: (c) => tree.renderAsMarkdown(c) },
  { name: 'randomContent', render: (c) => randomContent.renderAsMarkdown(c) },
];

// Per-component overrides registered by host applications, keyed by the same
// camelCase names used in the PIPELINE (and the `transformers` barrel).
const overrideRegistry = new Map<string, PlainMarkdownOverride>();

/**
 * Register a per-component override. Consumers can call this during boot to
 * replace the default degradation for a single component without forking the
 * package. `component` is one of the pipeline names: `layout`, `popover`,
 * `tooltip`, `date`, `badge`, `button`, `callout`, `card`, `carousel`,
 * `comparison`, `video`, `copyButton`, `details`, `imageDialog`, `dialog`,
 * `icon`, `tag`, `tabs`, `accordion`, `tree`, `randomContent`.
 */
export function registerOverride(component: string, fn: PlainMarkdownOverride): void {
  overrideRegistry.set(component, fn);
}

/** Clear all registered overrides (useful in tests). */
export function resetOverrides(): void {
  overrideRegistry.clear();
}

/** A copy of the currently registered overrides. */
export function overrides(): Map<string, PlainMarkdownOverride> {
  return new Map(overrideRegistry);
}

/**
 * Degrade Markawesome-flavored markdown to plain GFM. Fenced code blocks are
 * protected first, each component is degraded in the fixed pipeline order (a
 * registered override, if any, replaces that component's default), Kramdown
 * attribute syntax is stripped, then the code blocks are restored.
 */
export function process(content: string, options: PlainMarkdownOptions = {}): string {
  const { content: protectedContent, tokens } = codeBlockProtector.protect(content);

  let c = protectedContent;
  for (const step of PIPELINE) {
    const override = overrideRegistry.get(step.name);
    if (override) {
      c = override(c, options);
      continue;
    }
    c = step.render(c, options);
  }

  c = stripKramdownAttributes(c);
  return codeBlockProtector.restore(c, tokens);
}

/**
 * Strip Kramdown attribute syntax like `{:.class}`, `{:#id}`, `{: .class}`, etc.
 * These are Kramdown-specific and not valid GFM. The leading `\s*` is deliberate
 * — it eats the whitespace/newline before the `{:…}` block.
 */
export function stripKramdownAttributes(content: string): string {
  return content.replace(/\s*\{:\s*[^}]*\}/g, '');
}

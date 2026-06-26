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
import * as tabs from './transformers/tabs.js';
import * as tag from './transformers/tag.js';
import * as tooltip from './transformers/tooltip.js';

export interface ProcessOptions {
  /**
   * Enable the image-dialog transformer. `true` uses defaults; an object can
   * supply a `defaultWidth`. Applied before the dialog transformer.
   */
  imageDialog?: boolean | ImageDialogConfig;
}

/**
 * Transform Markawesome-flavored markdown into markdown with Web Awesome
 * component HTML spliced in.
 *
 * The pipeline order is load-bearing and mirrors the Ruby engine exactly:
 * fenced code blocks are protected first, the transformers run in a fixed
 * order, then the code blocks are restored.
 */
export function process(content: string, options: ProcessOptions = {}): string {
  const { content: protectedContent, tokens } = codeBlockProtector.protect(content);

  let c = protectedContent;
  c = layout.transform(c);
  c = popover.transform(c);
  c = tooltip.transform(c);
  c = date.transform(c);
  c = badge.transform(c);
  c = button.transform(c);
  c = callout.transform(c);
  c = card.transform(c);
  c = carousel.transform(c);
  c = comparison.transform(c);
  c = copyButton.transform(c);
  c = details.transform(c);

  // Image dialog runs BEFORE the dialog transformer when enabled.
  if (options.imageDialog) {
    const config: ImageDialogConfig =
      typeof options.imageDialog === 'object' ? options.imageDialog : {};
    c = imageDialog.transform(c, config);
  }

  c = dialog.transform(c);
  c = icon.transform(c);
  c = tag.transform(c);
  c = tabs.transform(c);

  // Accordion runs last so item bodies may contain other already-transformed
  // components (same reason tabs runs near the end).
  c = accordion.transform(c);

  return codeBlockProtector.restore(c, tokens);
}

import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml, md5Hex8 } from './base.js';

/**
 * Transforms dialog syntax into `<wa-dialog>` elements with trigger buttons.
 *   Primary:     ???params\nbutton text\n>>>\ncontent\n???
 *   Alternative: :::wa-dialog params\nbutton text\n>>>\ncontent\n:::
 * The header (with the X close button) is always enabled for accessibility.
 */
const DIALOG_ATTRIBUTES: AttributeSchema = {
  light_dismiss: ['light-dismiss'],
};

const PRIMARY_REGEX = /^\?\?\?([^\n]*)$\n([\s\S]*?)\n^>>>$\n([\s\S]*?)\n^\?\?\?$/gm;
const ALTERNATIVE_REGEX = /^:::wa-dialog([^\n]*)$\n([\s\S]*?)\n^>>>$\n([\s\S]*?)\n^:::$/gm;

const WIDTH_TOKEN = /^\d+(\.\d+)?(px|em|rem|vw|vh|%|ch)$/;

export function transform(content: string): string {
  // Two dialogs with the same trigger and body hash alike, so suffix repeats
  // (-2, -3, …) to keep ids unique — same scheme as popover/tooltip.
  const seenIds: Record<string, number> = {};

  const transformProc = (paramsString = '', buttonTextRaw = '', dialogContentRaw = ''): string => {
    const buttonText = buttonTextRaw.trim();
    const dialogContent = dialogContentRaw.trim();

    const [lightDismiss, width] = parseParameters(paramsString);
    const [label, contentWithoutLabel] = extractLabel(dialogContent, buttonText);
    const dialogId = generateDialogId(buttonText, dialogContent, seenIds);
    const contentHtml = renderMarkdown(contentWithoutLabel);

    return buildDialogHtml(dialogId, buttonText, label, contentHtml, lightDismiss, width);
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * Degrade a dialog to an italic trigger label followed by the body. (The Ruby
 * source's if/else branches are identical — the heading-vs-not distinction is
 * dead code — so this collapses them.)
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', buttonText = '', dialogContent = ''): string => {
    const trigger = (buttonText ?? '').trim();
    const body = (dialogContent ?? '').trim();
    return `_${trigger}:_\n\n${body}`;
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * The hash covers the trigger and body only, so two dialogs differing solely by a
 * param (e.g. width) would collide — and identical ones always do. The occurrence
 * counter disambiguates: the first keeps the bare id, later ones get -2, -3, …
 * Mirrors generatePopoverId / generateTooltipId.
 */
function generateDialogId(
  buttonText: string,
  content: string,
  seenIds: Record<string, number>,
): string {
  const base = `dialog-${md5Hex8(`${buttonText}${content}`)}`;
  seenIds[base] = (seenIds[base] ?? 0) + 1;
  const occurrence = seenIds[base];
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function parseParameters(paramsString: string): [boolean, string | undefined] {
  if (!paramsString || paramsString.trim() === '') return [false, undefined];
  const attributes = parseAttributes(paramsString, DIALOG_ATTRIBUTES);
  const lightDismiss = attributes.light_dismiss === 'light-dismiss';
  const tokens = paramsString.trim().split(/\s+/);
  const width = tokens.find((token) => WIDTH_TOKEN.test(token));
  return [lightDismiss, width];
}

// Always returns a label: the first heading if present, else the button text.
function extractLabel(content: string, defaultLabel: string): [string, string] {
  const match = content.match(/^#\s+(.+?)$/m);
  if (match) {
    const label = match[1]!.trim();
    const contentWithoutLabel = content.replace(/^#\s+.+?\n/m, '').trim();
    return [label, contentWithoutLabel];
  }
  return [defaultLabel, content];
}

function escapeAttribute(text: string): string {
  return text.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

function buildDialogHtml(
  dialogId: string,
  buttonText: string,
  label: string,
  contentHtml: string,
  lightDismiss: boolean,
  width: string | undefined,
): string {
  const dialogAttrs = [`id='${dialogId}'`];
  dialogAttrs.push(`label='${escapeAttribute(escapeHtml(label))}'`);
  if (lightDismiss) dialogAttrs.push('light-dismiss');

  const styleAttr = width ? ` style='--width: ${width}'` : '';

  const isImageButton = buttonText.includes('<img');
  const buttonId = `${dialogId}-btn`;

  const html: string[] = [];

  if (isImageButton) {
    // WA 3.11 deprecated wa-button's generic `base` part in favour of a part named after
    // the component (`button`). `base` still works but is on its way out, so target both —
    // the output then styles correctly on 3.10-pinned and 3.11+ sites.
    const wrapperParts = (state: string) =>
      `  #${buttonId}::part(base)${state}, #${buttonId}::part(button)${state} {`;
    html.push('<style>');
    html.push(wrapperParts(''));
    html.push('    padding: 0;');
    html.push('    margin: 0;');
    html.push('    border: none;');
    html.push('    background: transparent;');
    html.push('    box-shadow: none;');
    html.push('    color: inherit;');
    html.push('    min-width: 0;');
    html.push('    height: auto;');
    html.push('  }');
    html.push(wrapperParts(':hover'));
    html.push('    background: transparent;');
    html.push('    border-color: transparent;');
    html.push('  }');
    html.push(wrapperParts(':active'));
    html.push('    background: transparent;');
    html.push('    border-color: transparent;');
    html.push('  }');
    html.push('</style>');
  }

  // Only allow HTML for image tags (image-dialog support); escape everything else.
  const buttonContent = isImageButton ? buttonText : escapeHtml(buttonText);
  const buttonIdAttr = isImageButton ? ` id='${buttonId}'` : '';
  const buttonAppearance = isImageButton ? " appearance='plain'" : '';
  html.push(
    `<wa-button${buttonIdAttr}${buttonAppearance} data-dialog='open ${dialogId}'>${buttonContent}</wa-button>`,
  );

  html.push(`<wa-dialog ${dialogAttrs.join(' ')}${styleAttr}>`);
  html.push(contentHtml);
  html.push("<wa-button slot='footer' variant='brand' data-dialog='close'>Close</wa-button>");
  html.push('</wa-dialog>');

  return html.join('\n');
}

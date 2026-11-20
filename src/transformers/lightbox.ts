import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml } from './base.js';
import { gridAttributes } from './layout.js';

/**
 * Transforms a fenced list of Markdown images into a `<wa-lightbox>` gallery:
 * a grid of thumbnails that open a full-screen viewer.
 *   Primary:     ::::lightbox params?\n![alt](src "caption")\n…\n::::
 *   Alternative: :::wa-lightbox params?\n…same body…\n:::
 *
 * Items (one per line): `![alt](src "caption")` -> item src = thumbnail = src;
 * `[![alt](thumb "t")](href "caption")` -> thumbnail = thumb, item src = href.
 * The caption is the link title, else the image title. An item src ending in a
 * video extension (.mp4 .webm .mov .ogv .m4v, ignoring ?query/#hash) gets
 * type="video". Blank lines are ignored; any other line is rendered as Markdown
 * and kept in place (never silently dropped).
 *
 * Params: `loop`, `thumbnails` (-> with-thumbnails), `no-nav`
 * (-> without-navigation), `no-counter` (-> without-counter), `no-zoom`
 * (-> without-zoom), `label:"…"`; `square` (default), `landscape` (4 / 3),
 * `portrait` (3 / 4), `natural` (no crop); `gap:`, `min:`, `align:`,
 * `justify:` — the ::::grid rules (the gallery is a wa-grid).
 *
 * Runs first in the pipeline (with divider/stepper) so its `::::` closer is
 * consumed before the layout transformer — a lightbox can sit inside a
 * ::::grid, a card or a tab — and so the optional image-dialog transformer
 * never sees the gallery's images (they are already <img> HTML).
 *
 * Byte-for-byte mirror of the Ruby `LightboxTransformer`.
 */

/** wa-lightbox-item `type` values: image is implicit (WA's default). */
export const LIGHTBOX_ITEM_TYPES = ['image', 'video'];

const FLAGS: Record<string, string> = {
  loop: 'loop',
  thumbnails: 'with-thumbnails',
  'no-nav': 'without-navigation',
  'no-counter': 'without-counter',
  'no-zoom': 'without-zoom',
};

// Emission order for boolean attributes (after class, style, label).
const FLAG_ORDER = [
  'loop',
  'with-thumbnails',
  'without-navigation',
  'without-counter',
  'without-zoom',
];

const THUMBNAIL_RADIUS = 'border-radius: var(--wa-border-radius-m)';
const THUMBNAIL_STYLES: Record<string, string> = {
  square: `width: 100%; aspect-ratio: 1; object-fit: cover; ${THUMBNAIL_RADIUS}`,
  landscape: `width: 100%; aspect-ratio: 4 / 3; object-fit: cover; ${THUMBNAIL_RADIUS}`,
  portrait: `width: 100%; aspect-ratio: 3 / 4; object-fit: cover; ${THUMBNAIL_RADIUS}`,
  natural: `width: 100%; height: auto; ${THUMBNAIL_RADIUS}`,
};

// Ruby: /^::::lightbox(?:[ \t]+([^\n]*))?\n(.*?)\n::::[ \t]*$/m and
//       /^:::wa-lightbox(?:[ \t]+([^\n]*))?\n(.*?)\n:::[ \t]*$/m
// `(?![^\n])` mirrors Ruby's end-of-line `$` exactly (see divider.ts).
const PRIMARY_REGEX = /^::::lightbox(?:[ \t]+([^\n]*))?\n([\s\S]*?)\n::::[ \t]*(?![^\n])/gm;
const ALTERNATIVE_REGEX = /^:::wa-lightbox(?:[ \t]+([^\n]*))?\n([\s\S]*?)\n:::[ \t]*(?![^\n])/gm;
const LABEL_REGEX = /label:(?:"([^"]*)"|'([^']*)')/;
const IMAGE_REGEX = /^!\[([^\]]*)\]\(([^)\s]+)(?:[ \t]+"([^"]*)")?\)$/;
const LINKED_IMAGE_REGEX =
  /^\[!\[([^\]]*)\]\(([^)\s]+)(?:[ \t]+"([^"]*)")?\)\]\(([^)\s]+)(?:[ \t]+"([^"]*)")?\)$/;
const VIDEO_REGEX = /\.(?:mp4|webm|mov|ogv|m4v)(?:[?#].*)?$/i;

interface Item {
  alt: string;
  thumb: string;
  src: string;
  caption: string;
}

export function transform(content: string): string {
  const transformProc = (paramsString = '', body = ''): string => buildLightbox(paramsString, body);
  return applyPatterns(
    content,
    dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc),
  );
}

/**
 * Plain-Markdown degrade: the image lines are already valid GFM, so keep the
 * body as written and drop the fence.
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', body = ''): string => body;
  return applyPatterns(
    content,
    dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc),
  );
}

function buildLightbox(rawParams: string, body: string): string {
  const [label, paramsString] = extractLabel(rawParams);
  const tokens = paramsString.split(/\s+/).filter((t) => t !== '');
  const [classes, styles] = gridAttributes(paramsString);
  const shape =
    [...tokens].reverse().find((t) => Object.prototype.hasOwnProperty.call(THUMBNAIL_STYLES, t)) ??
    'square';
  const flags = tokens
    .filter((t) => Object.prototype.hasOwnProperty.call(FLAGS, t))
    .map((t) => FLAGS[t]!);

  const attrParts = [`class="${escapeHtml(classes.join(' '))}"`];
  if (styles.length > 0) attrParts.push(`style="${escapeHtml(styles.join('; '))}"`);
  if (label !== '') attrParts.push(`label="${escapeHtml(label)}"`);
  for (const flag of FLAG_ORDER) if (flags.includes(flag)) attrParts.push(flag);

  return `<wa-lightbox ${attrParts.join(' ')}>${buildChildren(body, shape)}</wa-lightbox>`;
}

// Pull out label:"…" (or label:'…') before the bare tokens are read, so words
// inside the label can't be taken as flags.
function extractLabel(paramsString: string): [string, string] {
  const m = LABEL_REGEX.exec(paramsString);
  if (!m) return ['', paramsString];
  return [(m[1] ?? m[2] ?? '').trim(), paramsString.replace(LABEL_REGEX, ' ')];
}

// Image lines become items; runs of other lines are rendered as Markdown in
// place. Blank lines only separate those runs.
function buildChildren(body: string, shape: string): string {
  const children: string[] = [];
  let pending: string[] = [];
  const flush = (): void => {
    const text = pending.join('\n').trim();
    if (text !== '') children.push(renderMarkdown(text).trim());
    pending = [];
  };

  for (const line of body.split('\n')) {
    const item = parseItem(line.trim());
    if (item) {
      flush();
      children.push(buildItem(item, shape));
    } else {
      pending.push(line);
    }
  }
  flush();
  return children.join('');
}

function parseItem(line: string): Item | null {
  const linked = LINKED_IMAGE_REGEX.exec(line);
  if (linked) {
    return {
      alt: linked[1]!,
      thumb: linked[2]!,
      src: linked[4]!,
      caption: linked[5] ?? linked[3] ?? '',
    };
  }
  const image = IMAGE_REGEX.exec(line);
  if (image) return { alt: image[1]!, thumb: image[2]!, src: image[2]!, caption: image[3] ?? '' };
  return null;
}

function buildItem(item: Item, shape: string): string {
  const itemParts: string[] = [];
  if (VIDEO_REGEX.test(item.src)) itemParts.push('type="video"');
  itemParts.push(`src="${escapeHtml(item.src)}"`);
  if (item.caption !== '') itemParts.push(`caption="${escapeHtml(item.caption)}"`);

  const img =
    `<img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.alt)}" ` +
    `loading="lazy" style="${THUMBNAIL_STYLES[shape]!}">`;
  return `<wa-lightbox-item ${itemParts.join(' ')}>${img}</wa-lightbox-item>`;
}

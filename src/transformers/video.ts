import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { applyPatterns, escapeHtml, type Pattern } from './base.js';

/**
 * Transforms video syntax into Web Awesome's two media components:
 *   `<wa-video>`          — a single embedded video with custom controls
 *   `<wa-video-playlist>` — a playlist wrapping multiple `<wa-video>` children
 *
 * Single video
 *   Primary:     ;;;tokens\n[Title](src)\n![Poster](poster)\n;;;
 *   Alternative: :::wa-video tokens\n…\n:::
 *
 * Playlist (a ;;;;;; container wrapping bare ;;; items, mirroring carousel)
 *   Primary:     ;;;;;;tokens\n;;;\n[Title](src)\n;;;\n…\n;;;;;;
 *   Alternative: :::wa-video-playlist tokens\n;;;\n…\n;;;\n:::
 *
 * Byte-for-byte port of the Ruby `VideoTransformer`.
 */

/** Boolean flags, matched as whole tokens so `autoplay-muted` never triggers `autoplay`. */
const VIDEO_FLAGS: AttributeSchema = {
  autoplay: ['autoplay'],
  'autoplay-muted': ['autoplay-muted'],
  'autoplay-on-visible': ['autoplay-on-visible'],
  loop: ['loop'],
  muted: ['muted'],
};

/** Deterministic emission order for the boolean flags. */
const FLAG_ORDER = ['autoplay', 'autoplay-muted', 'autoplay-on-visible', 'loop', 'muted'];

const CONTROLS_VALUES = ['none', 'standard', 'full'];
const PRELOAD_VALUES = ['auto', 'metadata', 'none'];

// Ruby `/m` DOTALL body captures become `[\s\S]*?`; line-anchored `^`/`$` carry
// the `m` flag; `gsub` carries `g`. The bare `;;;\n` item open (no params) is
// load-bearing — it stops the closing `;;;;;;` from being mis-read as an item.
const PLAYLIST_PRIMARY = /^;{6}([^\n]*)\n((?:;;;\n(?:[\s\S]*?\n)?;;;\n?)+);{6}/gm;
const PLAYLIST_ALT = /^:::wa-video-playlist\s*([^\n]*)\n([\s\S]*?)\n:::/gm;
// `(?!;)` keeps the single open from matching a leftover `;;;;;;` fence.
const SINGLE_PRIMARY = /^;;;(?!;)([^\n]*)\n([\s\S]*?)\n^;;;$/gm;
const SINGLE_ALT = /^:::wa-video\s*([^\n]*)\n([\s\S]*?)\n:::/gm;
const ITEM_REGEX = /;;;\n([\s\S]*?);;;(?:\n|$)/gm;

/** First markdown link that is not the `![…]()` of an image → title + src. */
const LINK_REGEX = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/;
/** First markdown image → poster. */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/;

interface ParsedTokens {
  controls: string | null;
  preload: string | null;
  flags: string[];
}

export function transform(content: string): string {
  const patterns: Pattern[] = [
    { regex: PLAYLIST_PRIMARY, handler: (c) => buildPlaylist(c[0] ?? '', c[1] ?? '') },
    { regex: PLAYLIST_ALT, handler: (c) => buildPlaylist(c[0] ?? '', c[1] ?? '') },
    { regex: SINGLE_PRIMARY, handler: (c, full) => buildSingle(c[0] ?? '', c[1] ?? '') ?? full },
    { regex: SINGLE_ALT, handler: (c, full) => buildSingle(c[0] ?? '', c[1] ?? '') ?? full },
  ];
  return applyPatterns(content, patterns);
}

/**
 * Degrade video markup to plain markdown links. A single video becomes
 * `[title](src)` (falling back to the src as the label when there is no title);
 * a link-less block is left untouched. A playlist becomes a `- [title](src)`
 * bullet per item, joined by a single newline.
 */
export function renderAsMarkdown(content: string): string {
  const patterns: Pattern[] = [
    { regex: PLAYLIST_PRIMARY, handler: (c) => renderPlaylistMarkdown(c[1] ?? '') },
    { regex: PLAYLIST_ALT, handler: (c) => renderPlaylistMarkdown(c[1] ?? '') },
    { regex: SINGLE_PRIMARY, handler: (c, full) => renderSingleMarkdown(c[1] ?? '') ?? full },
    { regex: SINGLE_ALT, handler: (c, full) => renderSingleMarkdown(c[1] ?? '') ?? full },
  ];
  return applyPatterns(content, patterns);
}

function renderSingleMarkdown(body: string): string | null {
  const [title, src] = extractLinkAndImage(body);
  if (!src) return null;
  const label = !title || title === '' ? src : title;
  return `[${label}](${src})`;
}

function renderPlaylistMarkdown(body: string): string {
  const items: string[] = [];
  for (const itemBody of extractItems(body)) {
    const [title, src] = extractLinkAndImage(itemBody);
    if (!src) continue;
    const label = !title || title === '' ? src : title;
    items.push(`- [${label}](${src})`);
  }
  return items.join('\n');
}

function buildSingle(params: string, body: string): string | null {
  return buildVideo(params, body, false);
}

function buildPlaylist(params: string, body: string): string {
  const controls = parseTokens(params).controls;
  const controlsAttr = controls ? ` controls="${controls}"` : '';
  const children = extractItems(body)
    .map((itemBody) => buildVideo('', itemBody, true))
    .filter((html): html is string => html !== null);
  return `<wa-video-playlist${controlsAttr}>${children.join('')}</wa-video-playlist>`;
}

/**
 * Returns the `<wa-video>` HTML, or null when the body has no link (no `src`),
 * signalling the caller to leave the block untransformed.
 */
function buildVideo(params: string, body: string, suppressControls: boolean): string | null {
  const tokens = parseTokens(params);
  const [title, src, poster] = extractLinkAndImage(body);
  if (!src) return null;

  const parts = [`src="${escapeHtml(src)}"`];
  if (poster) parts.push(`poster="${escapeHtml(poster)}"`);
  if (title && title !== '') parts.push(`title="${escapeHtml(title)}"`);
  if (tokens.controls && !suppressControls) parts.push(`controls="${tokens.controls}"`);
  if (tokens.preload) parts.push(`preload="${tokens.preload}"`);
  for (const flag of FLAG_ORDER) if (tokens.flags.includes(flag)) parts.push(flag);

  return `<wa-video ${parts.join(' ')}></wa-video>`;
}

function parseTokens(params: string): ParsedTokens {
  const result: ParsedTokens = { controls: null, preload: null, flags: [] };
  for (const token of params.trim().split(/\s+/)) {
    let m: RegExpMatchArray | null;
    if ((m = token.match(/^controls:(.+)$/)) && CONTROLS_VALUES.includes(m[1]!)) {
      result.controls = m[1]!;
    } else if ((m = token.match(/^preload:(.+)$/)) && PRELOAD_VALUES.includes(m[1]!)) {
      result.preload = m[1]!;
    }
  }
  result.flags = Object.keys(parseAttributes(params, VIDEO_FLAGS));
  return result;
}

function extractItems(body: string): string[] {
  return [...body.matchAll(ITEM_REGEX)].map((m) => m[1] ?? '');
}

function extractLinkAndImage(body: string): [string | null, string | null, string | null] {
  const link = body.match(LINK_REGEX);
  const image = body.match(IMAGE_REGEX);
  return [link ? (link[1] ?? null) : null, link ? (link[2] ?? null) : null, image ? (image[2] ?? null) : null];
}

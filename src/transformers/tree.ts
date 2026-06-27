import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml } from './base.js';

/**
 * Transforms tree syntax into `<wa-tree>` / `<wa-tree-item>` from a nested
 * Markdown bullet list — the first transformer that maps indentation (rather
 * than flat item fences) onto a component.
 *   Primary:     ||||||open?\n- item\n  - child\n||||||
 *   Alternative: :::wa-tree open?\n…list…\n:::
 *
 * Web Awesome's tree is fundamentally a *selection* control, which is
 * interactive (needs JS). On a static site we deliberately emit a
 * display/navigation-only tree: visual hierarchy via nesting, initial expand
 * state, and leading folder/file icons — all declarative and static-safe. We
 * skip selection, lazy, selected, and selection events entirely.
 *
 * Fence token `open` (alias `expanded`) marks every branch (node with children)
 * expanded. Per-node leading tokens (stripped from the label): `expanded`
 * forces one branch open; `icon:name` emits a leading content `<wa-icon>`.
 * `expanded` is emitted only on nodes that HAVE children AND (fence open OR the
 * node's own `expanded` flag); leaves never get `expanded`.
 *
 * WA runtime caveat (verified against the WA 3.9.0 kit): `<wa-tree-item>` only
 * honors a static `expanded` on items VISIBLE at load, so in practice `open`
 * expands the TOP-LEVEL branches and deeper branches stay collapsed until their
 * parent is opened (WA strips `expanded` from nested items at init). We still
 * emit `expanded` on every branch on purpose: harmless (WA ignores the nested
 * ones), records authorial intent, and forward-compatible if WA ever honors
 * nested initial-expand.
 *
 * Runs last in the pipeline (after accordion).
 */

// Content slot: emits `<wa-icon name="...">` with no slot attribute.
const ICON_SLOTS: SlotConfig = {
  default: 'content',
  slots: ['content'],
  slotMap: { content: 'content' },
};

const ITEM_FLAGS = ['expanded'];
const FENCE_TOKENS = ['open', 'expanded'];
const TAB_WIDTH = 4;

const PRIMARY_REGEX = /^\|{6}[ \t]*([^\n]*)\n([\s\S]*?)\n\|{6}/gm;
const ALTERNATIVE_REGEX = /^:::wa-tree[ \t]*([^\n]*)\n([\s\S]*?)\n:::/gm;
const LIST_LINE_REGEX = /^(\s*)[-*+]\s+(.*)$/;

interface TreeNode {
  indent: number;
  raw: string;
}

interface Cursor {
  pos: number;
}

export function transform(content: string): string {
  const transformProc = (paramsString = '', body = ''): string => {
    const fenceOpen = isFenceOpen(paramsString);
    const nodes = parseLines(body);
    return `<wa-tree>${buildItems(nodes, { pos: 0 }, -1, fenceOpen)}</wa-tree>`;
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function isFenceOpen(paramsString: string): boolean {
  const trimmed = (paramsString ?? '').trim();
  if (trimmed === '') return false;
  return trimmed.split(/\s+/).some((t) => FENCE_TOKENS.includes(t));
}

// Keep only list lines; record each line's indent width and its raw text
// (everything after the bullet). Blank/non-list lines are skipped.
function parseLines(body: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const rawLine of (body ?? '').split('\n')) {
    const line = rawLine.replace(/\r$/, ''); // mirror Ruby String#chomp
    const match = LIST_LINE_REGEX.exec(line);
    if (!match) continue;
    nodes.push({ indent: indentWidth(match[1]!), raw: match[2]! });
  }
  return nodes;
}

function indentWidth(whitespace: string): number {
  let width = 0;
  for (const ch of whitespace) width += ch === '\t' ? TAB_WIDTH : 1;
  return width;
}

// Pointer + recursion comparing actual indent values (width-agnostic, no fixed
// step assumed): children are strictly more indented than the parent.
function buildItems(
  nodes: TreeNode[],
  cursor: Cursor,
  parentIndent: number,
  fenceOpen: boolean,
): string {
  let out = '';
  while (cursor.pos < nodes.length && nodes[cursor.pos]!.indent > parentIndent) {
    const node = nodes[cursor.pos]!;
    const current = node.indent;
    cursor.pos += 1;
    const childrenHtml = buildItems(nodes, cursor, current, fenceOpen);
    out += emitItem(node, childrenHtml, fenceOpen);
  }
  return out;
}

function emitItem(node: TreeNode, childrenHtml: string, fenceOpen: boolean): string {
  const iconResult = parseIconSlots(node.raw, ICON_SLOTS);
  const [flags, label] = parseItemFlagsAndLabel(iconResult.remaining);
  const hasChildren = childrenHtml !== '';
  const expanded = hasChildren && (fenceOpen || flags.includes('expanded'));

  const attrs = expanded ? ' expanded' : '';
  const iconHtml = iconsToHtml(iconResult.icons, ICON_SLOTS.slotMap);
  return `<wa-tree-item${attrs}>${iconHtml}${escapeHtml(label)}${childrenHtml}</wa-tree-item>`;
}

// Consume leading expanded tokens; the remainder is the label.
function parseItemFlagsAndLabel(remaining: string): [string[], string] {
  const tokens = (remaining ?? '').trim() === '' ? [] : remaining.trim().split(/\s+/);
  const flags: string[] = [];
  while (tokens.length > 0 && ITEM_FLAGS.includes(tokens[0]!)) {
    flags.push(tokens.shift()!);
  }
  return [flags, tokens.join(' ')];
}

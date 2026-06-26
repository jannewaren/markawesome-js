import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms tabs syntax into `<wa-tab-group>` elements.
 *   Primary:     ++++++[attrs]\n+++ tab1\ncontent\n+++\n…\n++++++
 *   Alternative: :::wa-tab-group [attrs]\n+++ tab1\ncontent\n+++\n…\n:::
 */
const COMPONENT_ATTRIBUTES: AttributeSchema = {
  placement: ['top', 'bottom', 'start', 'end'],
  activation: ['auto', 'manual'],
};

const PRIMARY_REGEX = /^\+{6}([^\n]*)\n((\+\+\+ [^\n]+\n[\s\S]*?\n\+\+\+\n?)+)\+{6}/gm;
const ALTERNATIVE_REGEX = /^:::wa-tab-group\s*([^\n]*)\n((\+\+\+ [^\n]+\n[\s\S]*?\n\+\+\+\n?)+):::/gm;

const TAB_REGEX = /^\+\+\+ ([^\n]+)\n([\s\S]*?)\n\+\+\+/gm;

export function transform(content: string): string {
  const transformProc = (paramsString = '', tabsBlock = ''): string => {
    const params = paramsString ?? '';
    const attributes = parseAttributes(params.trim(), COMPONENT_ATTRIBUTES);
    const noScrollControls = params.includes('no-scroll-controls');

    // Active panel = any token that's not a placement/activation/no-scroll-controls.
    let activePanel: string | undefined;
    const tokens = params.trim() === '' ? [] : params.trim().split(/\s+/);
    for (const token of tokens) {
      if (COMPONENT_ATTRIBUTES.placement!.includes(token)) continue;
      if (COMPONENT_ATTRIBUTES.activation!.includes(token)) continue;
      if (token === 'no-scroll-controls') continue;
      activePanel = token;
      break;
    }

    const { tabs, tabPanels } = extractTabsAndPanels(tabsBlock);

    const htmlAttrs: string[] = [];
    htmlAttrs.push(`placement="${attributes.placement || 'top'}"`);
    if (attributes.activation) htmlAttrs.push(`activation="${attributes.activation}"`);
    if (activePanel) htmlAttrs.push(`active="${activePanel}"`);
    if (noScrollControls) htmlAttrs.push('without-scroll-controls');

    return `<wa-tab-group ${htmlAttrs.join(' ')}>${tabs.join('')}${tabPanels.join('')}</wa-tab-group>`;
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function extractTabsAndPanels(tabsBlock: string): { tabs: string[]; tabPanels: string[] } {
  const tabs: string[] = [];
  const tabPanels: string[] = [];
  let index = 0;
  for (const match of tabsBlock.matchAll(TAB_REGEX)) {
    const title = match[1]!;
    const panelContent = match[2]!;
    const tabId = `tab-${index + 1}`;
    const [label, disabled] = parseTabHeader(title);

    const tabAttrs = [`panel="${tabId}"`];
    if (disabled) tabAttrs.push('disabled');
    tabs.push(`<wa-tab ${tabAttrs.join(' ')}>${label}</wa-tab>`);

    const panelHtml = renderMarkdown(panelContent.trim());
    tabPanels.push(`<wa-tab-panel name="${tabId}">${panelHtml}</wa-tab-panel>`);
    index += 1;
  }
  return { tabs, tabPanels };
}

/**
 * Parse a tab item header. A leading `disabled` token (case-sensitive, exactly
 * `disabled` or `disabled `-prefixed) flags the tab as disabled and is stripped
 * from the label; otherwise the label is the stripped title, unchanged. Mirrors
 * accordion's leading item flags.
 */
function parseTabHeader(title: string): [string, boolean] {
  const stripped = title.trim();
  if (stripped !== 'disabled' && !stripped.startsWith('disabled ')) {
    return [stripped, false];
  }
  return [stripped.replace(/^disabled\s*/, ''), true];
}

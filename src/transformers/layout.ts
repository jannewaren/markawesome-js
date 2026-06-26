import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms layout syntax into CSS layout utility containers.
 *   Primary:     ::::type params?\ncontent\n::::
 *   Alternative: ::::wa-type params?\ncontent\n::::
 * Types: grid, stack, cluster, split, flank, frame.
 */
const VALID_GAPS = ['0', '3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'];
const VALID_ALIGNS = ['start', 'end', 'center', 'stretch', 'baseline'];
const VALID_JUSTIFIES = [
  'start',
  'end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
];
const VALID_RADII = ['s', 'm', 'l', 'pill', 'circle', 'square'];

const KEYWORD_MODIFIERS: Record<string, string[]> = {
  split: ['row', 'column'],
  flank: ['start', 'end'],
  frame: ['landscape', 'portrait', 'square'],
};

const COMMON_KEY_CLASS_MAP: Record<string, (v: string) => string | undefined> = {
  gap: (v) => (VALID_GAPS.includes(v) ? `wa-gap-${v}` : undefined),
  align: (v) => (VALID_ALIGNS.includes(v) ? `wa-align-items-${v}` : undefined),
  justify: (v) => (VALID_JUSTIFIES.includes(v) ? `wa-justify-content-${v}` : undefined),
};

const TYPES = 'grid|stack|cluster|split|flank|frame';
const PRIMARY_REGEX = new RegExp(`^::::(${TYPES})[ \\t]*([^\\n]*)\\n([\\s\\S]*?)\\n::::`, 'gm');
const ALTERNATIVE_REGEX = new RegExp(`^::::wa-(${TYPES})[ \\t]*([^\\n]*)\\n([\\s\\S]*?)\\n::::`, 'gm');

export function transform(content: string): string {
  const transformProc = (type = '', paramsString = '', innerContent = ''): string => {
    const [classes, styles] = buildAttributes(type, paramsString);
    return buildHtml(classes, styles, innerContent);
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function buildAttributes(type: string, paramsString: string): [string[], string[]] {
  const classes = [`wa-${type}`];
  const styles: string[] = [];

  if (!paramsString || paramsString.trim() === '') return [classes, styles];

  for (const token of paramsString.trim().split(/\s+/)) {
    processToken(type, token, classes, styles);
  }
  return [classes, styles];
}

function processToken(type: string, token: string, classes: string[], styles: string[]): void {
  if (token.includes(':')) {
    processKeyValue(type, token, classes, styles);
  } else {
    processKeyword(type, token, classes);
  }
}

function processKeyValue(type: string, token: string, classes: string[], styles: string[]): void {
  // Ruby: token.split(':', 2) -> first colon splits key from the (possibly
  // colon-containing) value.
  const idx = token.indexOf(':');
  const key = token.slice(0, idx);
  const value = token.slice(idx + 1);
  if (value === '') return;

  if (key in COMMON_KEY_CLASS_MAP) {
    const cssClass = COMMON_KEY_CLASS_MAP[key]!(value);
    if (cssClass) classes.push(cssClass);
  } else {
    processTypeSpecificKeyValue(type, key, value, classes, styles);
  }
}

function processTypeSpecificKeyValue(
  type: string,
  key: string,
  value: string,
  classes: string[],
  styles: string[],
): void {
  switch (key) {
    case 'min':
      if (type === 'grid') styles.push(`--min-column-size: ${sanitizeCss(value)}`);
      break;
    case 'size':
      if (type === 'flank') styles.push(`--flank-size: ${sanitizeCss(value)}`);
      break;
    case 'content':
      if (type === 'flank') styles.push(`--content-percentage: ${sanitizeCss(value)}`);
      break;
    case 'radius':
      if (type === 'frame' && VALID_RADII.includes(value)) classes.push(`wa-border-radius-${value}`);
      break;
  }
}

function processKeyword(type: string, token: string, classes: string[]): void {
  const modifiers = KEYWORD_MODIFIERS[type];
  if (!modifiers || !modifiers.includes(token)) return;
  classes[0] = `wa-${type}:${token}`;
}

function sanitizeCss(value: string): string {
  return value.replace(/["'<>;]/g, '');
}

function buildHtml(classes: string[], styles: string[], innerContent: string): string {
  const attrParts = [`class="${classes.join(' ')}"`];
  if (styles.length > 0) attrParts.push(`style="${styles.join('; ')}"`);
  return `<div ${attrParts.join(' ')}>\n${innerContent}\n</div>`;
}

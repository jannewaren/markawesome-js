import type { AttributeSchema, ParsedAttributes } from './attribute-parser.js';

/**
 * Shared `<wa-icon>` attribute vocabulary (family/variant/animation) and an
 * emission helper. Values verified against Web Awesome 3.x.
 */
export const ICON_ATTRIBUTE_SCHEMA = {
  family: ['classic', 'sharp', 'duotone', 'sharp-duotone', 'brands'],
  variant: ['thin', 'light', 'regular', 'solid'],
  animation: [
    'beat',
    'fade',
    'beat-fade',
    'bounce',
    'flip',
    'shake',
    'spin',
    'spin-pulse',
    'spin-reverse',
  ],
} satisfies AttributeSchema;

const ICON_ATTRIBUTE_ORDER = ['family', 'variant', 'animation'] as const;

/** Return ordered `['family="…"', 'variant="…"', 'animation="…"']` for present keys. */
export function iconAttributePairs(attributes: ParsedAttributes): string[] {
  const pairs: string[] = [];
  for (const key of ICON_ATTRIBUTE_ORDER) {
    if (attributes[key]) pairs.push(`${key}="${attributes[key]}"`);
  }
  return pairs;
}

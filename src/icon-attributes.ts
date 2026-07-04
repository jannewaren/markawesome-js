import type { AttributeSchema, ParsedAttributes } from './attribute-parser.js';

/**
 * Shared `<wa-icon>` attribute vocabulary (family/variant/animation/canvas) and
 * an emission helper. Values verified against Web Awesome 3.10.0.
 */
export const ICON_ATTRIBUTE_SCHEMA = {
  family: [
    'classic',
    'sharp',
    'duotone',
    'sharp-duotone',
    'brands',
    'mosaic',
    'pixel',
    'vellum',
    'slab-duo',
    'slab-press-duo',
    'chisel',
    'etch',
    'graphite',
    'jelly',
    'jelly-duo',
    'jelly-fill',
    'notdog',
    'notdog-duo',
    'slab',
    'slab-press',
    'thumbprint',
    'utility',
    'utility-duo',
    'utility-fill',
    'whiteboard',
  ],
  variant: ['thin', 'light', 'regular', 'solid', 'semibold'],
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
    'flip-360',
    'spin-snap',
    'spin-snap-4',
    'spin-snap-8',
    'buzz',
    'float',
    'jello',
    'swing',
    'wag',
  ],
  canvas: ['fixed', 'auto', 'square', 'roomy'],
} satisfies AttributeSchema;

// Fixed emission order (canvas last) for byte-for-byte parity with the Ruby engine.
const ICON_ATTRIBUTE_ORDER = ['family', 'variant', 'animation', 'canvas'] as const;

/**
 * Return ordered `['family="…"', 'variant="…"', 'animation="…"', 'canvas="…"']`
 * for present keys.
 */
export function iconAttributePairs(attributes: ParsedAttributes): string[] {
  const pairs: string[] = [];
  for (const key of ICON_ATTRIBUTE_ORDER) {
    if (attributes[key]) pairs.push(`${key}="${attributes[key]}"`);
  }
  return pairs;
}

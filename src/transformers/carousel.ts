import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms carousel syntax into `<wa-carousel>` elements.
 *   Primary:     ~~~~~~params\n~~~ slide1 ~~~\n…\n~~~~~~
 *   Alternative: :::wa-carousel params\n…\n:::
 */
const COMPONENT_ATTRIBUTES: AttributeSchema = {
  loop: ['loop'],
  navigation: ['navigation'],
  pagination: ['pagination'],
  autoplay: ['autoplay'],
  'mouse-dragging': ['mouse-dragging'],
  vertical: ['vertical'],
};

const PRIMARY_REGEX = /^~{6}([^\n]*)\n((?:~~~\n(?:[\s\S]*?\n)?~~~\n?)+)~{6}/gm;
const ALTERNATIVE_REGEX = /^:::wa-carousel\s*([^\n]*)\n((?:~~~\n(?:[\s\S]*?\n)?~~~\n?)+):::/gm;
const SLIDE_REGEX = /~~~\n([\s\S]*?)~~~(?:\n|$)/gm;

interface ParsedParams {
  attributes: Record<string, string | true>;
  cssVars: Record<string, string>;
}

export function transform(content: string): string {
  const transformProc = (params = '', slidesBlock = ''): string => {
    const parsedParams = parseParams(params);
    const slides = extractSlides(slidesBlock);
    return buildCarouselHtml(slides, parsedParams);
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function parseParams(params: string): ParsedParams {
  const result: ParsedParams = { attributes: {}, cssVars: {} };
  if (!params || params.trim() === '') return result;

  const attributes = parseAttributes(params, COMPONENT_ATTRIBUTES);
  for (const key of Object.keys(attributes)) {
    if (key === 'vertical') {
      result.attributes['orientation'] = 'vertical';
    } else {
      result.attributes[key] = true;
    }
  }

  let numericCount = 0;
  for (const token of params.trim().split(/\s+/)) {
    if (token.includes(':')) {
      const idx = token.indexOf(':');
      const key = token.slice(0, idx);
      const value = token.slice(idx + 1);
      switch (key) {
        case 'autoplay-interval':
          result.attributes['autoplay-interval'] = value;
          break;
        case 'scroll-hint':
          result.cssVars['--scroll-hint'] = value;
          break;
        case 'aspect-ratio':
          result.cssVars['--aspect-ratio'] = value;
          break;
        case 'slide-gap':
          result.cssVars['--slide-gap'] = value;
          break;
      }
    } else if (/^\d+$/.test(token)) {
      numericCount += 1;
      if (numericCount === 1) result.attributes['slides-per-page'] = token;
      else if (numericCount === 2) result.attributes['slides-per-move'] = token;
    }
  }

  return result;
}

function extractSlides(slidesBlock: string): string[] {
  return [...slidesBlock.matchAll(SLIDE_REGEX)].map((m) => (m[1] ?? '').trim());
}

function buildCarouselHtml(slides: string[], parsedParams: ParsedParams): string {
  const attributes = buildAttributes(parsedParams.attributes);
  const style = buildStyle(parsedParams.cssVars);

  const attrString = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
  const styleString = style === '' ? '' : ` style="${style}"`;

  const slideItems = slides.map(
    (slideContent) => `<wa-carousel-item>${renderMarkdown(slideContent)}</wa-carousel-item>`,
  );

  return `<wa-carousel${attrString}${styleString}>${slideItems.join('')}</wa-carousel>`;
}

function buildAttributes(attrs: Record<string, string | true>): string[] {
  return Object.entries(attrs).map(([key, value]) => (value === true ? key : `${key}="${value}"`));
}

function buildStyle(cssVars: Record<string, string>): string {
  return Object.entries(cssVars)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

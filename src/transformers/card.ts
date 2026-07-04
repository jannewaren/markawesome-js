import { parseAttributes, type AttributeSchema, type ParsedAttributes } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms card syntax into `<wa-card>` elements.
 *   Primary:     ===params?\ncontent\n===
 *   Alternative: :::wa-card params?\ncontent\n:::
 * The first markdown image becomes the media slot, the first bold line (not a
 * heading) becomes the header slot, and a trailing link becomes the footer.
 */
const CARD_ATTRIBUTES: AttributeSchema = {
  appearance: ['outlined', 'filled', 'filled-outlined', 'plain', 'accent'],
  orientation: ['vertical', 'horizontal'],
};

const PRIMARY_REGEX = /^===([^\n]*)\n([\s\S]*?)\n===/gm;
const ALTERNATIVE_REGEX = /^:::wa-card\s*([^\n]*)\n([\s\S]*?)\n:::/gm;

interface Media {
  alt: string;
  src: string;
}
interface Footer {
  text: string;
  href: string;
}
interface CardParts {
  media: Media | null;
  header: string | null;
  content: string;
  footer: Footer | null;
}

export function transform(content: string): string {
  const transformProc = (paramsString = '', cardContent = ''): string => {
    const attributes = parseAttributes(paramsString, CARD_ATTRIBUTES);
    const cardParts = parseCardContent(cardContent.trim());
    return buildCardHtml(cardParts, attributes);
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function parseCardContent(content: string): CardParts {
  const parts: CardParts = { media: null, header: null, content, footer: null };

  // Extract first image as media.
  const mediaMatch = content.match(/^!\[([^\]]*)\]\(([^)]+)\)/m);
  if (mediaMatch) {
    parts.media = { alt: mediaMatch[1]!, src: mediaMatch[2]! };
    content = content.replace(/^!\[([^\]]*)\]\(([^)]+)\)\n?/m, '');
  }

  // Extract first bold line as header.
  const headerMatch = content.match(/^\*\*(.+)\*\*$/m);
  if (headerMatch) {
    parts.header = headerMatch[1]!.trim();
    content = content.replace(/^\*\*(.+)\*\*\n?/m, '');
  }

  // Extract trailing buttons/links as footer.
  const footerMatch = content.match(/\n\[([^\]]+)\]\(([^)]+)\)\s*$/);
  if (footerMatch) {
    parts.footer = { text: footerMatch[1]!, href: footerMatch[2]! };
    content = content.replace(/\n\[([^\]]+)\]\(([^)]+)\)\s*$/, '');
  }

  parts.content = content.trim();
  return parts;
}

function buildCardHtml(parts: CardParts, attributes: ParsedAttributes): string {
  const appearance = attributes.appearance || 'outlined';
  const orientation = attributes.orientation || 'vertical';

  const htmlAttrs: string[] = [];
  if (appearance !== 'outlined') htmlAttrs.push(`appearance="${appearance}"`);
  if (orientation !== 'vertical') htmlAttrs.push(`orientation="${orientation}"`);
  if (parts.media) htmlAttrs.push('with-media');
  if (parts.header) htmlAttrs.push('with-header');
  if (parts.footer) htmlAttrs.push('with-footer');

  const attrString = htmlAttrs.length === 0 ? '' : ` ${htmlAttrs.join(' ')}`;

  const htmlParts: string[] = [];
  if (parts.media) {
    htmlParts.push(`<img slot="media" src="${parts.media.src}" alt="${parts.media.alt}">`);
  }
  if (parts.header) {
    htmlParts.push(`<div slot="header">${renderMarkdown(parts.header)}</div>`);
  }
  if (parts.content && parts.content !== '') {
    // Horizontal cards wrap the body in a single <div> so Web Awesome's
    // `:host([orientation='horizontal']) .body slot::slotted(*) { height: 100% }`
    // rule — which it applies to EVERY direct body child — targets one wrapper
    // instead of each block. Without the wrapper a multi-block body (e.g. a
    // heading plus a paragraph) has each child stretched to the full card
    // height, so the extra ones overflow below it.
    const contentHtml = renderMarkdown(parts.content);
    htmlParts.push(orientation === 'horizontal' ? `<div>${contentHtml}</div>` : contentHtml);
  }
  if (parts.footer) {
    htmlParts.push(
      `<div slot="footer"><wa-button href="${parts.footer.href}">${parts.footer.text}</wa-button></div>`,
    );
  }

  return `<wa-card${attrString}>${htmlParts.join('')}</wa-card>`;
}

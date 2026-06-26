/**
 * Transforms comparison syntax into `<wa-comparison>` elements.
 *   Primary:     |||[position]\n![before](…)\n![after](…)\n|||
 *   Alternative: :::wa-comparison [position]\n…\n:::
 * Expects exactly two image elements inside the wrapper; otherwise unchanged.
 */

const PRIMARY_REGEX = /^\|\|\|(\d+)?\n([\s\S]*?)\n\|\|\|/gm;
const ALTERNATIVE_REGEX = /^:::wa-comparison\s*(\d+)?\n([\s\S]*?)\n:::/gm;
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

type ImagePair = [alt: string, src: string];

export function transform(content: string): string {
  content = content.replace(PRIMARY_REGEX, (match, position: string | undefined, inner: string) => {
    const innerContent = inner.trim();
    return extractImages(innerContent).length === 2
      ? buildComparisonHtml(innerContent, position)
      : match;
  });

  return content.replace(
    ALTERNATIVE_REGEX,
    (match, position: string | undefined, inner: string) => {
      const innerContent = inner.trim();
      return extractImages(innerContent).length === 2
        ? buildComparisonHtml(innerContent, position)
        : match;
    },
  );
}

function extractImages(content: string): ImagePair[] {
  return [...content.matchAll(IMAGE_REGEX)].map((m) => [m[1] ?? '', m[2] ?? '']);
}

function buildComparisonHtml(content: string, position?: string): string {
  const images = extractImages(content);
  const beforeImage = buildImageHtml(images[0]!, 'before');
  const afterImage = buildImageHtml(images[1]!, 'after');
  const positionAttr = position ? ` position="${position}"` : '';
  return `<wa-comparison${positionAttr}>${beforeImage}${afterImage}</wa-comparison>`;
}

function buildImageHtml(image: ImagePair, slot: string): string {
  const [altText, src] = image;
  // Escape order matches Ruby: & first, then ", <, >.
  const escapedAlt = altText
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<img slot="${slot}" src="${src}" alt="${escapedAlt}" />`;
}

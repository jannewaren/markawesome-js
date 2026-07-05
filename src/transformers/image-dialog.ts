/**
 * Transforms standalone images into clickable images that open in dialogs.
 * Images opt out by adding "nodialog" to the title: `![Alt](img.png "nodialog")`.
 *
 * Emits the engine's custom `???…???` dialog syntax, which the DialogTransformer
 * (which runs later in the pipeline) turns into the actual `<wa-dialog>`.
 */
export interface ImageDialogConfig {
  defaultWidth?: string;
}

const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g;
const WIDTH_UNIT = /\d+(?:\.\d+)?(?:px|em|rem|vw|vh|%|ch)/;

export function transform(content: string, config: ImageDialogConfig = {}): string {
  const [c1, fenced] = protect(content, /^```[\s\S]*?^```$|^~~~[\s\S]*?^~~~$/gm, 'FENCED_CODE');
  const [c2, inline] = protect(c1, /`[^`]+`/g, 'INLINE_CODE');
  const [c3, comparisons] = protectComparisons(c2);

  let result = c3.replace(
    IMAGE_REGEX,
    (match, altText: string, urlRaw: string, title: string | undefined) => {
      if (title && title.includes('nodialog')) return match;
      return transformToDialog(altText, urlRaw.trim(), title, config);
    },
  );

  // Restore in reverse order.
  result = restore(result, comparisons, 'COMPARISON');
  result = restore(result, inline, 'INLINE_CODE');
  result = restore(result, fenced, 'FENCED_CODE');
  return result;
}

/**
 * Plain-markdown degradation is a no-op: image-dialog wrapping is dropped, and
 * the raw markdown image syntax is already exactly what we want. It stays in the
 * pipeline (behind the `imageDialog` gate) so ordering and host overrides match
 * the Ruby engine.
 */
export function renderAsMarkdown(content: string, _config: ImageDialogConfig = {}): string {
  return content;
}

function protect(content: string, regex: RegExp, kind: string): [string, string[]] {
  const blocks: string[] = [];
  const protectedContent = content.replace(regex, (match) => {
    const placeholder = `<!--IMAGE_DIALOG_${kind}_${blocks.length}-->`;
    blocks.push(match);
    return placeholder;
  });
  return [protectedContent, blocks];
}

function protectComparisons(content: string): [string, string[]] {
  const blocks: string[] = [];
  // Protect markdown comparison syntax first…
  let protectedContent = content.replace(/\|\|\|(\d+)?\n[\s\S]*?\n\|\|\|/g, (match) => {
    const placeholder = `<!--IMAGE_DIALOG_COMPARISON_${blocks.length}-->`;
    blocks.push(match);
    return placeholder;
  });
  // …then any already-transformed HTML comparison blocks.
  protectedContent = protectedContent.replace(
    /<wa-comparison[^>]*>[\s\S]*?<\/wa-comparison>/g,
    (match) => {
      const placeholder = `<!--IMAGE_DIALOG_COMPARISON_${blocks.length}-->`;
      blocks.push(match);
      return placeholder;
    },
  );
  return [protectedContent, blocks];
}

function restore(content: string, blocks: string[], kind: string): string {
  let result = content;
  blocks.forEach((block, index) => {
    result = result.replaceAll(`<!--IMAGE_DIALOG_${kind}_${index}-->`, () => block);
  });
  return result;
}

function transformToDialog(
  altText: string,
  imageUrl: string,
  title: string | undefined,
  config: ImageDialogConfig,
): string {
  let width = extractWidthFromTitle(title);
  if (!width && config.defaultWidth) width = config.defaultWidth;

  const params = ['light-dismiss'];
  if (width) params.push(width);
  const paramsString = params.join(' ');

  const titleAttr =
    title && !title.includes('nodialog') && !containsWidth(title) ? ` title="${title}"` : '';
  const buttonContent = `<img src="${imageUrl}" alt="${altText}" style="cursor: zoom-in; display: block; width: 100%; height: auto;"${titleAttr} />`;

  const labelText = altText === '' ? 'Image' : altText;
  const dialogContent = `# ${labelText}\n\n<img src="${imageUrl}" alt="${altText}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;

  return [`???${paramsString}`, buttonContent, '>>>', dialogContent, '???'].join('\n');
}

function extractWidthFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const match = title.match(/(\d+(?:\.\d+)?(?:px|em|rem|vw|vh|%|ch))/);
  return match ? match[1] : undefined;
}

function containsWidth(title: string | undefined): boolean {
  if (!title) return false;
  return WIDTH_UNIT.test(title);
}

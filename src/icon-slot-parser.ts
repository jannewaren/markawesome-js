/**
 * Parses `icon:...` tokens from parameter strings for Web Awesome component
 * icon slots. Supports default slot mapping, explicit slot names, and slot name
 * remapping.
 *
 * Examples:
 *   "icon:gear"              -> default slot gets "gear"
 *   "icon:end:arrow-right"   -> "end" slot gets "arrow-right"
 *   "success icon:gear large" -> icons: { start: "gear" }, remaining: "success large"
 */

export interface SlotConfig {
  /** Default slot name for `icon:name` tokens (null = no default). */
  default: string | null;
  /** Allowed slot names for `icon:slot:name`. */
  slots: readonly string[];
  /** Optional mapping from short slot names to HTML slot attributes. */
  slotMap?: Record<string, string>;
}

export interface IconParseResult {
  icons: Record<string, string>;
  remaining: string;
}

// Ruby's String#split(sep, limit): the final part keeps any remaining
// delimiters, unlike JS String#split which drops the tail.
function splitLimit(str: string, sep: string, limit: number): string[] {
  const parts = str.split(sep);
  if (parts.length <= limit) return parts;
  return [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(sep)];
}

/** Parse icon tokens from a parameter string. */
export function parseIconSlots(
  paramsString: string | null | undefined,
  slotConfig: SlotConfig,
): IconParseResult {
  if (paramsString == null || paramsString.trim() === '') {
    return { icons: {}, remaining: '' };
  }

  const icons: Record<string, string> = {};
  const remainingTokens: string[] = [];
  const tokens = paramsString.trim().split(/\s+/);

  for (const token of tokens) {
    if (token.startsWith('icon:')) {
      const parts = splitLimit(token, ':', 3); // ["icon", slot_or_name, maybe_name]

      if (parts.length === 3) {
        // Explicit slot: icon:slot:name
        const slot = parts[1]!;
        const name = parts[2]!;
        if (slotConfig.slots.includes(slot)) icons[slot] = name;
      } else if (parts.length === 2 && slotConfig.default) {
        // Default slot: icon:name
        const name = parts[1]!;
        if (name !== '') icons[slotConfig.default] = name;
      }
    } else {
      remainingTokens.push(token);
    }
  }

  return { icons, remaining: remainingTokens.join(' ') };
}

/** Generate `<wa-icon>` HTML elements for parsed icons. */
export function iconsToHtml(
  iconsHash: Record<string, string>,
  slotMap?: Record<string, string>,
): string {
  return Object.entries(iconsHash)
    .map(([slot, name]) => {
      const htmlSlot = slotMap ? slotMap[slot] || slot : slot;
      if (htmlSlot === 'content') {
        return `<wa-icon name="${name}"></wa-icon>`;
      }
      return `<wa-icon slot="${htmlSlot}" name="${name}"></wa-icon>`;
    })
    .join('');
}

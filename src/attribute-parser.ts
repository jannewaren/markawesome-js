/**
 * Parses space-separated attributes from a parameter string.
 *
 * Supports multiple values per attribute with rightmost-wins semantics, which
 * makes flexible syntax like `"pill pulse brand"` order-independent.
 */

/** Schema: attribute name -> array of allowed token values. */
export type AttributeSchema = Record<string, readonly string[]>;

/** Parsed attributes: attribute name -> resolved token value. */
export type ParsedAttributes = Record<string, string>;

/**
 * Parse a space-separated parameter string into an attribute map.
 *
 * Tokens that don't match any attribute are silently ignored. For each token,
 * schema attributes are tested in declaration order and the first attribute
 * whose allowed values include the token claims it (rightmost-wins across
 * tokens for the same attribute).
 */
export function parseAttributes(
  paramsString: string | null | undefined,
  attributeSchema: AttributeSchema,
): ParsedAttributes {
  if (paramsString == null || paramsString.trim() === '') return {};

  const parsed: ParsedAttributes = {};
  const tokens = paramsString.trim().split(/\s+/);

  for (const token of tokens) {
    for (const [attrName, allowedValues] of Object.entries(attributeSchema)) {
      if (!allowedValues.includes(token)) continue;
      // Rightmost-wins: latest value for this attribute wins.
      parsed[attrName] = token;
      break; // Move to next token once we've matched it.
    }
  }

  return parsed;
}

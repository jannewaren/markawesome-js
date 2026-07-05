import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { VARIANTS, CALLOUT_ATTRIBUTES } from '../src/transformers/callout.js';
import { BADGE_ATTRIBUTES } from '../src/transformers/badge.js';
import { BUTTON_ATTRIBUTES } from '../src/transformers/button.js';
import { COMPONENT_ATTRIBUTES as TAG_ATTRS } from '../src/transformers/tag.js';
import { CARD_ATTRIBUTES } from '../src/transformers/card.js';
import { CONTAINER_ATTRIBUTES } from '../src/transformers/accordion.js';
import { COMPONENT_ATTRIBUTES as DETAILS_ATTRS } from '../src/transformers/details.js';
import { COMPONENT_ATTRIBUTES as TABS_ATTRS } from '../src/transformers/tabs.js';
import { POPOVER_ATTRIBUTES } from '../src/transformers/popover.js';
import { TOOLTIP_ATTRIBUTES } from '../src/transformers/tooltip.js';
import { COPY_BUTTON_ATTRIBUTES } from '../src/transformers/copy-button.js';
import { COMPONENT_ATTRIBUTES as RANDOM_ATTRS } from '../src/transformers/random-content.js';
import { RELATIVE_FORMATS, RELATIVE_NUMERICS, GRANULAR_ENUMS } from '../src/transformers/date.js';
import { ICON_ATTRIBUTE_SCHEMA } from '../src/icon-attributes.js';
import { CONTROLS_VALUES, PRELOAD_VALUES } from '../src/transformers/video.js';

/**
 * Guards the hand-curated enum lists our transformers accept against Web Awesome's
 * machine-readable Custom Elements Manifest. The fixture is a distilled, vendored
 * slice of WA's `custom-elements.json`, regenerated with `npm run update-wa-manifest
 * <version>` (never hand-edited). For each mapped (constant -> WA tag/attribute) it
 * fails on:
 *   DRIFT — a value we accept that WA no longer lists (alias-exempt), and
 *   GAP   — a WA value we do not expose (unless intentionally omitted).
 * Entries WA can't describe as an inline enum become a surfaced `it.skip`. See
 * markawesome's spec/webawesome_manifest_coverage_spec.rb — same scope + fixture.
 */

// The Web Awesome release these lists are curated against. Bump in lockstep with
// regenerating the fixture.
const WA_VERSION = '3.10.0';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/webawesome-enums.json', import.meta.url), 'utf8'),
) as {
  _meta: { webAwesomeVersion: string; source: string; allTags: string[] };
  [tag: string]: unknown;
};

const allTags = fixture._meta.allTags;

// WA enum values we knowingly do not expose, keyed 'wa-tag attr' => values.
// Starts empty: a new WA value fails the build until we adopt it or record it
// here with a one-line reason.
const INTENTIONALLY_OMITTED: Record<string, string[]> = {};

interface Entry {
  label: string;
  tag: string;
  // The WA attribute name, which can differ from our internal key (e.g.
  // copy-button placement -> tooltip-placement).
  attr: string;
  // The live transformer constant. ES module live bindings mean editing a
  // transformer is seen here.
  accepted: readonly string[];
  // Input-only values WA does not list but we deliberately accept.
  aliases?: string[];
}

const COVERAGE: Entry[] = [
  {
    label: 'callout variant',
    tag: 'wa-callout',
    attr: 'variant',
    accepted: VARIANTS,
    aliases: ['info'],
  },
  { label: 'callout size', tag: 'wa-callout', attr: 'size', accepted: CALLOUT_ATTRIBUTES.size! },
  {
    label: 'callout appearance',
    tag: 'wa-callout',
    attr: 'appearance',
    accepted: CALLOUT_ATTRIBUTES.appearance!,
  },

  { label: 'badge variant', tag: 'wa-badge', attr: 'variant', accepted: BADGE_ATTRIBUTES.variant! },
  {
    label: 'badge appearance',
    tag: 'wa-badge',
    attr: 'appearance',
    accepted: BADGE_ATTRIBUTES.appearance!,
  },
  {
    label: 'badge attention',
    tag: 'wa-badge',
    attr: 'attention',
    accepted: BADGE_ATTRIBUTES.attention!,
  },

  {
    label: 'button variant',
    tag: 'wa-button',
    attr: 'variant',
    accepted: BUTTON_ATTRIBUTES.variant!,
  },
  {
    label: 'button appearance',
    tag: 'wa-button',
    attr: 'appearance',
    accepted: BUTTON_ATTRIBUTES.appearance!,
  },
  { label: 'button size', tag: 'wa-button', attr: 'size', accepted: BUTTON_ATTRIBUTES.size! },
  { label: 'button target', tag: 'wa-button', attr: 'target', accepted: BUTTON_ATTRIBUTES.target! },

  { label: 'tag variant', tag: 'wa-tag', attr: 'variant', accepted: TAG_ATTRS.variant! },
  { label: 'tag appearance', tag: 'wa-tag', attr: 'appearance', accepted: TAG_ATTRS.appearance! },
  { label: 'tag size', tag: 'wa-tag', attr: 'size', accepted: TAG_ATTRS.size! },

  {
    label: 'card appearance',
    tag: 'wa-card',
    attr: 'appearance',
    accepted: CARD_ATTRIBUTES.appearance!,
  },
  {
    label: 'card orientation',
    tag: 'wa-card',
    attr: 'orientation',
    accepted: CARD_ATTRIBUTES.orientation!,
  },

  {
    label: 'accordion appearance',
    tag: 'wa-accordion',
    attr: 'appearance',
    accepted: CONTAINER_ATTRIBUTES.appearance!,
  },
  {
    label: 'accordion mode',
    tag: 'wa-accordion',
    attr: 'mode',
    accepted: CONTAINER_ATTRIBUTES.mode!,
  },
  {
    label: 'accordion icon-placement',
    tag: 'wa-accordion',
    attr: 'icon-placement',
    accepted: CONTAINER_ATTRIBUTES.icon_placement!,
  },

  {
    label: 'details appearance',
    tag: 'wa-details',
    attr: 'appearance',
    accepted: DETAILS_ATTRS.appearance!,
  },
  {
    label: 'details icon-placement',
    tag: 'wa-details',
    attr: 'icon-placement',
    accepted: DETAILS_ATTRS.icon_placement!,
  },

  {
    label: 'tabs placement',
    tag: 'wa-tab-group',
    attr: 'placement',
    accepted: TABS_ATTRS.placement!,
  },
  {
    label: 'tabs activation',
    tag: 'wa-tab-group',
    attr: 'activation',
    accepted: TABS_ATTRS.activation!,
  },

  {
    label: 'popover placement',
    tag: 'wa-popover',
    attr: 'placement',
    accepted: POPOVER_ATTRIBUTES.placement!,
  },

  {
    label: 'tooltip placement',
    tag: 'wa-tooltip',
    attr: 'placement',
    accepted: TOOLTIP_ATTRIBUTES.placement!,
  },

  {
    label: 'copy-button placement',
    tag: 'wa-copy-button',
    attr: 'tooltip-placement',
    accepted: COPY_BUTTON_ATTRIBUTES.placement!,
  },

  {
    label: 'random-content mode',
    tag: 'wa-random-content',
    attr: 'mode',
    accepted: RANDOM_ATTRS.mode!,
  },
  {
    label: 'random-content animation',
    tag: 'wa-random-content',
    attr: 'animation',
    accepted: RANDOM_ATTRS.animation!,
  },

  {
    label: 'relative-time format',
    tag: 'wa-relative-time',
    attr: 'format',
    accepted: RELATIVE_FORMATS,
  },
  {
    label: 'relative-time numeric',
    tag: 'wa-relative-time',
    attr: 'numeric',
    accepted: RELATIVE_NUMERICS,
  },

  {
    label: 'format-date weekday',
    tag: 'wa-format-date',
    attr: 'weekday',
    accepted: GRANULAR_ENUMS['weekday']!,
  },
  {
    label: 'format-date era',
    tag: 'wa-format-date',
    attr: 'era',
    accepted: GRANULAR_ENUMS['era']!,
  },
  {
    label: 'format-date year',
    tag: 'wa-format-date',
    attr: 'year',
    accepted: GRANULAR_ENUMS['year']!,
  },
  {
    label: 'format-date month',
    tag: 'wa-format-date',
    attr: 'month',
    accepted: GRANULAR_ENUMS['month']!,
  },
  {
    label: 'format-date day',
    tag: 'wa-format-date',
    attr: 'day',
    accepted: GRANULAR_ENUMS['day']!,
  },
  {
    label: 'format-date hour',
    tag: 'wa-format-date',
    attr: 'hour',
    accepted: GRANULAR_ENUMS['hour']!,
  },
  {
    label: 'format-date minute',
    tag: 'wa-format-date',
    attr: 'minute',
    accepted: GRANULAR_ENUMS['minute']!,
  },
  {
    label: 'format-date second',
    tag: 'wa-format-date',
    attr: 'second',
    accepted: GRANULAR_ENUMS['second']!,
  },
  {
    label: 'format-date hour-format',
    tag: 'wa-format-date',
    attr: 'hour-format',
    accepted: GRANULAR_ENUMS['hour-format']!,
  },
  {
    label: 'format-date time-zone-name',
    tag: 'wa-format-date',
    attr: 'time-zone-name',
    accepted: GRANULAR_ENUMS['time-zone-name']!,
  },

  // Skipped: WA declares these as freeform strings / opaque named types, not
  // inline enums, so the CEM can't check our richer hand-curated lists.
  { label: 'icon family', tag: 'wa-icon', attr: 'family', accepted: ICON_ATTRIBUTE_SCHEMA.family },
  {
    label: 'icon variant',
    tag: 'wa-icon',
    attr: 'variant',
    accepted: ICON_ATTRIBUTE_SCHEMA.variant,
  },
  {
    label: 'icon animation',
    tag: 'wa-icon',
    attr: 'animation',
    accepted: ICON_ATTRIBUTE_SCHEMA.animation,
  },
  { label: 'icon canvas', tag: 'wa-icon', attr: 'canvas', accepted: ICON_ATTRIBUTE_SCHEMA.canvas },

  // Skipped: wa-video is absent from WA core's manifest, so its enums can't be
  // checked here (lists manually verified).
  { label: 'video controls', tag: 'wa-video', attr: 'controls', accepted: CONTROLS_VALUES },
  { label: 'video preload', tag: 'wa-video', attr: 'preload', accepted: PRELOAD_VALUES },
];

// Set difference: values in `a` not present in any of `rest`.
const without = (a: readonly string[], ...rest: Array<readonly string[]>): string[] =>
  a.filter((x) => !rest.some((b) => b.includes(x)));

describe('Web Awesome manifest coverage', () => {
  it('pins the fixture to the expected Web Awesome version', () => {
    expect(fixture._meta.webAwesomeVersion).toBe(WA_VERSION);
  });

  for (const entry of COVERAGE) {
    const tagInManifest = allTags.includes(entry.tag);
    const waEnum = tagInManifest
      ? (fixture[entry.tag] as Record<string, string[]> | undefined)?.[entry.attr]
      : undefined;

    const title = `keeps ${entry.label} in sync with ${entry.tag} ${entry.attr}`;

    if (!tagInManifest) {
      it.skip(`${title} (${entry.tag} is not in the WA ${WA_VERSION} core manifest — list manually verified)`, () => {});
      continue;
    }
    if (waEnum === undefined) {
      it.skip(`${title} (${entry.tag} ${entry.attr} is not an inline enum in WA ${WA_VERSION} — list manually verified)`, () => {});
      continue;
    }

    it(title, () => {
      const aliases = entry.aliases ?? [];
      const omitted = INTENTIONALLY_OMITTED[`${entry.tag} ${entry.attr}`] ?? [];

      const drift = without(entry.accepted, waEnum, aliases);
      const gap = without(waEnum, entry.accepted, omitted);

      expect(drift, `DRIFT: ${entry.label} accepts ${JSON.stringify(drift)}`).toEqual([]);
      expect(gap, `GAP: WA ${entry.tag} ${entry.attr} lists ${JSON.stringify(gap)}`).toEqual([]);
    });
  }
});

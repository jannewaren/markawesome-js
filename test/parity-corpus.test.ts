import { describe, it, expect } from 'vitest';
import { process } from '../src/index.js';

/**
 * Cross-engine parity corpus. These inputs were verified to produce output that
 * is byte-identical to the markawesome Ruby engine (except for insignificant
 * whitespace inside markdown list rendering — Kramdown indents `<li>`, which is
 * cosmetic). The inline snapshots below lock that Ruby-matching behaviour so
 * future changes can't silently drift.
 */
const CORPUS: Array<{ name: string; input: string }> = [
  { name: 'callout', input: ':::info\nHello **world** and `code`\n:::' },
  {
    name: 'callout-attrs',
    input: ':::warning large filled-outlined icon:shield sharp regular bounce\nHeads up\n:::',
  },
  { name: 'badge', input: '!!!brand pill filled\n**New** stuff\n!!!' },
  {
    name: 'button-link',
    input: '%%%brand large icon:download _blank download\n[**Get** it](https://x.com/a.zip)\n%%%',
  },
  { name: 'tag-inline', input: 'Status: @@@ success icon:check Done @@@ ok' },
  { name: 'comparison', input: '|||50\n![Before](b.jpg)\n![After](a.jpg)\n|||' },
  { name: 'tooltip', input: '(((distance:5 API term >>> Application Programming Interface)))' },
  {
    name: 'popover-aligned-skidding-block',
    input: '&&&bottom-start skidding:12\nTrigger\n>>>\nBody\n&&&',
  },
  {
    name: 'popover-aligned-skidding-inline',
    input: 'Click &&&right-start skidding:-4 here >>> Aligned popover&&& now.',
  },
  {
    name: 'tooltip-aligned-skidding-inline',
    input: '(((right-end skidding:-4 API >>> Application Programming Interface)))',
  },
  {
    name: 'tooltip-aligned-skidding-block',
    input: ':::wa-tooltip bottom-end distance:8 skidding:12\nREST\n>>>\nRepresentational State Transfer\n:::',
  },
  {
    name: 'tabs-disabled',
    input:
      '++++++top\n+++ Tab 1\nContent 1\n+++\n+++ disabled Coming soon\nNot yet available.\n+++\n++++++',
  },
  { name: 'layout-flank', input: '::::flank start size:200px content:60% gap:m\nSide\n::::' },
  { name: 'date-inline-style', input: 'Published [[[2026-06-26 style:long]]].' },
  {
    name: 'date-inline-datetime',
    input: 'Released [[[2026-06-26T14:30:00Z style:medium time:short hour-format:24]]].',
  },
  { name: 'date-inline-granular', input: '[[[2026-06-26 style:full month:short lang:fr]]]' },
  { name: 'date-relative', input: 'Updated [[[relative 2026-06-20 format:short numeric:always]]].' },
  { name: 'date-relative-sync', input: 'Live [[[relative 2026-06-20 sync]]]' },
  { name: 'date-block', input: ':::wa-format-date 2026-06-26 style:full lang:fr\n:::' },
];

describe('parity corpus (locked to Ruby-matching output)', () => {
  for (const { name, input } of CORPUS) {
    it(name, () => {
      expect(process(input, { imageDialog: { defaultWidth: '90vh' } })).toMatchSnapshot();
    });
  }
});

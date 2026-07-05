import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/date.js';

/**
 * Exact-string assertions mirroring the Ruby `spec/date_transformer_spec.rb`.
 * The expected strings are the Ruby engine's output (verified byte-for-byte via
 * the parity corpus), so this doubles as a cross-engine parity guard.
 */
describe('DateTransformer.transform', () => {
  describe('format-date (inline [[[ ]]])', () => {
    it('defaults a bare date to style:long', () => {
      expect(transform('[[[2026-06-26]]]')).toBe(
        '<wa-format-date date="2026-06-26" year="numeric" month="long" day="numeric"></wa-format-date>',
      );
    });

    it('expands style:short', () => {
      expect(transform('[[[2026-06-26 style:short]]]')).toBe(
        '<wa-format-date date="2026-06-26" year="2-digit" month="numeric" day="numeric"></wa-format-date>',
      );
    });

    it('expands style:full with a weekday', () => {
      expect(transform('[[[2026-06-26 style:full]]]')).toBe(
        '<wa-format-date date="2026-06-26" weekday="long" year="numeric" month="long" day="numeric"></wa-format-date>',
      );
    });

    it('expands time:short to hour/minute only', () => {
      expect(transform('[[[2026-06-26T14:30:00Z time:short]]]')).toBe(
        '<wa-format-date date="2026-06-26T14:30:00Z" hour="numeric" minute="numeric"></wa-format-date>',
      );
    });

    it('expands time:long to add a short time-zone name', () => {
      expect(transform('[[[2026-06-26T14:30:00Z time:long]]]')).toContain(
        'second="numeric" time-zone-name="short"',
      );
    });

    it('combines style + time presets and hour-format', () => {
      expect(transform('[[[2026-06-26T14:30:00Z style:medium time:short hour-format:24]]]')).toBe(
        '<wa-format-date date="2026-06-26T14:30:00Z" year="numeric" month="short" day="numeric" hour="numeric" minute="numeric" hour-format="24"></wa-format-date>',
      );
    });

    it('lets a granular token override a preset', () => {
      expect(transform('[[[2026-06-26 style:long month:short]]]')).toBe(
        '<wa-format-date date="2026-06-26" year="numeric" month="short" day="numeric"></wa-format-date>',
      );
    });

    it('emits a runtime-now component when no date token is present', () => {
      const result = transform('[[[style:long]]]');
      expect(result).toBe(
        '<wa-format-date year="numeric" month="long" day="numeric"></wa-format-date>',
      );
      expect(result).not.toContain('date=');
    });

    it('maps lang: and locale: to the lang attribute', () => {
      expect(transform('[[[2026-06-26 style:long lang:fr]]]')).toContain('lang="fr"');
      expect(transform('[[[2026-06-26 locale:fr-CA]]]')).toContain('lang="fr-CA"');
    });

    it('passes a time-zone value through', () => {
      expect(transform('[[[2026-06-26T14:30:00Z time:short time-zone:America/New_York]]]')).toContain(
        'time-zone="America/New_York"',
      );
    });
  });

  describe('relative-time (inline relative flag)', () => {
    it('switches to <wa-relative-time>', () => {
      expect(transform('[[[relative 2026-06-20]]]')).toBe(
        '<wa-relative-time date="2026-06-20"></wa-relative-time>',
      );
    });

    it('emits non-default format and numeric values', () => {
      expect(transform('[[[relative 2026-06-20 format:short numeric:always]]]')).toBe(
        '<wa-relative-time date="2026-06-20" format="short" numeric="always"></wa-relative-time>',
      );
    });

    it('omits the default format:long and numeric:auto', () => {
      expect(transform('[[[relative 2026-06-20 format:long numeric:auto]]]')).toBe(
        '<wa-relative-time date="2026-06-20"></wa-relative-time>',
      );
    });

    it('emits the sync boolean flag', () => {
      expect(transform('[[[relative 2026-06-20 sync]]]')).toBe(
        '<wa-relative-time date="2026-06-20" sync></wa-relative-time>',
      );
    });

    it('ignores date/style tokens in relative mode', () => {
      expect(transform('[[[relative 2026-06-20 style:full month:short]]]')).toBe(
        '<wa-relative-time date="2026-06-20"></wa-relative-time>',
      );
    });
  });

  describe('block forms', () => {
    it('transforms a format-date block (mode from the selector)', () => {
      expect(transform(':::wa-format-date 2026-06-26 style:full lang:fr\n:::')).toBe(
        '<wa-format-date date="2026-06-26" weekday="long" year="numeric" month="long" day="numeric" lang="fr"></wa-format-date>',
      );
    });

    it('transforms a relative-time block (mode from the selector)', () => {
      expect(transform(':::wa-relative-time 2026-06-20 sync\n:::')).toBe(
        '<wa-relative-time date="2026-06-20" sync></wa-relative-time>',
      );
    });

    it('defaults an empty format-date block to a runtime-now long date', () => {
      expect(transform(':::wa-format-date\n:::')).toBe(
        '<wa-format-date year="numeric" month="long" day="numeric"></wa-format-date>',
      );
    });
  });

  describe('edge cases', () => {
    it('transforms multiple timestamps on one line', () => {
      const result = transform('A [[[2026-01-01]]] and B [[[2026-12-31]]].');
      expect(result).toContain('date="2026-01-01"');
      expect(result).toContain('date="2026-12-31"');
      expect((result.match(/<wa-format-date/g) ?? []).length).toBe(2);
    });

    it('drops invalid/unknown tokens and falls back to style:long', () => {
      expect(transform('[[[2026-06-26 style:bogus month:huge color:red]]]')).toBe(
        '<wa-format-date date="2026-06-26" year="numeric" month="long" day="numeric"></wa-format-date>',
      );
    });

    it('does not treat an inherited prototype key as a valid style', () => {
      // `style:constructor` must not reach Object.prototype.constructor.
      expect(transform('[[[2026-06-26 style:constructor]]]')).toBe(
        '<wa-format-date date="2026-06-26" year="numeric" month="long" day="numeric"></wa-format-date>',
      );
    });

    it('does not match across newlines', () => {
      const input = '[[[2026-06-26\nstyle:long]]]';
      expect(transform(input)).toBe(input);
    });
  });
});

describe('DateTransformer.renderAsMarkdown', () => {
  // Plain markdown has no locale formatting, so each timestamp degrades to its
  // raw ISO date string (empty when omitted). Goldens generated from the Ruby
  // DateTransformer.render_as_markdown.
  it('degrades an inline styled date to its raw ISO string', () => {
    expect(renderAsMarkdown('Published [[[2026-06-26 style:long]]].')).toBe('Published 2026-06-26.');
  });

  it('degrades an inline datetime to its raw ISO string', () => {
    expect(renderAsMarkdown('Released [[[2026-06-26T14:30:00Z style:medium]]].')).toBe(
      'Released 2026-06-26T14:30:00Z.',
    );
  });

  it('degrades an inline relative timestamp to its raw date', () => {
    expect(renderAsMarkdown('Updated [[[relative 2026-06-20 format:short]]].')).toBe(
      'Updated 2026-06-20.',
    );
  });

  it('degrades a dateless inline timestamp to an empty string', () => {
    expect(renderAsMarkdown('[[[style:long]]]')).toBe('');
  });

  it('degrades the block format-date syntax to its raw date', () => {
    expect(renderAsMarkdown(':::wa-format-date 2026-06-26 style:full lang:fr\n:::')).toBe(
      '2026-06-26',
    );
  });

  it('degrades the block relative-time syntax to its raw date', () => {
    expect(renderAsMarkdown(':::wa-relative-time 2026-06-20 format:short\n:::')).toBe('2026-06-20');
  });
});

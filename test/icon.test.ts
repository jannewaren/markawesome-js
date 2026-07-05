import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/icon.js';

describe('IconTransformer.transform', () => {
  describe('primary syntax ($$$)', () => {
    it('basic', () => {
      expect(transform('Click the $$$settings icon to configure.')).toBe(
        'Click the <wa-icon name="settings"></wa-icon> icon to configure.',
      );
    });
    it('hyphenated', () => {
      expect(transform('Use the $$$user-circle icon.')).toBe(
        'Use the <wa-icon name="user-circle"></wa-icon> icon.',
      );
    });
    it('underscored', () => {
      expect(transform('Click $$$home_page for navigation.')).toBe(
        'Click <wa-icon name="home_page"></wa-icon> for navigation.',
      );
    });
    it('multiple in one line', () => {
      expect(transform('Icons: $$$home, $$$settings, and $$$user.')).toBe(
        'Icons: <wa-icon name="home"></wa-icon>, <wa-icon name="settings"></wa-icon>, and <wa-icon name="user"></wa-icon>.',
      );
    });
    it('works within markdown formatting', () => {
      expect(transform('Click **$$$settings** to configure or *$$$home* to navigate.')).toBe(
        'Click **<wa-icon name="settings"></wa-icon>** to configure or *<wa-icon name="home"></wa-icon>* to navigate.',
      );
    });
    it('ignores invalid icon names with spaces', () => {
      expect(transform('Invalid $$$icon name with spaces.')).toBe(
        'Invalid $$$icon name with spaces.',
      );
    });
    it('ignores incomplete syntax', () => {
      expect(transform('Incomplete $$$ syntax.')).toBe('Incomplete $$$ syntax.');
    });
    it('preserves existing wa-icon elements', () => {
      expect(transform('Existing <wa-icon name="test"></wa-icon> and new $$$home icon.')).toBe(
        'Existing <wa-icon name="test"></wa-icon> and new <wa-icon name="home"></wa-icon> icon.',
      );
    });
    it('special characters around icons', () => {
      expect(transform('Before($$$home)after and [before$$$settings]after.')).toBe(
        'Before(<wa-icon name="home"></wa-icon>)after and [before<wa-icon name="settings"></wa-icon>]after.',
      );
    });
    it('leaves $$$ inline icons name-only with trailing tokens', () => {
      expect(transform('$$$heart solid')).toBe('<wa-icon name="heart"></wa-icon> solid');
    });
  });

  describe('alternative syntax (:::wa-icon)', () => {
    it('basic', () => {
      expect(transform('Click the :::wa-icon settings\n::: icon to configure.\n')).toBe(
        'Click the <wa-icon name="settings"></wa-icon> icon to configure.\n',
      );
    });
    it('family', () => {
      expect(transform(':::wa-icon star sharp\n:::')).toBe(
        '<wa-icon name="star" family="sharp"></wa-icon>',
      );
    });
    it('variant', () => {
      expect(transform(':::wa-icon star solid\n:::')).toBe(
        '<wa-icon name="star" variant="solid"></wa-icon>',
      );
    });
    it('animation', () => {
      expect(transform(':::wa-icon star spin\n:::')).toBe(
        '<wa-icon name="star" animation="spin"></wa-icon>',
      );
    });
    it('canvas', () => {
      expect(transform(':::wa-icon star roomy\n:::')).toBe(
        '<wa-icon name="star" canvas="roomy"></wa-icon>',
      );
    });
    it('semibold variant (WA 3.10.0)', () => {
      expect(transform(':::wa-icon star semibold\n:::')).toBe(
        '<wa-icon name="star" variant="semibold"></wa-icon>',
      );
    });
    it('WA 3.10.0 family', () => {
      expect(transform(':::wa-icon star jelly\n:::')).toBe(
        '<wa-icon name="star" family="jelly"></wa-icon>',
      );
    });
    it('WA 3.10.0 animation', () => {
      expect(transform(':::wa-icon star wag\n:::')).toBe(
        '<wa-icon name="star" animation="wag"></wa-icon>',
      );
    });
    it('family, variant, animation, canvas in deterministic order', () => {
      expect(transform(':::wa-icon star sharp semibold wag roomy\n:::')).toBe(
        '<wa-icon name="star" family="sharp" variant="semibold" animation="wag" canvas="roomy"></wa-icon>',
      );
    });
    it('deterministic order with label', () => {
      expect(transform(':::wa-icon star spin solid sharp\nFeatured\n:::')).toBe(
        '<wa-icon name="star" family="sharp" variant="solid" animation="spin" label="Featured"></wa-icon>',
      );
    });
    it('rightmost-wins', () => {
      expect(transform(':::wa-icon star thin solid\n:::')).toBe(
        '<wa-icon name="star" variant="solid"></wa-icon>',
      );
    });
    it('drops unknown tokens', () => {
      expect(transform(':::wa-icon star bogus spin\n:::')).toBe(
        '<wa-icon name="star" animation="spin"></wa-icon>',
      );
    });
    it('collapses multi-line body label', () => {
      expect(transform(':::wa-icon bell shake\nFirst line\nSecond line\n:::')).toBe(
        '<wa-icon name="bell" animation="shake" label="First line Second line"></wa-icon>',
      );
    });
    it('HTML-escapes the label', () => {
      expect(transform(':::wa-icon flag\nit\'s <a> & "b"\n:::')).toBe(
        '<wa-icon name="flag" label="it&#39;s &lt;a&gt; &amp; &quot;b&quot;"></wa-icon>',
      );
    });
    it('bare name for empty body', () => {
      expect(transform(':::wa-icon settings\n:::')).toBe('<wa-icon name="settings"></wa-icon>');
    });
    it('not transformed inside fenced code block', () => {
      const content = '```\n:::wa-icon star spin\n:::\n```';
      expect(transform(content)).toBe(content);
    });
  });

  describe('code blocks', () => {
    it('ignores icons inside inline code', () => {
      const result = transform('Normal $$$home and `code with $$$settings` and more $$$user.');
      expect(result).toContain('<wa-icon name="home"></wa-icon>');
      expect(result).toContain('<wa-icon name="user"></wa-icon>');
      expect(result).toContain('`code with $$$settings`');
    });
  });

  describe('edge cases', () => {
    it('empty content', () => {
      expect(transform('')).toBe('');
    });
    it('no icons', () => {
      expect(transform('This is regular content without any icons.')).toBe(
        'This is regular content without any icons.',
      );
    });
  });
});

describe('IconTransformer.renderAsMarkdown', () => {
  it('drops primary-syntax icons entirely (leaving surrounding whitespace)', () => {
    expect(renderAsMarkdown('Check $$$gear and $$$home-line.')).toBe('Check  and .');
  });

  it('preserves icon-like syntax inside fenced code blocks', () => {
    const md = '```\n$$$keep-me\n```';
    expect(renderAsMarkdown(md)).toBe(md);
  });

  it('drops the :::wa-icon alternative syntax', () => {
    expect(renderAsMarkdown(':::wa-icon gear\n:::').trim()).toBe('');
  });

  it('degrades a labeled block to its label text', () => {
    expect(renderAsMarkdown(':::wa-icon heart solid\nAdd to favorites\n:::').trim()).toBe(
      'Add to favorites',
    );
  });

  it('still drops an unlabeled enriched block', () => {
    expect(renderAsMarkdown(':::wa-icon star spin\n:::').trim()).toBe('');
  });
});

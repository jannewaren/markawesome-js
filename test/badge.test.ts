import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/badge.js';

describe('BadgeTransformer.transform', () => {
  describe('basic badge syntax', () => {
    it('transforms simple badge without attributes', () => {
      expect(transform('!!!\nNew\n!!!')).toBe('<wa-badge>New</wa-badge>');
    });

    it('transforms badge with brand variant', () => {
      expect(transform('!!!brand\n5\n!!!')).toBe('<wa-badge variant="brand">5</wa-badge>');
    });

    it('transforms badge with success variant', () => {
      expect(transform('!!!success\nOnline\n!!!')).toBe(
        '<wa-badge variant="success">Online</wa-badge>',
      );
    });

    it('transforms badge with warning variant', () => {
      expect(transform('!!!warning\n3 pending\n!!!')).toBe(
        '<wa-badge variant="warning">3 pending</wa-badge>',
      );
    });

    it('transforms badge with danger variant', () => {
      expect(transform('!!!danger\nError\n!!!')).toBe('<wa-badge variant="danger">Error</wa-badge>');
    });

    it('transforms badge with neutral variant', () => {
      expect(transform('!!!neutral\nDraft\n!!!')).toBe('<wa-badge variant="neutral">Draft</wa-badge>');
    });
  });

  describe('appearance attribute', () => {
    it('accent', () => {
      expect(transform('!!!brand accent\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="accent">Badge</wa-badge>',
      );
    });
    it('filled', () => {
      expect(transform('!!!brand filled\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled">Badge</wa-badge>',
      );
    });
    it('outlined', () => {
      expect(transform('!!!brand outlined\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="outlined">Badge</wa-badge>',
      );
    });
    it('filled-outlined', () => {
      expect(transform('!!!brand filled-outlined\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled-outlined">Badge</wa-badge>',
      );
    });
  });

  describe('pill attribute', () => {
    it('pill flag', () => {
      expect(transform('!!!brand pill\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" pill>Badge</wa-badge>',
      );
    });
    it('pill and appearance', () => {
      expect(transform('!!!brand pill filled\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled" pill>Badge</wa-badge>',
      );
    });
  });

  describe('attention attribute', () => {
    it('none', () => {
      expect(transform('!!!brand none\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" attention="none">Badge</wa-badge>',
      );
    });
    it('pulse', () => {
      expect(transform('!!!brand pulse\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" attention="pulse">Badge</wa-badge>',
      );
    });
    it('bounce', () => {
      expect(transform('!!!brand bounce\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" attention="bounce">Badge</wa-badge>',
      );
    });
  });

  describe('multiple attributes', () => {
    it('combines variant, appearance, and attention', () => {
      expect(transform('!!!brand filled pulse\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled" attention="pulse">Badge</wa-badge>',
      );
    });
    it('combines all attributes', () => {
      expect(transform('!!!danger outlined pill bounce\nAlert\n!!!')).toBe(
        '<wa-badge variant="danger" appearance="outlined" attention="bounce" pill>Alert</wa-badge>',
      );
    });
    it('handles attributes in any order', () => {
      expect(transform('!!!pill brand filled\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled" pill>Badge</wa-badge>',
      );
    });
    it('rightmost-wins for variant conflicts', () => {
      expect(transform('!!!brand danger\nBadge\n!!!')).toBe(
        '<wa-badge variant="danger">Badge</wa-badge>',
      );
    });
    it('rightmost-wins for appearance conflicts', () => {
      expect(transform('!!!brand filled outlined\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="outlined">Badge</wa-badge>',
      );
    });
    it('rightmost-wins for attention conflicts', () => {
      expect(transform('!!!brand pulse bounce\nBadge\n!!!')).toBe(
        '<wa-badge variant="brand" attention="bounce">Badge</wa-badge>',
      );
    });
  });

  describe('alternative badge syntax', () => {
    it('simple', () => {
      expect(transform(':::wa-badge\nNew\n:::')).toBe('<wa-badge>New</wa-badge>');
    });
    it('brand variant', () => {
      expect(transform(':::wa-badge brand\n5\n:::')).toBe('<wa-badge variant="brand">5</wa-badge>');
    });
    it('multiple attributes', () => {
      expect(transform(':::wa-badge brand filled pill\nBadge\n:::')).toBe(
        '<wa-badge variant="brand" appearance="filled" pill>Badge</wa-badge>',
      );
    });
    it('any order', () => {
      expect(transform(':::wa-badge pill brand filled\nBadge\n:::')).toBe(
        '<wa-badge variant="brand" appearance="filled" pill>Badge</wa-badge>',
      );
    });
  });

  describe('markdown content', () => {
    it('handles markdown formatting within badges', () => {
      expect(transform('!!!brand\n**Bold** text\n!!!')).toBe(
        '<wa-badge variant="brand"><strong>Bold</strong>&nbsp;text</wa-badge>',
      );
    });
    it('handles links within badges', () => {
      expect(transform('!!!\n[Link](http://example.com)\n!!!')).toBe(
        '<wa-badge><a href="http://example.com">Link</a></wa-badge>',
      );
    });
    it('removes paragraph tags for simple text', () => {
      expect(transform('!!!\nSimple text\n!!!')).toBe('<wa-badge>Simple text</wa-badge>');
    });
    it('markdown with multiple attributes', () => {
      expect(transform('!!!brand filled\n**Bold** text\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled"><strong>Bold</strong>&nbsp;text</wa-badge>',
      );
    });
  });

  describe('multiple badges', () => {
    it('transforms multiple badges in content', () => {
      const input = `!!!brand
First
!!!

Some content here.

!!!success pill
Second
!!!
`;
      const result = transform(input);
      expect(result).toContain('<wa-badge variant="brand">First</wa-badge>');
      expect(result).toContain('<wa-badge variant="success" pill>Second</wa-badge>');
      expect(result).toContain('Some content here.');
    });
  });

  describe('invalid syntax', () => {
    it('ignores unrecognized attribute values', () => {
      expect(transform('!!!invalid\nContent\n!!!')).toBe('<wa-badge>Content</wa-badge>');
    });
    it('does not transform incomplete badge syntax', () => {
      expect(transform('!!!\nContent without closing')).toBe('!!!\nContent without closing');
    });
    it('does not transform inline ! symbols', () => {
      expect(transform('This has !!! in the middle of text')).toBe(
        'This has !!! in the middle of text',
      );
    });
  });

  describe('whitespace handling', () => {
    it('trims whitespace from badge content', () => {
      expect(transform('!!!\n  Spaced content  \n!!!')).toBe('<wa-badge>Spaced content</wa-badge>');
    });
    it('handles multiline content', () => {
      expect(transform('!!!\nLine one\nLine two\n!!!')).toBe(
        '<wa-badge>Line one\nLine two</wa-badge>',
      );
    });
    it('handles whitespace in parameters', () => {
      expect(transform('!!!  brand   filled   pill  \nContent\n!!!')).toBe(
        '<wa-badge variant="brand" appearance="filled" pill>Content</wa-badge>',
      );
    });
  });
});

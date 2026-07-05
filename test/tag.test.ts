import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/tag.js';

describe('TagTransformer.transform', () => {
  describe('block syntax', () => {
    it('simple', () => {
      expect(transform('@@@\nBasic tag\n@@@')).toBe('<wa-tag>Basic tag</wa-tag>');
    });
    it('brand variant', () => {
      expect(transform('@@@brand\nVersion 2.0\n@@@')).toBe(
        '<wa-tag variant="brand">Version 2.0</wa-tag>',
      );
    });
    it('with-remove', () => {
      expect(transform('@@@danger with-remove\nTag\n@@@')).toBe(
        '<wa-tag variant="danger" with-remove>Tag</wa-tag>',
      );
    });
    it('all attributes', () => {
      expect(transform('@@@success filled large pill with-remove\nTag\n@@@')).toBe(
        '<wa-tag variant="success" appearance="filled" size="large" pill with-remove>Tag</wa-tag>',
      );
    });
    it('any order', () => {
      expect(transform('@@@pill large brand filled\nTag\n@@@')).toBe(
        '<wa-tag variant="brand" appearance="filled" size="large" pill>Tag</wa-tag>',
      );
    });
  });

  describe('icons (content slot, no slot attribute)', () => {
    it('icon block', () => {
      expect(transform('@@@brand icon:check\nApproved\n@@@')).toBe(
        '<wa-tag variant="brand"><wa-icon name="check"></wa-icon>Approved</wa-tag>',
      );
    });
    it('icon has no slot attribute', () => {
      const result = transform('@@@icon:gear\nSettings\n@@@');
      expect(result).toContain('<wa-icon name="gear"></wa-icon>');
      expect(result).not.toContain('slot=');
    });
  });

  describe('inline syntax', () => {
    it('inline tag with icon', () => {
      expect(transform('Status: @@@ success icon:check Done @@@')).toBe(
        'Status: <wa-tag variant="success"><wa-icon name="check"></wa-icon>Done</wa-tag>',
      );
    });
    it('inline tag with icon and pill', () => {
      expect(transform('Check @@@ brand icon:star pill Featured @@@ here')).toBe(
        'Check <wa-tag variant="brand" pill><wa-icon name="star"></wa-icon>Featured</wa-tag> here',
      );
    });
  });

  describe('markdown content', () => {
    it('bold (no nbsp)', () => {
      expect(transform('@@@success\n**Bold** text\n@@@')).toBe(
        '<wa-tag variant="success"><strong>Bold</strong> text</wa-tag>',
      );
    });
    it('links', () => {
      expect(transform('@@@brand\n[Link](https://example.com)\n@@@')).toBe(
        '<wa-tag variant="brand"><a href="https://example.com">Link</a></wa-tag>',
      );
    });
  });

  describe('invalid syntax', () => {
    it('invalid tokens become params (dropped) when no content', () => {
      expect(transform('@@@invalid\nText\n@@@')).toBe('<wa-tag>Text</wa-tag>');
    });
    it('does not transform incomplete', () => {
      expect(transform('@@@success\nIncomplete tag')).toBe('@@@success\nIncomplete tag');
    });
    it('does not transform inline @ symbols', () => {
      expect(transform('Contact us @@@example.com for help')).toBe(
        'Contact us @@@example.com for help',
      );
    });
  });
});

describe('TagTransformer.renderAsMarkdown', () => {
  it('renders a block tag as bold', () => {
    expect(renderAsMarkdown('@@@\nLabel\n@@@')).toBe('**Label**');
  });

  it('drops attribute tokens when rendering an inline tag', () => {
    expect(renderAsMarkdown('Check @@@ brand Beta @@@ out')).toBe('Check **Beta** out');
  });

  it('handles alternative :::wa-tag syntax', () => {
    expect(renderAsMarkdown(':::wa-tag\nLabel\n:::')).toBe('**Label**');
  });
});

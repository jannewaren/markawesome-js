import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/button.js';

describe('ButtonTransformer.transform', () => {
  describe('link buttons', () => {
    it('simple link button', () => {
      expect(transform('%%%\n[Click here](https://example.com)\n%%%')).toBe(
        '<wa-button href="https://example.com">Click here</wa-button>',
      );
    });
    it('with brand variant', () => {
      expect(transform('%%%brand\n[Download](https://example.com/download)\n%%%')).toBe(
        '<wa-button variant="brand" href="https://example.com/download">Download</wa-button>',
      );
    });
    it('alternative syntax', () => {
      expect(transform(':::wa-button\n[Click here](https://example.com)\n:::')).toBe(
        '<wa-button href="https://example.com">Click here</wa-button>',
      );
    });
    it('bold text in link', () => {
      expect(transform('%%%brand\n[**Download** Now](https://example.com)\n%%%')).toBe(
        '<wa-button variant="brand" href="https://example.com"><strong>Download</strong>&nbsp;Now</wa-button>',
      );
    });
    it('complex URLs', () => {
      expect(
        transform('%%%brand\n[Query Link](https://example.com/path?param=value&other=123)\n%%%'),
      ).toBe(
        '<wa-button variant="brand" href="https://example.com/path?param=value&other=123">Query Link</wa-button>',
      );
    });
  });

  describe('regular buttons', () => {
    it('simple', () => {
      expect(transform('%%%\nClick me\n%%%')).toBe('<wa-button>Click me</wa-button>');
    });
    it('brand variant', () => {
      expect(transform('%%%brand\nSubmit Form\n%%%')).toBe(
        '<wa-button variant="brand">Submit Form</wa-button>',
      );
    });
    it('bold text', () => {
      expect(transform('%%%brand\n**Submit** Form\n%%%')).toBe(
        '<wa-button variant="brand"><strong>Submit</strong>&nbsp;Form</wa-button>',
      );
    });
    it('multiline content', () => {
      expect(transform('%%%\nLine one\nLine two\n%%%')).toBe(
        '<wa-button>Line one\nLine two</wa-button>',
      );
    });
    it('does not confuse partial link syntax', () => {
      expect(transform('%%%\n[Incomplete link\n%%%')).toBe('<wa-button>[Incomplete link</wa-button>');
    });
  });

  describe('attributes', () => {
    it('appearance', () => {
      expect(transform('%%%accent\nClick me\n%%%')).toBe(
        '<wa-button appearance="accent">Click me</wa-button>',
      );
    });
    it('size', () => {
      expect(transform('%%%large\nClick me\n%%%')).toBe('<wa-button size="large">Click me</wa-button>');
    });
    it('all attributes', () => {
      expect(transform('%%%danger filled large pill caret loading disabled\nClick me\n%%%')).toBe(
        '<wa-button variant="danger" appearance="filled" size="large" pill with-caret loading disabled>Click me</wa-button>',
      );
    });
    it('rightmost-wins for size', () => {
      expect(transform('%%%small large\nClick me\n%%%')).toBe(
        '<wa-button size="large">Click me</wa-button>',
      );
    });
  });

  describe('icons', () => {
    it('start icon (default)', () => {
      expect(transform('%%%icon:download\nDownload File\n%%%')).toBe(
        '<wa-button><wa-icon slot="start" name="download"></wa-icon>Download File</wa-button>',
      );
    });
    it('end icon', () => {
      expect(transform('%%%icon:end:arrow-right\nNext\n%%%')).toBe(
        '<wa-button><wa-icon slot="end" name="arrow-right"></wa-icon>Next</wa-button>',
      );
    });
    it('icon with link button', () => {
      expect(transform('%%%brand icon:download\n[Download](https://example.com/file.zip)\n%%%')).toBe(
        '<wa-button variant="brand" href="https://example.com/file.zip"><wa-icon slot="start" name="download"></wa-icon>Download</wa-button>',
      );
    });
  });

  describe('target/rel/download', () => {
    it('emits target and auto rel', () => {
      expect(transform('%%%brand _blank\n[Open](https://example.com)\n%%%')).toBe(
        '<wa-button variant="brand" href="https://example.com" target="_blank" rel="noopener noreferrer">Open</wa-button>',
      );
    });
    it('no rel for non-blank target', () => {
      expect(transform('%%%_self\n[Open](https://example.com)\n%%%')).toBe(
        '<wa-button href="https://example.com" target="_self">Open</wa-button>',
      );
    });
    it('rightmost-wins target suppresses rel', () => {
      expect(transform('%%%_blank _self\n[Open](https://example.com)\n%%%')).toBe(
        '<wa-button href="https://example.com" target="_self">Open</wa-button>',
      );
    });
    it('bare download', () => {
      expect(transform('%%%brand download\n[Get file](/files/report.pdf)\n%%%')).toBe(
        '<wa-button variant="brand" href="/files/report.pdf" download>Get file</wa-button>',
      );
    });
    it('combines component attrs, icon, target, download', () => {
      expect(
        transform('%%%brand large icon:download _blank download\n[Get it](https://example.com/x.zip)\n%%%'),
      ).toBe(
        '<wa-button variant="brand" size="large" href="https://example.com/x.zip" target="_blank" rel="noopener noreferrer" download><wa-icon slot="start" name="download"></wa-icon>Get it</wa-button>',
      );
    });
    it('ignores target on non-link button', () => {
      expect(transform('%%%brand _blank\nClick me\n%%%')).toBe(
        '<wa-button variant="brand">Click me</wa-button>',
      );
    });
  });

  describe('invalid syntax', () => {
    it('ignores invalid attribute names', () => {
      expect(transform('%%%invalid\nContent\n%%%')).toBe('<wa-button>Content</wa-button>');
    });
    it('does not transform incomplete syntax', () => {
      expect(transform('%%%\nContent without closing')).toBe('%%%\nContent without closing');
    });
    it('does not transform inline % symbols', () => {
      expect(transform('This has %%% in the middle of text')).toBe(
        'This has %%% in the middle of text',
      );
    });
  });
});

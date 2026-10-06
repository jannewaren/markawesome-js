import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/divider.js';

describe('DividerTransformer.transform', () => {
  it('centered label (exact)', () => {
    expect(transform('--- or ---')).toBe('<wa-divider>or</wa-divider>');
  });

  it('maps start/center/end to label-placement', () => {
    expect(transform('--- start Release notes ---')).toBe(
      '<wa-divider label-placement="start">Release notes</wa-divider>',
    );
    expect(transform('--- center Mid ---')).toBe('<wa-divider label-placement="center">Mid</wa-divider>');
    expect(transform('--- end Fin ---')).toBe('<wa-divider label-placement="end">Fin</wa-divider>');
  });

  it('puts an icon before the label, separated by a space', () => {
    expect(transform('--- end icon:star New ---')).toBe(
      '<wa-divider label-placement="end"><wa-icon name="star"></wa-icon> New</wa-divider>',
    );
  });

  it('supports an icon-only label', () => {
    expect(transform('--- icon:quote-left ---')).toBe(
      '<wa-divider><wa-icon name="quote-left"></wa-icon></wa-divider>',
    );
  });

  it('maps vertical/horizontal to orientation, emitted before label-placement', () => {
    expect(transform('--- vertical vs ---')).toBe('<wa-divider orientation="vertical">vs</wa-divider>');
    expect(transform('--- start horizontal Notes ---')).toBe(
      '<wa-divider orientation="horizontal" label-placement="start">Notes</wa-divider>',
    );
  });

  it('uses rightmost-wins among the leading tokens', () => {
    expect(transform('--- start end icon:a icon:b X ---')).toBe(
      '<wa-divider label-placement="end"><wa-icon name="b"></wa-icon> X</wa-divider>',
    );
  });

  it('only consumes tokens at the start of the label', () => {
    expect(transform('--- Read from start to end ---')).toBe(
      '<wa-divider>Read from start to end</wa-divider>',
    );
  });

  it('renders the label as inline Markdown and escapes text', () => {
    expect(transform('--- **Bold** & `code` ---')).toBe(
      '<wa-divider><strong>Bold</strong> &amp; <code>code</code></wa-divider>',
    );
  });

  it('transforms a divider in the middle of a document', () => {
    expect(transform('Before\n\n--- or ---\n\nAfter')).toBe('Before\n\n<wa-divider>or</wa-divider>\n\nAfter');
  });

  it('tolerates trailing whitespace after the closing dashes', () => {
    expect(transform('--- or ---  \nNext')).toBe('<wa-divider>or</wa-divider>\nNext');
  });

  for (const input of [
    '---',
    '--- ---',
    '---  ---',
    '--- | ---',
    '--- | :---: | ---:',
    '---- x ----',
    '--- x',
    'x --- y ---',
    '  --- indented ---',
  ]) {
    it(`leaves ${JSON.stringify(input)} untouched`, () => {
      expect(transform(input)).toBe(input);
    });
  }

  describe('alternative syntax', () => {
    it('uses the body as the label (exact)', () => {
      expect(transform(':::wa-divider start icon:star\nRelease **notes**\n:::')).toBe(
        '<wa-divider label-placement="start"><wa-icon name="star"></wa-icon> Release <strong>notes</strong></wa-divider>',
      );
    });

    it('lets a label start with a reserved word', () => {
      expect(transform(':::wa-divider\nstart here\n:::')).toBe('<wa-divider>start here</wa-divider>');
    });

    it('emits a bare divider for an empty body', () => {
      expect(transform(':::wa-divider vertical\n:::')).toBe('<wa-divider orientation="vertical"></wa-divider>');
    });

    it('drops unknown tokens', () => {
      expect(transform(':::wa-divider bogus end\nX\n:::')).toBe(
        '<wa-divider label-placement="end">X</wa-divider>',
      );
    });

    it('does not close on a ::: that starts another component', () => {
      expect(transform(':::wa-divider\n:::info\nBody\n:::')).toMatch(/^<wa-divider>:::info/);
    });
  });
});

describe('DividerTransformer.renderAsMarkdown', () => {
  it('degrades to a thematic break followed by the label paragraph (exact)', () => {
    expect(renderAsMarkdown('--- or ---')).toBe('\n---\n\nor\n');
  });

  it('drops placement, orientation and icon tokens but keeps label Markdown', () => {
    expect(renderAsMarkdown('--- start vertical icon:star **New** ---')).toBe('\n---\n\n**New**\n');
  });

  it('degrades an icon-only divider to a bare thematic break', () => {
    expect(renderAsMarkdown('--- icon:quote-left ---')).toBe('\n---');
  });

  it('separates the break from a preceding paragraph so it cannot become a setext heading', () => {
    expect(renderAsMarkdown('Para\n--- or ---\nNext')).toBe('Para\n\n---\n\nor\n\nNext');
  });

  it('degrades the alternative syntax, including an empty body', () => {
    expect(renderAsMarkdown(':::wa-divider end\nRelease *notes*\n:::')).toBe('\n---\n\nRelease *notes*\n');
    expect(renderAsMarkdown(':::wa-divider\n:::')).toBe('\n---');
  });

  it('leaves plain rules and table separators untouched', () => {
    const input = '---\n\n--- | ---';
    expect(renderAsMarkdown(input)).toBe(input);
  });
});

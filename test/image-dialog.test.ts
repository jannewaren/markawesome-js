import { describe, it, expect } from 'vitest';
import * as imageDialog from '../src/transformers/image-dialog.js';
import { process } from '../src/transformer.js';

describe('ImageDialogTransformer', () => {
  it('emits ???-dialog syntax for a standalone image', () => {
    const result = imageDialog.transform('![A cat](cat.jpg)', { defaultWidth: '90vh' });
    expect(result).toContain('???light-dismiss 90vh');
    expect(result).toContain(
      '<img src="cat.jpg" alt="A cat" style="cursor: zoom-in; display: block; width: 100%; height: auto;" />',
    );
    expect(result).toContain('# A cat');
  });

  it('opts out with nodialog title', () => {
    const md = '![A cat](cat.jpg "nodialog")';
    expect(imageDialog.transform(md)).toBe(md);
  });

  it('falls back to "Image" label for empty alt', () => {
    expect(imageDialog.transform('![](cat.jpg)')).toContain('# Image');
  });

  it('does not transform images inside fenced code blocks', () => {
    const md = '```\n![A cat](cat.jpg)\n```';
    expect(imageDialog.transform(md)).toBe(md);
  });

  it('full pipeline produces exact wa-dialog (incl. MD5 id from Ruby)', () => {
    const result = process('![A cat](cat.jpg)', { imageDialog: { defaultWidth: '90vh' } });
    expect(result).toContain("<wa-dialog id='dialog-e50cf875' label='A cat' light-dismiss style='--width: 90vh'>");
    expect(result).toContain(
      "<wa-button id='dialog-e50cf875-btn' appearance='plain' data-dialog='open dialog-e50cf875'>",
    );
    // NB: Kramdown wraps a standalone raw <img> in <p>; markdown-it emits it as
    // an HTML block (no <p>). Functionally equivalent inside the dialog body.
    expect(result).toContain(
      '<img src="cat.jpg" alt="A cat" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />',
    );
  });

  it('image dialog is disabled by default', () => {
    const result = process('![A cat](cat.jpg)');
    expect(result).toBe('![A cat](cat.jpg)');
  });
});

describe('ImageDialogTransformer.renderAsMarkdown', () => {
  it('leaves plain markdown images untouched', () => {
    const md = '![Alt](image.png)';
    expect(imageDialog.renderAsMarkdown(md)).toBe(md);
  });
});

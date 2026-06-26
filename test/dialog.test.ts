import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/dialog.js';

describe('DialogTransformer.transform', () => {
  it('basic dialog (exact, incl. MD5 id matching Ruby)', () => {
    const result = transform('???\nOpen Dialog\n>>>\nThis is the dialog content.\n???');
    expect(result).toBe(
      [
        "<wa-button data-dialog='open dialog-52fcc928'>Open Dialog</wa-button>",
        "<wa-dialog id='dialog-52fcc928' label='Open Dialog'>",
        '<p>This is the dialog content.</p>',
        '',
        "<wa-button slot='footer' variant='brand' data-dialog='close'>Close</wa-button>",
        '</wa-dialog>',
      ].join('\n'),
    );
  });

  it('extracts label from first heading', () => {
    const result = transform('???\nOpen Dialog\n>>>\n# Dialog Title\nThis is the content.\n???');
    expect(result).toContain("label='Dialog Title'");
    expect(result).not.toContain('<h1>Dialog Title</h1>');
    expect(result).toContain('<p>This is the content.</p>');
  });

  it('uses button text as label when no heading', () => {
    expect(transform('???\nClick Me\n>>>\nJust content here.\n???')).toContain("label='Click Me'");
  });

  it('supports light-dismiss', () => {
    expect(transform('???light-dismiss\nOpen Dialog\n>>>\nContent here.\n???')).toContain(
      'light-dismiss',
    );
  });

  it('supports width with px', () => {
    expect(transform('???500px\nOpen Dialog\n>>>\nContent here.\n???')).toContain(
      "style='--width: 500px'",
    );
  });

  it('always includes header label, never without-header', () => {
    const result = transform('???\nOpen Dialog\n>>>\nContent here.\n???');
    expect(result).not.toContain('without-header');
    expect(result).toContain("label='");
  });
});

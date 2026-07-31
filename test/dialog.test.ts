import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/dialog.js';

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

  // An <img> in the trigger makes the button chrome-less via CSS parts. WA 3.11 deprecated
  // wa-button's generic `base` part in favour of `button`; we emit both so the style lands on
  // 3.10-pinned sites (no `button` part) and 3.11+ sites alike. Byte-for-byte parity with
  // markawesome's spec/dialog_transformer_spec.rb.
  it('image trigger targets both the deprecated base part and the WA 3.11 button part', () => {
    const result = transform(
      '???\n<img src="/photo.png" alt="A photo" />\n>>>\nContent here.\n???\n',
    );
    expect(result).toContain(
      '  #dialog-f14fd894-btn::part(base), #dialog-f14fd894-btn::part(button) {',
    );
    expect(result).toContain(
      '  #dialog-f14fd894-btn::part(base):hover, #dialog-f14fd894-btn::part(button):hover {',
    );
    expect(result).toContain(
      '  #dialog-f14fd894-btn::part(base):active, #dialog-f14fd894-btn::part(button):active {',
    );
  });

  it('emits no part styling when the trigger has no image', () => {
    const result = transform('???\nOpen Dialog\n>>>\nContent here.\n???\n');
    expect(result).not.toContain('::part(');
    expect(result).not.toContain('<style>');
  });
});

describe('DialogTransformer.renderAsMarkdown', () => {
  it('renders dialog as an italic trigger label followed by body', () => {
    const md = '???\nOpen settings\n>>>\nSome dialog body.\n???';
    expect(renderAsMarkdown(md)).toBe('_Open settings:_\n\nSome dialog body.');
  });

  it('handles alternative :::wa-dialog syntax', () => {
    const result = renderAsMarkdown(':::wa-dialog\nTrigger\n>>>\nBody\n:::');
    expect(result).toContain('_Trigger:_');
    expect(result).toContain('Body');
  });
});

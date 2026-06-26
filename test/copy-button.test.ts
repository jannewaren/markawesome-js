import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/copy-button.js';

describe('CopyButtonTransformer.transform', () => {
  it('simple copy button', () => {
    expect(transform('<<<\nCopy this text\n<<<')).toBe(
      '<wa-copy-button value="Copy this text"></wa-copy-button>',
    );
  });

  it('alternative syntax', () => {
    expect(transform(':::wa-copy-button\nCopy this text\n:::')).toBe(
      '<wa-copy-button value="Copy this text"></wa-copy-button>',
    );
  });

  it('keeps bold markup raw in value', () => {
    expect(transform('<<<\n**Bold text** to copy\n<<<')).toBe(
      '<wa-copy-button value="**Bold text** to copy"></wa-copy-button>',
    );
  });

  it('keeps code markup raw in value', () => {
    expect(transform('<<<\nCopy this `code snippet`\n<<<')).toBe(
      '<wa-copy-button value="Copy this `code snippet`"></wa-copy-button>',
    );
  });

  it('escapes double quotes', () => {
    expect(transform('<<<\nText with "quotes"\n<<<')).toBe(
      '<wa-copy-button value="Text with &quot;quotes&quot;"></wa-copy-button>',
    );
  });

  it('does not escape ampersand or other specials', () => {
    expect(transform('<<<\nSpecial chars: @#$%^&*()\n<<<')).toBe(
      '<wa-copy-button value="Special chars: @#$%^&*()"></wa-copy-button>',
    );
  });

  it('transforms in text context', () => {
    expect(transform('Here is some text\n\n<<<\nCopy me\n<<<\n\nAnd more text')).toBe(
      'Here is some text\n\n<wa-copy-button value="Copy me"></wa-copy-button>\n\nAnd more text',
    );
  });

  it('transforms multiple copy buttons', () => {
    expect(transform('<<<\nFirst copy\n<<<\n\n<<<\nSecond copy\n<<<')).toBe(
      '<wa-copy-button value="First copy"></wa-copy-button>\n\n<wa-copy-button value="Second copy"></wa-copy-button>',
    );
  });
});

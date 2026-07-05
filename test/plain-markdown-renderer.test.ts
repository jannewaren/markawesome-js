import { describe, it, expect, afterEach } from 'vitest';
import { plainMarkdown } from '../src/index.js';

/**
 * Mirrors the Ruby `spec/plain_markdown/renderer_spec.rb`. `plainMarkdown.process`
 * is byte-for-byte compatible with `Markawesome::PlainMarkdownRenderer.process`.
 */
describe('plainMarkdown.process', () => {
  afterEach(() => plainMarkdown.resetOverrides());

  it('strips Kramdown attribute syntax', () => {
    expect(plainMarkdown.process('## Heading {:.my-class}')).toBe('## Heading');
  });

  it('strips Kramdown attribute IDs', () => {
    expect(plainMarkdown.process('## Heading {:#slug}')).toBe('## Heading');
  });

  it('protects fenced code blocks from transformation', () => {
    const md = [
      'Here is a callout example:',
      '',
      '```markdown',
      ':::info',
      'should stay verbatim',
      ':::',
      '```',
      '',
      ':::info',
      'This becomes a real note.',
      ':::',
    ].join('\n');
    const result = plainMarkdown.process(md);
    expect(result).toContain('```markdown\n:::info\nshould stay verbatim\n:::\n```');
    expect(result).toContain('> [!NOTE]');
    expect(result).toContain('This becomes a real note.');
  });

  it('leaves vanilla markdown untouched', () => {
    const md = [
      '# Title',
      '',
      'A paragraph with **bold** and _italic_ text, plus a [link](/go).',
      '',
      '- one',
      '- two',
      '',
      '| a | b |',
      '|---|---|',
      '| 1 | 2 |',
    ].join('\n');
    expect(plainMarkdown.process(md)).toBe(md);
  });

  it('degrades a realistic docs page without leaking component markers', () => {
    const md = [
      '# Getting started',
      '',
      ':::info',
      'Read this first.',
      ':::',
      '',
      '::::grid gap:m',
      '===',
      '![Cover](cover.png)',
      '**Call it out**',
      'A short line.',
      '===',
      '::::',
      '',
      '++++++',
      '+++ Tab 1',
      'Tab one body.',
      '+++',
      '+++ Tab 2',
      'Tab two body.',
      '+++',
      '++++++',
      '',
      '%%%brand',
      '[Go](/go)',
      '%%%',
      '',
      '!!!brand',
      'New',
      '!!!',
      '',
      'Check @@@ brand Beta @@@ out.',
      '',
      '$$$cog',
      '',
      'See the heading {:.foo}.',
    ].join('\n');
    const result = plainMarkdown.process(md);

    const forbidden = [
      /:::/,
      /\^\^\^/,
      /@@@/,
      /!!!/,
      /%%%/,
      /^===/m,
      /^~~~~~~/m,
      /^\|\|\|/m,
      /^<<</m,
      /^\?\?\?/m,
      /\{:\./,
      /\{:#/,
      /<wa-[a-z-]+/,
    ];
    for (const pattern of forbidden) {
      expect(result).not.toMatch(pattern);
    }

    expect(result).toContain('> [!NOTE]');
    expect(result).toContain('![Cover](cover.png)');
    expect(result).toContain('### Call it out');
    expect(result).toContain('### Tab 1');
    expect(result).toContain('[Go](/go)');
    expect(result).toContain('**New**');
    expect(result).toContain('**Beta**');
  });
});

describe('plainMarkdown.registerOverride', () => {
  afterEach(() => plainMarkdown.resetOverrides());

  it('allows a host app to override a component rendering', () => {
    plainMarkdown.registerOverride('callout', (content) =>
      content.replace(/^:::info\n([\s\S]*?)\n:::/gm, 'CUSTOM: $1'),
    );
    expect(plainMarkdown.process(':::info\nhi\n:::')).toBe('CUSTOM: hi');
  });

  it('restores default rendering after resetOverrides', () => {
    plainMarkdown.registerOverride('callout', () => 'OVERRIDDEN');
    expect(plainMarkdown.process(':::info\nhi\n:::')).toBe('OVERRIDDEN');
    plainMarkdown.resetOverrides();
    expect(plainMarkdown.process(':::info\nhi\n:::')).toBe('> [!NOTE]\n> hi');
  });

  it('exposes a copy of the registered overrides', () => {
    const fn: (c: string) => string = (c) => c;
    plainMarkdown.registerOverride('callout', fn);
    const snapshot = plainMarkdown.overrides();
    expect(snapshot.get('callout')).toBe(fn);
    // Mutating the returned copy must not affect the live registry.
    snapshot.clear();
    expect(plainMarkdown.overrides().get('callout')).toBe(fn);
  });
});

import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/card.js';

describe('CardTransformer.transform', () => {
  it('transforms simple card', () => {
    const result = transform('===\nThis is a basic card with just content.\n===\n');
    expect(result).toContain('<wa-card>');
    expect(result).toContain('This is a basic card with just content.');
    expect(result).toContain('</wa-card>');
  });

  it('transforms card with bold header', () => {
    const result = transform('===\n**Card Title**\nThis is the card content.\n===\n');
    expect(result).toContain('<wa-card with-header>');
    expect(result).toContain('<div slot="header">');
    expect(result).toContain('Card Title');
    expect(result).toContain('This is the card content.');
  });

  it('transforms card with media', () => {
    const result = transform('===\n![Alt text](image.jpg)\n**Card Title**\nThe content.\n===\n');
    expect(result).toContain('<wa-card with-media with-header>');
    expect(result).toContain('<img slot="media" src="image.jpg" alt="Alt text">');
    expect(result).toContain('<div slot="header">');
  });

  it('transforms card with footer', () => {
    const result = transform(
      '===\n**Card Title**\nThe content.\n[Learn More](https://example.com)\n===\n',
    );
    expect(result).toContain('<wa-card with-header with-footer>');
    expect(result).toContain('<div slot="footer">');
    expect(result).toContain('<wa-button href="https://example.com">Learn More</wa-button>');
  });

  it('filled appearance', () => {
    expect(transform('===filled\n**Card Title**\nx\n===\n')).toContain(
      '<wa-card appearance="filled" with-header>',
    );
  });

  it('does not emit default outlined/vertical', () => {
    const result = transform('===\n**Card Title**\nx\n===\n');
    expect(result).toContain('<wa-card with-header>');
    expect(result).not.toContain('appearance="outlined"');
    expect(result).not.toContain('orientation="vertical"');
  });

  it('horizontal orientation', () => {
    expect(transform('===horizontal\n![Image](image.jpg)\nx\n===\n')).toContain(
      '<wa-card orientation="horizontal" with-media>',
    );
  });

  it('appearance + orientation any order', () => {
    expect(transform('===horizontal filled\n![Image](image.jpg)\nx\n===\n')).toContain(
      '<wa-card appearance="filled" orientation="horizontal" with-media>',
    );
  });

  it('rightmost-wins for duplicate appearance', () => {
    const result = transform('===filled accent\n**Test Card**\nx\n===\n');
    expect(result).toContain('<wa-card appearance="accent" with-header>');
  });

  it('complete card with all components', () => {
    const result = transform(
      '===filled\n![Hero image](hero.jpg)\n**Complete Card**\nEverything here.\n[Get Started](https://example.com)\n===\n',
    );
    expect(result).toContain('<wa-card appearance="filled" with-media with-header with-footer>');
    expect(result).toContain('<img slot="media" src="hero.jpg" alt="Hero image">');
    expect(result).toContain('<div slot="header">');
    expect(result).toContain('<div slot="footer">');
    expect(result).toContain('<wa-button href="https://example.com">Get Started</wa-button>');
  });

  it('alternative syntax', () => {
    expect(
      transform(':::wa-card filled horizontal\n![Image](image.jpg)\n**Alt**\nx\n:::\n'),
    ).toContain('<wa-card appearance="filled" orientation="horizontal" with-media with-header>');
  });

  it('does not treat # heading as header', () => {
    const result = transform('===\n# This is not a header\nThe content.\n===\n');
    expect(result).not.toContain('slot="header"');
    expect(result).toContain('This is not a header');
  });
});

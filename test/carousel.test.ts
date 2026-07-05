import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/carousel.js';

describe('CarouselTransformer.transform', () => {
  it('basic carousel with flags (exact)', () => {
    expect(transform('~~~~~~loop pagination\n~~~\nFirst\n~~~\n~~~\nSecond\n~~~\n~~~~~~')).toBe(
      '<wa-carousel loop pagination>' +
        '<wa-carousel-item><p>First</p>\n</wa-carousel-item>' +
        '<wa-carousel-item><p>Second</p>\n</wa-carousel-item>' +
        '</wa-carousel>',
    );
  });

  it('no params', () => {
    const result = transform('~~~~~~\n~~~\nFirst slide content\n~~~\n~~~\nSecond slide content\n~~~\n~~~~~~');
    expect(result).toContain('<wa-carousel>');
    expect(result).toContain('First slide content');
    expect(result).toContain('Second slide content');
  });

  it('slides-per-page numeric', () => {
    expect(transform('~~~~~~3\n~~~\nA\n~~~\n~~~~~~')).toContain('slides-per-page="3"');
  });

  it('slides-per-page and slides-per-move', () => {
    const result = transform('~~~~~~3 2\n~~~\nA\n~~~\n~~~~~~');
    expect(result).toContain('slides-per-page="3"');
    expect(result).toContain('slides-per-move="2"');
  });

  it('vertical maps to orientation', () => {
    expect(transform('~~~~~~vertical\n~~~\nA\n~~~\n~~~~~~')).toContain('orientation="vertical"');
  });

  it('css var params', () => {
    expect(transform('~~~~~~aspect-ratio:16/9\n~~~\nA\n~~~\n~~~~~~')).toContain(
      'style="--aspect-ratio: 16/9"',
    );
  });

  it('markdown content in slides', () => {
    const result = transform('~~~~~~\n~~~\n**Bold text** and *italic text*\n~~~\n~~~~~~');
    expect(result).toContain('<strong>Bold text</strong>');
    expect(result).toContain('<em>italic text</em>');
  });
});

describe('CarouselTransformer.renderAsMarkdown', () => {
  it('flattens slides into sequential blocks', () => {
    const md = '~~~~~~\n~~~\n![One](one.png)\n~~~\n~~~\n![Two](two.png)\n~~~\n~~~~~~';
    const result = renderAsMarkdown(md);
    expect(result).toContain('![One](one.png)');
    expect(result).toContain('![Two](two.png)');
    expect(result).not.toContain('~~~');
  });
});

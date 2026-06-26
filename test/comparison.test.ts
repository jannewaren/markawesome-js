import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/comparison.js';

describe('ComparisonTransformer.transform', () => {
  it('basic comparison with two images', () => {
    const result = transform('|||\n![Before image](before.jpg)\n![After image](after.jpg)\n|||');
    expect(result).toContain('<wa-comparison>');
    expect(result).toContain('<img slot="before" src="before.jpg" alt="Before image" />');
    expect(result).toContain('<img slot="after" src="after.jpg" alt="After image" />');
    expect(result).toContain('</wa-comparison>');
  });

  it('empty alt text', () => {
    const result = transform('|||\n![](before.jpg)\n![](after.jpg)\n|||');
    expect(result).toContain('<img slot="before" src="before.jpg" alt="" />');
    expect(result).toContain('<img slot="after" src="after.jpg" alt="" />');
  });

  it('URLs with query parameters', () => {
    const result = transform(
      '|||\n![Before](https://example.com/before.jpg?v=1&format=webp)\n![After](https://example.com/after.jpg?v=2&format=webp)\n|||',
    );
    expect(result).toContain(
      '<img slot="before" src="https://example.com/before.jpg?v=1&format=webp" alt="Before" />',
    );
  });

  it('position', () => {
    const result = transform('|||50\n![Before](before.jpg)\n![After](after.jpg)\n|||');
    expect(result).toContain('<wa-comparison position="50">');
  });

  it('does not transform with one image', () => {
    const md = '|||\n![Only one](one.jpg)\n|||';
    expect(transform(md)).toBe(md);
  });

  it('does not transform with three images', () => {
    const md = '|||\n![One](1.jpg)\n![Two](2.jpg)\n![Three](3.jpg)\n|||';
    expect(transform(md)).toBe(md);
  });

  it('alternative syntax', () => {
    const result = transform(
      ':::wa-comparison\n![Before image](before.jpg)\n![After image](after.jpg)\n:::',
    );
    expect(result).toContain('<wa-comparison>');
    expect(result).toContain('<img slot="before" src="before.jpg" alt="Before image" />');
  });

  it('multiple comparison blocks', () => {
    const result = transform(
      '|||\n![Before 1](before1.jpg)\n![After 1](after1.jpg)\n|||\n\nSome text in between.\n\n|||\n![Before 2](before2.jpg)\n![After 2](after2.jpg)\n|||',
    );
    expect(result.match(/<wa-comparison>/g)?.length).toBe(2);
    expect(result).toContain('Some text in between.');
  });
});

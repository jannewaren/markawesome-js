import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/layout.js';

describe('LayoutTransformer.transform', () => {
  it('grid with gap and min (exact)', () => {
    expect(transform('::::grid gap:l min:300px\nContent\n::::')).toBe(
      '<div class="wa-grid wa-gap-l" style="--min-column-size: 300px">\nContent\n</div>',
    );
  });
  it('basic grid', () => {
    expect(transform('::::grid\nx\n::::')).toContain('<div class="wa-grid">');
  });
  it('stack with gap', () => {
    expect(transform('::::stack gap:m\nx\n::::')).toContain('<div class="wa-stack wa-gap-m">');
  });
  it('cluster with gap and justify', () => {
    expect(transform('::::cluster gap:s justify:center\nx\n::::')).toContain(
      '<div class="wa-cluster wa-gap-s wa-justify-content-center">',
    );
  });
  it('split row modifier', () => {
    expect(transform('::::split row\nx\n::::')).toContain('<div class="wa-split:row">');
  });
  it('flank with size', () => {
    const r = transform('::::flank size:200px\nx\n::::');
    expect(r).toContain('class="wa-flank"');
    expect(r).toContain('style="--flank-size: 200px"');
  });
  it('flank content percentage', () => {
    expect(transform('::::flank content:60%\nx\n::::')).toContain('--content-percentage: 60%');
  });
  it('frame square modifier', () => {
    expect(transform('::::frame square\nx\n::::')).toContain('<div class="wa-frame:square">');
  });
  it('frame border radius', () => {
    expect(transform('::::frame radius:pill\nx\n::::')).toContain(
      'class="wa-frame wa-border-radius-pill"',
    );
  });
  it('min ignored on non-grid', () => {
    expect(transform('::::stack min:300px\nx\n::::')).not.toContain('--min-column-size');
  });
  it('stack align center', () => {
    expect(transform('::::stack align:center\nx\n::::')).toContain(
      'class="wa-stack wa-align-items-center"',
    );
  });
  it('alternative wa- syntax', () => {
    expect(transform('::::wa-grid gap:l\nx\n::::')).toContain('<div class="wa-grid wa-gap-l">');
  });
});

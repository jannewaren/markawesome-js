import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/details.js';

describe('DetailsTransformer.transform', () => {
  it('basic summary/details', () => {
    const result = transform('^^^\nSummary here\n>>>\nDetails here\n^^^');
    expect(result).toContain("<wa-details appearance='outlined' icon-placement='end'>");
    expect(result).toContain("<span slot='summary'><p>Summary here</p>");
    expect(result).toContain('<p>Details here</p>');
    expect(result).toContain('</wa-details>');
  });

  it('filled appearance', () => {
    expect(transform('^^^filled\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='filled' icon-placement='end'>",
    );
  });

  it('icon placement start', () => {
    expect(transform('^^^start\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='outlined' icon-placement='start'>",
    );
  });

  it('appearance + placement', () => {
    expect(transform('^^^filled start\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='filled' icon-placement='start'>",
    );
  });

  it('parameter order flexible', () => {
    const a = transform('^^^filled start\nS\n>>>\nD\n^^^');
    const b = transform('^^^start filled\nS\n>>>\nD\n^^^');
    expect(a).toBe(b);
  });

  it('disabled', () => {
    expect(transform('^^^disabled\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='outlined' icon-placement='end' disabled>",
    );
  });

  it('open', () => {
    expect(transform('^^^open\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='outlined' icon-placement='end' open>",
    );
  });

  it('name', () => {
    expect(transform('^^^name:group-1\nS\n>>>\nD\n^^^')).toContain(
      "<wa-details appearance='outlined' icon-placement='end' name='group-1'>",
    );
  });

  it('multiline summary and details', () => {
    const result = transform('^^^\nSummary line 1\nSummary line 2\n>>>\nDetails line 1\n\nDetails line 2\n^^^');
    expect(result).toContain("<span slot='summary'><p>Summary line 1");
    expect(result).toContain('Summary line 2</p>');
    expect(result).toContain('<p>Details line 1</p>');
    expect(result).toContain('<p>Details line 2</p>');
  });

  it('does not transform incomplete syntax', () => {
    const md = '^^^\nSummary only\n^^^';
    expect(transform(md)).toBe(md);
  });
});

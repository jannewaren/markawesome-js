import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/tabs.js';

describe('TabsTransformer.transform', () => {
  it('basic tab group (exact)', () => {
    expect(transform('++++++\n+++ Tab 1\nContent 1\n+++\n+++ Tab 2\nContent 2\n+++\n++++++')).toBe(
      '<wa-tab-group placement="top">' +
        '<wa-tab panel="tab-1">Tab 1</wa-tab>' +
        '<wa-tab panel="tab-2">Tab 2</wa-tab>' +
        '<wa-tab-panel name="tab-1"><p>Content 1</p>\n</wa-tab-panel>' +
        '<wa-tab-panel name="tab-2"><p>Content 2</p>\n</wa-tab-panel>' +
        '</wa-tab-group>',
    );
  });

  it('start placement', () => {
    expect(transform('++++++start\n+++ Tab 1\nContent 1\n+++\n++++++')).toContain(
      '<wa-tab-group placement="start">',
    );
  });

  it('manual activation', () => {
    expect(transform('++++++manual\n+++ Tab 1\nContent 1\n+++\n++++++')).toContain(
      'activation="manual"',
    );
  });

  it('complex content (heading auto-id, list, bold)', () => {
    const result = transform(
      '++++++\n+++ First Tab\n# Heading in tab\nSome content here.\n+++\n+++ Second Tab\n- List item 1\n- List item 2\n+++\n++++++',
    );
    expect(result).toContain('<wa-tab panel="tab-1">First Tab</wa-tab>');
    expect(result).toContain('<h1 id="heading-in-tab">Heading in tab</h1>');
    expect(result).toContain('<li>List item 1</li>');
  });

  it('does not transform incomplete syntax', () => {
    const md = '++++++\n+++ Tab 1\nContent 1\n++++++';
    expect(transform(md)).toBe(md);
  });
});

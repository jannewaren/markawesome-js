import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/tree.js';

describe('TreeTransformer.transform', () => {
  it('basic nested list with icons and fence open (exact)', () => {
    expect(
      transform(
        '||||||open\n- icon:folder src\n  - icon:file index.ts\n  - icon:file utils.ts\n- icon:file README.md\n||||||',
      ),
    ).toBe(
      '<wa-tree>' +
        '<wa-tree-item expanded><wa-icon name="folder"></wa-icon>src' +
        '<wa-tree-item><wa-icon name="file"></wa-icon>index.ts</wa-tree-item>' +
        '<wa-tree-item><wa-icon name="file"></wa-icon>utils.ts</wa-tree-item>' +
        '</wa-tree-item>' +
        '<wa-tree-item><wa-icon name="file"></wa-icon>README.md</wa-tree-item>' +
        '</wa-tree>',
    );
  });

  it('flat list with no nesting (exact)', () => {
    expect(transform('||||||\n- One\n- Two\n||||||')).toBe(
      '<wa-tree><wa-tree-item>One</wa-tree-item><wa-tree-item>Two</wa-tree-item></wa-tree>',
    );
  });

  it('nests with 2-space indentation', () => {
    expect(transform('||||||\n- parent\n  - child\n||||||')).toBe(
      '<wa-tree><wa-tree-item>parent<wa-tree-item>child</wa-tree-item></wa-tree-item></wa-tree>',
    );
  });

  it('nests with 4-space indentation identically', () => {
    expect(transform('||||||\n- parent\n    - child\n||||||')).toBe(
      '<wa-tree><wa-tree-item>parent<wa-tree-item>child</wa-tree-item></wa-tree-item></wa-tree>',
    );
  });

  it('treats a tab as four columns of indentation', () => {
    expect(transform('||||||\n- parent\n\t- child\n||||||')).toBe(
      '<wa-tree><wa-tree-item>parent<wa-tree-item>child</wa-tree-item></wa-tree-item></wa-tree>',
    );
  });

  it('supports * and + bullet markers', () => {
    expect(transform('||||||\n* parent\n  + child\n||||||')).toBe(
      '<wa-tree><wa-tree-item>parent<wa-tree-item>child</wa-tree-item></wa-tree-item></wa-tree>',
    );
  });

  it('expands every branch when the fence is open', () => {
    expect(transform('||||||open\n- a\n  - b\n||||||')).toContain('<wa-tree-item expanded>a');
  });

  it('treats expanded as an alias for the open fence token', () => {
    expect(transform('||||||expanded\n- a\n  - b\n||||||')).toContain('<wa-tree-item expanded>a');
  });

  it('expands only the flagged branch when the fence is closed', () => {
    const result = transform('||||||\n- expanded a\n  - b\n- c\n  - d\n||||||');
    expect(result).toContain('<wa-tree-item expanded>a');
    expect(result).toContain('<wa-tree-item>c');
  });

  it('never marks a leaf as expanded even with the open fence', () => {
    expect(transform('||||||open\n- a\n- b\n||||||')).toBe(
      '<wa-tree><wa-tree-item>a</wa-tree-item><wa-tree-item>b</wa-tree-item></wa-tree>',
    );
  });

  it('never marks a leaf as expanded even with a per-node expanded flag', () => {
    expect(transform('||||||\n- expanded a\n||||||')).toBe(
      '<wa-tree><wa-tree-item>a</wa-tree-item></wa-tree>',
    );
  });

  it('emits a leading icon as the item first child with no slot attribute', () => {
    expect(transform('||||||\n- icon:folder src\n||||||')).toBe(
      '<wa-tree><wa-tree-item><wa-icon name="folder"></wa-icon>src</wa-tree-item></wa-tree>',
    );
  });

  it('combines an icon with the expanded flag on a branch', () => {
    expect(transform('||||||\n- expanded icon:folder src\n  - leaf\n||||||')).toContain(
      '<wa-tree-item expanded><wa-icon name="folder"></wa-icon>src',
    );
  });

  it('escapes < and > in labels', () => {
    expect(transform('||||||\n- 5 > 3 & <tag>\n||||||')).toContain(
      '<wa-tree-item>5 &gt; 3 &amp; &lt;tag&gt;</wa-tree-item>',
    );
  });

  it('keeps colon-bearing labels (element names) intact, not parsed as icons', () => {
    const result = transform('||||||\n- Invoice\n  - cbc:ID\n  - cac:Item\n||||||');
    expect(result).not.toContain('<wa-icon');
    expect(result).toContain('<wa-tree-item>cbc:ID</wa-tree-item>');
    expect(result).toContain('<wa-tree-item>cac:Item</wa-tree-item>');
  });

  it('skips blank and non-list lines in the body', () => {
    expect(transform('||||||\n- a\n\nnot a list line\n- b\n||||||')).toBe(
      '<wa-tree><wa-tree-item>a</wa-tree-item><wa-tree-item>b</wa-tree-item></wa-tree>',
    );
  });

  it('does not transform incomplete syntax (no closing fence)', () => {
    const input = '||||||\n- a\n- b';
    expect(transform(input)).toBe(input);
  });

  it('transforms the alternative :::wa-tree syntax', () => {
    expect(transform(':::wa-tree\n- a\n  - b\n:::')).toBe(
      '<wa-tree><wa-tree-item>a<wa-tree-item>b</wa-tree-item></wa-tree-item></wa-tree>',
    );
  });

  it('accepts the open fence token on the alternative syntax', () => {
    expect(transform(':::wa-tree open\n- a\n  - b\n:::')).toContain('<wa-tree-item expanded>a');
  });
});

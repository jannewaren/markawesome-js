import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/lightbox.js';
import { process, plainMarkdown } from '../src/index.js';

const SQUARE =
  'width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--wa-border-radius-m)';
const img = (src: string, alt: string, style = SQUARE): string =>
  `<img src="${src}" alt="${alt}" loading="lazy" style="${style}">`;

describe('LightboxTransformer.transform', () => {
  it('full gallery (exact)', () => {
    const md = [
      '::::lightbox loop thumbnails min:10rem gap:s label:"Lisbon trip"',
      '![Tram](tram.jpg "Tram 28 in Alfama")',
      '[![Bridge](bridge-thumb.jpg)](bridge-full.jpg "25 de Abril")',
      '[![Drone](drone-poster.jpg)](drone.mp4 "From above")',
      '::::',
    ].join('\n');
    expect(transform(md)).toBe(
      '<wa-lightbox class="wa-grid wa-gap-s" style="--min-column-size: 10rem" label="Lisbon trip" ' +
        'loop with-thumbnails>' +
        `<wa-lightbox-item src="tram.jpg" caption="Tram 28 in Alfama">${img('tram.jpg', 'Tram')}</wa-lightbox-item>` +
        `<wa-lightbox-item src="bridge-full.jpg" caption="25 de Abril">${img('bridge-thumb.jpg', 'Bridge')}</wa-lightbox-item>` +
        `<wa-lightbox-item type="video" src="drone.mp4" caption="From above">${img('drone-poster.jpg', 'Drone')}</wa-lightbox-item>` +
        '</wa-lightbox>',
    );
  });

  it('bare lightbox without params', () => {
    expect(transform('::::lightbox\n![A](a.jpg)\n::::')).toBe(
      `<wa-lightbox class="wa-grid"><wa-lightbox-item src="a.jpg">${img('a.jpg', 'A')}</wa-lightbox-item></wa-lightbox>`,
    );
  });

  it('supports the :::wa-lightbox alternative syntax', () => {
    const result = transform(':::wa-lightbox no-zoom\n![A](a.jpg)\n:::');
    expect(result.startsWith('<wa-lightbox class="wa-grid" without-zoom>')).toBe(true);
  });

  it('emits flags in a fixed order', () => {
    expect(
      transform('::::lightbox no-zoom no-counter no-nav thumbnails loop\n![A](a.jpg)\n::::'),
    ).toMatch(
      /^<wa-lightbox class="wa-grid" loop with-thumbnails without-navigation without-counter without-zoom>/,
    );
  });

  it('does not read label words as flags, and escapes the label', () => {
    expect(transform("::::lightbox label:'loop the thumbnails'\n![A](a.jpg)\n::::")).toMatch(
      /^<wa-lightbox class="wa-grid" label="loop the thumbnails">/,
    );
    expect(transform('::::lightbox label:"Tom & <Jerry>"\n![A](a.jpg)\n::::')).toContain(
      'label="Tom &amp; &lt;Jerry&gt;"',
    );
  });

  it('reuses the grid rules', () => {
    expect(
      transform('::::lightbox gap:xl min:8rem align:center gap:bogus\n![A](a.jpg)\n::::'),
    ).toMatch(
      /^<wa-lightbox class="wa-grid wa-gap-xl wa-align-items-center" style="--min-column-size: 8rem">/,
    );
    expect(transform('::::lightbox min:10rem;color:red\n![A](a.jpg)\n::::')).toContain(
      'style="--min-column-size: 10remcolor:red"',
    );
  });

  it.each([
    [
      'landscape',
      'width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--wa-border-radius-m)',
    ],
    [
      'portrait',
      'width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: var(--wa-border-radius-m)',
    ],
    ['natural', 'width: 100%; height: auto; border-radius: var(--wa-border-radius-m)'],
    ['square', SQUARE],
    ['portrait natural', 'width: 100%; height: auto; border-radius: var(--wa-border-radius-m)'],
  ])('styles %s thumbnails', (shape, style) => {
    const result = transform(`::::lightbox ${shape}\n![A](a.jpg)\n::::`);
    expect(result).toContain(`style="${style}"`);
    expect(result.startsWith('<wa-lightbox class="wa-grid">')).toBe(true);
  });

  it('captions from the link title, else the image title', () => {
    const result = transform(
      '::::lightbox\n[![A](t.jpg "Image title")](f.jpg "Link title")\n[![B](t2.jpg "Only image")](f2.jpg)\n::::',
    );
    expect(result).toContain('<wa-lightbox-item src="f.jpg" caption="Link title">');
    expect(result).toContain('<wa-lightbox-item src="f2.jpg" caption="Only image">');
  });

  it.each([
    'clip.mp4',
    'clip.WEBM',
    'clip.mov',
    'clip.ogv',
    'clip.m4v',
    'clip.mp4?t=10',
    'clip.webm#start',
  ])('marks %s as a video', (href) => {
    expect(transform(`::::lightbox\n[![P](p.jpg)](${href})\n::::`)).toContain(
      `<wa-lightbox-item type="video" src="${href}">`,
    );
  });

  it('does not mark a non-video href as a video', () => {
    expect(transform('::::lightbox\n[![P](p.jpg)](mp4.jpg)\n::::')).not.toContain('type="video"');
  });

  it('escapes item attributes', () => {
    const result = transform(
      '::::lightbox\n![A "quoted" & co](a.jpg?x=1&y=2 "Fish & chips")\n::::',
    );
    expect(result).toContain('src="a.jpg?x=1&amp;y=2" caption="Fish &amp; chips"');
    expect(result).toContain('alt="A &quot;quoted&quot; &amp; co"');
  });

  it('ignores blank lines and indentation', () => {
    const result = transform('::::lightbox\n\n  ![A](a.jpg)\n\n![B](b.jpg)\n\n::::');
    expect(result.match(/<wa-lightbox-item/g)?.length).toBe(2);
    expect(result).not.toContain('<p>');
  });

  it('renders non-image lines as Markdown in place', () => {
    const result = transform('::::lightbox\n![A](a.jpg)\nSome *note*\nmore\n![B](b.jpg)\n::::');
    expect(result).toContain(
      '</wa-lightbox-item><p>Some <em>note</em>\nmore</p><wa-lightbox-item src="b.jpg">',
    );
  });

  it('does not match ::::lightboxes or a grid', () => {
    expect(transform('::::lightboxes\n![A](a.jpg)\n::::')).toBe(
      '::::lightboxes\n![A](a.jpg)\n::::',
    );
    expect(transform('::::grid\n![A](a.jpg)\n::::')).toBe('::::grid\n![A](a.jpg)\n::::');
  });
});

describe('LightboxTransformer in the pipeline', () => {
  it('nests inside a grid layout', () => {
    const result = process('::::grid gap:l\n::::lightbox\n![A](a.jpg)\n::::\nSide text\n::::');
    expect(result.startsWith('<div class="wa-grid wa-gap-l">\n<wa-lightbox class="wa-grid">')).toBe(
      true,
    );
    expect(result.endsWith('</wa-lightbox>\nSide text\n</div>')).toBe(true);
  });

  it('nests inside a card without a wrapping paragraph', () => {
    const result = process('===\nGallery\n\n::::lightbox\n![A](a.jpg)\n::::\n===');
    expect(result).toContain('<wa-lightbox class="wa-grid"><wa-lightbox-item src="a.jpg">');
    expect(result).not.toContain('<p><wa-lightbox');
  });

  it('is never dialog-wrapped by imageDialog', () => {
    const result = process('::::lightbox\n![A](a.jpg)\n::::\n\n![Solo](solo.jpg)', {
      imageDialog: true,
    });
    expect(result.match(/<wa-dialog/g)?.length).toBe(1);
    expect(result).toContain(`<wa-lightbox-item src="a.jpg">${img('a.jpg', 'A')}`);
  });
});

describe('LightboxTransformer.renderAsMarkdown', () => {
  it('keeps the image lines and drops the fence', () => {
    expect(
      renderAsMarkdown(
        '::::lightbox loop label:"Trip"\n![A](a.jpg "Cap")\n[![B](t.jpg)](b.mp4 "Clip")\n::::',
      ),
    ).toBe('![A](a.jpg "Cap")\n[![B](t.jpg)](b.mp4 "Clip")');
    expect(renderAsMarkdown(':::wa-lightbox\n![A](a.jpg)\n:::')).toBe('![A](a.jpg)');
  });

  it('degrades a lightbox inside a grid through the full renderer', () => {
    expect(plainMarkdown.process('::::grid\n::::lightbox\n![A](a.jpg)\n::::\nAfter\n::::')).toBe(
      '![A](a.jpg)\nAfter',
    );
  });
});

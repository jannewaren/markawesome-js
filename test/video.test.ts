import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/video.js';

/**
 * Exact-string assertions copied verbatim from the markawesome Ruby engine's
 * `VideoTransformer.transform` output (the cross-engine source of truth).
 */
describe('VideoTransformer.transform single video', () => {
  it('transforms a single video with link, poster, controls, and flags', () => {
    const input = ';;;controls:full autoplay muted\n[My Clip](test_video.mp4)\n![Poster](test_video_poster.jpg)\n;;;';
    expect(transform(input)).toBe(
      '<wa-video src="test_video.mp4" poster="test_video_poster.jpg" ' +
        'title="My Clip" controls="full" autoplay muted></wa-video>',
    );
  });

  it('emits only src and title for a bare link', () => {
    expect(transform(';;;\n[Clip](v.mp4)\n;;;')).toBe('<wa-video src="v.mp4" title="Clip"></wa-video>');
  });

  it('leaves a link-less block untransformed', () => {
    const input = ';;;controls:full\n![Just a poster](p.jpg)\n;;;';
    expect(transform(input)).toBe(input);
  });

  it('transforms the :::wa-video alternative syntax', () => {
    expect(transform(':::wa-video preload:none loop\n[Clip](v.mp4)\n:::')).toBe(
      '<wa-video src="v.mp4" title="Clip" preload="none" loop></wa-video>',
    );
  });
});

describe('VideoTransformer.transform attributes', () => {
  const single = (tokens: string): string => transform(`;;;${tokens}\n[X](x.mp4)\n;;;`);

  it('drops an invalid controls value', () => {
    expect(single('controls:bogus')).toBe('<wa-video src="x.mp4" title="X"></wa-video>');
  });

  it('drops an invalid preload value', () => {
    expect(single('preload:weird')).not.toContain('preload');
  });

  it('emits each boolean flag as a bare token', () => {
    for (const flag of ['autoplay', 'autoplay-muted', 'autoplay-on-visible', 'loop', 'muted']) {
      expect(single(flag)).toBe(`<wa-video src="x.mp4" title="X" ${flag}></wa-video>`);
    }
  });

  it('distinguishes autoplay-muted from a bare autoplay flag', () => {
    const result = single('autoplay-muted');
    expect(result).toContain('autoplay-muted');
    expect(result).not.toMatch(/ autoplay></);
  });

  it('emits attributes in deterministic order regardless of token order', () => {
    const result = single('muted loop autoplay preload:auto controls:standard autoplay-on-visible autoplay-muted');
    expect(result).toBe(
      '<wa-video src="x.mp4" title="X" controls="standard" preload="auto" ' +
        'autoplay autoplay-muted autoplay-on-visible loop muted></wa-video>',
    );
  });
});

describe('VideoTransformer.transform body parsing', () => {
  it('does not treat the image as the link source', () => {
    expect(transform(';;;\n![Poster](poster.jpg)\n[Title](movie.mp4)\n;;;')).toBe(
      '<wa-video src="movie.mp4" poster="poster.jpg" title="Title"></wa-video>',
    );
  });

  it('HTML-escapes src, poster, and title', () => {
    const result = transform(';;;\n[A & B <"\'>](u.mp4?a=1&b=2)\n![P&Q](p.jpg?x=1&y=2)\n;;;');
    expect(result).toBe(
      '<wa-video src="u.mp4?a=1&amp;b=2" poster="p.jpg?x=1&amp;y=2" ' +
        'title="A &amp; B &lt;&quot;&#39;&gt;"></wa-video>',
    );
  });
});

describe('VideoTransformer.transform playlist', () => {
  it('wraps items and forwards controls to the container only', () => {
    const input =
      ';;;;;;controls:standard\n;;;\n[Part 1](a.mp4)\n![Poster A](a.jpg)\n;;;\n;;;\n[Part 2](b.mp4)\n;;;\n;;;;;;';
    expect(transform(input)).toBe(
      '<wa-video-playlist controls="standard">' +
        '<wa-video src="a.mp4" poster="a.jpg" title="Part 1"></wa-video>' +
        '<wa-video src="b.mp4" title="Part 2"></wa-video>' +
        '</wa-video-playlist>',
    );
  });

  it('omits the container controls attribute when not specified', () => {
    expect(transform(';;;;;;\n;;;\n[One](1.mp4)\n;;;\n;;;;;;')).toBe(
      '<wa-video-playlist><wa-video src="1.mp4" title="One"></wa-video></wa-video-playlist>',
    );
  });

  it('transforms the :::wa-video-playlist alternative syntax', () => {
    const input = ':::wa-video-playlist controls:none\n;;;\n[One](1.mp4)\n;;;\n;;;\n[Two](2.mp4)\n![P](2.jpg)\n;;;\n:::';
    expect(transform(input)).toBe(
      '<wa-video-playlist controls="none">' +
        '<wa-video src="1.mp4" title="One"></wa-video>' +
        '<wa-video src="2.mp4" poster="2.jpg" title="Two"></wa-video>' +
        '</wa-video-playlist>',
    );
  });
});

describe('VideoTransformer.renderAsMarkdown', () => {
  // Fresh coverage (the Ruby engine has no video plain-markdown spec). A single
  // video degrades to a plain link; a playlist to `- ` bullet links joined by a
  // single newline. Goldens generated from the Ruby VideoTransformer.render_as_markdown.
  it('degrades a single video to a plain link (poster dropped)', () => {
    const md = ';;;controls:full autoplay muted\n[My Clip](test_video.mp4)\n![Poster](p.jpg)\n;;;';
    expect(renderAsMarkdown(md)).toBe('[My Clip](test_video.mp4)');
  });

  it('degrades a bare single video to a plain link', () => {
    expect(renderAsMarkdown(';;;\n[Clip](v.mp4)\n;;;')).toBe('[Clip](v.mp4)');
  });

  it('leaves a link-less block untouched', () => {
    const md = ';;;controls:full\n![Just a poster](p.jpg)\n;;;';
    expect(renderAsMarkdown(md)).toBe(md);
  });

  it('degrades the :::wa-video alternative syntax', () => {
    expect(renderAsMarkdown(':::wa-video preload:none loop\n[Clip](v.mp4)\n:::')).toBe('[Clip](v.mp4)');
  });

  it('degrades a playlist to a bullet list joined by single newlines', () => {
    const md =
      ';;;;;;controls:standard\n;;;\n[Part 1](a.mp4)\n![Poster A](a.jpg)\n;;;\n;;;\n[Part 2](b.mp4)\n;;;\n;;;;;;';
    expect(renderAsMarkdown(md)).toBe('- [Part 1](a.mp4)\n- [Part 2](b.mp4)');
  });

  it('degrades the :::wa-video-playlist alternative syntax', () => {
    const md = ':::wa-video-playlist controls:none\n;;;\n[One](1.mp4)\n;;;\n;;;\n[Two](2.mp4)\n;;;\n:::';
    expect(renderAsMarkdown(md)).toBe('- [One](1.mp4)\n- [Two](2.mp4)');
  });
});

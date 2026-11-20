import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown, shiftPercent } from '../src/transformers/number-ticker.js';
import { process, plainMarkdown } from '../src/index.js';

describe('NumberTickerTransformer.transform', () => {
  it('currency ticker (exact)', () => {
    expect(transform('Raised [[[ 18452.75 currency:EUR ]]] so far')).toBe(
      'Raised <wa-number-ticker value="18452.75" type="currency" currency="EUR"></wa-number-ticker> so far',
    );
  });

  it('bare number and start value', () => {
    expect(transform('[[[1234]]]')).toBe('<wa-number-ticker value="1234"></wa-number-ticker>');
    expect(transform('[[[ 12000 from:10000 duration:1500 ]]] users')).toBe(
      '<wa-number-ticker value="12000" start-value="10000" duration="1500"></wa-number-ticker> users',
    );
  });

  it('emits every option in a fixed order', () => {
    const input =
      '[[[ -3.5 lang:fi decimals:2 display:name currency:usd no-grouping eager ' +
      'easing:"cubic-bezier(0.1, 0.7, 1, 0.1)" delay:200 duration:900 from:-10 ]]]';
    expect(transform(input)).toBe(
      '<wa-number-ticker value="-3.5" start-value="-10" duration="900" delay="200" ' +
        'easing="cubic-bezier(0.1, 0.7, 1, 0.1)" eager type="currency" without-grouping currency="USD" ' +
        'currency-display="name" minimum-fraction-digits="2" maximum-fraction-digits="2" lang="fi"></wa-number-ticker>',
    );
  });

  it.each([
    ['87', '0.87'],
    ['12.5', '0.125'],
    ['150', '1.5'],
    ['5', '0.05'],
    ['100', '1'],
    ['0', '0'],
    ['0.5', '0.005'],
    ['-12.5', '-0.125'],
    ['1234.5678', '12.345678'],
    ['007', '0.07'],
    ['-0', '0'],
  ])('shifts %s%% to %s', (input, value) => {
    expect(shiftPercent(input)).toBe(value);
    expect(transform(`[[[ ${input}% ]]]`)).toBe(
      `<wa-number-ticker value="${value}" type="percent"></wa-number-ticker>`,
    );
  });

  it('percent and decimal tokens', () => {
    expect(transform('[[[ 0.42 percent ]]]')).toBe(
      '<wa-number-ticker value="0.42" type="percent"></wa-number-ticker>',
    );
    expect(transform('[[[ 87% decimal ]]]')).toBe(
      '<wa-number-ticker value="0.87"></wa-number-ticker>',
    );
  });

  it('drops invalid option values', () => {
    expect(
      transform(
        '[[[ 5 currency:EURO display:wide from:abc duration:1.5 delay:-1 decimals:101 decimals:x ]]]',
      ),
    ).toBe('<wa-number-ticker value="5"></wa-number-ticker>');
    expect(transform('[[[ 5 decimals:007 locale:de ]]]')).toBe(
      '<wa-number-ticker value="5" minimum-fraction-digits="7" maximum-fraction-digits="7" lang="de"></wa-number-ticker>',
    );
  });

  it('escapes the easing value', () => {
    expect(transform('[[[ 5 easing:"a<b>&" ]]]')).toContain('easing="a&lt;b&gt;&amp;"');
  });

  it.each(['2026-06-26', '2026-06-26T10:00', 'relative', 'countdown', '12abc', '1.2.3', '1e5'])(
    'leaves [[[ %s ]]] to the date transformer',
    (token) => {
      expect(transform(`[[[ ${token} ]]]`)).toBe(`[[[ ${token} ]]]`);
    },
  );

  it('supports the :::wa-number-ticker block', () => {
    expect(transform(':::wa-number-ticker 99 eager\n:::')).toBe(
      '<wa-number-ticker value="99" eager></wa-number-ticker>',
    );
    expect(transform(':::wa-number-ticker eager\n:::')).toBe(':::wa-number-ticker eager\n:::');
  });
});

describe('NumberTickerTransformer in the pipeline', () => {
  it('routes [[[ … ]]] to a ticker, a counter or a date', () => {
    expect(process('[[[ 87% ]]] [[[ 2026-12-24 countdown ]]] [[[ 2026-06-26 ]]]')).toBe(
      '<wa-number-ticker value="0.87" type="percent"></wa-number-ticker> ' +
        '<wa-counter date="2026-12-24"></wa-counter> ' +
        '<wa-format-date date="2026-06-26" year="numeric" month="long" day="numeric"></wa-format-date>',
    );
  });
});

describe('NumberTickerTransformer.renderAsMarkdown', () => {
  it('degrades to the number as written, plus the currency', () => {
    expect(renderAsMarkdown('[[[ 87% ]]] satisfaction')).toBe('87% satisfaction');
    expect(renderAsMarkdown('Raised [[[ 18452.75 currency:eur ]]]')).toBe('Raised 18452.75 EUR');
    expect(renderAsMarkdown(':::wa-number-ticker 99 eager\n:::')).toBe('99');
    expect(plainMarkdown.process('[[[ 5% ]]] on [[[ 2026-06-26 ]]]')).toBe('5% on 2026-06-26');
  });
});

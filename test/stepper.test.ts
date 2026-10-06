import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/stepper.js';

const CHECKOUT = [
  '>>>>>> vertical label:"Checkout progress"',
  '- [x] Cart',
  '- [x] Shipping',
  '  Standard, 3–5 days',
  '- [ ] pulse icon:credit-card Payment',
  '- [ ] Review',
  '>>>>>>',
].join('\n');

describe('StepperTransformer.transform', () => {
  it('checkout stepper (exact)', () => {
    expect(transform(CHECKOUT)).toBe(
      '<wa-stepper orientation="vertical" label="Checkout progress" active="step-3">' +
        '<wa-step name="step-1" completed>Cart</wa-step>' +
        '<wa-step name="step-2" completed>Shipping<span slot="description">Standard, 3–5 days</span></wa-step>' +
        '<wa-step name="step-3" attention="pulse"><wa-icon slot="icon" name="credit-card"></wa-icon>Payment</wa-step>' +
        '<wa-step name="step-4">Review</wa-step>' +
        '</wa-stepper>',
    );
  });

  it('accepts steps without checkboxes and any bullet', () => {
    expect(transform('>>>>>>\n- One\n* Two\n+ Three\n>>>>>>')).toBe(
      '<wa-stepper active="step-1"><wa-step name="step-1">One</wa-step>' +
        '<wa-step name="step-2">Two</wa-step><wa-step name="step-3">Three</wa-step></wa-stepper>',
    );
  });

  it('treats [X] as completed', () => {
    expect(transform('>>>>>>\n- [X] Done\n- [ ] Next\n>>>>>>')).toContain(
      '<wa-step name="step-1" completed>Done</wa-step>',
    );
  });

  describe('active step resolution', () => {
    it('makes the last step active when all are complete', () => {
      expect(transform('>>>>>>\n- [x] A\n- [x] B\n>>>>>>')).toMatch(/^<wa-stepper active="step-2">/);
    });

    it('honors an explicit active flag over the first incomplete step', () => {
      const result = transform('>>>>>>\n- [ ] A\n- [ ] active B\n- [ ] C\n>>>>>>');
      expect(result).toMatch(/^<wa-stepper active="step-2">/);
      expect(result).toContain('<wa-step name="step-2">B</wa-step>');
    });

    it('lets the last explicit active flag win', () => {
      expect(transform('>>>>>>\n- active A\n- B\n- active C\n>>>>>>')).toMatch(
        /^<wa-stepper active="step-3">/,
      );
    });

    it('emits no active attribute for an empty stepper', () => {
      expect(transform('>>>>>> vertical\n\n>>>>>>')).toBe('<wa-stepper orientation="vertical"></wa-stepper>');
    });
  });

  it('emits step attributes in a fixed order', () => {
    expect(transform('>>>>>>\n- [x] bounce danger disabled loading Late\n>>>>>>')).toContain(
      '<wa-step name="step-1" completed loading disabled variant="danger" attention="bounce">Late</wa-step>',
    );
  });

  it('uses rightmost-wins for variant and attention', () => {
    expect(transform('>>>>>>\n- warning success pulse none X\n>>>>>>')).toContain(
      '<wa-step name="step-1" variant="success" attention="none">X</wa-step>',
    );
  });

  it('only consumes flags at the start of the label', () => {
    expect(transform('>>>>>>\n- Ship the active order\n>>>>>>')).toContain(
      '<wa-step name="step-1">Ship the active order</wa-step>',
    );
  });

  it('joins multi-line descriptions and renders them as inline Markdown', () => {
    expect(transform('>>>>>>\n- Deploy\n  Push to **main**\n    then wait\n>>>>>>')).toContain(
      '<wa-step name="step-1">Deploy<span slot="description">Push to <strong>main</strong> then wait</span></wa-step>',
    );
  });

  it('ignores blank lines, unindented prose and continuations before the first step', () => {
    expect(transform('>>>>>>\n  orphan\n\n- A\n\nnot a step\n- B\n>>>>>>')).toBe(
      '<wa-stepper active="step-1"><wa-step name="step-1">A</wa-step><wa-step name="step-2">B</wa-step></wa-stepper>',
    );
  });

  it('renders labels as inline Markdown', () => {
    expect(transform('>>>>>>\n- [Docs](/docs) & *more*\n>>>>>>')).toContain(
      '<wa-step name="step-1"><a href="/docs">Docs</a> &amp; <em>more</em></wa-step>',
    );
  });

  it('HTML-escapes the container label', () => {
    expect(transform('>>>>>> label:"Tom & <Jerry>"\n- A\n>>>>>>')).toMatch(
      /^<wa-stepper label="Tom &amp; &lt;Jerry&gt;" active="step-1">/,
    );
  });

  it('accepts a single-quoted label and keeps its words out of the orientation tokens', () => {
    expect(transform(">>>>>> label:'The vertical path' horizontal\n- A\n>>>>>>")).toMatch(
      /^<wa-stepper orientation="horizontal" label="The vertical path" active="step-1">/,
    );
  });

  it('drops unknown container tokens', () => {
    expect(transform('>>>>>> clickable linear auto\n- A\n>>>>>>')).toMatch(
      /^<wa-stepper orientation="auto" active="step-1">/,
    );
  });

  it('transforms the alternative syntax identically', () => {
    expect(transform(':::wa-stepper vertical\n- [x] A\n- B\n:::')).toBe(
      transform('>>>>>> vertical\n- [x] A\n- B\n>>>>>>'),
    );
  });

  it('leaves a lone >>> separator alone', () => {
    const markdown = '^^^\nSummary\n>>>\nBody\n^^^';
    expect(transform(markdown)).toBe(markdown);
  });
});

describe('StepperTransformer.renderAsMarkdown', () => {
  it('degrades to an ordered task list with the current step in bold (exact)', () => {
    expect(renderAsMarkdown(CHECKOUT)).toBe(
      '1. [x] Cart\n2. [x] Shipping\n   Standard, 3–5 days\n3. [ ] **Payment**\n4. [ ] Review',
    );
  });

  it('bolds the last step when every step is complete', () => {
    expect(renderAsMarkdown('>>>>>>\n- [x] A\n- [x] B\n>>>>>>')).toBe('1. [x] A\n2. [x] **B**');
  });

  it('bolds the explicitly active step and drops its flags', () => {
    expect(renderAsMarkdown('>>>>>>\n- A\n- active warning B\n>>>>>>')).toBe('1. [ ] A\n2. [ ] **B**');
  });

  it('indents descriptions to the marker width past nine steps', () => {
    const steps = Array.from({ length: 10 }, (_, i) => `- [x] S${i + 1}`);
    steps[9] += '\n  Last one';
    expect(renderAsMarkdown(`>>>>>>\n${steps.join('\n')}\n>>>>>>`)).toMatch(
      /10\. \[x\] \*\*S10\*\*\n {4}Last one$/,
    );
  });

  it('degrades the alternative syntax identically', () => {
    expect(renderAsMarkdown(':::wa-stepper\n- [x] A\n- B\n:::')).toBe(
      renderAsMarkdown('>>>>>>\n- [x] A\n- B\n>>>>>>'),
    );
  });
});

import { parseAttributes, type AttributeSchema, type ParsedAttributes } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml } from './base.js';

/**
 * Transforms stepper syntax into a display-only `<wa-stepper>` / `<wa-step>`
 * progress indicator, written as a Markdown task list.
 *   Primary:     >>>>>> params?\n- [x] Step\n  description\n- [ ] Step\n>>>>>>
 *   Alternative: :::wa-stepper params?\n…list…\n:::
 *
 * Container params: `horizontal`/`vertical`/`auto` -> orientation, and
 * `label:"text"` -> label (accessible name).
 *
 * Steps are unindented list lines (`-`, `*` or `+`): `[x]`/`[X]` marks the step
 * completed (`[ ]` or no box: not completed); leading flags are `active`,
 * `loading`, `disabled`, a variant (neutral, brand, success, warning, danger),
 * an attention (none, pulse, bounce) and `icon:name` (slotted into the step's
 * icon slot); the rest of the line is the label, as inline Markdown. Lines
 * indented by two or more spaces under a step are joined into its description
 * slot, as inline Markdown.
 *
 * Steps are named step-1..N and the container's `active` points at the step
 * flagged `active` (last one wins), else the first incomplete step, else the
 * last step. Interactivity (`clickable`, `linear`, step invokers) is omitted on
 * purpose: these steps have no content panels, so there is nothing to navigate
 * between without app JavaScript.
 *
 * Runs first in the pipeline (after the divider) so a stepper can sit inside
 * any container body. Its `>>>>>>` fence never matches the `^>>>$` separator
 * the details/dialog/popover/tooltip/random-content transformers split on.
 */
export const STEPPER_ATTRIBUTES: AttributeSchema = {
  orientation: ['horizontal', 'vertical', 'auto'],
};

export const STEP_ATTRIBUTES: AttributeSchema = {
  variant: ['neutral', 'brand', 'success', 'warning', 'danger'],
  attention: ['none', 'pulse', 'bounce'],
};

const STEP_FLAGS = ['active', 'loading', 'disabled'];

const ICON_SLOTS: SlotConfig = {
  default: 'icon',
  slots: ['icon'],
  slotMap: { icon: 'icon' },
};

// Ruby: /^>{6}([^\n]*)\n(.*?)\n>{6}[ \t]*$/m  and
//       /^:::wa-stepper[ \t]*([^\n]*)\n(.*?)\n:::[ \t]*$/m
// `(?![^\n])` mirrors Ruby's end-of-line `$` exactly (see divider.ts).
const PRIMARY_REGEX = /^>{6}([^\n]*)\n([\s\S]*?)\n>{6}[ \t]*(?![^\n])/gm;
const ALTERNATIVE_REGEX = /^:::wa-stepper[ \t]*([^\n]*)\n([\s\S]*?)\n:::[ \t]*(?![^\n])/gm;
const LABEL_REGEX = /label:(?:"([^"]*)"|'([^']*)')/;
const STEP_LINE_REGEX = /^[-*+][ \t]+(.*)$/;
const CONTINUATION_REGEX = /^[ \t]{2,}(\S.*)$/;
const CHECKBOX_REGEX = /^\[([ xX])\](?:[ \t]+(.*))?$/;

interface Step {
  completed: boolean;
  flags: string[];
  attributes: ParsedAttributes;
  icons: Record<string, string>;
  label: string;
  descriptionLines: string[];
  description: string;
}

export function transform(content: string): string {
  const transformProc = (rawParams = '', body = ''): string => {
    const [label, paramsString] = extractLabel(rawParams);
    const attributes = parseAttributes(paramsString, STEPPER_ATTRIBUTES);
    const steps = parseSteps(body);
    const active = activeIndex(steps);

    const attrParts: string[] = [];
    if (attributes.orientation) attrParts.push(`orientation="${attributes.orientation}"`);
    if (label !== '') attrParts.push(`label="${escapeHtml(label)}"`);
    if (active !== null) attrParts.push(`active="step-${active + 1}"`);
    const attrsString = attrParts.length === 0 ? '' : ` ${attrParts.join(' ')}`;

    const stepsHtml = steps.map((step, index) => buildStep(step, index)).join('');
    return `<wa-stepper${attrsString}>${stepsHtml}</wa-stepper>`;
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * Degrade to an ordered task list: completed steps keep `[x]`, the current step
 * is bold, and a description becomes an indented continuation line.
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', body = ''): string => {
    const steps = parseSteps(body);
    const active = activeIndex(steps);

    return steps
      .map((step, index) => {
        const marker = `${index + 1}. `;
        const label = index === active && step.label !== '' ? `**${step.label}**` : step.label;
        let line = `${marker}[${step.completed ? 'x' : ' '}]`;
        if (label !== '') line += ` ${label}`;
        if (step.description !== '') line += `\n${' '.repeat(marker.length)}${step.description}`;
        return line;
      })
      .join('\n');
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

// Pull out label:"…" (or label:'…') before the bare tokens are parsed, so words
// inside the label can't be read as orientation tokens.
function extractLabel(paramsString: string): [string, string] {
  const match = LABEL_REGEX.exec(paramsString);
  if (!match) return ['', paramsString];
  return [(match[1] ?? match[2] ?? '').trim(), paramsString.replace(LABEL_REGEX, ' ')];
}

function parseSteps(body: string): Step[] {
  const steps: Step[] = [];
  for (const rawLine of (body ?? '').split('\n')) {
    const line = rawLine.replace(/\r$/, ''); // mirror Ruby String#chomp
    const stepMatch = STEP_LINE_REGEX.exec(line);
    if (stepMatch) {
      steps.push(parseStep(stepMatch[1]!));
      continue;
    }
    const continuation = CONTINUATION_REGEX.exec(line);
    if (continuation && steps.length > 0) {
      steps[steps.length - 1]!.descriptionLines.push(continuation[1]!.trim());
    }
  }
  for (const step of steps) step.description = step.descriptionLines.join(' ');
  return steps;
}

function parseStep(raw: string): Step {
  let completed = false;
  let rest = raw;
  const checkbox = CHECKBOX_REGEX.exec(raw.trim());
  if (checkbox) {
    completed = checkbox[1] !== ' ';
    rest = checkbox[2] ?? '';
  }

  const tokens = rest.trim() === '' ? [] : rest.trim().split(/\s+/);
  const lead: string[] = [];
  while (tokens.length > 0 && isLeadingToken(tokens[0]!)) lead.push(tokens.shift()!);
  const leadString = lead.join(' ');

  return {
    completed,
    flags: lead.filter((token) => STEP_FLAGS.includes(token)),
    attributes: parseAttributes(leadString, STEP_ATTRIBUTES),
    icons: parseIconSlots(leadString, ICON_SLOTS).icons,
    label: tokens.join(' '),
    descriptionLines: [],
    description: '',
  };
}

function isLeadingToken(token: string): boolean {
  return (
    token.startsWith('icon:') ||
    STEP_FLAGS.includes(token) ||
    Object.values(STEP_ATTRIBUTES).some((values) => values.includes(token))
  );
}

// The explicitly active step (last wins), else the first incomplete one, else
// the last step; null when there are no steps.
function activeIndex(steps: Step[]): number | null {
  if (steps.length === 0) return null;

  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i]!.flags.includes('active')) return i;
  }

  const firstIncomplete = steps.findIndex((step) => !step.completed);
  return firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
}

function buildStep(step: Step, index: number): string {
  const attrParts = [`name="step-${index + 1}"`];
  if (step.completed) attrParts.push('completed');
  if (step.flags.includes('loading')) attrParts.push('loading');
  if (step.flags.includes('disabled')) attrParts.push('disabled');
  if (step.attributes.variant) attrParts.push(`variant="${step.attributes.variant}"`);
  if (step.attributes.attention) attrParts.push(`attention="${step.attributes.attention}"`);

  const iconHtml = iconsToHtml(step.icons, ICON_SLOTS.slotMap);
  const description = renderInline(step.description);
  const descriptionHtml = description === '' ? '' : `<span slot="description">${description}</span>`;

  return `<wa-step ${attrParts.join(' ')}>${iconHtml}${renderInline(step.label)}${descriptionHtml}</wa-step>`;
}

// Inline Markdown: render, then drop the wrapping <p> (the badge idiom).
function renderInline(text: string): string {
  if (text === '') return '';
  return renderMarkdown(text)
    .trim()
    .replace(/^<p>([\s\S]*)<\/p>$/, (_m, inner: string) => inner);
}

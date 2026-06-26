import { describe, it, expect, afterEach } from 'vitest';
import { configure, getConfiguration, resetConfiguration } from '../src/config.js';
import { transform as calloutTransform } from '../src/transformers/callout.js';

describe('configuration', () => {
  afterEach(() => resetConfiguration());

  it('starts unconfigured (null)', () => {
    expect(getConfiguration()).toBeNull();
  });

  it('creates default configuration', () => {
    const config = configure();
    expect(config.calloutIcons.info).toBe('circle-info');
    expect(config.calloutIcons.success).toBe('circle-check');
    expect(config.calloutIcons.warning).toBe('triangle-exclamation');
    expect(config.calloutIcons.danger).toBe('circle-exclamation');
  });

  it('merges calloutIcons over defaults', () => {
    configure({ calloutIcons: { info: 'info-circle' } });
    expect(getConfiguration()!.calloutIcons.info).toBe('info-circle');
    // Other defaults are retained by the merge.
    expect(getConfiguration()!.calloutIcons.success).toBe('circle-check');
  });

  it('persists configuration across calls', () => {
    configure({ calloutIcons: { info: 'custom-icon' } });
    configure({ customComponents: { test: 'Test' } });
    expect(getConfiguration()!.calloutIcons.info).toBe('custom-icon');
    expect(getConfiguration()!.customComponents.test).toBe('Test');
  });

  it('callout uses brand-keyed defaults when unconfigured', () => {
    expect(calloutTransform(':::info\nx\n:::')).toContain('name="circle-info"');
  });

  it('replicates Ruby quirk: configure() makes :::info icon empty (brand key missing)', () => {
    configure(); // info-keyed default map; lookup is by "brand"
    expect(calloutTransform(':::info\nx\n:::')).toContain('name=""');
  });

  it('configuring a brand key restores the :::info icon', () => {
    configure({ calloutIcons: { brand: 'star' } });
    expect(calloutTransform(':::info\nx\n:::')).toContain('name="star"');
  });
});

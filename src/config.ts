/**
 * Module-level configuration singleton, mirroring the Ruby engine's
 * `Markawesome.configure` / `Markawesome.configuration`.
 *
 * The configuration starts as `null` (unconfigured). It is created lazily on
 * the first {@link configure} call. Consumers such as the callout transformer
 * fall back to their own built-in defaults while the configuration is `null` —
 * this distinction is load-bearing and matches the Ruby behaviour exactly.
 */

export interface Configuration {
  /** Variant -> icon name. Keyed by `info`/`success`/`neutral`/`warning`/`danger`. */
  calloutIcons: Record<string, string>;
  /** Reserved for host-registered custom components. */
  customComponents: Record<string, string>;
}

export interface ConfigureOptions {
  calloutIcons?: Record<string, string>;
  customComponents?: Record<string, string>;
}

// Mirrors Ruby `Configuration#default_callout_icons` (info-keyed). Note this is
// deliberately distinct from the callout transformer's own brand-keyed fallback
// used while the configuration is unset.
const DEFAULT_CALLOUT_ICONS: Record<string, string> = {
  info: 'circle-info',
  success: 'circle-check',
  neutral: 'gear',
  warning: 'triangle-exclamation',
  danger: 'circle-exclamation',
};

let configuration: Configuration | null = null;

/**
 * Create or update the global configuration, merging the provided options into
 * the existing (or freshly defaulted) singleton. Last-write-wins per key.
 */
export function configure(options: ConfigureOptions = {}): Configuration {
  if (!configuration) {
    configuration = {
      calloutIcons: { ...DEFAULT_CALLOUT_ICONS },
      customComponents: {},
    };
  }
  if (options.calloutIcons) {
    configuration.calloutIcons = { ...configuration.calloutIcons, ...options.calloutIcons };
  }
  if (options.customComponents) {
    configuration.customComponents = {
      ...configuration.customComponents,
      ...options.customComponents,
    };
  }
  return configuration;
}

/** Return the current configuration, or `null` if {@link configure} was never called. */
export function getConfiguration(): Configuration | null {
  return configuration;
}

/** Reset configuration to the unconfigured state (primarily for tests). */
export function resetConfiguration(): void {
  configuration = null;
}

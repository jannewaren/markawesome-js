import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // markdown-it is bundled as a regular dependency, not externalized into the
  // consumer's graph — the engine owns its internal renderer so inner rendering
  // stays deterministic and decoupled from the host's markdown-it.
  target: 'node18',
});

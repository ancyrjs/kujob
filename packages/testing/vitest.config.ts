import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'nodenext' },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'tests/suites/functional/**/*.test.ts'],
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
    },
  },
});

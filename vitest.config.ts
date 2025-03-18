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
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/config/global-setup.ts'],
  },
});

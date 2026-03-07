import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',   // relative paths so the build works in any subdirectory (e.g. PR previews)
  test: {
    environment: 'node',
    css: false,
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});

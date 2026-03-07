import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    css: false,
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});

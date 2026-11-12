import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves it at /shortlist/
  base: '/shortlist/',
  // the browser tests in e2e/ run with Playwright, not vitest
  test: { exclude: ['e2e/**', 'node_modules/**'] },
});

import { defineConfig, devices } from '@playwright/test';

// A real browser on the built site (npm run build first), on a desktop and on a phone.
const PORT = 4330;

export default defineConfig({
  testDir: 'e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/shortlist/`, locale: 'en-US' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ].map((project) => ({
    ...project,
    // locally it uses the Edge that's already installed instead of downloading Chromium
    use: { ...project.use, channel: process.env.CI ? undefined : 'msedge' },
  })),
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/shortlist/`,
    reuseExistingServer: false,
  },
});

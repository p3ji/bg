import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || '3000';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/unit/**',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'off',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: 'Mobile Chrome (Android)',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari (iOS)',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
});

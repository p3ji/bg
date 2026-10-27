import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
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
    command: 'npm run start',
    url: 'http://localhost:3000',
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

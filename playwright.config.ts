import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = 'C:/Users/vishn/.agent-browser/browsers/chrome-154.0.8037.57/chrome.exe';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/report' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.CHROME_PATH || (existsSync(localChrome) ? localChrome : undefined) },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

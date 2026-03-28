import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3200',
    headless: true,
  },
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --port 3200 --host 127.0.0.1',
    url: 'http://127.0.0.1:3200',
    reuseExistingServer: false,
    timeout: 240_000,
  },
})

import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:5183' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5183', url: 'http://127.0.0.1:5183', env: { VITE_DEARCC_URL: 'http://127.0.0.1:3100', VITE_POSTHOG_ENABLED: 'false' } },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Server ESM — typed loosely for the Vite config project
// @ts-expect-error — no .d.ts for server/*.mjs under nodenext
import { v3ApiPlugin } from './server/v3Api.mjs'
// @ts-expect-error — no .d.ts for server/*.mjs under nodenext
import { v4ApiPlugin } from './server/v4Api.mjs'
// @ts-expect-error — no .d.ts for server/*.mjs under nodenext
import { profileProgressApiPlugin } from './server/profileProgressApi.mjs'

export default defineConfig(({ mode }) => {
  // Expose AOI_* to the Vite Node process (API plugin), not to the browser.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'AOI_USERNAME',
    'AOI_PASSWORD',
    'AOI_BASE_URL',
    'DEARCC_PROFILE_URL',
    'PROFILE_SYNC_SECRET',
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/fieldreport/' : '/',
    plugins: [react(), tailwindcss(), v3ApiPlugin(), v4ApiPlugin(), profileProgressApiPlugin()],
  }
})

import { defineConfig, devices } from '@playwright/test'

// The production build, served statically, as on GitHub Pages
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:8090',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'parcel build src/index.html --public-url ./ --dist-dir .e2e/dist --no-cache && python3 -m http.server 8090 --directory .e2e/dist',
    url: 'http://localhost:8090',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})

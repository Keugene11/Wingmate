import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "https://wingmate.live",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPad Air",
      use: {
        ...devices["iPad Mini"],
        // iPad Air 11-inch dimensions (the review device)
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: "webkit",
      },
    },
    {
      name: "iPad Air Landscape",
      use: {
        ...devices["iPad Mini landscape"],
        viewport: { width: 1180, height: 820 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: "webkit",
      },
    },
    {
      name: "iPhone 15",
      use: {
        ...devices["iPhone 15"],
      },
    },
  ],
});

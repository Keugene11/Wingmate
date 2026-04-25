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
      testIgnore: /android-(phone|tablet)-screenshots\.spec\.ts/,
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
      testIgnore: /android-(phone|tablet)-screenshots\.spec\.ts/,
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
      testIgnore: /android-(phone|tablet)-screenshots\.spec\.ts/,
      use: {
        ...devices["iPhone 15"],
      },
    },
    {
      name: "android-phone",
      testMatch: /android-phone-screenshots\.spec\.ts/,
    },
    {
      name: "android-tablet",
      testMatch: /android-tablet-screenshots\.spec\.ts/,
    },
  ],
});

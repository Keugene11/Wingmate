import { test, expect } from "@playwright/test";

/**
 * iPad smoke tests for Wingmate.
 * Runs against the live deployment to catch crashes, layout issues,
 * and iPad-specific rendering problems before App Store submission.
 */

test.describe("iPad Smoke Tests", () => {
  test("onboarding page loads without crash", async ({ page }) => {
    await page.goto("/onboarding");
    // Should show the first onboarding question
    await expect(page.locator("text=approach anxiety")).toBeVisible();
    // Next button should eventually appear (delayed 5s)
    await expect(page.locator("button:has-text('Next')")).toBeVisible({
      timeout: 8000,
    });
  });

  test("onboarding Next button navigates without crash", async ({ page }) => {
    await page.goto("/onboarding");
    const nextBtn = page.locator("button:has-text('Next')");
    await expect(nextBtn).toBeVisible({ timeout: 8000 });
    await nextBtn.click();
    // Should navigate to step 2 — value proposition
    await expect(page.locator("text=subscription")).toBeVisible({
      timeout: 5000,
    });
  });

  test("onboarding shows sign-in buttons on final step", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 1 → Next
    const next1 = page.locator("button:has-text('Next')");
    await expect(next1).toBeVisible({ timeout: 8000 });
    await next1.click();

    // Step 2 → Next
    const next2 = page.locator("button:has-text('Next')");
    await expect(next2).toBeVisible({ timeout: 8000 });
    await next2.click();

    // Step 3 — should show plan cards + sign-in
    await expect(page.locator("text=Sign in with Google")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=Pro Yearly")).toBeVisible();
    await expect(page.locator("text=Pro Monthly")).toBeVisible();
  });

  test("plans page loads without crash", async ({ page }) => {
    await page.goto("/plans");
    // Should show plans content or redirect to onboarding
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(
      url.includes("/plans") || url.includes("/onboarding")
    ).toBeTruthy();
  });

  test("privacy page loads without crash", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("delete-account page loads without crash", async ({ page }) => {
    await page.goto("/delete-account");
    await expect(page.locator("text=Delete account")).toBeVisible();
  });

  test("no content overflows viewport width", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  });

  test("buttons are tappable and not obscured", async ({ page }) => {
    await page.goto("/onboarding");
    const nextBtn = page.locator("button:has-text('Next')");
    await expect(nextBtn).toBeVisible({ timeout: 8000 });

    // Ensure button is within viewport
    const box = await nextBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const viewport = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test("page renders at iPad width without horizontal scroll", async ({
    page,
  }) => {
    // Visit multiple pages and check for horizontal overflow
    const paths = ["/onboarding", "/privacy", "/delete-account", "/plans"];

    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);
    }
  });
});

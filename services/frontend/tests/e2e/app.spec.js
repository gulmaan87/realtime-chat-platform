import { test, expect } from '@playwright/test';

test.describe('Realtime Chat Platform - Rendering and Layout Tests', () => {
  test('Landing page renders smoothly', async ({ page }) => {
    // Go to the starting page
    await page.goto('/');

    // Expect the title to contain "LevelUp Chat"
    await expect(page.locator('text=LevelUp Chat').first()).toBeVisible();

    // Verify the showcase hero is rendered with the expected layout
    const heroSection = page.locator('.showcase-hero');
    await expect(heroSection).toBeVisible();

    // Take a screenshot to verify layout rendering
    await expect(page).toHaveScreenshot('landing-page.png', { maxDiffPixelRatio: 0.1 });
  });

  test('Navigation to Auth pages works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Click on Open app (login route)
    await page.click('text=Open app');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Navigate to Signup
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
  });
});

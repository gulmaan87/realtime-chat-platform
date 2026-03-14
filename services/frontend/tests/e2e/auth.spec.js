import { test, expect } from '@playwright/test';

const AUTH_API_URL = 'https://realtime-chat-platform-1.onrender.com';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Successful login redirects to chat', async ({ page }) => {
    // Mock successful login response
    await page.route(`${AUTH_API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-jwt-token',
          user: { id: '123', username: 'testuser', email: 'test@example.com' }
        }),
      });
    });

    // Mock contacts fetch since redirect to /app will trigger it
    await page.route(`${AUTH_API_URL}/contacts`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to /app
    await expect(page).toHaveURL(/.*\/app/);
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
  });

  test('Failed login shows error message', async ({ page }) => {
    // Mock failed login response
    await page.route(`${AUTH_API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    });

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('Signup flow works correctly', async ({ page }) => {
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/.*\/signup/);

    // Mock successful signup
    await page.route(`${AUTH_API_URL}/auth/signup`, async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'new-user-token',
          user: { id: '456', username: 'newuser', email: 'new@example.com' }
        }),
      });
    });

    // Mock contacts fetch
    await page.route(`${AUTH_API_URL}/contacts`, async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.fill('input[placeholder="Username"]', 'newuser');
    await page.fill('input[placeholder="Email"]', 'new@example.com');
    await page.fill('input[placeholder="Password"]', 'securepass123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/app/);
  });
});

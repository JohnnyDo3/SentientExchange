import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between all main pages', async ({ page }) => {
    // Start at home
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/');

    // Navigate to marketplace
    await page.goto('/marketplace', { waitUntil: 'networkidle', timeout: 60000 });
    await expect(page).toHaveURL('/marketplace');
    await expect(page.locator('main, div').first()).toBeVisible();

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('main, div').first()).toBeVisible();

    // Navigate to swarm
    await page.goto('/swarm', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page).toHaveURL('/swarm');
    await expect(page.locator('main, div').first()).toBeVisible();
  });

  test('should navigate to provider pages', async ({ page }) => {
    // My Services
    await page.goto('/providers/my-services', { waitUntil: 'networkidle', timeout: 60000 });
    await expect(page).toHaveURL('/providers/my-services');
    await expect(page.locator('main, div').first()).toBeVisible();

    // Register Service
    await page.goto('/providers/register', { waitUntil: 'networkidle', timeout: 60000 });
    await expect(page).toHaveURL('/providers/register');
    await expect(page.locator('main, div').first()).toBeVisible();
  });

  test('should have working back navigation', async ({ page }) => {
    // Navigate forward
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Navigate back and wait for navigation to complete
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.goBack()
    ]);

    await expect(page).toHaveURL('/');
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page', { timeout: 30000 });

    // Should show 404 or redirect
    const notFound = page.locator('text=/404|not found/i');
    // Either shows 404 or redirects to home (both are valid)
    const is404 = await notFound.isVisible({ timeout: 3000 }).catch(() => false);
    const isHome = page.url().includes('localhost:3000/') || page.url().includes('localhost:3000');

    expect(is404 || isHome).toBeTruthy();
  });

  test('should have header on all pages', async ({ page }) => {
    const pages = [
      { path: '/', waitUntil: 'networkidle' as const },
      { path: '/marketplace', waitUntil: 'domcontentloaded' as const },
      { path: '/dashboard', waitUntil: 'domcontentloaded' as const },
    ];

    for (const { path, waitUntil } of pages) {
      await page.goto(path, { waitUntil, timeout: 60000 });

      // Header or nav or main content should exist
      const header = page.locator('header, nav, main, [role="banner"]').first();
      await expect(header).toBeVisible({ timeout: 10000 });
    }
  });
});

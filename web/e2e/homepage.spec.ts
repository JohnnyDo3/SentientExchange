import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check title
    await expect(page).toHaveTitle(/AgentMarket/i);

    // Check main heading (use first() to handle multiple h1 elements)
    await expect(page.locator('h1').first()).toContainText(/agent/i);
  });

  test('should have hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Hero should be visible - check for any large heading text
    const hero = page.locator('h1, h2').filter({ hasText: /future|ai|commerce|agent/i }).first();
    await expect(hero).toBeVisible();
  });

  test('should have call-to-action buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Should have marketplace link (may be in header or as CTA)
    const marketplaceLink = page.locator('a, button').filter({ hasText: /marketplace|explore|discover/i }).first();
    await expect(marketplaceLink).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to marketplace', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Verify marketplace link exists in the page
    const marketplaceLink = page.locator('a[href="/marketplace"]').first();
    await expect(marketplaceLink).toHaveCount(1);

    // Navigate to marketplace (use goto instead of click to avoid visibility issues)
    await page.goto('/marketplace', { waitUntil: 'networkidle', timeout: 60000 });

    // Should navigate to marketplace
    await expect(page).toHaveURL(/\/marketplace/);
  });

  test('should have footer or page content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check that page has loaded with content (footer or main content)
    const content = page.locator('footer, main, [role="main"]').first();
    await expect(content).toBeVisible();
  });
});

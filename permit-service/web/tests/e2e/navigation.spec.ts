import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate from landing to chat page', async ({ page }) => {
    await page.goto('/')

    // Click main CTA
    await page.getByRole('link', { name: /Start Free Application/i }).first().click()

    // Should navigate to chat page
    await expect(page).toHaveURL('/chat')
    await expect(page.getByRole('heading', { name: /HVAC Permit Application/i })).toBeVisible()
  })

  test('should display header on all pages', async ({ page }) => {
    // Check on landing page
    await page.goto('/')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByText('AI Permit Tampa')).toBeVisible()

    // Check on chat page
    await page.goto('/chat')
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('should navigate back from chat to home', async ({ page }) => {
    await page.goto('/chat')

    // Click back button
    await page.getByRole('link').first().click()

    // Should be back on home
    await expect(page).toHaveURL('/')
  })

  test('should have working header navigation links', async ({ page }) => {
    await page.goto('/')

    // Check that navigation links exist (they may not navigate to real pages yet)
    await expect(page.getByRole('link', { name: 'How It Works' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pricing' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible()
  })

  test('should show mobile menu on small screens', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Mobile menu button should be visible
    const menuButton = page.getByRole('button', { name: /Toggle menu/i })
    await expect(menuButton).toBeVisible()

    // Desktop navigation should be hidden
    const desktopNav = page.locator('.hidden.md\\:flex')
    await expect(desktopNav).not.toBeVisible()
  })
})

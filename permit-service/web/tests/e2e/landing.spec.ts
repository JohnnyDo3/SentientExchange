import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load landing page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/AI Permit Tampa/)
  })

  test('should display hero section with correct content', async ({ page }) => {
    // Check hero heading
    await expect(page.getByRole('heading', { name: /Get Your HVAC Permit in/i })).toBeVisible()
    await expect(page.getByText('5 Minutes')).toBeVisible()

    // Check trust badge
    await expect(page.getByText('Trusted by 500+ Tampa Contractors')).toBeVisible()

    // Check CTAs
    await expect(page.getByRole('link', { name: /Start Free Application/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /See How It Works/i })).toBeVisible()
  })

  test('should display trust signals', async ({ page }) => {
    await expect(page.getByText('Accela Certified')).toBeVisible()
    await expect(page.getByText('PCI Compliant')).toBeVisible()
  })

  test('should display How It Works section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible()

    // Check all 3 steps
    await expect(page.getByText('1. Chat with AI')).toBeVisible()
    await expect(page.getByText('2. Review & Pay')).toBeVisible()
    await expect(page.getByText('3. Download or Submit')).toBeVisible()

    // Check timing indicators
    await expect(page.getByText('~5 minutes')).toBeVisible()
    await expect(page.getByText('~30 seconds')).toBeVisible()
  })

  test('should display pricing section with both tiers', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Simple, Transparent Pricing/i })).toBeVisible()

    // Check Tier 1
    await expect(page.getByText('DIY Submission')).toBeVisible()
    await expect(page.getByText('$30')).toBeVisible()

    // Check Tier 2
    await expect(page.getByText('Full Service')).toBeVisible()
    await expect(page.getByText('$150')).toBeVisible()

    // Check "Most Popular" badge
    await expect(page.getByText('Most Popular')).toBeVisible()
  })

  test('should display testimonials section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /What Contractors Are Saying/i })).toBeVisible()

    // Check contractor names
    await expect(page.getByText('John Martinez')).toBeVisible()
    await expect(page.getByText('Sarah Rodriguez')).toBeVisible()
    await expect(page.getByText('David Thompson')).toBeVisible()

    // Check company names
    await expect(page.getByText('Cool Air HVAC, Tampa')).toBeVisible()
  })

  test('should display final CTA section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Ready to Save Time/i })).toBeVisible()
    await expect(page.getByText('No credit card required • 5-minute setup')).toBeVisible()
  })

  test('should display footer with all sections', async ({ page }) => {
    // Check footer sections
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.getByText('Quick Links')).toBeVisible()
    await expect(page.getByText('Support')).toBeVisible()
    await expect(page.getByText('Service Area')).toBeVisible()

    // Check service areas
    await expect(page.getByText('Hillsborough County')).toBeVisible()
    await expect(page.getByText('Pinellas County')).toBeVisible()
    await expect(page.getByText('Pasco County')).toBeVisible()
  })
})

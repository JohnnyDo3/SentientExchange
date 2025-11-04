import { test, expect } from '@playwright/test'

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('should load chat page with initial message', async ({ page }) => {
    // Check page heading
    await expect(page.getByRole('heading', { name: /HVAC Permit Application/i })).toBeVisible()

    // Check initial AI message is displayed
    await expect(page.getByText(/Hey there! I'm here to help you/i)).toBeVisible()
    await expect(page.getByText(/property address/i)).toBeVisible()
  })

  test('should display progress sidebar on desktop', async ({ page }) => {
    // Check progress sidebar exists
    await expect(page.getByText('Your Progress')).toBeVisible()

    // Check all progress steps
    await expect(page.getByText('Property Details')).toBeVisible()
    await expect(page.getByText('Work Description')).toBeVisible()
    await expect(page.getByText('Contractor Info')).toBeVisible()
    await expect(page.getByText('Equipment Details')).toBeVisible()
    await expect(page.getByText('Review & Pay')).toBeVisible()
  })

  test('should display trust signals in sidebar', async ({ page }) => {
    await expect(page.getByText('Accela Certified')).toBeVisible()
    await expect(page.getByText('Secure & Encrypted')).toBeVisible()
    await expect(page.getByText('~5 minute process')).toBeVisible()
  })

  test('should have message input and send button', async ({ page }) => {
    // Check input exists
    const input = page.getByPlaceholder('Type your answer...')
    await expect(input).toBeVisible()

    // Check send button exists
    const sendButton = page.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeVisible()

    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled()
  })

  test('should enable send button when input has text', async ({ page }) => {
    const input = page.getByPlaceholder('Type your answer...')
    const sendButton = page.getByRole('button', { name: 'Send' })

    // Type something
    await input.fill('123 Main St, Tampa, FL 33601')

    // Send button should now be enabled
    await expect(sendButton).toBeEnabled()
  })

  test('should display mobile progress bar on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Progress should show at bottom
    await expect(page.getByText(/Step \d of \d/)).toBeVisible()
  })

  test('should show help text below input', async ({ page }) => {
    await expect(page.getByText(/Press Enter to send/i)).toBeVisible()
    await expect(page.getByText(/encrypted and secure/i)).toBeVisible()
  })

  test('should display session time in header', async ({ page }) => {
    // Session time should be visible
    const timeRegex = /\d{1,2}:\d{2}/
    await expect(page.locator('text=' + timeRegex)).toBeVisible()
  })
})

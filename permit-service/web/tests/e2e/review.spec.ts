import { test, expect } from '@playwright/test'

test.describe('Review Page', () => {
  test('should redirect to chat if no session exists', async ({ page }) => {
    await page.goto('/review')

    // Should redirect to chat page
    await page.waitForURL('/chat', { timeout: 5000 })
    await expect(page).toHaveURL('/chat')
  })

  test('should display page structure (when session exists)', async ({ page, context }) => {
    // Mock localStorage with session data
    await context.addInitScript(() => {
      const mockState = {
        state: {
          sessionId: 'test-session-123',
          permitData: {
            propertyAddress: '123 Main St',
            propertyCity: 'Tampa',
            propertyZip: '33601',
            contractorName: 'Test Contractor',
            contractorLicense: 'CL123456',
            equipmentType: 'Central AC',
          },
          selectedTier: null,
        },
        version: 0,
      }
      localStorage.setItem('chat-storage', JSON.stringify(mockState))
    })

    await page.goto('/review')

    // Check header
    await expect(page.getByRole('heading', { name: /Review & Select Service/i })).toBeVisible()

    // Check tier cards exist
    await expect(page.getByText('DIY Submission')).toBeVisible()
    await expect(page.getByText('Full Service')).toBeVisible()

    // Check pricing
    await expect(page.getByText('$30')).toBeVisible()
    await expect(page.getByText('$150')).toBeVisible()
  })

  test('should display application summary sections', async ({ page, context }) => {
    // Mock localStorage
    await context.addInitScript(() => {
      const mockState = {
        state: {
          sessionId: 'test-session-123',
          permitData: {
            propertyAddress: '123 Main St',
            propertyCity: 'Tampa',
            propertyZip: '33601',
            contractorName: 'Test Contractor',
            contractorLicense: 'CL123456',
            contractorPhone: '813-555-0100',
            equipmentType: 'Central AC',
            equipmentBrand: 'Carrier',
          },
          selectedTier: null,
        },
        version: 0,
      }
      localStorage.setItem('chat-storage', JSON.stringify(mockState))
    })

    await page.goto('/review')

    // Check summary sections
    await expect(page.getByText('Application Summary')).toBeVisible()
    await expect(page.getByText('Property Details')).toBeVisible()
    await expect(page.getByText('Contractor Information')).toBeVisible()
    await expect(page.getByText('Equipment Details')).toBeVisible()
  })

  test('should show tier features', async ({ page, context }) => {
    await context.addInitScript(() => {
      const mockState = {
        state: {
          sessionId: 'test-session-123',
          permitData: {},
          selectedTier: null,
        },
        version: 0,
      }
      localStorage.setItem('chat-storage', JSON.stringify(mockState))
    })

    await page.goto('/review')

    // Tier 1 features
    await expect(page.getByText('Pre-filled FEMA 301, 301A forms')).toBeVisible()
    await expect(page.getByText('Download immediately')).toBeVisible()

    // Tier 2 features
    await expect(page.getByText('Everything in Tier 1')).toBeVisible()
    await expect(page.getByText('We submit to Accela for you')).toBeVisible()
    await expect(page.getByText('24-hour review period')).toBeVisible()
  })

  test('should have payment security indicators', async ({ page, context }) => {
    await context.addInitScript(() => {
      const mockState = {
        state: {
          sessionId: 'test-session-123',
          permitData: {},
          selectedTier: null,
        },
        version: 0,
      }
      localStorage.setItem('chat-storage', JSON.stringify(mockState))
    })

    await page.goto('/review')

    await expect(page.getByText('Secure Payment')).toBeVisible()
    await expect(page.getByText(/Powered by Stripe/i)).toBeVisible()
  })
})

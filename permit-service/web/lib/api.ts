import { PermitData } from './store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api/v1'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatResponse = {
  aiResponse: string  // Backend sends "aiResponse"
  sessionId: string
  isComplete: boolean
  extractedData?: Partial<PermitData>
  conversationState: string
  missingFields: string[]
  dataSummary: any
}

export type PaymentIntentResponse = {
  clientSecret: string
  amountCents: number
}

export type PackageResponse = {
  token: string
  expiresAt: string
  previewUrl: string
}

export type AccelaSubmissionResponse = {
  success: boolean
  recordId?: string
  message: string
}

/**
 * Start or continue a chat session
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a Stripe payment intent
 */
export async function createPaymentIntent(
  tier: 1 | 2,
  sessionId: string
): Promise<PaymentIntentResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tier: `tier${tier}`, // Convert 1 → "tier1", 2 → "tier2"
      sessionId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Payment intent creation failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Confirm payment completion (called after Stripe confirmPayment succeeds)
 */
export async function confirmPayment(
  sessionId: string,
  paymentIntentId: string,
  tier: 1 | 2
): Promise<{ success: boolean; sessionStatus: string }> {
  const response = await fetch(`${API_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      paymentIntentId,
      tier: `tier${tier}`, // Convert 1 → "tier1", 2 → "tier2"
    }),
  })

  if (!response.ok) {
    throw new Error(`Payment confirmation failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Check payment status for a session
 */
export async function checkPaymentStatus(
  sessionId: string
): Promise<{ sessionStatus: string; isPaid: boolean; hasSubmission: boolean; hasPdfPackage: boolean }> {
  const response = await fetch(`${API_BASE_URL}/payments/status/${sessionId}`)

  if (!response.ok) {
    throw new Error(`Payment status check failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Generate permit package (after payment)
 */
export async function generatePackage(
  sessionId: string,
  tier: 1 | 2
): Promise<PackageResponse> {
  const response = await fetch(`${API_BASE_URL}/generate-package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      tier: `tier${tier}`, // Convert 1 → "tier1", 2 → "tier2"
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    const error: any = new Error(errorData.message || `Package generation failed: ${response.statusText}`)
    error.missingFields = errorData.missingFields || []
    error.details = errorData.details
    throw error
  }

  return response.json()
}

/**
 * Submit to Accela (Tier 2 only, after approval)
 */
export async function submitToAccela(
  token: string
): Promise<AccelaSubmissionResponse> {
  const response = await fetch(`${API_BASE_URL}/submit-to-accela`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
    }),
  })

  if (!response.ok) {
    throw new Error(`Accela submission failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error('Health check failed')
  }

  return response.json()
}

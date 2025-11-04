'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useChatStore } from '@/lib/store'
import { createPaymentIntent, confirmPayment } from '@/lib/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

// Payment Form Component using Stripe Elements
function CheckoutForm({
  sessionId,
  paymentIntentId,
  tier,
  onSuccess,
  onError
}: {
  sessionId: string
  paymentIntentId: string
  tier: 1 | 2
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      // Step 1: Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        onError(error.message || 'Payment failed')
        return
      }

      // Step 2: Confirm payment with our backend to update session status
      try {
        await confirmPayment(sessionId, paymentIntent?.id || paymentIntentId, tier)
      } catch (confirmError: any) {
        console.error('Payment confirmation error:', confirmError)
        onError('Payment succeeded but confirmation failed. Please contact support.')
        return
      }

      // Step 3: Payment confirmed, proceed to success page
      onSuccess()
    } catch (err: any) {
      onError(err.message || 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full btn btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing Payment...
          </span>
        ) : (
          `Complete Payment`
        )}
      </button>
    </form>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { sessionId, permitData, selectedTier, setTier } = useChatStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTier2Warning, setShowTier2Warning] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)

  // Check payment status on load
  useEffect(() => {
    if (!sessionId) {
      router.push('/chat')
      return
    }

    const checkStatus = async () => {
      try {
        const { checkPaymentStatus } = await import('@/lib/api')
        const status = await checkPaymentStatus(sessionId)

        if (status.isPaid) {
          setAlreadyPaid(true)
        }
      } catch (err) {
        console.error('Failed to check payment status:', err)
      } finally {
        setCheckingPayment(false)
      }
    }

    checkStatus()
  }, [sessionId, router])

  const handleTierSelect = (tier: 1 | 2) => {
    // Tier 2 requires authentication for Accela submission
    if (tier === 2 && !isSignedIn) {
      setShowTier2Warning(true)
      setError('Sign in required for Tier 2: We need your Accela API credentials to auto-submit on your behalf.')
      return
    }
    setShowTier2Warning(false)
    setError(null)
    setTier(tier)
  }

  const handlePayment = async () => {
    if (!selectedTier || !sessionId) {
      setError('Please select a tier')
      return
    }

    // If already paid, skip payment and go to package generation
    if (alreadyPaid) {
      router.push('/success')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Create payment intent
      const response = await createPaymentIntent(selectedTier, sessionId)

      // Store client secret and payment intent ID
      setClientSecret(response.clientSecret)
      setPaymentIntentId(response.paymentIntentId)
      setShowPaymentForm(true)
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = () => {
    router.push('/success')
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    setShowPaymentForm(false)
  }

  if (!sessionId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/chat" className="text-navy-600 hover:text-navy-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-navy-900">Review & Select Service</h1>
              <p className="text-sm text-gray-600">Almost done! Review your info and choose your tier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Application Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-navy-900 mb-4">Application Summary</h2>

              {/* Property Details */}
              <div className="mb-6">
                <h3 className="font-semibold text-navy-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Property Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-navy-900">{permitData.propertyAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium text-navy-900">{permitData.propertyCity || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ZIP:</span>
                    <span className="font-medium text-navy-900">{permitData.propertyZip || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Contractor Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-navy-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contractor Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-navy-900">{permitData.contractorName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">License:</span>
                    <span className="font-medium text-navy-900">{permitData.contractorLicense || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium text-navy-900">{permitData.contractorPhone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Equipment Details */}
              <div>
                <h3 className="font-semibold text-navy-700 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Equipment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-navy-900">{permitData.equipmentType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand/Model:</span>
                    <span className="font-medium text-navy-900">
                      {permitData.equipmentBrand || 'N/A'} {permitData.equipmentModel || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BTU/Tonnage:</span>
                    <span className="font-medium text-navy-900">
                      {permitData.equipmentBTU || permitData.equipmentTonnage || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => router.push('/chat')}
              className="w-full btn btn-secondary"
            >
              ← Back to Edit Information
            </button>
          </div>

          {/* Right: Tier Selection & Payment */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-navy-900 mb-4">Choose Your Service</h2>

              {/* Tier 1 */}
              <div
                className={`border-2 rounded-lg p-6 mb-4 cursor-pointer transition-all ${
                  selectedTier === 1
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => handleTierSelect(1)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-navy-900">Tier 1: PDF Package</h3>
                    <p className="text-sm text-gray-600">Download and submit yourself</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-600">$30</div>
                    <div className="text-xs text-gray-500">+ permit fees</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Pre-filled FEMA 301, 301A forms
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tampa/Hillsborough branding
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Download immediately
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You submit to Accela yourself
                  </li>
                </ul>
                {selectedTier === 1 && (
                  <div className="text-sm text-orange-600 font-semibold">✓ Selected</div>
                )}
              </div>

              {/* Tier 2 */}
              <div
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedTier === 2
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => handleTierSelect(2)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-navy-900">Tier 2: Full Service</h3>
                    <p className="text-sm text-gray-600">We submit to Accela for you</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-600">$150</div>
                    <div className="text-xs text-gray-500">+ permit fees</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Everything in Tier 1
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    24-hour review period
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>We submit to Accela for you</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Get Accela record ID
                  </li>
                </ul>
                {selectedTier === 2 && (
                  <div className="text-sm text-orange-600 font-semibold">✓ Selected</div>
                )}
              </div>
            </div>

            {/* Tier 2 Auth Warning */}
            {showTier2Warning && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-navy-900 mb-1">Sign In Required for Tier 2</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      To auto-submit permits to Accela, we need to securely store your Accela API credentials.
                      This requires creating a free account.
                    </p>
                    <Link
                      href={`/sign-in?redirect_url=${encodeURIComponent('/review')}`}
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Sign In to Continue →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Already Completed Banner */}
            {alreadyPaid && (
              <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-900">Payment Completed</h4>
                    <p className="text-sm text-green-700">Your payment has been processed. Click below to generate your permit package.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Other Errors */}
            {error && !showTier2Warning && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={!selectedTier || isProcessing || checkingPayment}
              className="w-full btn btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingPayment ? (
                'Checking payment status...'
              ) : isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : alreadyPaid ? (
                '✓ Generate Package (No Payment Required)'
              ) : selectedTier ? (
                `Pay $${selectedTier === 1 ? '30' : '150'} & Continue`
              ) : (
                'Select a Tier First'
              )}
            </button>

            {/* Trust Signals */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-navy-900 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-semibold">Secure Payment</span>
              </div>
              <p className="text-xs text-gray-600">
                Powered by Stripe. Your payment information is encrypted and secure. We never store your card details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal - Enhanced Design */}
      {showPaymentForm && clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-slideUp flex flex-col">
            {/* Header - Fixed */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Secure Checkout</h2>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-orange-100 text-sm">Complete your permit application purchase</p>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Order Summary */}
              <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm text-orange-700 font-medium mb-1">
                      {selectedTier === 1 ? 'Tier 1: PDF Package' : 'Tier 2: Full Service'}
                    </div>
                    <div className="text-xs text-orange-600">
                      {selectedTier === 1 ? 'Download and submit yourself' : 'We submit to Accela for you'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-600">
                      ${selectedTier === 1 ? '30' : '150'}
                    </div>
                    <div className="text-xs text-orange-500">one-time fee</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-orange-200">
                  <div className="flex items-center gap-2 text-xs text-orange-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Includes HVAC permit forms for Tampa Bay area</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-red-900 text-sm mb-1">Payment Failed</div>
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Form Label */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-navy-900 mb-2">
                  Payment Information
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Enter your card details to complete the purchase
                </p>
              </div>

              {/* Stripe Elements */}
              <div className="mb-4">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#ea580c',
                        colorBackground: '#ffffff',
                        colorText: '#1e293b',
                        colorDanger: '#ef4444',
                        fontFamily: 'system-ui, sans-serif',
                        spacingUnit: '4px',
                        borderRadius: '8px',
                        fontSizeBase: '15px',
                      },
                      rules: {
                        '.Input': {
                          border: '1.5px solid #e2e8f0',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        },
                        '.Input:focus': {
                          border: '1.5px solid #ea580c',
                          boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.1)',
                        },
                        '.Label': {
                          fontWeight: '600',
                          fontSize: '14px',
                          marginBottom: '6px',
                        },
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    sessionId={sessionId!}
                    paymentIntentId={paymentIntentId!}
                    tier={selectedTier!}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              </div>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-medium">256-bit SSL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">PCI Compliant</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="font-semibold">Powered by</span>
                  <span className="text-[#635bff] font-bold">Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

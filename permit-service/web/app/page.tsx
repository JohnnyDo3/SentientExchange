'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const { sessionId, savedSessions, loadSession, deleteSession, resetChat, saveCurrentSession } = useChatStore()

  // Auto-save current session before showing list
  useEffect(() => {
    if (sessionId) {
      saveCurrentSession()
    }
  }, [sessionId, saveCurrentSession])

  const handleNewApplication = () => {
    resetChat()
    router.push('/chat')
  }

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId)
    router.push('/chat')
  }

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (confirm('Delete this application? This cannot be undone.')) {
      deleteSession(sessionId)
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-navy-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              Trusted by 500+ Tampa Contractors
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-navy-900 mb-6">
              Get Your HVAC Permit in{' '}
              <span className="text-gradient">5 Minutes</span>
            </h1>

            <p className="text-xl text-navy-600 mb-8 max-w-2xl mx-auto">
              AI-powered permit forms for Tampa Bay contractors. No paperwork headaches. No county trips.
            </p>

            {savedSessions.length > 0 && (
              <div className="mb-6 max-w-2xl mx-auto">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-900 mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold">My Applications ({savedSessions.length})</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    {savedSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.sessionId}
                        onClick={() => handleLoadSession(session.sessionId)}
                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-navy-900">
                            {session.propertyAddress || 'New Application'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(() => {
                              const completedSteps = session.progress.filter(p => p.status === 'completed').length
                              const totalSteps = session.progress.length
                              const reviewStepCompleted = session.progress.find(p => p.id === 'review')?.status === 'completed'

                              // If review step is completed, they've paid
                              if (reviewStepCompleted) {
                                return `✓ Paid - Tier ${session.selectedTier || '?'} • ${formatDate(session.lastUpdated)}`
                              }

                              // If they selected a tier, they're at payment
                              if (session.selectedTier) {
                                return `Ready for payment (Tier ${session.selectedTier}) • ${formatDate(session.lastUpdated)}`
                              }

                              // If they have completed steps, show progress
                              if (completedSteps > 0) {
                                return `${completedSteps}/${totalSteps} steps completed • ${formatDate(session.lastUpdated)}`
                              }

                              // Otherwise just started
                              return `Just started • ${formatDate(session.lastUpdated)}`
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, session.sessionId)}
                          className="text-red-500 hover:text-red-700 p-2"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleNewApplication}
                    className="w-full btn btn-primary text-center"
                  >
                    + Start New Application
                  </button>
                </div>
              </div>
            )}

            {savedSessions.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={handleNewApplication} className="btn btn-primary text-center">
                  Start Free Application
                </button>
                <a href="#how-it-works" className="btn btn-secondary text-center">
                  See How It Works
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-6 justify-center mt-8 text-sm text-navy-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Accela Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-navy-600 max-w-2xl mx-auto">
              Three simple steps to get your permit application ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy-900 mb-2">1. Chat with AI</h3>
              <p className="text-navy-600">
                Tell us about your HVAC job in plain English. Our AI extracts all the permit details automatically.
              </p>
              <div className="mt-4 text-sm text-orange-600 font-semibold">~5 minutes</div>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy-900 mb-2">2. Review & Pay</h3>
              <p className="text-navy-600">
                See exactly what you're getting. Complete, accurate permit applications with all required documents.
              </p>
              <div className="mt-4 text-sm text-green-600 font-semibold">~30 seconds</div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-navy-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-navy-900 mb-2">3. Download or Submit</h3>
              <p className="text-navy-600">
                Download PDFs to submit yourself (Tier 1) or we'll submit directly to the county for you (Tier 2).
              </p>
              <div className="mt-4 text-sm text-navy-600 font-semibold">Your choice</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-navy-600">
              Choose the service level that works for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Tier 1 - DIY */}
            <div className="bg-white rounded-2xl shadow-medium p-8 relative border-2 border-orange-200">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-navy-900 mb-2">DIY Submission</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-navy-900">$30</span>
                  <span className="text-navy-500">+ permit fees</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Complete permit application forms (PDF)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">All required documents checklist</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Equipment specifications sheet</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Load calculation worksheet</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Ready to submit yourself</span>
                </li>
              </ul>

              <Link href="/chat" className="btn btn-primary w-full text-center block">
                Get Started
              </Link>

              <p className="text-center text-sm text-navy-500 mt-4">
                Perfect for contractors who know the process
              </p>
            </div>

            {/* Tier 2 - Full Service */}
            <div className="bg-white rounded-2xl shadow-medium p-8 border-2 border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-navy-900 mb-2">Full Service</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-navy-900">$150</span>
                  <span className="text-navy-500">+ permit fees</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700 font-semibold">Everything in Tier 1, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">We submit to county for you</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">24-hour approval preview</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Track application status</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-navy-700">Hands-off, fully automated</span>
                </li>
              </ul>

              <Link href="/chat" className="btn btn-secondary w-full text-center block">
                Get Started
              </Link>

              <p className="text-center text-sm text-navy-500 mt-4">
                Perfect for busy contractors who want it handled
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-navy-500 mt-8 max-w-2xl mx-auto">
            All prices shown are service fees. County permit fees are calculated based on your specific project and added to your total.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-navy-900 mb-4">
              What Contractors Are Saying
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-navy-700 mb-4">
                "Cuts my permitting time from 45 minutes to 5 minutes. Game changer for my business."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold">
                  JM
                </div>
                <div>
                  <div className="font-semibold text-navy-900">John Martinez</div>
                  <div className="text-sm text-navy-500">Cool Air HVAC, Tampa</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-navy-700 mb-4">
                "The AI chat is surprisingly good at understanding what I need. No more confusing forms!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold">
                  SR
                </div>
                <div>
                  <div className="font-semibold text-navy-900">Sarah Rodriguez</div>
                  <div className="text-sm text-navy-500">Bay Area Mechanical</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-navy-700 mb-4">
                "Tier 2 is worth every penny. I can focus on jobs while they handle the county paperwork."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold">
                  DT
                </div>
                <div>
                  <div className="font-semibold text-navy-900">David Thompson</div>
                  <div className="text-sm text-navy-500">Elite Comfort Systems</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Save Time on Your Next Permit?
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of Tampa Bay contractors who've simplified their permitting process
          </p>
          <Link href="/chat" className="inline-block bg-white text-orange-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-orange-50 transition-colors">
            Start Your Free Application
          </Link>
          <p className="text-orange-100 text-sm mt-4">
            No credit card required • 5-minute setup
          </p>
        </div>
      </section>
    </div>
  )
}

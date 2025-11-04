'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChatStore } from '@/lib/store'
import { sendChatMessage } from '@/lib/api'

export default function ChatPage() {
  const router = useRouter()
  const {
    messages,
    isLoading,
    progress,
    sessionId,
    permitData,
    addMessage,
    setLoading,
    setSessionId,
    updateProgress,
    updatePermitData,
    saveCurrentSession,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    setInput('')
    setError(null)

    // Add user message to chat
    addMessage({
      role: 'user',
      content: userInput,
    })

    setLoading(true)

    try {
      // Send message to backend
      const response = await sendChatMessage(userInput, sessionId || undefined)

      // Save session ID if this is the first message
      if (!sessionId && response.sessionId) {
        setSessionId(response.sessionId)
      }

      // Add assistant response to chat
      addMessage({
        role: 'assistant',
        content: response.aiResponse,
      })

      // Update permit data if extracted - transform nested structure to flat
      if (response.extractedData) {
        const extracted = response.extractedData
        const flatData: any = {}

        // Property details from permitInfo.location
        if (extracted.permitInfo?.location) {
          flatData.propertyAddress = extracted.permitInfo.location.address
          flatData.propertyCity = extracted.permitInfo.location.city
          flatData.propertyZip = extracted.permitInfo.location.zipCode
        }

        // Contractor info
        if (extracted.contractor) {
          flatData.contractorName = extracted.contractor.name
          flatData.contractorLicense = extracted.contractor.licenseNumber
          flatData.contractorPhone = extracted.contractor.phone
          flatData.contractorEmail = extracted.contractor.email
        }

        // Owner info
        if (extracted.property) {
          flatData.ownerName = extracted.property.ownerName
          flatData.ownerPhone = extracted.property.ownerPhone
        }

        // Equipment details
        if (extracted.equipmentDetails) {
          flatData.equipmentBrand = extracted.equipmentDetails.manufacturer
          flatData.equipmentModel = extracted.equipmentDetails.model
          flatData.equipmentSEER = extracted.equipmentDetails.seerRating
        }

        // Equipment type and tonnage from permitInfo
        if (extracted.permitInfo) {
          flatData.equipmentType = extracted.permitInfo.equipmentType
          flatData.equipmentTonnage = extracted.permitInfo.tonnage
          flatData.workType = extracted.permitInfo.jobType
        }

        // Installation cost
        if (extracted.installation) {
          flatData.estimatedCost = extracted.installation.estimatedCost
        }

        updatePermitData(flatData)

        // Update progress based on ALL accumulated data (not just this response)
        // Use a small delay to ensure state is updated
        setTimeout(() => {
          const currentState = useChatStore.getState()
          const allData = currentState.permitData
          const currentProgress = currentState.progress

          // Check property details (address required)
          if (allData.propertyAddress && currentProgress.find(s => s.id === 'property')?.status !== 'completed') {
            updateProgress('property', 'completed')
            if (currentProgress.find(s => s.id === 'work')?.status === 'pending') {
              updateProgress('work', 'current')
            }
          }

          // Check work description (workType required)
          if (allData.workType && currentProgress.find(s => s.id === 'work')?.status !== 'completed') {
            updateProgress('work', 'completed')
            if (currentProgress.find(s => s.id === 'contractor')?.status === 'pending') {
              updateProgress('contractor', 'current')
            }
          }

          // Check contractor info (name and license required)
          if (allData.contractorName && allData.contractorLicense && currentProgress.find(s => s.id === 'contractor')?.status !== 'completed') {
            updateProgress('contractor', 'completed')
            if (currentProgress.find(s => s.id === 'equipment')?.status === 'pending') {
              updateProgress('equipment', 'current')
            }
          }

          // Check equipment details (type and brand required)
          if (allData.equipmentType && allData.equipmentBrand && currentProgress.find(s => s.id === 'equipment')?.status !== 'completed') {
            updateProgress('equipment', 'completed')
          }
        }, 50)

        // Auto-save session after updating data
        setTimeout(() => saveCurrentSession(), 100)
      }

      // If chat is complete, show preparing message and redirect
      if (response.isComplete) {
        // Add "preparing" message
        addMessage({
          role: 'assistant',
          content: "Perfect! I have everything I need. Give me a moment while I prepare your application... 📋",
        })

        updateProgress('review', 'current')

        // Wait 3 seconds so user can read the message
        setTimeout(() => {
          router.push('/review')
        }, 3000)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to send message. Please try again.')
      addMessage({
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-navy-600 hover:text-navy-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-navy-900">HVAC Permit Application</h1>
                <p className="text-sm text-gray-600">Fill out your permit in plain English</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="hidden md:inline">Session started: </span>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 flex gap-6">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-navy-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-orange-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-navy-900 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Press Enter to send • Your data is encrypted and secure
              </p>
              {sessionId && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Connected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Sidebar - Desktop Only */}
        <div className="hidden lg:block w-80">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Your Progress</h2>
            <div className="space-y-4">
              {progress.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 ${
                    step.id === 'review' && step.status === 'current'
                      ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -ml-2'
                      : ''
                  }`}
                  onClick={() => {
                    if (step.id === 'review' && step.status === 'current') {
                      router.push('/review')
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-1">
                    {step.status === 'completed' ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : step.status === 'current' ? (
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-bold text-sm">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${
                        step.status === 'current'
                          ? 'text-orange-600'
                          : step.status === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </h3>
                    {step.status === 'current' && step.id === 'review' && (
                      <p className="text-sm text-orange-600 mt-1 font-medium">Click to continue →</p>
                    )}
                    {step.status === 'current' && step.id !== 'review' && (
                      <p className="text-sm text-gray-600 mt-1">In progress...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Signals */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Accela Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure & Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>~5 minute process</span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-navy-900 font-semibold mb-1">Need help?</p>
              <p className="text-xs text-gray-600">
                You can save and return to this application anytime. Just bookmark this page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="lg:hidden bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy-900">Progress</span>
          <span className="text-sm text-gray-600">
            Step {progress.findIndex((s) => s.status === 'current') + 1} of {progress.length}
          </span>
        </div>
        <div className="flex gap-1">
          {progress.map((step) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded-full ${
                step.status === 'completed'
                  ? 'bg-green-500'
                  : step.status === 'current'
                  ? 'bg-orange-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChatStore } from '@/lib/store'
import { generatePackage } from '@/lib/api'
import JSZip from 'jszip'

export default function SuccessPage() {
  const router = useRouter()
  const { sessionId, selectedTier, resetChat } = useChatStore()
  const [isGenerating, setIsGenerating] = useState(true)
  const [pdfPackage, setPdfPackage] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])

  useEffect(() => {
    if (!sessionId || !selectedTier) {
      router.push('/chat')
      return
    }

    // Generate the package
    const generate = async () => {
      try {
        const result = await generatePackage(sessionId, selectedTier)

        if (selectedTier === 1) {
          // Tier 1: Store PDF package for download
          setPdfPackage(result.pdfPackage)
        } else {
          // Tier 2: Preview URL for approval
          setPreviewUrl(result.previewUrl)
          setPdfPackage(result.pdfPackage)
        }
      } catch (err: any) {
        console.error('Package generation error:', err)
        setError(err.message || 'Failed to generate package')
        if (err.missingFields && err.missingFields.length > 0) {
          setMissingFields(err.missingFields)
        }
      } finally {
        setIsGenerating(false)
      }
    }

    generate()
  }, [sessionId, selectedTier, router])

  const handleDownloadPdf = (pdfData: string, filename: string) => {
    // Create a blob from base64 PDF data
    const byteCharacters = atob(pdfData)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadAll = async () => {
    if (!pdfPackage) return

    try {
      // Create a new JSZip instance
      const zip = new JSZip()

      // Add main form to zip
      const mainFormBytes = atob(pdfPackage.mainForm.pdf)
      const mainFormArray = new Uint8Array(mainFormBytes.length)
      for (let i = 0; i < mainFormBytes.length; i++) {
        mainFormArray[i] = mainFormBytes.charCodeAt(i)
      }
      zip.file(`${pdfPackage.mainForm.name || 'permit-application'}.pdf`, mainFormArray)

      // Add additional documents to zip
      if (pdfPackage.additionalDocuments && pdfPackage.additionalDocuments.length > 0) {
        pdfPackage.additionalDocuments.forEach((doc: any, index: number) => {
          const docBytes = atob(doc.pdf)
          const docArray = new Uint8Array(docBytes.length)
          for (let i = 0; i < docBytes.length; i++) {
            docArray[i] = docBytes.charCodeAt(i)
          }
          zip.file(`${doc.name || `document-${index + 1}`}.pdf`, docArray)
        })
      }

      // Generate zip file and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `permit-package-${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error creating zip file:', error)
      alert('Failed to create zip file. Please try downloading individual files.')
    }
  }

  const handleStartNew = () => {
    resetChat()
    router.push('/')
  }

  if (!sessionId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {isGenerating ? (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 mb-2">Generating Your Permit Package...</h1>
            <p className="text-gray-600">This will only take a moment</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 mb-2 text-center">Payment Successful!</h1>
            <h2 className="text-lg font-semibold text-orange-600 mb-4 text-center">Additional Information Needed</h2>

            {missingFields.length > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Good news:</strong> Your payment was successful and has been saved. We just need a bit more information to generate your permit package:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  {missingFields.map((field) => (
                    <li key={field}>{field.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-600 text-center mb-6">{error}</p>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                💡 <strong>No need to pay again!</strong> Go back to the chat and provide the missing details, then return here to generate your package.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href="/chat" className="btn btn-primary">
                Complete Application
              </Link>
              {missingFields.length === 0 && (
                <a href="mailto:support@aipermittampa.com" className="btn btn-secondary">
                  Contact Support
                </a>
              )}
            </div>
          </div>
        ) : selectedTier === 1 ? (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 mb-2 text-center">Payment Successful!</h1>
            <p className="text-gray-600 text-center mb-6">
              Your HVAC permit package is ready to download
            </p>

            {/* Download Button */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
              <h2 className="font-bold text-navy-900 mb-3">Your Permit Package</h2>
              <p className="text-sm text-gray-600 mb-4">
                Includes pre-filled FEMA 301 and 301A forms with Tampa/Hillsborough branding
              </p>
              {pdfPackage && (
                <button
                  onClick={handleDownloadAll}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download ZIP Package
                </button>
              )}
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-navy-900 mb-3">Next Steps</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">1.</span>
                  Download your permit package above
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">2.</span>
                  Review the forms for accuracy
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">3.</span>
                  Submit to Accela Civic Platform (accela.tampa.gov)
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">4.</span>
                  Pay permit fees directly to the county
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button onClick={handleStartNew} className="flex-1 btn btn-secondary">
                Start New Application
              </button>
              <Link href="/" className="flex-1 btn btn-primary">
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 mb-2 text-center">Payment Successful!</h1>
            <p className="text-gray-600 text-center mb-6">
              Your application is ready for review
            </p>

            {/* Tier 2 Info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
              <h2 className="font-bold text-navy-900 mb-3">What Happens Next?</h2>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">1.</span>
                  <div>
                    <strong>Review Period (24 hours)</strong>
                    <p className="text-gray-600">Check your email for a preview link to review your permit package</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">2.</span>
                  <div>
                    <strong>Approve & Submit</strong>
                    <p className="text-gray-600">Click the approval link in your email to authorize submission</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-600">3.</span>
                  <div>
                    <strong>We Submit to Accela</strong>
                    <p className="text-gray-600">We'll submit your permit to Accela and send you the record ID</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Preview Link */}
            {previewUrl && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Preview your package now:</strong>
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full"
                >
                  View Permit Package
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button onClick={handleStartNew} className="flex-1 btn btn-secondary">
                Start New Application
              </button>
              <Link href="/" className="flex-1 btn btn-primary">
                Back to Home
              </Link>
            </div>

            {/* Email Reminder */}
            <p className="text-xs text-gray-500 text-center mt-6">
              Can't find the email? Check your spam folder or contact support@aipermittampa.com
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

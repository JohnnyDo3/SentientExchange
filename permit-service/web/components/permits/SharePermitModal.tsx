'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

interface SharePermitModalProps {
  submissionId: string
  onClose: () => void
}

export default function SharePermitModal({ submissionId, onClose }: SharePermitModalProps) {
  const { user } = useUser()
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number>(7)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const createShareLink = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organizations/submissions/${submissionId}/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password: password || undefined,
            expiresInDays: expiresInDays || undefined,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setShareUrl(data.shareUrl)
      } else {
        alert('Failed to create share link')
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
      alert('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy-900">Share Permit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!shareUrl ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Create a shareable link that homeowners can use to view their permit package.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Protection (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Leave empty for no password"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended for sensitive permit information</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Expires In</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Anyone with this link can view the permit package. The link will show PDFs and permit details but cannot be used to modify anything.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={createShareLink}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold text-green-600">Share link created!</span>
              </div>
              <p className="text-sm text-gray-600">Copy this link and share it with the homeowner:</p>
            </div>

            <div className="bg-gray-50 border border-gray-300 rounded p-3 mb-4">
              <code className="text-xs text-gray-800 break-all">{shareUrl}</code>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-800">
                {password && '🔒 Link is password protected. '}
                {expiresInDays > 0
                  ? `Link expires in ${expiresInDays} day${expiresInDays > 1 ? 's' : ''}.`
                  : 'Link never expires.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

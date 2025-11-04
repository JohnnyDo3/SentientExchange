'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PermitData {
  id: string
  status: string
  permitData: any
  pdfPackage: any
  accelaRecordId?: string
  accelaUrl?: string
  createdAt: string
  submittedAt?: string
}

export default function SharedPermitPage() {
  const params = useParams()
  const token = params.token as string

  const [permit, setPermit] = useState<PermitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [viewCount, setViewCount] = useState(0)

  const downloadPDF = () => {
    if (!permit?.pdfPackage?.pdfBase64) {
      alert('PDF not available for download')
      return
    }

    try {
      // Convert base64 to blob
      const byteCharacters = atob(permit.pdfPackage.pdfBase64)
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
      link.download = `permit-${permit.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert('Failed to download PDF')
    }
  }

  useEffect(() => {
    if (token) {
      fetchSharedPermit()
    }
  }, [token])

  const fetchSharedPermit = async (pwd?: string) => {
    setLoading(true)
    setError('')

    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/organizations/shared/${token}`)
      if (pwd || password) {
        url.searchParams.append('password', pwd || password)
      }

      const response = await fetch(url.toString())

      if (response.status === 401) {
        const data = await response.json()
        if (data.requiresPassword) {
          setRequiresPassword(true)
          setError('')
        } else {
          setError('Invalid password')
        }
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to load permit')
        return
      }

      const data = await response.json()
      setPermit(data.permit)
      setViewCount(data.viewCount)
      setRequiresPassword(false)
    } catch (err: any) {
      console.error('Failed to fetch shared permit:', err)
      setError('Failed to load permit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSharedPermit(password)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading permit...</p>
        </div>
      </div>
    )
  }

  if (requiresPassword && !permit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-navy-900">Password Protected</h1>
            <p className="text-gray-600 mt-2">This permit requires a password to view</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-semibold"
            >
              View Permit
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (error || !permit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Permit Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This permit link may have expired or been deleted'}</p>
          <Link href="/" className="text-orange-600 hover:text-orange-700 font-semibold">
            Go to Home Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Shared Permit</h1>
              <p className="text-sm text-gray-600">View-only access</p>
            </div>
            <Link href="/" className="px-4 py-2 text-orange-600 hover:text-orange-700 font-semibold">
              AI Permit Tampa
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Banner */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Permit Status</h2>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    permit.status === 'submitted'
                      ? 'bg-green-100 text-green-700'
                      : permit.status === 'generated'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {permit.status}
                </span>
                <span className="text-sm text-gray-600">
                  Views: {viewCount}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {permit.pdfPackage && (
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              )}
              {permit.accelaUrl && (
                <a
                  href={permit.accelaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-semibold text-sm"
                >
                  View in Accela →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-navy-900 mb-4">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permit.permitData?.property?.address && (
              <div>
                <label className="text-sm text-gray-600">Address</label>
                <p className="font-semibold text-navy-900">{permit.permitData.property.address}</p>
              </div>
            )}
            {permit.permitData?.property?.parcelNumber && (
              <div>
                <label className="text-sm text-gray-600">Parcel Number</label>
                <p className="font-semibold text-navy-900">{permit.permitData.property.parcelNumber}</p>
              </div>
            )}
            {permit.permitData?.owner && (
              <>
                <div>
                  <label className="text-sm text-gray-600">Owner Name</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.owner.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Owner Phone</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.owner.phone}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Work Information */}
        {permit.permitData?.work && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Work Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Description</label>
                <p className="text-navy-900">{permit.permitData.work.description}</p>
              </div>
              {permit.permitData.work.estimatedCost && (
                <div>
                  <label className="text-sm text-gray-600">Estimated Cost</label>
                  <p className="font-semibold text-navy-900">
                    ${permit.permitData.work.estimatedCost.toLocaleString()}
                  </p>
                </div>
              )}
              {permit.permitData.work.estimatedStartDate && (
                <div>
                  <label className="text-sm text-gray-600">Start Date</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.work.estimatedStartDate}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contractor Information */}
        {permit.permitData?.contractor && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Contractor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Company Name</label>
                <p className="font-semibold text-navy-900">{permit.permitData.contractor.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">License Number</label>
                <p className="font-semibold text-navy-900">{permit.permitData.contractor.licenseNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <p className="font-semibold text-navy-900">{permit.permitData.contractor.phone}</p>
              </div>
              {permit.permitData.contractor.email && (
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.contractor.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equipment Details */}
        {permit.permitData?.equipment && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Equipment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permit.permitData.equipment.manufacturer && (
                <div>
                  <label className="text-sm text-gray-600">Manufacturer</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.equipment.manufacturer}</p>
                </div>
              )}
              {permit.permitData.equipment.model && (
                <div>
                  <label className="text-sm text-gray-600">Model</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.equipment.model}</p>
                </div>
              )}
              {permit.permitData.equipment.serialNumber && (
                <div>
                  <label className="text-sm text-gray-600">Serial Number</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.equipment.serialNumber}</p>
                </div>
              )}
              {permit.permitData.equipment.efficiency && (
                <div>
                  <label className="text-sm text-gray-600">Efficiency Rating</label>
                  <p className="font-semibold text-navy-900">{permit.permitData.equipment.efficiency}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accela Information */}
        {permit.accelaRecordId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Submission Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Record ID</label>
                <p className="font-semibold text-navy-900">{permit.accelaRecordId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Submitted Date</label>
                <p className="font-semibold text-navy-900">
                  {new Date(permit.submittedAt!).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-blue-900">
            Want to automate your HVAC permits?{' '}
            <Link href="/" className="font-semibold text-orange-600 hover:text-orange-700">
              Try AI Permit Tampa →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

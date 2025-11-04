'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import SharePermitModal from '@/components/permits/SharePermitModal'

interface Permit {
  id: string
  user_id: string
  session_id: string
  tier: string
  status: string
  stripe_payment_id?: string
  amount_cents: number
  permit_data: any
  pdf_package?: any
  accela_record_id?: string
  accela_url?: string
  approval_token?: string
  approval_expires_at?: string
  created_at: string
  submitted_at?: string
}

export default function PermitDetailPage() {
  const { user, isLoaded } = useUser()
  const params = useParams()
  const router = useRouter()
  const permitId = params.id as string

  const [permit, setPermit] = useState<Permit | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [hasOrgCredentials, setHasOrgCredentials] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      fetchPermit()
      checkOrgCredentials()
    }
  }, [isLoaded, user, permitId])

  const fetchPermit = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/submissions/${permitId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPermit(data.submission)
      } else {
        alert('Failed to load permit')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to fetch permit:', error)
      alert('Failed to load permit')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const checkOrgCredentials = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.organizations && data.organizations.length > 0) {
          // Check if first org has credentials
          const orgResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/organizations/${data.organizations[0].id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            setHasOrgCredentials(orgData.hasAccelaCredentials && orgData.accelaVerified)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check credentials:', error)
    }
  }

  const downloadPDF = () => {
    if (!permit?.pdf_package?.pdfBase64) {
      alert('PDF not available for download')
      return
    }

    try {
      const byteCharacters = atob(permit.pdf_package.pdfBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

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

  const submitToAccela = async () => {
    if (!permit) return

    const confirmed = confirm(
      'Are you ready to submit this permit to Accela?\n\n' +
        'This will:\n' +
        '• Create an official permit application\n' +
        '• Submit it to the Tampa/Hillsborough County system\n' +
        '• Use your organization\'s Accela credentials\n\n' +
        'Click OK to proceed.'
    )

    if (!confirmed) return

    setSubmitting(true)

    try {
      const token = await user?.getIdToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/submit-to-accela`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: permit.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Success! Permit submitted to Accela.\nRecord ID: ${data.recordId}`)
        fetchPermit() // Refresh to show updated status
      } else {
        const error = await response.json()
        alert(`Failed to submit: ${error.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Failed to submit to Accela:', error)
      alert(`Failed to submit: ${error.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading permit...</p>
        </div>
      </div>
    )
  }

  if (!permit) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Permit Review</h1>
                <p className="text-sm text-gray-600">Review and submit your permit application</p>
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    permit.status === 'submitted'
                      ? 'bg-green-100 text-green-700'
                      : permit.status === 'generated'
                      ? 'bg-blue-100 text-blue-700'
                      : permit.status === 'paid'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {permit.status}
                </span>
                <span className="text-sm text-gray-600">
                  Created {new Date(permit.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {permit.pdf_package && (
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download PDF
                </button>
              )}

              {(permit.status === 'generated' || permit.status === 'submitted') && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
              )}

              {permit.status === 'generated' && permit.tier === 'tier-2' && (
                <button
                  onClick={submitToAccela}
                  disabled={!hasOrgCredentials || submitting}
                  className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!hasOrgCredentials ? 'Accela credentials required. Set up in Organization Settings.' : ''}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Submit to Accela
                    </>
                  )}
                </button>
              )}

              {permit.accela_url && (
                <a
                  href={permit.accela_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-sm"
                >
                  View in Accela →
                </a>
              )}
            </div>
          </div>

          {permit.status === 'generated' && !hasOrgCredentials && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-800">Accela credentials required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Set up your Accela API credentials in{' '}
                  <Link href="/organization" className="underline font-semibold">
                    Organization Settings
                  </Link>{' '}
                  to enable automatic submission.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Permit Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Property Information</h2>
            <div className="space-y-3">
              {permit.permit_data?.property?.address && (
                <div>
                  <label className="text-sm text-gray-600">Address</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.property.address}</p>
                </div>
              )}
              {permit.permit_data?.property?.parcelNumber && (
                <div>
                  <label className="text-sm text-gray-600">Parcel Number</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.property.parcelNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Owner Information */}
          {permit.permit_data?.owner && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Property Owner</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.owner.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.owner.phone}</p>
                </div>
                {permit.permit_data.owner.email && (
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.owner.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Information */}
          {permit.permit_data?.work && (
            <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Work Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Description</label>
                  <p className="text-navy-900">{permit.permit_data.work.description}</p>
                </div>
                {permit.permit_data.work.estimatedCost && (
                  <div>
                    <label className="text-sm text-gray-600">Estimated Cost</label>
                    <p className="font-semibold text-navy-900">
                      ${permit.permit_data.work.estimatedCost.toLocaleString()}
                    </p>
                  </div>
                )}
                {permit.permit_data.work.estimatedStartDate && (
                  <div>
                    <label className="text-sm text-gray-600">Start Date</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.work.estimatedStartDate}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contractor Information */}
          {permit.permit_data?.contractor && (
            <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Contractor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Company Name</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.contractor.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">License Number</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.contractor.licenseNumber}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="font-semibold text-navy-900">{permit.permit_data.contractor.phone}</p>
                </div>
                {permit.permit_data.contractor.email && (
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.contractor.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Equipment Information */}
          {permit.permit_data?.equipment && (
            <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Equipment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {permit.permit_data.equipment.manufacturer && (
                  <div>
                    <label className="text-sm text-gray-600">Manufacturer</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.equipment.manufacturer}</p>
                  </div>
                )}
                {permit.permit_data.equipment.model && (
                  <div>
                    <label className="text-sm text-gray-600">Model</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.equipment.model}</p>
                  </div>
                )}
                {permit.permit_data.equipment.serialNumber && (
                  <div>
                    <label className="text-sm text-gray-600">Serial Number</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.equipment.serialNumber}</p>
                  </div>
                )}
                {permit.permit_data.equipment.efficiency && (
                  <div>
                    <label className="text-sm text-gray-600">Efficiency Rating</label>
                    <p className="font-semibold text-navy-900">{permit.permit_data.equipment.efficiency}</p>
                  </div>
                )}
                {permit.permit_data.equipment.fuelType && (
                  <div>
                    <label className="text-sm text-gray-600">Fuel Type</label>
                    <p className="font-semibold text-navy-900">
                      {permit.permit_data.equipment.fuelType.charAt(0).toUpperCase() +
                        permit.permit_data.equipment.fuelType.slice(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <SharePermitModal submissionId={permit.id} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  )
}

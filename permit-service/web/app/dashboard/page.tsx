'use client'

import { useUser, UserButton } from '@clerk/nextjs'
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
  created_at: string
  submitted_at?: string
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [permits, setPermits] = useState<Permit[]>([])
  const [loading, setLoading] = useState(true)
  const [shareModalPermitId, setShareModalPermitId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      fetchPermits()
    }
  }, [isLoaded, user])

  const fetchPermits = async () => {
    try {
      const token = await user?.getIdToken()

      // Get user's submissions from API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/submissions/user/${user?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPermits(data.submissions || [])
      }
    } catch (error) {
      console.error('Failed to fetch permits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.firstName || 'there'}!</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 text-navy-600 hover:text-navy-800 font-semibold"
              >
                New Permit
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Permits</p>
                <p className="text-3xl font-bold text-navy-900 mt-1">{permits.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {permits.filter(p => p.status === 'submitted').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {permits.filter(p => p.status === 'pending' || p.status === 'generated').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Permits List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-navy-900">Recent Permits</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading permits...</p>
            </div>
          ) : permits.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No permits yet</h3>
              <p className="text-gray-600 mb-6">Start your first HVAC permit application</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Start New Permit
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {permits.map((permit) => (
                <div key={permit.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-900">
                        {permit.permit_data?.property?.address || 'Permit Application'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {permit.permit_data?.work?.description || `Tier: ${permit.tier}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(permit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        permit.status === 'submitted' ? 'bg-green-100 text-green-700' :
                        permit.status === 'generated' ? 'bg-blue-100 text-blue-700' :
                        permit.status === 'paid' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {permit.status}
                      </span>
                      {(permit.status === 'generated' || permit.status === 'submitted') && (
                        <button
                          onClick={() => setShareModalPermitId(permit.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                          title="Share with homeowner"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </button>
                      )}
                      <Link
                        href={`/permits/${permit.id}`}
                        className="px-4 py-2 text-orange-600 hover:text-orange-700 font-semibold"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-navy-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Our AI can answer questions about Florida HVAC permit requirements.
            </p>
            <button className="text-orange-600 hover:text-orange-700 font-semibold text-sm">
              Contact Support →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-navy-900 mb-2">Organization Settings</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage team members, Accela credentials, and billing.
            </p>
            <Link
              href="/organization"
              className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
            >
              Manage Organization →
            </Link>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareModalPermitId && (
        <SharePermitModal
          submissionId={shareModalPermitId}
          onClose={() => setShareModalPermitId(null)}
        />
      )}
    </div>
  )
}

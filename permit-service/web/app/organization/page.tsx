'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Organization {
  id: string
  name: string
  owner_id: string
  clerk_org_id?: string
  description?: string
  license_number?: string
  phone?: string
  address?: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

interface Member {
  id: string
  org_id: string
  user_id: string
  role: 'admin' | 'member'
  added_at: string
}

export default function OrganizationPage() {
  const { user, isLoaded } = useUser()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasAccelaCredentials, setHasAccelaCredentials] = useState(false)
  const [accelaVerified, setAccelaVerified] = useState(false)

  // Form states
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDescription, setNewOrgDescription] = useState('')
  const [newOrgLicense, setNewOrgLicense] = useState('')
  const [newOrgPhone, setNewOrgPhone] = useState('')
  const [newOrgAddress, setNewOrgAddress] = useState('')

  // Accela form states
  const [accelaAgency, setAccelaAgency] = useState('Tampa')
  const [accelaEnvironment, setAccelaEnvironment] = useState('production')
  const [accelaClientId, setAccelaClientId] = useState('')
  const [accelaClientSecret, setAccelaClientSecret] = useState('')
  const [accelaUsername, setAccelaUsername] = useState('')
  const [accelaPassword, setAccelaPassword] = useState('')

  useEffect(() => {
    if (isLoaded && user) {
      fetchOrganizations()
    }
  }, [isLoaded, user])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])
        if (data.organizations && data.organizations.length > 0) {
          selectOrganization(data.organizations[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectOrganization = async (orgId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedOrg(data.organization)
        setMembers(data.members || [])
        setHasAccelaCredentials(data.hasAccelaCredentials)
        setAccelaVerified(data.accelaVerified)
      }
    } catch (error) {
      console.error('Failed to fetch organization details:', error)
    }
  }

  const createOrganization = async () => {
    if (!newOrgName) {
      alert('Organization name is required')
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          name: newOrgName,
          description: newOrgDescription,
          licenseNumber: newOrgLicense,
          phone: newOrgPhone,
          address: newOrgAddress,
        }),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setNewOrgName('')
        setNewOrgDescription('')
        setNewOrgLicense('')
        setNewOrgPhone('')
        setNewOrgAddress('')
        fetchOrganizations()
      } else {
        alert('Failed to create organization')
      }
    } catch (error) {
      console.error('Failed to create organization:', error)
      alert('Failed to create organization')
    }
  }

  const saveAccelaCredentials = async () => {
    if (!selectedOrg) return

    if (!accelaClientId || !accelaClientSecret) {
      alert('Client ID and Client Secret are required')
      return
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organizations/${selectedOrg.id}/accela-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({
            agency: accelaAgency,
            environment: accelaEnvironment,
            clientId: accelaClientId,
            clientSecret: accelaClientSecret,
            username: accelaUsername,
            password: accelaPassword,
          }),
        }
      )

      if (response.ok) {
        setShowCredentialsModal(false)
        setAccelaClientId('')
        setAccelaClientSecret('')
        setAccelaUsername('')
        setAccelaPassword('')
        selectOrganization(selectedOrg.id)
        alert('Accela credentials saved successfully')
      } else {
        alert('Failed to save credentials')
      }
    } catch (error) {
      console.error('Failed to save credentials:', error)
      alert('Failed to save credentials')
    }
  }

  const getAuthToken = async () => {
    // Get Clerk session token
    return await user?.getIdToken?.() || ''
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
              <h1 className="text-2xl font-bold text-navy-900">Organization Management</h1>
              <p className="text-sm text-gray-600">Manage your team and settings</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="px-4 py-2 text-navy-600 hover:text-navy-800 font-semibold">
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organizations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy-900">Organizations</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {organizations.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    <p>No organizations yet</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-orange-600 hover:text-orange-700 font-semibold"
                    >
                      Create your first organization
                    </button>
                  </div>
                ) : (
                  organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => selectOrganization(org.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedOrg?.id === org.id ? 'bg-orange-50 border-l-4 border-orange-600' : ''
                      }`}
                    >
                      <h3 className="font-semibold text-navy-900">{org.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {org.role === 'owner' ? 'Owner' : org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Organization Details */}
          <div className="lg:col-span-2">
            {selectedOrg ? (
              <div className="space-y-6">
                {/* Organization Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-navy-900 mb-4">Organization Details</h2>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-semibold text-navy-900">{selectedOrg.name}</p>
                    </div>

                    {selectedOrg.license_number && (
                      <div>
                        <label className="text-sm text-gray-600">License Number</label>
                        <p className="font-semibold text-navy-900">{selectedOrg.license_number}</p>
                      </div>
                    )}

                    {selectedOrg.phone && (
                      <div>
                        <label className="text-sm text-gray-600">Phone</label>
                        <p className="font-semibold text-navy-900">{selectedOrg.phone}</p>
                      </div>
                    )}

                    {selectedOrg.address && (
                      <div>
                        <label className="text-sm text-gray-600">Address</label>
                        <p className="font-semibold text-navy-900">{selectedOrg.address}</p>
                      </div>
                    )}

                    {selectedOrg.description && (
                      <div>
                        <label className="text-sm text-gray-600">Description</label>
                        <p className="text-navy-900">{selectedOrg.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accela Credentials */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-navy-900">Accela Credentials</h2>
                      <p className="text-sm text-gray-600">Required for automatic permit submission</p>
                    </div>
                    <button
                      onClick={() => setShowCredentialsModal(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                      disabled={selectedOrg.role === 'member'}
                    >
                      {hasAccelaCredentials ? 'Update' : 'Add'} Credentials
                    </button>
                  </div>

                  {hasAccelaCredentials ? (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          accelaVerified ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      ></div>
                      <span className="text-sm text-gray-700">
                        Credentials {accelaVerified ? 'verified' : 'saved (not yet verified)'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No credentials configured</p>
                  )}
                </div>

                {/* Team Members */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-navy-900 mb-4">Team Members</h2>

                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-semibold text-navy-900">User {member.user_id.substring(0, 8)}...</p>
                          <p className="text-xs text-gray-600">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4">No team members yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">Select an organization to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Create Organization</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="ACME HVAC Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  value={newOrgLicense}
                  onChange={(e) => setNewOrgLicense(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="CFC123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="(813) 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newOrgAddress}
                  onChange={(e) => setNewOrgAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="123 Main St, Tampa, FL 33601"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Professional HVAC services in Tampa Bay"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createOrganization}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accela Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 my-8">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Accela API Credentials</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
                <select
                  value={accelaAgency}
                  onChange={(e) => setAccelaAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Tampa">Tampa</option>
                  <option value="Hillsborough">Hillsborough County</option>
                  <option value="Pinellas">Pinellas County</option>
                  <option value="Pasco">Pasco County</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <select
                  value={accelaEnvironment}
                  onChange={(e) => setAccelaEnvironment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID *</label>
                <input
                  type="text"
                  value={accelaClientId}
                  onChange={(e) => setAccelaClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Your Accela Client ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret *</label>
                <input
                  type="password"
                  value={accelaClientSecret}
                  onChange={(e) => setAccelaClientSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Your Accela Client Secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username (Optional)</label>
                <input
                  type="text"
                  value={accelaUsername}
                  onChange={(e) => setAccelaUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Accela username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (Optional)</label>
                <input
                  type="password"
                  value={accelaPassword}
                  onChange={(e) => setAccelaPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Accela password"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Your credentials are encrypted and stored securely. They are only used
                  for automatic permit submission to Accela on your behalf.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAccelaCredentials}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Save Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PendingService {
  id: string;
  name: string;
  description: string;
  provider: string;
  provider_wallet: string;
  endpoint: string;
  health_check_url?: string;
  capabilities: string[];
  pricing: {
    perRequest: string;
    currency: string;
  };
  middleware_verified: boolean;
  network: string;
  metadata?: {
    image?: string;
    color?: string;
  };
}

interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  error?: string;
}

interface TestResult {
  endpoint: string;
  status: number;
  middlewareWorking: boolean;
  response?: TestResponse;
  message: string;
  error?: string;
}

export default function AdminApprovalsPage() {
  const { isAuthenticated, token, address: _address } = useAuth();
  const [services, setServices] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  // Fetch pending services
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetch('/api/admin/pending-services', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setServices(data.services);
        } else {
          setError(data.error || 'Failed to load pending services');
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, token]);

  const testEndpoint = async (serviceId: string) => {
    if (!token) return;

    setProcessing((prev) => ({ ...prev, [serviceId]: true }));

    try {
      const res = await fetch(`/api/admin/test-endpoint/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success && data.test) {
        setTestResults((prev) => ({
          ...prev,
          [serviceId]: data.test,
        }));
      } else if (!data.success && data.test) {
        setTestResults((prev) => ({
          ...prev,
          [serviceId]: data.test,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestResults((prev) => ({
        ...prev,
        [serviceId]: {
          endpoint: '',
          status: 0,
          middlewareWorking: false,
          message: '✗ Test failed',
          error: errorMessage,
        },
      }));
    } finally {
      setProcessing((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  const approveService = async (serviceId: string, notes: string = '') => {
    if (!token) return;

    setProcessing((prev) => ({ ...prev, [serviceId]: true }));

    try {
      const res = await fetch(`/api/admin/approve/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
        alert('Service approved successfully!');
      } else {
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  const rejectService = async (serviceId: string) => {
    if (!token) return;

    const notes = prompt('Please provide a reason for rejection:');
    if (!notes || notes.trim().length === 0) {
      alert('Rejection reason is required');
      return;
    }

    setProcessing((prev) => ({ ...prev, [serviceId]: true }));

    try {
      const res = await fetch(`/api/admin/reject/${serviceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
        alert('Service rejected');
      } else {
        alert(`Failed to reject: ${data.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark via-dark-secondary to-dark flex items-center justify-center">
        <div className="bg-dark-card border border-gray-800 rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-400 mb-4">Please sign in with an admin wallet to access this page.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple hover:bg-purple-dark text-white rounded-lg transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark via-dark-secondary to-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple mx-auto mb-4"></div>
          <p className="text-gray-400">Loading pending services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark via-dark-secondary to-dark flex items-center justify-center">
        <div className="bg-dark-card border border-red-800 rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple hover:bg-purple-dark text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-dark-secondary to-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Approval Dashboard</h1>
          <p className="text-gray-400">Review and approve pending service registrations</p>
        </div>

        {services.length === 0 ? (
          <div className="bg-dark-card border border-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-gray-400">No pending services to review</p>
          </div>
        ) : (
          <div className="space-y-6">
            {services.map((service) => {
              const testResult = testResults[service.id];
              const isProcessing = processing[service.id];

              return (
                <div
                  key={service.id}
                  className="bg-dark-card border border-gray-800 rounded-lg p-6 hover:border-purple/50 transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Service Icon */}
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: service.metadata?.color || '#a855f7' }}
                    >
                      {service.metadata?.image || '🔮'}
                    </div>

                    {/* Service Details */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                      <p className="text-gray-400 mb-4">{service.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Provider</p>
                          <p className="text-white">{service.provider}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Price</p>
                          <p className="text-white">{service.pricing.perRequest} {service.pricing.currency}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Wallet ({service.network})</p>
                          <p className="text-white font-mono text-xs truncate">{service.provider_wallet}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Middleware Status</p>
                          <p className={service.middleware_verified ? 'text-green' : 'text-yellow'}>
                            {service.middleware_verified ? '✓ Verified' : '⚠ Not verified'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-500 text-sm mb-2">Capabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {service.capabilities.map((cap, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-purple/20 text-purple rounded-full text-sm"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-500 text-sm mb-1">Endpoint</p>
                        <p className="text-white font-mono text-sm">{service.endpoint}</p>
                      </div>

                      {testResult && (
                        <div
                          className={`mb-4 p-4 rounded-lg ${
                            testResult.middlewareWorking
                              ? 'bg-green/10 border border-green/30'
                              : 'bg-red/10 border border-red/30'
                          }`}
                        >
                          <p className="text-white font-semibold mb-1">{testResult.message}</p>
                          <p className="text-gray-400 text-sm">Status: {testResult.status}</p>
                          {testResult.error && (
                            <p className="text-red text-sm mt-2">Error: {testResult.error}</p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => void testEndpoint(service.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-blue hover:bg-blue-dark text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Testing...' : 'Test Endpoint'}
                        </button>
                        <button
                          onClick={() => void approveService(service.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-green hover:bg-green-dark text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => void rejectService(service.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-red hover:bg-red-dark text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

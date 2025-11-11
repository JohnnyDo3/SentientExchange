'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, RefreshCw, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ServiceMetrics from '@/components/providers/ServiceMetrics';
import ServiceList from '@/components/providers/ServiceList';
import EditServiceModal from '@/components/providers/EditServiceModal';
import ParticleScene from '@/components/3d/ParticleScene';
import { Service } from '@/lib/types';
import { MarketplaceAPI } from '@/lib/marketplace-api';
import { soundManager } from '@/lib/sound';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedConnectButton from '@/components/wallet/UnifiedConnectButton';

export default function MyServicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load services from API
  const loadServices = useCallback(async () => {
    // Don't load if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if backend is available
      const isAvailable = await MarketplaceAPI.checkHealth();
      setBackendAvailable(isAvailable);

      if (isAvailable) {
        // Use authenticated endpoint to get only user's services
        const myServices = await MarketplaceAPI.getMyServices();
        setServices(myServices);
      } else {
        // Fallback to empty state if backend not available
        setServices([]);
      }
    } catch (error) {
      console.error('Error loading services:', error);

      // Handle authentication errors
      if (error instanceof Error && error.message?.includes('Authentication')) {
        setError('Please sign in to view your services');
      } else {
        setError('Failed to load services. Please try again.');
      }

      setServices([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      void loadServices();
    }
  }, [isAuthenticated, authLoading, loadServices]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    soundManager.playClick();
    void loadServices();
  };

  const handleEdit = (service: Service) => {
    soundManager.playClick();
    setEditingService(service);
  };

  const handleEditSuccess = (updatedService: Service) => {
    // Update the service in the list
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
    soundManager.playSuccessChord();
  };

  const handleDeleteAsync = async (service: Service) => {
    try {
      await MarketplaceAPI.deleteService(service.id);
      setServices(services.filter(s => s.id !== service.id));
      soundManager.playSuccessChord();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  const handleDelete = (service: Service) => {
    void handleDeleteAsync(service);
  };

  const handleViewAnalytics = (service: Service) => {
    router.push(`/providers/analytics?service=${service.id}`);
  };

  const handleToggleActive = (service: Service) => {
    // TODO: Implement pause/resume functionality
    console.log('Toggle active:', service);
    soundManager.playSuccessChord();
  };

  // Calculate aggregate metrics
  const totalRevenue = services.reduce((sum, service) => {
    const price = parseFloat(service.pricing.perRequest.replace('$', ''));
    return sum + (service.reputation.totalJobs * price);
  }, 0);

  const totalRequests = services.reduce((sum, service) => sum + service.reputation.totalJobs, 0);

  const avgRating = services.length > 0
    ? services.reduce((sum, service) => sum + service.reputation.rating, 0) / services.length
    : 0;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleScene />
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-2 gradient-text">
                My Services
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-400">
                Manage your services and track performance
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  router.push('/providers/register');
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple to-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add New Service
              </button>
            </div>
          </div>

          {/* Backend Status Indicator */}
          {!isLoading && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-green animate-pulse' : 'bg-red'}`} />
              <span className={backendAvailable ? 'text-green' : 'text-red-400'}>
                {backendAvailable ? 'Connected to API Server' : 'API Server Offline - Using Mock Data'}
              </span>
            </div>
          )}
        </motion.div>

        {/* Auth Loading State */}
        {authLoading ? (
          <div className="container mx-auto px-4 md:px-6 pb-16">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple mx-auto mb-4" />
                <p className="text-gray-400">Checking authentication...</p>
              </div>
            </div>
          </div>
        ) : !isAuthenticated ? (
          /* Connect Wallet Prompt */
          <div className="container mx-auto px-4 md:px-6 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center py-20"
            >
              <div className="glass rounded-3xl p-12 border border-gray-800">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-3xl font-bold gradient-text mb-4">
                  Connect Your Wallet
                </h2>

                <p className="text-xl text-gray-400 mb-8">
                  Please connect and sign in with your wallet to view and manage your services.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex justify-center">
                  <UnifiedConnectButton />
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  New to Sentient Exchange? Connect your wallet to start providing AI services and earn revenue.
                </p>
              </div>
            </motion.div>
          </div>
        ) : isLoading ? (
          /* Loading Services */
          <div className="container mx-auto px-4 md:px-6 pb-16">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple mx-auto mb-4" />
                <p className="text-gray-400">Loading your services...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 md:px-6 pb-16">
            {/* Metrics Section */}
            {services.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-8"
              >
                <ServiceMetrics
                  totalRevenue={totalRevenue}
                  totalRequests={totalRequests}
                  avgRating={avgRating}
                  revenueTrend={23}      // Mock trend data
                  requestsTrend={156}    // Mock trend data
                  ratingTrend={0.1}      // Mock trend data
                />
              </motion.div>
            )}

            {/* Services List Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  Your Services ({services.length})
                </h2>
              </div>

              <ServiceList
                services={services}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewAnalytics={handleViewAnalytics}
                onToggleActive={handleToggleActive}
              />
            </motion.div>

            {/* Help Section */}
            {services.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-8 glass rounded-2xl p-6 border border-gray-800"
              >
                <h3 className="text-xl font-bold text-white mb-4">Tips for Success</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-3xl mb-2">📈</div>
                    <h4 className="font-semibold text-white mb-1">Optimize Pricing</h4>
                    <p className="text-sm text-gray-400">
                      Competitive pricing attracts more users. Monitor your competitors and adjust accordingly.
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">⚡</div>
                    <h4 className="font-semibold text-white mb-1">Improve Response Time</h4>
                    <p className="text-sm text-gray-400">
                      Faster services get better ratings. Aim for sub-3 second response times.
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">⭐</div>
                    <h4 className="font-semibold text-white mb-1">Maintain Quality</h4>
                    <p className="text-sm text-gray-400">
                      High success rates and good reviews lead to more usage. Monitor feedback closely.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

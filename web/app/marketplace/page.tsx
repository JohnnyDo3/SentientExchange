'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Service } from '@/lib/types';
import ServiceGrid from '@/components/marketplace/ServiceGrid';
import FilterPanel from '@/components/marketplace/FilterPanel';
import ServiceModal from '@/components/marketplace/ServiceModal';
import MarketplaceStats from '@/components/marketplace/MarketplaceStats';
import ParticleScene from '@/components/3d/ParticleScene';
import { soundManager } from '@/lib/sound';

export const dynamic = 'force-dynamic';

export default function MarketplacePage() {
  const {
    services,
    filters,
    stats,
    isLoading,
    isBackendAvailable,
    updateFilters,
    clearFilters
  } = useMarketplace();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize sound on first user interaction
  useEffect(() => {
    const initSound = () => {
      soundManager.init();
      document.removeEventListener('click', initSound);
    };
    document.addEventListener('click', initSound);
    return () => document.removeEventListener('click', initSound);
  }, []);

  const handleServiceClick = (service: Service) => {
    soundManager.playClick();
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    soundManager.playClick();
    setIsModalOpen(false);
    // Delay clearing selected service for smooth animation
    setTimeout(() => setSelectedService(null), 300);
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleScene />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-6 md:pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-4 md:mb-6 gradient-text text-center">
            MARKETPLACE
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white font-semibold text-center mb-6 md:mb-8">
            Discover the Agent Economy
          </p>

          {/* Stats Bar */}
          <MarketplaceStats
            stats={stats}
            isBackendAvailable={isBackendAvailable}
          />
        </motion.div>

        {/* Main Layout: Filter Panel + Visualization */}
        <div className="container mx-auto px-4 md:px-6 pb-12 md:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Filter Panel (Left Sidebar) */}
            <div className="lg:col-span-3">
              <FilterPanel
                filters={filters}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
              />
            </div>

            {/* Service Grid (Main Area) */}
            <div className="lg:col-span-9">
              {isLoading ? (
                <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple mx-auto mb-4" />
                    <p className="text-gray-400">Loading services...</p>
                  </div>
                </div>
              ) : services.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <p className="text-2xl text-gray-400 mb-2">No services found</p>
                    <p className="text-gray-500">Try adjusting your filters</p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 btn-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              ) : (
                <ServiceGrid
                  services={services}
                  onServiceClick={handleServiceClick}
                />
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="container mx-auto px-4 md:px-6 pb-6 md:pb-8">
          <motion.p
            className="text-center text-sm md:text-base text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Showing {services.length} service{services.length !== 1 ? 's' : ''}
            {services.length !== stats.totalServices && ` of ${stats.totalServices} total`}
          </motion.p>
        </div>
      </div>

      {/* Service Modal */}
      <ServiceModal
        service={selectedService}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

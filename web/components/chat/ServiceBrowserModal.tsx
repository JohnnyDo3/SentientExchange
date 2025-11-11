'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Zap,
  Star,
  TrendingUp,
  Filter,
  Grid3x3,
  List,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  pricing: {
    amount?: number;
    perRequest?: number;
    currency: string;
  };
  reputation: {
    rating: number;
    reviewCount: number;
  };
  capabilities: string[];
  metadata: {
    image?: string;
    category?: string;
  };
}

interface ServiceBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseService: (serviceName: string, serviceId: string) => void;
}

export default function ServiceBrowserModal({
  isOpen,
  onClose,
  onUseService,
}: ServiceBrowserModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'popular' | 'recent'>('rating');

  // Fetch services from marketplace API
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketplace/services');
      if (!response.ok) throw new Error('Failed to fetch services');

      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen, fetchServices]);

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(services.map((s) => s.metadata.category || 'other')))];

  // Filter and sort services
  const filteredServices = services
    .filter((service) => {
      const matchesSearch =
        searchQuery === '' ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.capabilities.some((cap) => cap.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || service.metadata.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.reputation.rating - a.reputation.rating;
        case 'popular':
          return b.reputation.reviewCount - a.reputation.reviewCount;
        case 'recent':
          return 0; // Would need timestamp field for this
        default:
          return 0;
      }
    });

  const handleUseService = (service: Service) => {
    onUseService(service.name, service.id);
    onClose();
  };

  // Keyboard shortcut to close (Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-browser-title"
            aria-describedby="service-browser-desc"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div>
                  <h2 id="service-browser-title" className="text-2xl font-bold gradient-text">Service Browser</h2>
                  <p id="service-browser-desc" className="text-sm text-gray-400 mt-1">Discover AI services for your tasks</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close service browser"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-gray-800 space-y-4">
                {/* Search */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services, capabilities..."
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple/50 transition-colors"
                      aria-label="Search services"
                    />
                  </div>
                  <div className="flex items-center gap-2" role="group" aria-label="View mode">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'grid' ? 'bg-purple/20 text-purple' : 'hover:bg-gray-800'
                      }`}
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                    >
                      <Grid3x3 className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'list' ? 'bg-purple/20 text-purple' : 'hover:bg-gray-800'
                      }`}
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                    >
                      <List className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple/50"
                      aria-label="Filter by category"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple/50"
                      aria-label="Sort by"
                    >
                      <option value="rating">Top Rated</option>
                      <option value="popular">Most Popular</option>
                      <option value="recent">Recently Added</option>
                    </select>
                  </div>
                  <div className="ml-auto text-sm text-gray-400" role="status" aria-live="polite">
                    {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full" role="status" aria-label="Loading services">
                    <Loader2 className="w-8 h-8 text-purple animate-spin" />
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500" role="status">
                    <Search className="w-16 h-16 mb-4 opacity-50" aria-hidden="true" />
                    <p className="text-lg font-medium">No services found</p>
                    <p className="text-sm mt-2">Try adjusting your filters or search query</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((service) => (
                      <ServiceCard key={service.id} service={service} onUse={handleUseService} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredServices.map((service) => (
                      <ServiceListItem key={service.id} service={service} onUse={handleUseService} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Grid Card Component
function ServiceCard({ service, onUse }: { service: Service; onUse: (s: Service) => void }) {
  const price = service.pricing.perRequest || service.pricing.amount || 0;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple/50 transition-all cursor-pointer group text-left w-full"
      onClick={() => onUse(service)}
      aria-label={`Use ${service.name} service, rated ${service.reputation.rating} stars, costs ${price} ${service.pricing.currency}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {service.metadata.image ? (
            <span className="text-2xl" aria-hidden="true">{service.metadata.image}</span>
          ) : (
            <Zap className="w-5 h-5 text-purple" aria-hidden="true" />
          )}
          <div>
            <h3 className="font-semibold text-white group-hover:text-purple transition-colors">
              {service.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow fill-yellow" aria-hidden="true" />
              <span className="text-xs text-gray-400">
                {service.reputation.rating.toFixed(1)} ({service.reputation.reviewCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{service.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {service.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded"
          >
            {cap}
          </span>
        ))}
        {service.capabilities.length > 3 && (
          <span className="text-xs px-2 py-1 text-gray-500">
            +{service.capabilities.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <span className="text-sm font-mono text-purple">
          ${price.toFixed(4)} {service.pricing.currency}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple group-hover:translate-x-1 transition-all" aria-hidden="true" />
      </div>
    </motion.button>
  );
}

// List Item Component
function ServiceListItem({ service, onUse }: { service: Service; onUse: (s: Service) => void }) {
  const price = service.pricing.perRequest || service.pricing.amount || 0;

  return (
    <motion.button
      whileHover={{ scale: 1.01, x: 4 }}
      className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-purple/50 transition-all cursor-pointer group flex items-center gap-4 text-left w-full"
      onClick={() => onUse(service)}
      aria-label={`Use ${service.name} service, rated ${service.reputation.rating} stars, costs ${price} ${service.pricing.currency}`}
    >
      <div className="flex-shrink-0">
        {service.metadata.image ? (
          <span className="text-3xl" aria-hidden="true">{service.metadata.image}</span>
        ) : (
          <div className="w-12 h-12 bg-purple/20 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-purple" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-white group-hover:text-purple transition-colors truncate">
            {service.name}
          </h3>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow fill-yellow" aria-hidden="true" />
            <span className="text-xs text-gray-400">{service.reputation.rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 line-clamp-1 mb-2">{service.description}</p>
        <div className="flex flex-wrap gap-1">
          {service.capabilities.slice(0, 5).map((cap) => (
            <span key={cap} className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded">
              {cap}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-mono text-purple mb-1">
          ${price.toFixed(4)}
        </div>
        <div className="text-xs text-gray-500">{service.pricing.currency}</div>
      </div>

      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple group-hover:translate-x-1 transition-all flex-shrink-0" aria-hidden="true" />
    </motion.button>
  );
}

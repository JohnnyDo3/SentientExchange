import { useState, useEffect, useCallback } from 'react';
import { Service, ServiceFilters, MarketplaceStats } from '@/lib/types';
import { MarketplaceAPI } from '@/lib/marketplace-api';

export function useMarketplace() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [filters, setFilters] = useState<ServiceFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);

  /**
   * Check if backend is available
   */
  useEffect(() => {
    MarketplaceAPI.checkHealth().then(setIsBackendAvailable);
  }, []);

  /**
   * Load services from real backend
   */
  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch from real backend
      const realServices = await MarketplaceAPI.getAllServices();
      setServices(realServices);
      setFilteredServices(realServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
      console.error('Failed to load services:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Apply filters and sorting to services
   */
  const applyFilters = useCallback(() => {
    let filtered = [...services];

    // Filter by capabilities
    if (filters.capabilities && filters.capabilities.length > 0) {
      filtered = filtered.filter(service =>
        filters.capabilities!.some(cap => service.capabilities.includes(cap))
      );
    }

    // Filter by price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filtered = filtered.filter(service => {
        const price = parseFloat(service.pricing.perRequest.replace('$', ''));
        const matchesMin = filters.minPrice === undefined || price >= filters.minPrice;
        const matchesMax = filters.maxPrice === undefined || price <= filters.maxPrice;
        return matchesMin && matchesMax;
      });
    }

    // Filter by rating
    if (filters.minRating !== undefined) {
      filtered = filtered.filter(service => service.reputation.rating >= filters.minRating!);
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price-asc':
            return parseFloat(a.pricing.perRequest.replace('$', '')) - parseFloat(b.pricing.perRequest.replace('$', ''));
          case 'price-desc':
            return parseFloat(b.pricing.perRequest.replace('$', '')) - parseFloat(a.pricing.perRequest.replace('$', ''));
          case 'rating-asc':
            return a.reputation.rating - b.reputation.rating;
          case 'rating-desc':
            return b.reputation.rating - a.reputation.rating;
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });
    }

    setFilteredServices(filtered);
  }, [services, filters]);

  /**
   * Load services on mount
   */
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  /**
   * Apply filters when filters or services change
   */
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters: Partial<ServiceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  /**
   * Get marketplace statistics
   */
  const getStats = useCallback((): MarketplaceStats => {
    if (services.length === 0) {
      return {
        totalServices: 0,
        totalJobs: 0,
        avgRating: 0,
        activeServices: 0
      };
    }

    const totalServices = services.length;
    const totalJobs = services.reduce((sum, s) => sum + s.reputation.totalJobs, 0);
    const avgRating = services.reduce((sum, s) => sum + s.reputation.rating, 0) / totalServices;
    const activeServices = services.filter(s => s.reputation.successRate > 95).length;

    return {
      totalServices,
      totalJobs,
      avgRating: parseFloat(avgRating.toFixed(1)),
      activeServices
    };
  }, [services]);

  /**
   * Get service by ID
   */
  const getServiceById = useCallback((id: string): Service | undefined => {
    return services.find(s => s.id === id);
  }, [services]);

  /**
   * Calculate shared capabilities between two services
   */
  const getSharedCapabilities = useCallback((serviceA: Service, serviceB: Service): string[] => {
    return serviceA.capabilities.filter(cap => serviceB.capabilities.includes(cap));
  }, []);

  return {
    // Data
    services: filteredServices,
    allServices: services,
    filters,
    stats: getStats(),

    // State
    isLoading,
    error,
    isBackendAvailable,

    // Actions
    updateFilters,
    clearFilters,
    loadServices,
    getServiceById,
    getSharedCapabilities
  };
}

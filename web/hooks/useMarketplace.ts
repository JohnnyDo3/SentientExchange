import { useState, useEffect, useCallback } from 'react';
import { Service, ServiceFilters, MarketplaceStats } from '@/lib/types';
import { mockServices } from '@/lib/mock-services';
import { mockServices100, getMarketplaceStats100, getAllCapabilities100, getPriceRange100 } from '@/lib/mock-services-100';
import { MarketplaceAPI } from '@/lib/marketplace-api';

// Toggle between 6 and 100 services for testing
const USE_100_SERVICES = true;

export function useMarketplace() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [filters, setFilters] = useState<ServiceFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(true); // Start with mock data
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);

  /**
   * Check if backend is available
   */
  useEffect(() => {
    MarketplaceAPI.checkHealth().then(setIsBackendAvailable);
  }, []);

  /**
   * Load services (mock or real)
   */
  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (useMockData) {
        // Use mock data (6 or 100 services)
        const mockData = USE_100_SERVICES ? mockServices100 : mockServices;
        setServices(mockData);
        setFilteredServices(mockData);
      } else {
        // Fetch from real backend
        const realServices = await MarketplaceAPI.getAllServices();
        setServices(realServices);
        setFilteredServices(realServices);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
      // Fallback to mock data on error
      const mockData = USE_100_SERVICES ? mockServices100 : mockServices;
      setServices(mockData);
      setFilteredServices(mockData);
    } finally {
      setIsLoading(false);
    }
  }, [useMockData]);

  /**
   * Apply filters to services
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

    setFilteredServices(filtered);
  }, [services, filters]);

  /**
   * Load services when data source changes
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
   * Toggle between mock and real data
   */
  const toggleDataSource = useCallback(() => {
    setUseMockData(prev => !prev);
  }, []);

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
    if (useMockData || services.length === 0) {
      return USE_100_SERVICES ? getMarketplaceStats100() : {
        totalServices: 6,
        totalJobs: 14547,
        avgRating: 4.7,
        activeServices: 5
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
  }, [services, useMockData]);

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
    useMockData,
    isBackendAvailable,

    // Actions
    updateFilters,
    clearFilters,
    toggleDataSource,
    loadServices,
    getServiceById,
    getSharedCapabilities
  };
}

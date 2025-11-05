import axios from 'axios';
import {
  checkServiceHealth,
  checkMultipleServicesHealth,
  filterHealthyServices,
  rankServices,
} from '../../../src/utils/health-check';
import type { Service } from '../../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('health-check', () => {
  const mockService: Service = {
    id: 'service-1',
    name: 'Test Service',
    description: 'Test',
    provider: 'provider-wallet',
    endpoint: 'http://localhost:3000',
    capabilities: ['test'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
    },
    reputation: {
      totalJobs: 100,
      successRate: 95,
      avgResponseTime: '2.5s',
      rating: 4.5,
      reviews: 20,
    },
    metadata: {
      apiVersion: 'v1',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status for successful response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('healthy');
      expect(result.serviceId).toBe('service-1');
      expect(result.responseTime).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.any(Object)
      );
    });

    it('should return healthy for ok status', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'ok' },
      });

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('healthy');
    });

    it('should return healthy for healthy=true', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { healthy: true },
      });

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('healthy');
    });

    it('should return unhealthy for non-200 status', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 500,
        data: {},
      });

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('status code');
    });

    it('should return unhealthy for connection timeout', async () => {
      const timeoutError: any = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(timeoutError);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Health check timeout');
    });

    it('should return unhealthy for connection refused', async () => {
      const connError: any = new Error('connection refused');
      connError.code = 'ECONNREFUSED';
      connError.isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(connError);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const result = await checkServiceHealth(mockService);

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Service unreachable');
    });

    it('should respect custom timeout', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      await checkServiceHealth(mockService, 10000);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 10000 })
      );
    });
  });

  describe('checkMultipleServicesHealth', () => {
    const services: Service[] = [
      { ...mockService, id: 'service-1', endpoint: 'http://localhost:3001' },
      { ...mockService, id: 'service-2', endpoint: 'http://localhost:3002' },
      { ...mockService, id: 'service-3', endpoint: 'http://localhost:3003' },
    ];

    it('should check all services in parallel', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      const results = await checkMultipleServicesHealth(services, {
        parallel: true,
      });

      expect(results).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should check services sequentially when parallel=false', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      const results = await checkMultipleServicesHealth(services, {
        parallel: false,
      });

      expect(results).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should respect concurrency limit', async () => {
      const manyServices = Array(25)
        .fill(null)
        .map((_, i) => ({
          ...mockService,
          id: `service-${i}`,
          endpoint: `http://localhost:${3000 + i}`,
        }));

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      const results = await checkMultipleServicesHealth(manyServices, {
        parallel: true,
        maxConcurrent: 10,
      });

      expect(results).toHaveLength(25);
    });
  });

  describe('filterHealthyServices', () => {
    const services: Service[] = [
      { ...mockService, id: 'service-1' },
      { ...mockService, id: 'service-2' },
      { ...mockService, id: 'service-3' },
      { ...mockService, id: 'service-4' },
    ];

    const healthResults = [
      { serviceId: 'service-1', status: 'healthy' as const, responseTime: 100 },
      { serviceId: 'service-2', status: 'unhealthy' as const, error: 'timeout' },
      { serviceId: 'service-3', status: 'healthy' as const, responseTime: 200 },
      // service-4 missing (unknown)
    ];

    it('should categorize services by health status', () => {
      const filtered = filterHealthyServices(services, healthResults);

      expect(filtered.healthy).toHaveLength(2);
      expect(filtered.unhealthy).toHaveLength(1);
      expect(filtered.unknown).toHaveLength(1);

      expect(filtered.healthy.map(s => s.id)).toEqual(['service-1', 'service-3']);
      expect(filtered.unhealthy.map(s => s.id)).toEqual(['service-2']);
      expect(filtered.unknown.map(s => s.id)).toEqual(['service-4']);
    });
  });

  describe('rankServices', () => {
    const services: Service[] = [
      {
        ...mockService,
        id: 'service-1',
        pricing: { perRequest: '$0.05', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 4.0 },
      },
      {
        ...mockService,
        id: 'service-2',
        pricing: { perRequest: '$0.01', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 5.0 },
      },
      {
        ...mockService,
        id: 'service-3',
        pricing: { perRequest: '$0.03', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 3.5 },
      },
    ];

    const healthResults = [
      { serviceId: 'service-1', status: 'healthy' as const, responseTime: 1000 },
      { serviceId: 'service-2', status: 'healthy' as const, responseTime: 500 },
      { serviceId: 'service-3', status: 'unhealthy' as const, error: 'timeout' },
    ];

    it('should rank by health, rating, and price', () => {
      const ranked = rankServices(services, healthResults);

      // service-2 should be first (healthy, high rating, low price, fast response)
      expect(ranked[0].id).toBe('service-2');

      // service-3 should be last (unhealthy)
      expect(ranked[2].id).toBe('service-3');
    });

    it('should handle custom weight preferences', () => {
      const ranked = rankServices(services, healthResults, {
        health: 0.1,
        rating: 0.1,
        price: 0.7, // Heavily weight price
        responseTime: 0.1,
      });

      // With heavy price weighting, service-2 ($0.01) should still be first
      expect(ranked[0].id).toBe('service-2');
    });

    it('should handle missing reputation gracefully', () => {
      const servicesWithoutRating = services.map(s => ({
        ...s,
        reputation: {
          ...s.reputation,
          rating: 0,
        },
      }));

      const ranked = rankServices(servicesWithoutRating, healthResults);

      expect(ranked).toHaveLength(3);
    });
  });
});

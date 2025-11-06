/**
 * HealthMonitor Unit Tests
 *
 * Comprehensive tests for the service health monitoring system including:
 * - Start/stop monitoring lifecycle
 * - Health check execution for services
 * - Status determination (healthy, degraded, unhealthy)
 * - Database recording of health checks
 * - Health history tracking
 * - Health statistics aggregation
 * - Unhealthy service handling
 * - Error handling and edge cases
 */

import { HealthMonitor, HealthCheckResult } from '../../../src/monitoring/HealthMonitor';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Database } from '../../../src/registry/database';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');

const MockAxios = axios as jest.Mocked<typeof axios>;

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let mockRegistry: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock registry
    mockRegistry = {
      getAllServices: jest.fn().mockReturnValue([]),
    };

    // Setup mock database
    mockDb = {
      run: jest.fn().mockResolvedValue({}),
      all: jest.fn().mockResolvedValue([]),
    };

    healthMonitor = new HealthMonitor(mockRegistry as any, mockDb as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    healthMonitor.stop();
  });

  describe('Start/Stop Monitoring', () => {
    it('should start health monitoring', () => {
      healthMonitor.start(5);

      // Timer should be set (implementation detail, but we can verify behavior)
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should run health checks immediately on start', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        {
          id: 'service-1',
          name: 'Test Service',
          endpoint: 'https://test.com',
          status: 'approved',
        },
      ]);

      MockAxios.get.mockResolvedValue({
        status: 200,
        data: {},
      });

      healthMonitor.start(5);

      // Wait for immediate execution without running interval timers
      await jest.advanceTimersByTimeAsync(0);

      expect(mockRegistry.getAllServices).toHaveBeenCalled();
      expect(MockAxios.get).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      healthMonitor.start(5);
      const timers1 = jest.getTimerCount();

      healthMonitor.start(5); // Try to start again

      const timers2 = jest.getTimerCount();
      expect(timers1).toBe(timers2); // Should not create additional timers
    });

    it('should stop health monitoring', () => {
      healthMonitor.start(5);
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      healthMonitor.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should use custom interval', () => {
      healthMonitor.start(10); // 10 minutes

      // Should set interval for 10 * 60 * 1000 ms
      const timers = jest.getTimerCount();
      expect(timers).toBeGreaterThan(0);
    });
  });

  describe('Health Check Execution', () => {
    it('should check approved services only', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: '1', name: 'Approved', status: 'approved', endpoint: 'https://test1.com' },
        { id: '2', name: 'Pending', status: 'pending', endpoint: 'https://test2.com' },
        { id: '3', name: 'Rejected', status: 'rejected', endpoint: 'https://test3.com' },
      ]);

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1); // Only approved service
      expect(results[0].serviceName).toBe('Approved');
    });

    it('should use health_check_url if provided', async () => {
      const service = {
        id: 'service-1',
        name: 'Test',
        status: 'approved',
        endpoint: 'https://test.com/api',
        health_check_url: 'https://test.com/health',
      };

      mockRegistry.getAllServices.mockReturnValue([service]);
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        'https://test.com/health',
        expect.any(Object)
      );
    });

    it('should fallback to endpoint if no health_check_url', async () => {
      const service = {
        id: 'service-1',
        name: 'Test',
        status: 'approved',
        endpoint: 'https://test.com/api',
      };

      mockRegistry.getAllServices.mockReturnValue([service]);
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        'https://test.com/api',
        expect.any(Object)
      );
    });

    it('should set request timeout', async () => {
      const service = {
        id: 'service-1',
        name: 'Test',
        status: 'approved',
        endpoint: 'https://test.com',
      };

      mockRegistry.getAllServices.mockReturnValue([service]);
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it('should include user agent header', async () => {
      const service = {
        id: 'service-1',
        name: 'Test',
        status: 'approved',
        endpoint: 'https://test.com',
      };

      mockRegistry.getAllServices.mockReturnValue([service]);
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'AgentMarket-HealthMonitor/1.0',
          }),
        })
      );
    });
  });

  describe('Health Status Determination', () => {
    beforeEach(() => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: 'service-1', name: 'Test', status: 'approved', endpoint: 'https://test.com' },
      ]);
    });

    it('should mark 2xx responses as healthy', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('healthy');
      expect(results[0].statusCode).toBe(200);
    });

    it('should mark 5xx responses as unhealthy', async () => {
      MockAxios.get.mockResolvedValue({ status: 500, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('unhealthy');
      expect(results[0].statusCode).toBe(500);
    });

    it('should mark 4xx responses as degraded', async () => {
      MockAxios.get.mockResolvedValue({ status: 404, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('degraded');
      expect(results[0].statusCode).toBe(404);
    });

    it('should mark slow responses (>5s) as degraded', async () => {
      // Mock a slow response
      MockAxios.get.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ status: 200, data: {} });
          }, 6000);
        });
      });

      const resultsPromise = healthMonitor.runHealthChecks();
      jest.advanceTimersByTime(6000);
      const results = await resultsPromise;

      expect(results[0].status).toBe('degraded');
      expect(results[0].responseTime).toBeGreaterThan(5000);
    });

    it('should mark network errors as unhealthy', async () => {
      MockAxios.get.mockRejectedValue(new Error('Network error'));

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('unhealthy');
      expect(results[0].error).toBeDefined();
    });

    it('should mark timeout errors as unhealthy', async () => {
      MockAxios.get.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('unhealthy');
      expect(results[0].error).toContain('timeout');
    });
  });

  describe('Response Time Tracking', () => {
    beforeEach(() => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: 'service-1', name: 'Test', status: 'approved', endpoint: 'https://test.com' },
      ]);
    });

    it('should track response time for successful requests', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof results[0].responseTime).toBe('number');
    });

    it('should track response time for failed requests', async () => {
      MockAxios.get.mockRejectedValue(new Error('Failed'));

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Recording', () => {
    beforeEach(() => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: 'service-1', name: 'Test', status: 'approved', endpoint: 'https://test.com' },
      ]);
    });

    it('should record health check in database', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO service_health_checks'),
        expect.arrayContaining([
          'service-1',
          'healthy',
          expect.any(Number),
          200,
          null,
          expect.any(Number),
        ])
      );
    });

    it('should record error in database', async () => {
      MockAxios.get.mockRejectedValue(new Error('Network error'));

      await healthMonitor.runHealthChecks();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO service_health_checks'),
        expect.arrayContaining([
          'service-1',
          'unhealthy',
          expect.any(Number),
          null,
          'Network error',
          expect.any(Number),
        ])
      );
    });

    it('should continue if database recording fails', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });
      mockDb.run.mockRejectedValue(new Error('DB error'));

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('healthy');
    });
  });

  describe('Unhealthy Service Handling', () => {
    beforeEach(() => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: 'service-1', name: 'Test', status: 'approved', endpoint: 'https://test.com' },
      ]);
      MockAxios.get.mockRejectedValue(new Error('Failed'));
    });

    it('should check recent health history for unhealthy service', async () => {
      await healthMonitor.runHealthChecks();

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT status FROM service_health_checks'),
        expect.arrayContaining(['service-1'])
      );
    });

    it('should log warning if consistently unhealthy', async () => {
      // Mock 5 consecutive unhealthy checks
      mockDb.all.mockResolvedValue([
        { status: 'unhealthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' },
      ]);

      await healthMonitor.runHealthChecks();

      // Should query history (tested above)
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should not alert if only 1-2 failures', async () => {
      mockDb.all.mockResolvedValue([
        { status: 'unhealthy' },
        { status: 'healthy' },
      ]);

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.all.mockRejectedValue(new Error('DB error'));

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('unhealthy');
    });
  });

  describe('Health History', () => {
    it('should retrieve health history for a service', async () => {
      const mockHistory = [
        { service_id: 'service-1', status: 'healthy', checked_at: Date.now() },
        { service_id: 'service-1', status: 'healthy', checked_at: Date.now() - 1000 },
      ];

      mockDb.all.mockResolvedValue(mockHistory);

      const history = await healthMonitor.getHealthHistory('service-1');

      expect(history).toEqual(mockHistory);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('FROM service_health_checks'),
        expect.arrayContaining(['service-1', 100])
      );
    });

    it('should use custom limit', async () => {
      mockDb.all.mockResolvedValue([]);

      await healthMonitor.getHealthHistory('service-1', 50);

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['service-1', 50])
      );
    });

    it('should return empty array on error', async () => {
      mockDb.all.mockRejectedValue(new Error('DB error'));

      const history = await healthMonitor.getHealthHistory('service-1');

      expect(history).toEqual([]);
    });
  });

  describe('Health Statistics', () => {
    it('should aggregate health stats', async () => {
      const mockChecks = [
        { service_id: '1', status: 'healthy', response_time: 100 },
        { service_id: '2', status: 'healthy', response_time: 200 },
        { service_id: '3', status: 'degraded', response_time: 5500 },
        { service_id: '4', status: 'unhealthy', response_time: 1000 },
      ];

      mockDb.all.mockResolvedValue(mockChecks);

      const stats = await healthMonitor.getHealthStats();

      expect(stats).toEqual({
        totalServices: 4,
        healthy: 2,
        degraded: 1,
        unhealthy: 1,
        avgResponseTime: 1700, // (100 + 200 + 5500 + 1000) / 4 = 1700
      });
    });

    it('should handle empty results', async () => {
      mockDb.all.mockResolvedValue([]);

      const stats = await healthMonitor.getHealthStats();

      expect(stats).toEqual({
        totalServices: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        avgResponseTime: 0,
      });
    });

    it('should return zero stats on error', async () => {
      mockDb.all.mockRejectedValue(new Error('DB error'));

      const stats = await healthMonitor.getHealthStats();

      expect(stats).toEqual({
        totalServices: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        avgResponseTime: 0,
      });
    });

    it('should round average response time', async () => {
      const mockChecks = [
        { service_id: '1', status: 'healthy', response_time: 100 },
        { service_id: '2', status: 'healthy', response_time: 101 },
        { service_id: '3', status: 'healthy', response_time: 102 },
      ];

      mockDb.all.mockResolvedValue(mockChecks);

      const stats = await healthMonitor.getHealthStats();

      expect(stats.avgResponseTime).toBe(101); // Rounded
    });
  });

  describe('Check Service Health', () => {
    it('should check individual service health', async () => {
      const service = {
        id: 'service-1',
        name: 'Test Service',
        endpoint: 'https://test.com',
      };

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result = await healthMonitor.checkServiceHealth(service);

      expect(result).toMatchObject({
        serviceId: 'service-1',
        serviceName: 'Test Service',
        status: 'healthy',
        statusCode: 200,
        responseTime: expect.any(Number),
        checkedAt: expect.any(Number),
      });
    });

    it('should include timestamp', async () => {
      const service = {
        id: 'service-1',
        name: 'Test',
        endpoint: 'https://test.com',
      };

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const before = Date.now();
      const result = await healthMonitor.checkServiceHealth(service);
      const after = Date.now();

      expect(result.checkedAt).toBeGreaterThanOrEqual(before);
      expect(result.checkedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no approved services', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: '1', name: 'Pending', status: 'pending', endpoint: 'https://test.com' },
      ]);

      const results = await healthMonitor.runHealthChecks();

      expect(results).toEqual([]);
      expect(MockAxios.get).not.toHaveBeenCalled();
    });

    it('should handle multiple services', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: '1', name: 'Service 1', status: 'approved', endpoint: 'https://test1.com' },
        { id: '2', name: 'Service 2', status: 'approved', endpoint: 'https://test2.com' },
        { id: '3', name: 'Service 3', status: 'approved', endpoint: 'https://test3.com' },
      ]);

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(3);
      expect(MockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should continue checking even if one service fails', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: '1', name: 'Service 1', status: 'approved', endpoint: 'https://test1.com' },
        { id: '2', name: 'Service 2', status: 'approved', endpoint: 'https://test2.com' },
      ]);

      MockAxios.get
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(2);
      expect(results[0].status).toBe('unhealthy');
      expect(results[1].status).toBe('healthy');
    });

    it('should handle services with missing fields gracefully', async () => {
      mockRegistry.getAllServices.mockReturnValue([
        { id: '1', status: 'approved', endpoint: 'https://test.com' } as any,
      ]);

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1);
    });
  });
});

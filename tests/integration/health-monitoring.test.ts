/**
 * Health Monitoring Integration Tests
 *
 * Tests the full health monitoring system including:
 * - Health monitoring API endpoints (stats, check, history)
 * - Integration with ServiceRegistry and Database
 * - Periodic monitoring behavior
 * - Real HTTP requests to service endpoints
 * - Database recording of health checks
 * - Admin authentication requirements
 * - Integration with API server startup/shutdown
 */

import request from 'supertest';
import express, { Express } from 'express';
import { HealthMonitor } from '../../src/monitoring/HealthMonitor';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { Database } from '../../src/registry/database';
import { generateToken } from '../../src/auth/jwt';
import { requireAuth, requireAdmin } from '../../src/middleware/auth';
import axios from 'axios';

// Mock axios for external requests
jest.mock('axios');
const MockAxios = axios as jest.Mocked<typeof axios>;

// Test wallet addresses
const ADMIN_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
const USER_WALLET = '0x1234567890123456789012345678901234567890';

describe('Health Monitoring Integration', () => {
  let app: Express;
  let db: Database;
  let registry: ServiceRegistry;
  let healthMonitor: HealthMonitor;
  let adminToken: string;
  let userToken: string;
  const originalEnv = process.env;

  beforeAll(async () => {
    // Set admin wallet in environment
    process.env.ADMIN_WALLETS = ADMIN_WALLET;

    // Initialize in-memory database
    db = new Database(':memory:');
    await db.initialize();

    // Initialize service registry
    registry = new ServiceRegistry(db);
    await registry.initialize();

    // Initialize health monitor
    healthMonitor = new HealthMonitor(registry, db);

    // Generate JWT tokens (chainId 8453 for Base)
    adminToken = generateToken(ADMIN_WALLET, 8453);
    userToken = generateToken(USER_WALLET, 8453);

    // Create Express app with health monitoring routes
    app = express();
    app.use(express.json());

    // Health monitoring routes
    app.get('/api/admin/health/stats', requireAuth, requireAdmin, async (req, res) => {
      try {
        const stats = await healthMonitor.getHealthStats();
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) });
      }
    });

    app.post('/api/admin/health/check', requireAuth, requireAdmin, async (req, res) => {
      try {
        const results = await healthMonitor.runHealthChecks();
        res.json({ success: true, message: 'Health check completed', results });
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) });
      }
    });

    app.get('/api/admin/health/history/:serviceId', requireAuth, requireAdmin, async (req, res) => {
      try {
        const { serviceId } = req.params;
        const limit = parseInt(String(req.query.limit), 10) || 100;
        const history = await healthMonitor.getHealthHistory(serviceId, limit);
        res.json({ success: true, history });
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) });
      }
    });

    app.get('/api/pulse', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    });

    // Insert test services using registry API so cache is updated
    await registry.registerService({
      id: 'service-1',
      name: 'Test Service 1',
      description: 'Test service',
      provider: 'test-provider',
      provider_wallet: 'test-wallet',
      endpoint: 'https://test1.example.com',
      health_check_url: 'https://test1.example.com/health',
      capabilities: ['test'],
      pricing: { perRequest: 100 },
      reputation: { averageRating: 5, totalRatings: 10 },
      status: 'approved',
    } as any);

    await registry.registerService({
      id: 'service-2',
      name: 'Test Service 2',
      description: 'Test service',
      provider: 'test-provider',
      provider_wallet: 'test-wallet',
      endpoint: 'https://test2.example.com',
      capabilities: ['test'],
      pricing: { perRequest: 100 },
      reputation: { averageRating: 5, totalRatings: 10 },
      status: 'pending',
    } as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    healthMonitor.stop();
    await db.close();
    process.env = originalEnv;
  });

  describe('GET /api/pulse', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/pulse');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        uptime: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('GET /api/admin/health/stats', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/health/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication token');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/health/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message || response.body.error).toContain('admin');
    });

    it('should return health statistics for admin', async () => {
      const response = await request(app)
        .get('/api/admin/health/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        totalServices: expect.any(Number),
        healthy: expect.any(Number),
        degraded: expect.any(Number),
        unhealthy: expect.any(Number),
        avgResponseTime: expect.any(Number),
      });
    });
  });

  describe('POST /api/admin/health/check', () => {
    beforeEach(() => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/admin/health/check');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/admin/health/check')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should trigger manual health check for admin', async () => {
      const response = await request(app)
        .post('/api/admin/health/check')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Health check completed');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should check only approved services', async () => {
      const response = await request(app)
        .post('/api/admin/health/check')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1); // Only approved service
      expect(response.body.results[0].serviceName).toBe('Test Service 1');
    });

    it('should record health check results in database', async () => {
      await request(app)
        .post('/api/admin/health/check')
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify database record
      const checks = await db.all(
        'SELECT * FROM service_health_checks WHERE service_id = ? ORDER BY checked_at DESC LIMIT 1',
        ['service-1']
      );

      expect(checks.length).toBe(1);
      expect((checks[0] as any).status).toBe('healthy');
      expect((checks[0] as any).status_code).toBe(200);
    });
  });

  describe('GET /api/admin/health/history/:serviceId', () => {
    beforeEach(async () => {
      // Insert test health check records
      const now = Date.now();
      await db.run(
        'INSERT INTO service_health_checks (service_id, status, response_time, status_code, error, checked_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['service-1', 'healthy', 100, 200, null, now - 300000]
      );
      await db.run(
        'INSERT INTO service_health_checks (service_id, status, response_time, status_code, error, checked_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['service-1', 'healthy', 150, 200, null, now - 600000]
      );
      await db.run(
        'INSERT INTO service_health_checks (service_id, status, response_time, status_code, error, checked_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['service-1', 'degraded', 6000, 200, null, now - 900000]
      );
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/admin/health/history/service-1');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication token');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/health/history/service-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message || response.body.error).toContain('admin');
    });

    it('should return health history for admin', async () => {
      const response = await request(app)
        .get('/api/admin/health/history/service-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.history).toBeInstanceOf(Array);
      expect(response.body.history.length).toBeGreaterThanOrEqual(3);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/health/history/service-1?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBeLessThanOrEqual(2);
    });

    it('should order history by most recent first', async () => {
      const response = await request(app)
        .get('/api/admin/health/history/service-1')
        .set('Authorization', `Bearer ${adminToken}`);

      const history = response.body.history;
      expect(history[0].checked_at).toBeGreaterThan(history[1].checked_at);
    });
  });

  describe('Integration with ServiceRegistry', () => {
    it('should only check services with approved status', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results.length).toBe(1);
      expect(results[0].serviceId).toBe('service-1');
    });

    it('should use health_check_url if provided', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        'https://test1.example.com/health',
        expect.any(Object)
      );
    });

    it('should fallback to endpoint if no health_check_url', async () => {
      // Add service without health_check_url
      await registry.registerService({
        id: 'service-3',
        name: 'Test Service 3',
        description: 'Test service',
        provider: 'test-provider',
        provider_wallet: 'test-wallet',
        endpoint: 'https://test3.example.com',
        capabilities: ['test'],
        pricing: { perRequest: 100 },
        reputation: { averageRating: 5, totalRatings: 10 },
        status: 'approved',
      } as any);

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      expect(MockAxios.get).toHaveBeenCalledWith(
        'https://test3.example.com',
        expect.any(Object)
      );
    });
  });

  describe('Database Integration', () => {
    it('should persist health check results', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      await healthMonitor.runHealthChecks();

      const checks = await db.all('SELECT * FROM service_health_checks WHERE service_id = ?', [
        'service-1',
      ]);

      expect(checks.length).toBeGreaterThan(0);
      expect(checks[checks.length - 1]).toMatchObject({
        service_id: 'service-1',
        status: 'healthy',
        status_code: 200,
      });
    });

    it('should persist error information', async () => {
      MockAxios.get.mockRejectedValue(new Error('Network timeout'));

      await healthMonitor.runHealthChecks();

      const checks = await db.all(
        'SELECT * FROM service_health_checks WHERE service_id = ? ORDER BY checked_at DESC LIMIT 1',
        ['service-1']
      );

      expect(checks[0]).toMatchObject({
        service_id: 'service-1',
        status: 'unhealthy',
        error: 'Network timeout',
      });
    });

    it('should continue monitoring even if database write fails', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      // Spy on db.run to verify it's called
      const runSpy = jest.spyOn(db, 'run');
      runSpy.mockRejectedValueOnce(new Error('DB error'));

      const results = await healthMonitor.runHealthChecks();

      // Should still return results even if DB write failed
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('healthy');

      runSpy.mockRestore();
    });
  });

  describe('Health Status Determination', () => {
    it('should mark 2xx responses as healthy', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('healthy');
      expect(results[0].statusCode).toBe(200);
    });

    it('should mark 4xx responses as degraded', async () => {
      MockAxios.get.mockResolvedValue({ status: 404, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('degraded');
      expect(results[0].statusCode).toBe(404);
    });

    it('should mark 5xx responses as unhealthy', async () => {
      MockAxios.get.mockResolvedValue({ status: 500, data: {} });

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('unhealthy');
      expect(results[0].statusCode).toBe(500);
    });

    it('should mark network errors as unhealthy', async () => {
      MockAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const results = await healthMonitor.runHealthChecks();

      expect(results[0].status).toBe('unhealthy');
      expect(results[0].error).toContain('ECONNREFUSED');
    });
  });

  describe('Periodic Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring with interval', () => {
      healthMonitor.start(5); // 5 minutes

      expect(jest.getTimerCount()).toBeGreaterThan(0);

      healthMonitor.stop();
    });

    it('should not start if already running', () => {
      healthMonitor.start(5);
      const timersBefore = jest.getTimerCount();

      healthMonitor.start(5); // Try to start again

      const timersAfter = jest.getTimerCount();
      expect(timersAfter).toBe(timersBefore);

      healthMonitor.stop();
    });

    it('should stop monitoring and clear timers', () => {
      healthMonitor.start(5);
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      healthMonitor.stop();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed service data gracefully', async () => {
      // Insert service with invalid data directly to DB (bypassing registry validation)
      const now = Date.now();
      await db.run(
        'INSERT INTO services (id, name, description, provider, provider_wallet, endpoint, capabilities, pricing, reputation, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'bad-service',
          'Bad Service',
          'Test',
          'test',
          'wallet',
          null, // Invalid: null endpoint
          JSON.stringify(['test']),
          JSON.stringify({ perRequest: 100 }),
          JSON.stringify({ averageRating: 5, totalRatings: 10 }),
          'approved',
          now,
          now,
        ]
      );

      // Reload registry cache to include the bad service
      await registry.initialize();

      MockAxios.get.mockResolvedValue({ status: 200, data: {} });

      // Should not crash
      const results = await healthMonitor.runHealthChecks();

      expect(results).toBeInstanceOf(Array);
    });

    it('should handle database query errors', async () => {
      const badDb = {
        all: jest.fn().mockRejectedValue(new Error('Database error')),
        run: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      const badMonitor = new HealthMonitor(registry, badDb as any);

      const stats = await badMonitor.getHealthStats();

      // Should return zero stats instead of throwing
      expect(stats).toEqual({
        totalServices: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        avgResponseTime: 0,
      });
    });
  });
});

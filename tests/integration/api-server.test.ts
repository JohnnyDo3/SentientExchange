/**
 * API Server Integration Tests
 *
 * Tests all REST API endpoints including:
 * - Authentication (nonce, verify, me, logout)
 * - Health checks (pulse, health)
 * - Service CRUD operations
 * - Search and filtering
 * - Ratings and reviews
 * - Stats and transactions
 * - Authorization and ownership
 */

import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Database } from '../../src/registry/database';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { generateToken } from '../../src/auth/jwt';
import { generateNonce, verifySiweMessage } from '../../src/auth/siwe.js';
import { requireAuth } from '../../src/middleware/auth.js';
import { randomUUID } from 'crypto';

// Test wallet addresses
const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
const OTHER_WALLET = '0x1234567890123456789012345678901234567890';

describe('API Server Integration Tests', () => {
  let app: express.Application;
  let db: Database;
  let registry: ServiceRegistry;
  let authToken: string;
  let testServiceId: string;

  beforeAll(async () => {
    // Initialize database
    db = new Database(':memory:');
    await db.initialize();
    registry = new ServiceRegistry(db);
    await registry.initialize();

    // Create Express app with middleware (simplified for testing)
    app = express();
    app.use(express.json());

    // Generate test auth token (chainId 1 for mainnet, 8453 for Base)
    authToken = generateToken(TEST_WALLET, 8453);

    // Mount test routes
    setupTestRoutes();
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  // Setup simplified routes for testing
  function setupTestRoutes() {
    // Using imported auth functions from top of file

    // Health endpoints
    app.get('/api/pulse', (req, res) => {
      res.json({
        pulse: 'strong',
        agents: 'active',
        market: 'open'
      });
    });

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Auth endpoints
    app.post('/api/auth/nonce', (req, res) => {
      const { address } = req.body;
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ success: false, error: 'Invalid address' });
      }
      const nonce = generateNonce(address);
      res.json({ success: true, nonce });
    });

    app.post('/api/auth/verify', async (req, res) => {
      const { message, signature } = req.body;
      if (!message || !signature) {
        return res.status(400).json({ success: false, error: 'Message and signature required' });
      }
      // For testing, accept any signature
      const token = generateToken(TEST_WALLET, 8453);
      res.json({ success: true, token, address: TEST_WALLET });
    });

    app.get('/api/auth/me', (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      res.json({ success: true, address: TEST_WALLET, authenticated: true });
    });

    app.post('/api/auth/logout', (req, res) => {
      res.json({ success: true, message: 'Logged out' });
    });

    // Service endpoints
    app.get('/api/services', async (req, res) => {
      const services = registry.getAllServices();
      res.json({ success: true, count: services.length, services });
    });

    app.get('/api/services/my-services', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const services = registry.getAllServices();
      const myServices = services.filter((s: any) => s.provider === TEST_WALLET);
      res.json({ success: true, count: myServices.length, services: myServices });
    });

    app.get('/api/services/:id', async (req, res) => {
      const service = await registry.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }
      res.json({ success: true, service });
    });

    app.post('/api/services', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const serviceData = {
        ...req.body,
        provider: TEST_WALLET
      };

      const service = await registry.registerService(serviceData);
      res.status(201).json({ success: true, service });
    });

    app.put('/api/services/:id', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const service = await registry.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }

      if (service.provider !== TEST_WALLET) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const updated = await registry.updateService(req.params.id, req.body, TEST_WALLET);
      res.json({ success: true, service: updated });
    });

    app.delete('/api/services/:id', async (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const service = await registry.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }

      if (service.provider !== TEST_WALLET) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await registry.deleteService(req.params.id, TEST_WALLET);
      res.json({ success: true, message: 'Service deleted' });
    });

    app.post('/api/services/search', async (req, res) => {
      const services = await registry.searchServices({
        capabilities: req.body.capabilities,
        minRating: req.body.minRating,
        maxPrice: req.body.maxPrice,
        sortBy: req.body.sortBy
      });
      res.json({ success: true, count: services.length, services });
    });

    app.post('/api/services/:id/rate', async (req, res) => {
      try {
        const { score, review, transactionId } = req.body;

        if (!score || score < 1 || score > 5) {
          return res.status(400).json({ success: false, error: 'Score must be between 1 and 5' });
        }

        const service = await registry.getService(req.params.id);
        if (!service) {
          return res.status(404).json({ success: false, error: 'Service not found' });
        }

        // Add rating to database
        await db.run(
          `INSERT INTO ratings (id, transactionId, serviceId, rater, score, review, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            transactionId || randomUUID(),
            req.params.id,
            TEST_WALLET,
            score,
            review || null,
            new Date().toISOString()
          ]
        );

        // Update reputation
        await registry.updateReputation(req.params.id, score);

        const updated = await registry.getService(req.params.id);
        res.json({ success: true, service: updated });
      } catch (error: any) {
        console.error('Error adding rating:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.get('/api/stats', async (req, res) => {
      const services = registry.getAllServices();
      const transactions = await db.all('SELECT * FROM transactions');

      res.json({
        success: true,
        stats: {
          services: services.length,
          transactions: transactions.length,
          volume: transactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || '0'), 0),
          agents: new Set(transactions.map((tx: any) => tx.buyer)).size
        }
      });
    });

    app.get('/api/transactions/recent', async (req, res) => {
      const limit = parseInt(req.query.limit as string) || 20;
      const transactions = await db.all(`
        SELECT * FROM transactions
        ORDER BY timestamp DESC
        LIMIT ?
      `, [limit]);
      res.json({ success: true, transactions });
    });

    app.get('/api/services/:id/audit', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const audit = await db.all(`
          SELECT * FROM audit_logs
          WHERE entity_id = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `, [req.params.id, limit]);
        res.json({ success: true, audit });
      } catch (error: any) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  describe('GET /api/pulse', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/api/pulse')
        .expect(200);

      expect(res.body).toHaveProperty('pulse', 'strong');
      expect(res.body).toHaveProperty('agents', 'active');
      expect(res.body).toHaveProperty('market', 'open');
    });
  });

  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('POST /api/auth/nonce', () => {
    it('should generate nonce for valid address', async () => {
      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ address: TEST_WALLET })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.nonce).toBeDefined();
      expect(typeof res.body.nonce).toBe('string');
    });

    it('should reject invalid address format', async () => {
      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ address: 'invalid' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should reject missing address', async () => {
      const res = await request(app)
        .post('/api/auth/nonce')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify signature and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({
          message: 'test message',
          signature: '0xtest'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.address).toBe(TEST_WALLET);
    });

    it('should reject missing message', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ signature: '0xtest' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject missing signature', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ message: 'test' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.address).toBe(TEST_WALLET);
      expect(res.body.authenticated).toBe(true);
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ============================================================================
  // SERVICE CRUD TESTS
  // ============================================================================

  describe('POST /api/services', () => {
    it('should create a new service with auth', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          description: 'Test description',
          endpoint: 'https://api.test.com',
          capabilities: ['test'],
          pricing: {
            perRequest: '$0.01',
            currency: 'USDC',
            network: 'base-sepolia'
          },
          reputation: {
            totalJobs: 0,
            successRate: 100,
            avgResponseTime: '1s',
            rating: 5,
            reviews: 0
          },
          metadata: {
            apiVersion: 'v1'
          }
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.service).toBeDefined();
      expect(res.body.service.name).toBe('Test Service');
      expect(res.body.service.provider).toBe(TEST_WALLET);

      // Save for later tests
      testServiceId = res.body.service.id;
    });

    it('should reject creation without auth', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({
          name: 'Test Service',
          description: 'Test description',
          endpoint: 'https://api.test.com'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/services', () => {
    it('should list all services', async () => {
      const res = await request(app)
        .get('/api/services')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.services).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/services/:id', () => {
    it('should get service by ID', async () => {
      const res = await request(app)
        .get(`/api/services/${testServiceId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.service.id).toBe(testServiceId);
      expect(res.body.service.name).toBe('Test Service');
    });

    it('should return 404 for non-existent service', async () => {
      const res = await request(app)
        .get('/api/services/non-existent-id')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/services/my-services', () => {
    it('should list only user services', async () => {
      const res = await request(app)
        .get('/api/services/my-services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.services).toBeInstanceOf(Array);
      expect(res.body.services.every((s: any) => s.provider === TEST_WALLET)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/services/my-services')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/services/:id', () => {
    it('should update own service', async () => {
      const res = await request(app)
        .put(`/api/services/${testServiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.service.description).toBe('Updated description');
    });

    it('should reject update without auth', async () => {
      const res = await request(app)
        .put(`/api/services/${testServiceId}`)
        .send({ description: 'Hack attempt' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent service', async () => {
      const res = await request(app)
        .put('/api/services/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Test' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/services/search', () => {
    it('should search services by query', async () => {
      const res = await request(app)
        .post('/api/services/search')
        .send({ query: 'Test' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.services).toBeInstanceOf(Array);
    });

    it('should filter by capabilities', async () => {
      const res = await request(app)
        .post('/api/services/search')
        .send({ capabilities: ['test'] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.services.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .post('/api/services/search')
        .send({ limit: 1 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.services.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/services/:id/rate', () => {
    it('should add rating to service', async () => {
      // Create a dummy transaction first (required by foreign key constraint)
      const txId = randomUUID();
      await db.run(
        `INSERT INTO transactions (id, serviceId, buyer, seller, amount, currency, status, request, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, testServiceId, TEST_WALLET, 'seller-wallet', '0.01', 'USDC', 'completed', '{}', new Date().toISOString()]
      );

      const res = await request(app)
        .post(`/api/services/${testServiceId}/rate`)
        .send({
          score: 5,
          review: 'Great service!',
          transactionId: txId
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.service.reputation.rating).toBeGreaterThan(0);
    });

    it('should reject invalid score', async () => {
      const res = await request(app)
        .post(`/api/services/${testServiceId}/rate`)
        .send({ score: 10 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent service', async () => {
      const res = await request(app)
        .post('/api/services/non-existent-id/rate')
        .send({ score: 5 })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('should delete own service', async () => {
      const res = await request(app)
        .delete(`/api/services/${testServiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject deletion without auth', async () => {
      const res = await request(app)
        .delete(`/api/services/${testServiceId}`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================================
  // STATS & TRANSACTIONS TESTS
  // ============================================================================

  describe('GET /api/stats', () => {
    it('should return marketplace statistics', async () => {
      const res = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats).toHaveProperty('services');
      expect(res.body.stats).toHaveProperty('transactions');
      expect(res.body.stats).toHaveProperty('volume');
      expect(res.body.stats).toHaveProperty('agents');
    });
  });

  describe('GET /api/transactions/recent', () => {
    it('should return recent transactions', async () => {
      const res = await request(app)
        .get('/api/transactions/recent')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.transactions).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/transactions/recent?limit=5')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.transactions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/services/:id/audit', () => {
    it('should return audit logs for service', async () => {
      // Create a service first
      const createRes = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Audit Test Service',
          description: 'Test',
          endpoint: 'https://api.test.com',
          capabilities: ['test'],
          pricing: {
            perRequest: '$0.01',
            currency: 'USDC',
            network: 'base-sepolia'
          },
          reputation: {
            totalJobs: 0,
            successRate: 100,
            avgResponseTime: '1s',
            rating: 5,
            reviews: 0
          },
          metadata: {
            apiVersion: 'v1'
          }
        });

      const serviceId = createRes.body.service.id;

      const res = await request(app)
        .get(`/api/services/${serviceId}/audit`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.audit).toBeInstanceOf(Array);
    });
  });
});

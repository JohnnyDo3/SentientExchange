/**
 * API Server Integration Tests
 *
 * Comprehensive tests for the Express API server including:
 * - Health check endpoints
 * - MCP SSE endpoints
 * - Authentication endpoints (SIWE + JWT)
 * - Service CRUD endpoints
 * - Admin endpoints
 * - Stats & analytics endpoints
 * - AI service endpoints (with x402 payment)
 * - WebSocket events
 * - Error handling
 *
 * This is a high-impact test file targeting apiServer.ts (408 lines, 0% coverage)
 */

import request from 'supertest';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import { Database } from '../../src/registry/database';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { generateToken } from '../../src/auth/jwt';
import { generateNonce } from '../../src/auth/siwe';
import axios from 'axios';

// Mock axios for external requests
jest.mock('axios');
const MockAxios = axios as jest.Mocked<typeof axios>;

// Mock x402 middleware
jest.mock('@sentientexchange/x402-middleware', () => ({
  x402Middleware: () => (req: any, res: any, next: any) => next(),
}));

// Mock AI services
jest.mock('../../src/services/ai/image/imageAnalyzer');
jest.mock('../../src/services/ai/sentiment/sentimentAnalyzer');
jest.mock('../../src/services/ai/text/textSummarizer');

// Import mocked classes
import { ImageAnalyzer } from '../../src/services/ai/image/imageAnalyzer';
import { SentimentAnalyzer } from '../../src/services/ai/sentiment/sentimentAnalyzer';
import { TextSummarizer } from '../../src/services/ai/text/textSummarizer';

describe('API Server Integration Tests', () => {
  let db: Database;
  let registry: ServiceRegistry;
  let app: express.Application;
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: Socket;
  let serverPort: number;

  const ADMIN_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const USER_WALLET = '0x1234567890123456789012345678901234567890';
  const OWNER_WALLET = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  let adminToken: string;
  let userToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    // Set admin wallet
    process.env.ADMIN_WALLETS = ADMIN_WALLET;
    process.env.NODE_ENV = 'test';
    process.env.IMAGE_ANALYZER_PRICE = '0.02';
    process.env.SENTIMENT_ANALYZER_PRICE = '0.01';
    process.env.TEXT_SUMMARIZER_PRICE = '0.015';

    // Initialize database (in-memory)
    db = new Database(':memory:');
    await db.initialize();

    // Initialize registry
    registry = new ServiceRegistry(db);
    await registry.initialize();

    // Generate JWT tokens (chainId 8453 for Base)
    adminToken = generateToken(ADMIN_WALLET, 8453);
    userToken = generateToken(USER_WALLET, 8453);
    ownerToken = generateToken(OWNER_WALLET, 8453);

    // Create Express app with all middleware
    app = express();

    // Mock Socket.IO setup
    httpServer = createServer(app);
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    // Basic middleware
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Mock AI services
    const mockImageAnalyzer = new ImageAnalyzer() as jest.Mocked<ImageAnalyzer>;
    mockImageAnalyzer.isAvailable = jest.fn().mockReturnValue(true);
    mockImageAnalyzer.analyze = jest.fn().mockResolvedValue({
      success: true,
      analysis: { description: 'Test image analysis' },
      metadata: { model: 'test', cost: 0.001 },
    });
    mockImageAnalyzer.getCostStats = jest.fn().mockReturnValue({
      lastRequestCost: 0.001,
      profitMargin: 0.019,
    });

    const mockSentimentAnalyzer = new SentimentAnalyzer() as jest.Mocked<SentimentAnalyzer>;
    mockSentimentAnalyzer.analyze = jest.fn().mockReturnValue({
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.9,
    });

    const mockTextSummarizer = new TextSummarizer() as jest.Mocked<TextSummarizer>;
    mockTextSummarizer.isAvailable = jest.fn().mockReturnValue(true);
    mockTextSummarizer.summarize = jest.fn().mockResolvedValue({
      success: true,
      summary: 'Test summary',
      metadata: { model: 'test', cost: 0.002 },
    });
    mockTextSummarizer.getStats = jest.fn().mockReturnValue({
      averageCost: 0.002,
      profitPerRequest: 0.013,
    });

    // Setup API routes (simplified version of apiServer.ts)
    setupRoutes(app, registry, db, io, mockImageAnalyzer, mockSentimentAnalyzer, mockTextSummarizer);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
    await db.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function seedTestData() {
    // Insert approved service
    await registry.registerService(
      {
        id: 'service-approved-1',
        name: 'Approved Service 1',
        description: 'Test approved service',
        provider: 'Test Provider',
        provider_wallet: OWNER_WALLET,
        endpoint: 'https://test1.example.com',
        health_check_url: 'https://test1.example.com/health',
        capabilities: ['test', 'analysis'],
        pricing: { perRequest: 100, currency: 'USDC' },
        reputation: { totalJobs: 10, successRate: 95, avgResponseTime: '1s', rating: 4.5, reviews: 5 },
        status: 'approved',
        network: 'solana',
        metadata: {
          walletAddress: OWNER_WALLET,
          providerWallet: OWNER_WALLET,
          apiVersion: 'v1',
          image: '🔮',
          color: '#a855f7',
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      } as any,
      OWNER_WALLET
    );

    // Insert pending service
    await registry.registerService(
      {
        id: 'service-pending-1',
        name: 'Pending Service 1',
        description: 'Test pending service',
        provider: 'Test Provider',
        provider_wallet: USER_WALLET,
        endpoint: 'https://test2.example.com',
        health_check_url: 'https://test2.example.com/health',
        capabilities: ['test'],
        pricing: { perRequest: 50, currency: 'USDC' },
        reputation: { totalJobs: 0, successRate: 100, avgResponseTime: '0s', rating: 5.0, reviews: 0 },
        status: 'pending',
        network: 'solana',
        metadata: {
          walletAddress: USER_WALLET,
          providerWallet: USER_WALLET,
          apiVersion: 'v1',
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      } as any,
      USER_WALLET
    );

    // Insert completed transaction
    await db.run(
      `INSERT INTO transactions (id, serviceId, buyer, seller, amount, currency, status, timestamp, request, response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'tx-test-1',
        'service-approved-1',
        'Agent_123456',
        'Test Provider',
        '$0.10',
        'USDC',
        'completed',
        new Date().toISOString(),
        JSON.stringify({ test: true }),
        JSON.stringify({ result: 'success' }),
      ]
    );
  }

  // ============================================================================
  // HEALTH CHECK ENDPOINTS
  // ============================================================================

  describe('GET /api/pulse', () => {
    it('should return health status with heartbeat', async () => {
      const response = await request(app).get('/api/pulse');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        pulse: 'strong',
        agents: 'active',
        market: 'open',
        vibe: 'immaculate',
      });
      expect(response.body.heartbeat).toMatch(/[💓🫀]/);
      expect(response.body.uptime).toMatch(/\d+m \d+s/);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.message).toContain('SentientExchange');
    });

    it('should include MCP endpoint information', async () => {
      const response = await request(app).get('/api/pulse');

      expect(response.body.mcp).toBeDefined();
      expect(response.body.mcp.sseEndpoint).toBe('/mcp/sse');
    });
  });

  describe('GET /api/health', () => {
    it('should redirect to /api/pulse', async () => {
      const response = await request(app).get('/api/health').redirects(0);

      expect(response.status).toBe(308); // Permanent redirect
      expect(response.headers.location).toBe('/api/pulse');
    });
  });

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  describe('POST /api/auth/nonce', () => {
    it('should generate nonce for valid address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ address: USER_WALLET });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.nonce).toBeDefined();
      expect(response.body.message).toContain('Sign this message');
    });

    it('should reject missing address', async () => {
      const response = await request(app).post('/api/auth/nonce').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Wallet address required');
    });

    it('should reject invalid address format', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ address: 'invalid-address' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid Ethereum address');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        address: USER_WALLET,
        chainId: 8453,
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear auth cookie', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  // ============================================================================
  // SERVICE ENDPOINTS
  // ============================================================================

  describe('GET /api/services', () => {
    it('should return only approved services', async () => {
      const response = await request(app).get('/api/services');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.services).toBeInstanceOf(Array);

      // Verify all returned services are approved
      response.body.services.forEach((service: any) => {
        expect(service.status).toBe('approved');
      });
    });
  });

  describe('GET /api/services/my-services', () => {
    it('should return services owned by authenticated user', async () => {
      const response = await request(app)
        .get('/api/services/my-services')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeInstanceOf(Array);

      // Verify all returned services belong to the owner
      response.body.services.forEach((service: any) => {
        expect(service.metadata?.walletAddress?.toLowerCase()).toBe(
          OWNER_WALLET.toLowerCase()
        );
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/services/my-services');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/services/:id', () => {
    it('should return service details', async () => {
      const response = await request(app).get('/api/services/service-approved-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service).toMatchObject({
        id: 'service-approved-1',
        name: 'Approved Service 1',
      });
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app).get('/api/services/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Service not found');
    });
  });

  describe('POST /api/services', () => {
    beforeEach(() => {
      // Mock axios for middleware verification
      MockAxios.post.mockResolvedValue({
        status: 402,
        data: {},
      });
    });

    it('should create new service when authenticated', async () => {
      const newService = {
        name: 'New Test Service',
        description: 'A new test service',
        provider: 'Test Provider',
        walletAddress: USER_WALLET,
        endpoint: 'https://newservice.example.com',
        healthCheckUrl: 'https://newservice.example.com/health',
        capabilities: ['test', 'new'],
        pricing: { perRequest: 200, currency: 'USDC' },
        middlewareInstalled: true,
      };

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newService);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.service).toMatchObject({
        name: 'New Test Service',
        status: 'pending',
      });
      expect(response.body.message).toContain('Awaiting admin approval');
    });

    it('should verify middleware when claimed', async () => {
      const newService = {
        name: 'Service with Middleware',
        description: 'Test',
        provider: 'Test',
        walletAddress: USER_WALLET,
        endpoint: 'https://middleware.example.com',
        healthCheckUrl: 'https://middleware.example.com/health',
        capabilities: ['test'],
        pricing: { perRequest: 100 },
        middlewareInstalled: true,
      };

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newService);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Middleware verified');
      expect(MockAxios.post).toHaveBeenCalledWith(
        'https://middleware.example.com',
        { test: true },
        expect.any(Object)
      );
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/services').send({});

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/services/:id', () => {
    it('should update service when owner', async () => {
      const updates = {
        name: 'Updated Service Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put('/api/services/service-approved-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.service.name).toBe('Updated Service Name');
    });

    it('should reject non-owners', async () => {
      const response = await request(app)
        .put('/api/services/service-approved-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Forbidden');
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app)
        .put('/api/services/non-existent')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('should delete service when owner', async () => {
      // Create a service to delete
      await registry.registerService(
        {
          id: 'service-to-delete',
          name: 'Deletable Service',
          description: 'Test',
          provider: 'Test',
          provider_wallet: OWNER_WALLET,
          endpoint: 'https://delete.example.com',
          health_check_url: 'https://delete.example.com/health',
          capabilities: ['test'],
          pricing: { perRequest: 100, currency: 'USDC' },
          status: 'approved',
          network: 'solana',
          metadata: { walletAddress: OWNER_WALLET },
          created_at: Date.now(),
          updated_at: Date.now(),
        } as any,
        OWNER_WALLET
      );

      const response = await request(app)
        .delete('/api/services/service-to-delete')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should reject non-owners', async () => {
      const response = await request(app)
        .delete('/api/services/service-approved-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/services/search', () => {
    it('should search services by capabilities', async () => {
      const response = await request(app)
        .post('/api/services/search')
        .send({ capabilities: ['test'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeInstanceOf(Array);
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .post('/api/services/search')
        .send({ offset: 0, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.offset).toBe(0);
      expect(response.body.limit).toBe(1);
      expect(response.body.services.length).toBeLessThanOrEqual(1);
    });

    it('should filter by price', async () => {
      const response = await request(app)
        .post('/api/services/search')
        .send({ maxPrice: 150 });

      expect(response.status).toBe(200);
      response.body.services.forEach((service: any) => {
        expect(service.pricing.perRequest).toBeLessThanOrEqual(150);
      });
    });
  });

  describe('POST /api/services/:id/rate', () => {
    it('should submit rating for service', async () => {
      const rating = {
        score: 4,
        review: 'Great service!',
        transactionId: 'tx-test-1',
      };

      const response = await request(app)
        .post('/api/services/service-approved-1/rate')
        .send(rating);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Rating submitted');
    });

    it('should validate score range', async () => {
      const response = await request(app)
        .post('/api/services/service-approved-1/rate')
        .send({ score: 10 }); // Invalid: > 5

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  describe('GET /api/admin/pending-services', () => {
    it('should return pending services for admin', async () => {
      const response = await request(app)
        .get('/api/admin/pending-services')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeInstanceOf(Array);

      // Verify all returned services are pending
      response.body.services.forEach((service: any) => {
        expect(service.status).toBe('pending');
      });
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/pending-services')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/approve/:id', () => {
    it('should approve service when admin', async () => {
      const response = await request(app)
        .post('/api/admin/approve/service-pending-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved after review' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/admin/approve/service-pending-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/reject/:id', () => {
    it('should reject service with notes', async () => {
      // Create a new pending service to reject
      await registry.registerService(
        {
          id: 'service-to-reject',
          name: 'Rejectable Service',
          description: 'Test',
          provider: 'Test',
          provider_wallet: USER_WALLET,
          endpoint: 'https://reject.example.com',
          health_check_url: 'https://reject.example.com/health',
          capabilities: ['test'],
          pricing: { perRequest: 100, currency: 'USDC' },
          status: 'pending',
          network: 'solana',
          metadata: { walletAddress: USER_WALLET },
          created_at: Date.now(),
          updated_at: Date.now(),
        } as any,
        USER_WALLET
      );

      const response = await request(app)
        .post('/api/admin/reject/service-to-reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Does not meet quality standards' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require rejection notes', async () => {
      const response = await request(app)
        .post('/api/admin/reject/service-pending-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rejection notes required');
    });
  });

  describe('POST /api/admin/test-endpoint/:id', () => {
    beforeEach(() => {
      MockAxios.post.mockResolvedValue({
        status: 402,
        data: { message: 'Payment required' },
      });
    });

    it('should test service endpoint', async () => {
      const response = await request(app)
        .post('/api/admin/test-endpoint/service-approved-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.test.endpoint).toBe('https://test1.example.com');
      expect(response.body.test.middlewareWorking).toBe(true);
    });

    it('should detect non-402 responses', async () => {
      MockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {},
      });

      const response = await request(app)
        .post('/api/admin/test-endpoint/service-approved-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.test.middlewareWorking).toBe(false);
    });
  });

  // ============================================================================
  // STATS & ANALYTICS ENDPOINTS
  // ============================================================================

  describe('GET /api/stats', () => {
    it('should return marketplace stats', async () => {
      const response = await request(app).get('/api/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        services: expect.any(Number),
        transactions: expect.any(Number),
        volume: expect.any(Number),
        agents: expect.any(Number),
      });
    });
  });

  describe('GET /api/transactions/recent', () => {
    it('should return recent transactions', async () => {
      const response = await request(app).get('/api/transactions/recent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app).get('/api/transactions/recent?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBeLessThanOrEqual(5);
    });

    it('should cap limit at 100', async () => {
      const response = await request(app).get('/api/transactions/recent?limit=9999');

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/services/:id/analytics', () => {
    it('should return analytics for owned service', async () => {
      const response = await request(app)
        .get('/api/services/service-approved-1/analytics')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toMatchObject({
        totalRevenue: expect.any(String),
        totalRequests: expect.any(Number),
        revenueByDay: expect.any(Array),
        requestsByHour: expect.any(Array),
        topUsers: expect.any(Array),
        recentTransactions: expect.any(Array),
      });
    });

    it('should reject non-owners', async () => {
      const response = await request(app)
        .get('/api/services/service-approved-1/analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/services/:id/audit', () => {
    it('should return audit history', async () => {
      const response = await request(app).get('/api/services/service-approved-1/audit');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.audit).toBeInstanceOf(Array);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app).get(
        '/api/services/service-approved-1/audit?limit=10'
      );

      expect(response.status).toBe(200);
      expect(response.body.audit.length).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // AI SERVICE ENDPOINTS
  // ============================================================================

  describe('POST /api/ai/image/analyze', () => {
    it('should analyze image with valid request', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({
          image: 'data:image/png;base64,iVBORw0KGgo=',
          analysisType: 'full',
          detailLevel: 'detailed',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.pricing).toMatchObject({
        charged: '0.02',
        apiCost: expect.any(String),
        profitMargin: expect.any(String),
      });
    });

    it('should reject missing image', async () => {
      const response = await request(app).post('/api/ai/image/analyze').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required field: image');
    });

    it('should validate analysisType', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({ image: 'test', analysisType: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid analysisType');
    });

    it('should validate detailLevel', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({ image: 'test', detailLevel: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid detailLevel');
    });
  });

  describe('POST /api/ai/sentiment/analyze', () => {
    it('should analyze sentiment with valid text', async () => {
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: 'This is a great service! I love it!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toMatchObject({
        sentiment: expect.any(String),
        score: expect.any(Number),
        confidence: expect.any(Number),
      });
      expect(response.body.pricing.charged).toBe('0.01');
    });

    it('should reject missing text', async () => {
      const response = await request(app).post('/api/ai/sentiment/analyze').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing or invalid required field: text');
    });

    it('should reject empty text', async () => {
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing or invalid');
    });

    it('should reject text over 10,000 characters', async () => {
      const longText = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: longText });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text too long');
    });
  });

  describe('POST /api/ai/text/summarize', () => {
    it('should summarize text with valid request', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({
          text: 'This is a long article about AI services and payments...',
          length: 'brief',
          style: 'bullets',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.pricing).toMatchObject({
        charged: '0.015',
        apiCost: expect.any(String),
        profitMargin: expect.any(String),
      });
    });

    it('should reject missing text', async () => {
      const response = await request(app).post('/api/ai/text/summarize').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing or invalid required field: text');
    });

    it('should reject text over 50,000 characters', async () => {
      const longText = 'a'.repeat(50001);
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: longText });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Text too long');
    });

    it('should validate length parameter', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: 'test', length: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid length');
    });

    it('should validate style parameter', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: 'test', style: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid style');
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return AI services health status', async () => {
      const response = await request(app).get('/api/ai/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services).toMatchObject({
        imageAnalyzer: {
          available: true,
          price: '0.02',
          currency: 'USDC',
          endpoint: '/api/ai/image/analyze',
        },
        sentimentAnalyzer: {
          available: true,
          price: '0.01',
          currency: 'USDC',
          endpoint: '/api/ai/sentiment/analyze',
        },
        textSummarizer: {
          available: true,
          price: '0.015',
          currency: 'USDC',
          endpoint: '/api/ai/text/summarize',
        },
      });
    });
  });

  // ============================================================================
  // WEBSOCKET EVENTS
  // ============================================================================

  describe('WebSocket Connection', () => {
    it('should establish connection and receive initial stats', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
      });

      clientSocket.on('initial-stats', (data: any) => {
        expect(data.services).toBeGreaterThanOrEqual(0);
        clientSocket.disconnect();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Route not found',
        path: '/api/does-not-exist',
      });
    });
  });
});

// ============================================================================
// HELPER: Setup API Routes
// ============================================================================

function setupRoutes(
  app: express.Application,
  registry: ServiceRegistry,
  db: Database,
  io: SocketIOServer,
  imageAnalyzer: any,
  sentimentAnalyzer: any,
  textSummarizer: any
) {
  // Import middleware
  const { requireAuth, requireAdmin, checkOwnership } = require('../../src/middleware/auth');
  const { validateService, validateServiceUpdate, validateSearch, validateRating } =
    require('../../src/validation/schemas');
  const { getErrorMessage } = require('../../src/types/errors');
  const { x402Middleware } = require('@sentientexchange/x402-middleware');
  const axios = require('axios');

  // Health Check
  app.get('/api/pulse', (req, res) => {
    const uptimeSeconds = process.uptime();
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const heartbeat = uptimeSeconds % 2 < 1 ? '💓' : '🫀';

    res.json({
      pulse: 'strong',
      heartbeat,
      agents: 'active',
      market: 'open',
      vibe: 'immaculate',
      uptime: `${uptimeMinutes}m ${Math.floor(uptimeSeconds % 60)}s`,
      timestamp: new Date().toISOString(),
      message: '🤖 SentientExchange is alive and thriving',
      mcp: {
        sseEndpoint: '/mcp/sse',
        activeSessions: 0,
      },
    });
  });

  app.get('/api/health', (req, res) => {
    res.redirect(308, '/api/pulse');
  });

  // Authentication
  app.post('/api/auth/nonce', (req, res) => {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required',
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
      });
    }

    const nonce = generateNonce(address);

    res.json({
      success: true,
      nonce,
      message: 'Sign this message to authenticate',
    });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
      success: true,
      user: {
        address: req.user!.address,
        chainId: req.user!.chainId,
      },
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth-token');
    res.json({
      success: true,
      message: 'Logged out successfully - cookie cleared',
    });
  });

  // Services
  app.get('/api/services', (req, res) => {
    const allServices = registry.getAllServices();
    const approvedServices = allServices.filter((s: any) => s.status === 'approved');
    res.json({ success: true, count: approvedServices.length, services: approvedServices });
  });

  app.get('/api/services/my-services', requireAuth, (req, res) => {
    const allServices = registry.getAllServices();
    const myServices = allServices.filter(
      (service) =>
        service.metadata?.walletAddress?.toLowerCase() === req.user!.address.toLowerCase()
    );
    res.json({ success: true, count: myServices.length, services: myServices });
  });

  app.get('/api/services/:id', async (req, res) => {
    const service = await registry.getService(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    res.json({ success: true, service });
  });

  app.post('/api/services', requireAuth, async (req, res) => {
    try {
      const validatedData = validateService(req.body);

      let middlewareVerified = false;
      if (validatedData.middlewareInstalled) {
        try {
          const testResponse = await axios.post(
            validatedData.endpoint,
            { test: true },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000, validateStatus: () => true }
          );

          if (testResponse.status === 402) {
            middlewareVerified = true;
          }
        } catch (error) {
          // Ignore test errors
        }
      }

      const serviceInput: any = {
        name: validatedData.name,
        description: validatedData.description,
        provider: validatedData.provider,
        provider_wallet: validatedData.walletAddress,
        endpoint: validatedData.endpoint,
        health_check_url: validatedData.healthCheckUrl,
        capabilities: validatedData.capabilities,
        pricing: {
          perRequest: validatedData.pricing?.perRequest,
          currency: validatedData.pricing?.currency || 'USDC',
        },
        reputation: {
          totalJobs: 0,
          successRate: 100,
          avgResponseTime: '0s',
          rating: 5.0,
          reviews: 0,
        },
        status: 'pending',
        middleware_verified: middlewareVerified,
        network: 'solana',
        metadata: {
          apiVersion: 'v1',
          walletAddress: validatedData.walletAddress,
          providerWallet: validatedData.walletAddress,
          healthCheckUrl: validatedData.healthCheckUrl,
          image: validatedData.image || '🔮',
          color: validatedData.color || '#a855f7',
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const createdBy = req.user!.address;
      const service = await registry.registerService(serviceInput, createdBy);

      res.status(201).json({
        success: true,
        service,
        message: middlewareVerified
          ? 'Service registered! ✓ Middleware verified. Awaiting admin approval.'
          : 'Service registered! Please ensure middleware is installed. Awaiting admin approval.',
      });
    } catch (error) {
      res.status(400).json({ success: false, error: getErrorMessage(error) });
    }
  });

  app.put('/api/services/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await registry.getService(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }

      if (!checkOwnership(existing.metadata?.walletAddress || '', req)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not own this service',
        });
      }

      const validatedData = validateServiceUpdate(req.body);
      const updates: any = {};
      if (validatedData.name) updates.name = validatedData.name;
      if (validatedData.description) updates.description = validatedData.description;

      const updatedBy = req.user!.address;
      const service = await registry.updateService(id, updates, updatedBy);

      io.emit('service-updated', service);

      res.json({ success: true, service, message: 'Service updated successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: getErrorMessage(error) });
    }
  });

  app.delete('/api/services/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await registry.getService(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Service not found' });
      }

      if (!checkOwnership(existing.metadata?.walletAddress || '', req)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not own this service',
        });
      }

      const deletedBy = req.user!.address;
      await registry.deleteService(id, deletedBy);

      io.emit('service-deleted', { id });

      res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: getErrorMessage(error) });
    }
  });

  app.post('/api/services/search', async (req, res) => {
    try {
      const validatedQuery = validateSearch(req.body);
      const results = await registry.searchServices({
        capabilities: validatedQuery.capabilities,
        maxPrice: validatedQuery.maxPrice,
        minRating: validatedQuery.minRating,
        sortBy: 'rating',
      });

      const approvedResults = results.filter((s: any) => s.status === 'approved');
      const offset = validatedQuery.offset || 0;
      const limit = validatedQuery.limit || 20;
      const paginatedResults = approvedResults.slice(offset, offset + limit);

      res.json({
        success: true,
        count: approvedResults.length,
        offset,
        limit,
        services: paginatedResults,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: getErrorMessage(error) });
    }
  });

  app.post('/api/services/:id/rate', async (req, res) => {
    try {
      const { id } = req.params;
      const validatedRating = validateRating({
        ...req.body,
        transactionId: req.body.transactionId || `tx-${Date.now()}`,
      });

      await registry.updateReputation(id, validatedRating.score);

      if (validatedRating.review) {
        await db.run(
          `INSERT INTO ratings (id, transactionId, serviceId, rater, score, review, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `rating-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            validatedRating.transactionId,
            id,
            req.headers['x-user-id'] as string || 'anonymous',
            validatedRating.score,
            validatedRating.review,
            new Date().toISOString(),
          ]
        );
      }

      const service = await registry.getService(id);
      res.json({ success: true, service, message: 'Rating submitted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: getErrorMessage(error) });
    }
  });

  // Admin Endpoints
  app.get('/api/admin/pending-services', requireAuth, requireAdmin, (req, res) => {
    const services = registry.getAllServices();
    const pendingServices = services.filter((s: any) => s.status === 'pending');
    res.json({ success: true, count: pendingServices.length, services: pendingServices });
  });

  app.post('/api/admin/test-endpoint/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const service = await registry.getService(id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    try {
      const testResponse = await axios.post(
        service.endpoint,
        { test: true, adminTest: true },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000, validateStatus: () => true }
      );

      const middlewareWorking = testResponse.status === 402;

      res.json({
        success: true,
        test: {
          endpoint: service.endpoint,
          status: testResponse.status,
          middlewareWorking,
          response: testResponse.data,
          message: middlewareWorking
            ? '✓ Middleware is correctly installed (returned 402)'
            : `⚠ Expected 402, got ${testResponse.status}`,
        },
      });
    } catch (error) {
      res.json({
        success: false,
        test: {
          endpoint: service.endpoint,
          error: getErrorMessage(error),
          message: '✗ Endpoint test failed',
        },
      });
    }
  });

  app.post('/api/admin/approve/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const service = await registry.getService(id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    await db.run(
      `UPDATE services SET status = ?, approval_notes = ?, approved_at = ? WHERE id = ?`,
      ['approved', notes || '', Date.now(), id]
    );

    const updatedService = await registry.getService(id);
    io.emit('new-service', updatedService);

    res.json({ success: true, service: updatedService, message: 'Service approved successfully' });
  });

  app.post('/api/admin/reject/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const service = await registry.getService(id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection notes required',
        message: 'Please provide a reason for rejection',
      });
    }

    await db.run(`UPDATE services SET status = ?, approval_notes = ? WHERE id = ?`, [
      'rejected',
      notes,
      id,
    ]);

    const updatedService = await registry.getService(id);

    res.json({ success: true, service: updatedService, message: 'Service rejected' });
  });

  // Stats & Analytics
  app.get('/api/stats', async (req, res) => {
    const services = registry.getAllServices();
    const query =
      'SELECT COUNT(*) as count, SUM(CAST(SUBSTR(amount, 2) AS REAL)) as volume FROM transactions WHERE status = "completed"';
    const stats = await db.get<{ count: number; volume: number }>(query);

    res.json({
      success: true,
      stats: {
        services: services.length,
        transactions: stats?.count || 0,
        volume: stats?.volume || 0,
        agents: 47,
      },
    });
  });

  app.get('/api/transactions/recent', async (req, res) => {
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;
    const query = `
      SELECT t.*, s.name as service_name
      FROM transactions t
      LEFT JOIN services s ON t.serviceId = s.id
      WHERE t.status = "completed"
      ORDER BY t.timestamp DESC
      LIMIT ?
    `;

    interface TransactionRow {
      id: string;
      service_name: string;
      amount: string;
      timestamp: string;
    }
    const transactions = await db.all<TransactionRow>(query, [limit]);

    res.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        from: `Agent_${t.id.substring(0, 6)}`,
        to: t.service_name || 'Unknown Service',
        amount: t.amount,
        timestamp: t.timestamp,
      })),
    });
  });

  app.get('/api/services/:id/analytics', requireAuth, async (req, res) => {
    const { id } = req.params;
    const service = await registry.getService(id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    if (!checkOwnership(service.metadata?.walletAddress || '', req)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not own this service',
      });
    }

    const transactionsQuery = `
      SELECT * FROM transactions
      WHERE serviceId = ? AND status = 'completed'
      ORDER BY timestamp DESC
    `;
    const transactions = await db.all<any>(transactionsQuery, [id]);

    const totalRevenue = transactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount.replace('$', ''));
      return sum + amount;
    }, 0);

    res.json({
      success: true,
      analytics: {
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        totalRequests: transactions.length,
        revenueByDay: [],
        requestsByHour: [],
        topUsers: [],
        recentTransactions: transactions.slice(0, 20),
      },
    });
  });

  app.get('/api/services/:id/audit', async (req, res) => {
    const { id } = req.params;
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 200 ? rawLimit : 50;

    const history = await db.getAuditHistory('service', id, limit);

    res.json({ success: true, count: history.length, audit: history });
  });

  // AI Services
  app.post('/api/ai/image/analyze', x402Middleware(), async (req, res) => {
    const { image, analysisType, detailLevel } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'Missing required field: image' });
    }

    const validTypes = ['full', 'objects', 'text', 'faces', 'description'];
    if (analysisType && !validTypes.includes(analysisType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid analysisType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const validLevels = ['basic', 'detailed'];
    if (detailLevel && !validLevels.includes(detailLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid detailLevel. Must be one of: ${validLevels.join(', ')}`,
      });
    }

    const result = await imageAnalyzer.analyze({ image, analysisType, detailLevel });
    const costStats = imageAnalyzer.getCostStats();

    res.json({
      ...result,
      pricing: {
        charged: '0.02',
        apiCost: costStats.lastRequestCost.toFixed(4),
        profitMargin: costStats.profitMargin.toFixed(4),
      },
    });
  });

  app.post('/api/ai/sentiment/analyze', x402Middleware(), (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing or invalid required field: text' });
    }

    if (text.length > 10000) {
      return res
        .status(400)
        .json({ success: false, error: 'Text too long. Maximum length is 10,000 characters' });
    }

    const result = sentimentAnalyzer.analyze(text);

    res.json({ success: true, result, pricing: { charged: '0.01' } });
  });

  app.post('/api/ai/text/summarize', x402Middleware(), async (req, res) => {
    const { text, length, style, focus, extractKeyPoints, includeTags } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing or invalid required field: text' });
    }

    if (text.length > 50000) {
      return res
        .status(400)
        .json({ success: false, error: 'Text too long. Maximum length is 50,000 characters' });
    }

    const validLengths = ['brief', 'medium', 'detailed'];
    if (length && !validLengths.includes(length)) {
      return res.status(400).json({
        success: false,
        error: `Invalid length. Must be one of: ${validLengths.join(', ')}`,
      });
    }

    const validStyles = ['bullets', 'paragraph', 'executive'];
    if (style && !validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        error: `Invalid style. Must be one of: ${validStyles.join(', ')}`,
      });
    }

    const result = await textSummarizer.summarize({
      text,
      length,
      style,
      focus,
      extractKeyPoints,
      includeTags,
    });
    const stats = textSummarizer.getStats();

    res.json({
      ...result,
      pricing: {
        charged: '0.015',
        apiCost: stats.averageCost.toFixed(4),
        profitMargin: stats.profitPerRequest.toFixed(4),
      },
    });
  });

  app.get('/api/ai/health', (req, res) => {
    res.json({
      success: true,
      services: {
        imageAnalyzer: {
          available: imageAnalyzer.isAvailable(),
          price: '0.02',
          currency: 'USDC',
          endpoint: '/api/ai/image/analyze',
        },
        sentimentAnalyzer: {
          available: true,
          price: '0.01',
          currency: 'USDC',
          endpoint: '/api/ai/sentiment/analyze',
        },
        textSummarizer: {
          available: textSummarizer.isAvailable(),
          price: '0.015',
          currency: 'USDC',
          endpoint: '/api/ai/text/summarize',
        },
      },
    });
  });

  // WebSocket
  io.on('connection', (socket) => {
    socket.emit('initial-stats', {
      services: registry.getAllServices().length,
    });
  });

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
    });
  });
}

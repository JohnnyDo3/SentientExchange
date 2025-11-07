#!/usr/bin/env node
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { Database } from '../registry/database.js';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { logger, securityLogger } from '../utils/logger.js';
import {
  apiLimiter,
  writeLimiter,
  registrationLimiter,
  mcpConnectionLimiter,
  mcpMessageLimiter,
  helmetConfig,
  corsOptions,
  requestSizeLimit,
  errorHandler,
  requestId,
  requestLogger,
  sanitizeRequest,
} from '../middleware/security.js';
import {
  validateService,
  validateServiceUpdate,
  validateSearch,
  validateRating,
} from '../validation/schemas.js';
import { generateNonce, verifySiweMessage } from '../auth/siwe.js';
import { generateToken } from '../auth/jwt.js';
import {
  requireAuth,
  requireAdmin,
  checkOwnership,
} from '../middleware/auth.js';
import { SSETransportManager } from '../mcp/SSETransport.js';
import { SolanaVerifier as _SolanaVerifier } from '../payment/SolanaVerifier.js';
import { SpendingLimitManager as _SpendingLimitManager } from '../payment/SpendingLimitManager.js';
import { HealthMonitor } from '../monitoring/HealthMonitor.js';
import { getErrorMessage } from '../types/errors.js';
import type { Service } from '../types/service.js';
import type { Transaction } from '../types/transaction.js';
import { x402Middleware } from '@sentientexchange/x402-middleware';
import { ImageAnalyzer } from '../services/ai/image/imageAnalyzer.js';
import { SentimentAnalyzer } from '../services/ai/sentiment/sentimentAnalyzer.js';
import { TextSummarizer } from '../services/ai/text/textSummarizer.js';
import { MasterOrchestrator } from '../orchestrator/MasterOrchestrator.js';
import { seedDatabase } from '../server/seed-endpoint.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
});

const PORT = process.env.API_PORT || 3333;

// Initialize database (auto-detects SQLite vs Postgres from DATABASE_URL)
const dbPathOrUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PATH ||
  './data/agentmarket.db';
const db = new Database(dbPathOrUrl);
const registry = new ServiceRegistry(db);

// Initialize payment verification (for MCP smart tools)
const solanaVerifier = new _SolanaVerifier();
const spendingLimitManager = new _SpendingLimitManager(db);

// Initialize SSE Transport for remote MCP connections
const sseTransport = new SSETransportManager(
  registry,
  db,
  solanaVerifier,
  spendingLimitManager
);

// Initialize Health Monitor
const healthMonitor = new HealthMonitor(registry, db);

// Initialize AI Services
const imageAnalyzer = new ImageAnalyzer();
const sentimentAnalyzer = new SentimentAnalyzer();
const textSummarizer = new TextSummarizer();

// Initialize Master Orchestrator for /swarm page
const orchestrator = new MasterOrchestrator(registry);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Trust Railway proxy (required for rate limiting and IP detection)
// Set to 1 to trust only the first proxy (Railway) - more secure than 'true'
app.set('trust proxy', 1);

// Security headers
app.use(helmetConfig);

// Request ID tracking
app.use(requestId);

// Request logging
app.use(requestLogger);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parsing (required for httpOnly JWT cookies)
app.use(cookieParser());

// Request size limiting
app.use(requestSizeLimit);

// Input sanitization
app.use(sanitizeRequest);

// Rate limiting (global)
app.use('/api', apiLimiter);

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function initialize() {
  await db.initialize();
  await registry.initialize();

  // Auto-seed database if empty (one-time startup seed)
  const serviceCount = registry.getAllServices().length;
  if (serviceCount === 0) {
    logger.info('🌱 Database is empty - auto-seeding with example services...');
    try {
      const seededServices = await seedDatabase(registry);
      logger.info(
        `✅ Auto-seed complete: ${seededServices.length} services created`
      );

      // Reload registry to update in-memory cache with seeded services
      await registry.initialize();
      const newCount = registry.getAllServices().length;
      logger.info(`✓ Registry reloaded: ${newCount} services now in memory`);
    } catch (error: unknown) {
      logger.error('❌ Auto-seed failed:', error);
      // Don't crash the server if seeding fails - just log the error
    }
  } else {
    logger.info(`✓ Database already seeded with ${serviceCount} services`);
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

// GET /api/pulse - Creative health check (agents always have a pulse!)
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
      activeSessions: sseTransport.getActiveSessionCount(),
    },
  });
});

// ============================================================================
// MCP SSE ENDPOINTS (Remote Claude Desktop Connections)
// ============================================================================

// GET /mcp/sse - Establish SSE stream for MCP protocol
// This allows Claude Desktop (or other MCP clients) to connect remotely
// Rate limited: 10 connections per 15 minutes per IP
app.get('/mcp/sse', mcpConnectionLimiter, async (req, res) => {
  await sseTransport.handleSSEConnection(req, res);
});

// POST /mcp/message?sessionId=X - Receive client messages
// Bidirectional communication: client sends JSON-RPC requests to server
// Rate limited: 60 messages per minute per session
app.post(
  '/mcp/message',
  mcpMessageLimiter,
  express.text({ type: '*/*' }),
  async (req, res) => {
    await sseTransport.handleMessage(req, res);
  }
);

// Legacy health endpoint (backwards compatibility)
app.get('/api/health', (req, res) => {
  res.redirect(308, '/api/pulse');
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /api/auth/nonce - Get nonce for wallet signature
app.post('/api/auth/nonce', (req, res, next) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required',
      });
    }

    // Validate address format (basic check)
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
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/auth/verify - Verify SIWE signature and return JWT
// SECURITY: Sets JWT in httpOnly cookie (XSS-safe) + returns in body (backwards compatibility)
app.post('/api/auth/verify', async (req, res, _next) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Message and signature required',
      });
    }

    // Verify SIWE signature
    const { address, chainId } = await verifySiweMessage(message, signature);

    // Generate JWT token
    const token = generateToken(address, chainId);

    // Security event: Successful authentication
    securityLogger.authSuccess({
      address,
      chainId,
      ip: req.ip,
    });

    // Set token in httpOnly cookie (XSS-safe - JavaScript cannot access)
    res.cookie('auth-token', token, {
      httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT expiry)
    });

    // Also return token in body for backwards compatibility
    res.json({
      success: true,
      token,
      address,
      chainId,
      message: 'Authentication successful',
    });
  } catch (error: unknown) {
    // Security event: Authentication failed
    const message = getErrorMessage(error);
    securityLogger.authFailure({
      reason: `SIWE verification failed: ${message}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: message,
    });
  }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      address: req.user!.address,
      chainId: req.user!.chainId,
    },
  });
});

// POST /api/auth/logout - Logout and clear httpOnly cookie
app.post('/api/auth/logout', (req, res) => {
  // Clear the httpOnly cookie
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({
    success: true,
    message: 'Logged out successfully - cookie cleared',
  });
});

// ============================================================================
// SERVICE ENDPOINTS
// ============================================================================

// GET /api/services - List all services (only approved)
app.get('/api/services', async (req, res, next) => {
  try {
    const allServices = registry.getAllServices();

    // Filter to only show approved services in marketplace
    const approvedServices = allServices.filter(
      (s: any) => s.status === 'approved'
    );

    res.json({
      success: true,
      count: approvedServices.length,
      services: approvedServices,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/services/my-services - Get services owned by authenticated user
app.get('/api/services/my-services', requireAuth, async (req, res, next) => {
  try {
    const allServices = registry.getAllServices();

    // Filter services owned by authenticated user
    const myServices = allServices.filter(
      (service) =>
        service.metadata?.walletAddress?.toLowerCase() ===
        req.user!.address.toLowerCase()
    );

    res.json({
      success: true,
      count: myServices.length,
      services: myServices,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/services/:id - Service details
app.get('/api/services/:id', async (req, res, next) => {
  try {
    const service = await registry.getService(req.params.id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, error: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/services - Create new service (requires authentication)
app.post(
  '/api/services',
  requireAuth,
  registrationLimiter,
  writeLimiter,
  async (req, res, next) => {
    try {
      // Validate input
      const validatedData = validateService(req.body);

      // Test middleware if claimed to be installed
      let middlewareVerified = false;
      if (validatedData.middlewareInstalled) {
        try {
          logger.info(`Testing middleware for ${validatedData.endpoint}...`);

          // Send test request expecting 402
          const testResponse = await axios.post(
            validatedData.endpoint,
            { test: true },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
              validateStatus: () => true, // Don't throw on any status
            }
          );

          // Check if service returned 402 (middleware is working)
          if (testResponse.status === 402) {
            middlewareVerified = true;
            logger.info(`✓ Middleware verified for ${validatedData.endpoint}`);
          } else {
            logger.warn(
              `Middleware test: Expected 402, got ${testResponse.status}`
            );
          }
        } catch (error) {
          logger.error(`Middleware test error:`, error);
        }
      }

      // Create service record
      const serviceInput: any = {
        name: validatedData.name,
        description: validatedData.description,
        provider: validatedData.provider,
        provider_wallet: validatedData.walletAddress, // Solana wallet
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
        status: 'pending', // Require admin approval
        middleware_verified: middlewareVerified,
        network: 'solana',
        metadata: {
          apiVersion: 'v1',
          walletAddress: validatedData.walletAddress,
          providerWallet: validatedData.walletAddress,
          healthCheckUrl: validatedData.healthCheckUrl,
          paymentAddresses: validatedData.paymentAddresses,
          image: validatedData.image || '🔮',
          color: validatedData.color || '#a855f7',
        },
      };

      // Use authenticated wallet address as creator
      const createdBy = req.user!.address;
      const service = await registry.registerService(serviceInput, createdBy);

      // Don't broadcast pending services (only after approval)
      // io.emit('new-service', service);

      res.status(201).json({
        success: true,
        service,
        message: middlewareVerified
          ? 'Service registered! ✓ Middleware verified. Awaiting admin approval.'
          : 'Service registered! Please ensure middleware is installed. Awaiting admin approval.',
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// PUT /api/services/:id - Update service (requires ownership)
app.put(
  '/api/services/:id',
  requireAuth,
  writeLimiter,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if service exists and verify ownership
      const existing = await registry.getService(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: 'Service not found' });
      }

      // Verify ownership
      if (!checkOwnership(existing.metadata?.walletAddress || '', req)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not own this service',
        });
      }

      // Validate input
      const validatedData = validateServiceUpdate(req.body);

      // Prepare update object
      const updates: Partial<Service> = {};
      if (validatedData.name) updates.name = validatedData.name;
      if (validatedData.description)
        updates.description = validatedData.description;
      if (validatedData.provider) updates.provider = validatedData.provider;
      if (validatedData.endpoint) updates.endpoint = validatedData.endpoint;
      if (validatedData.capabilities)
        updates.capabilities = validatedData.capabilities;
      if (validatedData.pricing)
        updates.pricing = {
          perRequest: validatedData.pricing.perRequest,
          currency: validatedData.pricing.currency || 'USDC',
        };

      // Update metadata fields
      if (
        validatedData.image ||
        validatedData.color ||
        validatedData.walletAddress ||
        validatedData.paymentAddresses
      ) {
        updates.metadata = {
          ...existing?.metadata,
          ...(validatedData.image && { image: validatedData.image }),
          ...(validatedData.color && { color: validatedData.color }),
          ...(validatedData.walletAddress && {
            walletAddress: validatedData.walletAddress,
          }),
          ...(validatedData.paymentAddresses && {
            paymentAddresses: validatedData.paymentAddresses,
          }),
        };
      }

      const updatedBy = req.user!.address;
      const service = await registry.updateService(id, updates, updatedBy);

      // Broadcast service update via WebSocket
      io.emit('service-updated', service);

      res.json({
        success: true,
        service,
        message: 'Service updated successfully',
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// DELETE /api/services/:id - Delete service (requires ownership)
app.delete(
  '/api/services/:id',
  requireAuth,
  writeLimiter,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if service exists and verify ownership
      const existing = await registry.getService(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: 'Service not found' });
      }

      // Verify ownership
      if (!checkOwnership(existing.metadata?.walletAddress || '', req)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not own this service',
        });
      }

      const deletedBy = req.user!.address;
      await registry.deleteService(id, deletedBy);

      // Broadcast service deletion via WebSocket
      io.emit('service-deleted', { id });

      res.json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/services/search - Advanced search (only approved services)
app.post('/api/services/search', async (req, res, next) => {
  try {
    const validatedQuery = validateSearch(req.body);

    const results = await registry.searchServices({
      capabilities: validatedQuery.capabilities,
      maxPrice: validatedQuery.maxPrice,
      minRating: validatedQuery.minRating,
      sortBy: 'rating', // Default sort
    });

    // Filter to only show approved services in marketplace
    const approvedResults = results.filter((s: any) => s.status === 'approved');

    // Apply pagination
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
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/services/:id/rate - Rate a service
app.post('/api/services/:id/rate', writeLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedRating = validateRating({
      ...req.body,
      transactionId: req.body.transactionId || `tx-${Date.now()}`, // Temporary fallback
    });

    await registry.updateReputation(id, validatedRating.score);

    // Store rating in database
    if (validatedRating.review) {
      await db.run(
        `INSERT INTO ratings (id, transactionId, serviceId, rater, score, review, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `rating-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          validatedRating.transactionId,
          id,
          (req.headers['x-user-id'] as string) || 'anonymous',
          validatedRating.score,
          validatedRating.review,
          new Date().toISOString(),
        ]
      );
    }

    const service = await registry.getService(id);

    res.json({
      success: true,
      service,
      message: 'Rating submitted successfully',
    });
  } catch (error: unknown) {
    next(error);
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// GET /api/admin/pending-services - Get all pending services (requires admin)
app.get(
  '/api/admin/pending-services',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const services = registry.getAllServices();
      const pendingServices = services.filter(
        (s: any) => s.status === 'pending'
      );

      res.json({
        success: true,
        count: pendingServices.length,
        services: pendingServices,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/test-endpoint/:id - Test service endpoint (requires admin)
app.post(
  '/api/admin/test-endpoint/:id',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const service = await registry.getService(id);
      if (!service) {
        return res
          .status(404)
          .json({ success: false, error: 'Service not found' });
      }

      // Test the endpoint
      try {
        logger.info(`Admin testing endpoint: ${service.endpoint}`);

        const testResponse = await axios.post(
          service.endpoint,
          { test: true, adminTest: true },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
            validateStatus: () => true, // Don't throw on any status
          }
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
      } catch (error: unknown) {
        res.json({
          success: false,
          test: {
            endpoint: service.endpoint,
            error: getErrorMessage(error),
            message: '✗ Endpoint test failed',
          },
        });
      }
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/approve/:id - Approve a service (requires admin)
app.post(
  '/api/admin/approve/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const service = await registry.getService(id);
      if (!service) {
        return res
          .status(404)
          .json({ success: false, error: 'Service not found' });
      }

      // Update service status to approved
      await db.run(
        `UPDATE services SET status = ?, approval_notes = ?, approved_at = ? WHERE id = ?`,
        ['approved', notes || '', Date.now(), id]
      );

      // Get updated service
      const updatedService = await registry.getService(id);

      // Broadcast new approved service via WebSocket
      io.emit('new-service', updatedService);

      logger.info(`✓ Service approved by admin: ${service.name} (${id})`);

      res.json({
        success: true,
        service: updatedService,
        message: 'Service approved successfully',
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/reject/:id - Reject a service (requires admin)
app.post(
  '/api/admin/reject/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const service = await registry.getService(id);
      if (!service) {
        return res
          .status(404)
          .json({ success: false, error: 'Service not found' });
      }

      if (!notes || notes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rejection notes required',
          message: 'Please provide a reason for rejection',
        });
      }

      // Update service status to rejected
      await db.run(
        `UPDATE services SET status = ?, approval_notes = ? WHERE id = ?`,
        ['rejected', notes, id]
      );

      // Get updated service
      const updatedService = await registry.getService(id);

      logger.info(`✗ Service rejected by admin: ${service.name} (${id})`);

      res.json({
        success: true,
        service: updatedService,
        message: 'Service rejected',
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// GET /api/admin/health/stats - Get health monitoring stats (requires admin)
app.get(
  '/api/admin/health/stats',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const stats = await healthMonitor.getHealthStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/health/check - Trigger manual health check (requires admin)
app.post(
  '/api/admin/health/check',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      logger.info('Manual health check triggered by admin');

      const results = await healthMonitor.runHealthChecks();

      res.json({
        success: true,
        message: 'Health check completed',
        results,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// GET /api/admin/health/history/:serviceId - Get health history for a service (requires admin)
app.get(
  '/api/admin/health/history/:serviceId',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { serviceId } = req.params;
      const rawLimit = parseInt(String(req.query.limit), 10);
      const limit =
        Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 200
          ? rawLimit
          : 100;

      const history = await healthMonitor.getHealthHistory(serviceId, limit);

      res.json({
        success: true,
        count: history.length,
        history,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// ============================================================================
// STATS & ANALYTICS ENDPOINTS
// ============================================================================

// GET /api/stats - Marketplace stats
app.get('/api/stats', async (req, res, next) => {
  try {
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
        agents: 47, // Mock data
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/transactions/recent - Recent transactions
app.get('/api/transactions/recent', async (req, res, next) => {
  try {
    // Secure parseInt with bounds checking (prevent Infinity, NaN, negative, or excessive values)
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100
        ? rawLimit
        : 20;
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
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/services/:id/analytics - Get analytics for a specific service (requires ownership)
app.get('/api/services/:id/analytics', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if service exists and verify ownership
    const service = await registry.getService(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, error: 'Service not found' });
    }

    // Verify ownership
    if (!checkOwnership(service.metadata?.walletAddress || '', req)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not own this service',
      });
    }

    // Get transactions for this service
    const transactionsQuery = `
      SELECT * FROM transactions
      WHERE serviceId = ? AND status = 'completed'
      ORDER BY timestamp DESC
    `;
    const transactions = await db.all<Transaction>(transactionsQuery, [id]);

    // Calculate analytics
    const totalRevenue = transactions.reduce((sum, t) => {
      const amount = parseFloat(t.amount.replace('$', ''));
      return sum + amount;
    }, 0);

    const totalRequests = transactions.length;

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const revenueByDay: Record<string, number> = {};

    transactions.forEach((t) => {
      const timestamp = new Date(t.timestamp).getTime();
      if (timestamp >= thirtyDaysAgo) {
        const date = new Date(t.timestamp).toISOString().split('T')[0];
        const amount = parseFloat(t.amount.replace('$', ''));
        revenueByDay[date] = (revenueByDay[date] || 0) + amount;
      }
    });

    const revenueData = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({
        date,
        revenue: parseFloat(revenue.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Requests by hour (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const requestsByHour: Record<number, number> = {};

    transactions.forEach((t) => {
      const timestamp = new Date(t.timestamp).getTime();
      if (timestamp >= oneDayAgo) {
        const hour = new Date(t.timestamp).getHours();
        requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;
      }
    });

    const requestsData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      requests: requestsByHour[hour] || 0,
    }));

    // Top users (last 30 days)
    const userSpending: Record<string, { requests: number; spent: number }> =
      {};

    transactions.forEach((t) => {
      const timestamp = new Date(t.timestamp).getTime();
      if (timestamp >= thirtyDaysAgo) {
        const buyer = t.buyer;
        const amount = parseFloat(t.amount.replace('$', ''));

        if (!userSpending[buyer]) {
          userSpending[buyer] = { requests: 0, spent: 0 };
        }

        userSpending[buyer].requests += 1;
        userSpending[buyer].spent += amount;
      }
    });

    const topUsers = Object.entries(userSpending)
      .map(([name, data]) => ({
        name,
        requests: data.requests,
        spent: `$${data.spent.toFixed(2)}`,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    res.json({
      success: true,
      analytics: {
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        totalRequests,
        revenueByDay: revenueData,
        requestsByHour: requestsData,
        topUsers,
        recentTransactions: transactions.slice(0, 20).map((t) => ({
          id: t.id,
          buyer: t.buyer,
          amount: t.amount,
          timestamp: t.timestamp,
        })),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// GET /api/services/:id/audit - Get audit history for a service
app.get('/api/services/:id/audit', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Secure parseInt with bounds checking (prevent Infinity, NaN, negative, or excessive values)
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 200
        ? rawLimit
        : 50;

    const history = await db.getAuditHistory('service', id, limit);

    res.json({
      success: true,
      count: history.length,
      audit: history,
    });
  } catch (error: unknown) {
    next(error);
  }
});

// ============================================================================
// ORCHESTRATION & SEED ENDPOINTS
// ============================================================================

// POST /api/orchestrate - Trigger Master Orchestrator (for /swarm page)
app.post('/api/orchestrate', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    logger.info(`🎯 Orchestration request: "${query}"`);

    const result = await orchestrator.executeComplexTask(query);

    res.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    logger.error('Orchestration failed:', error);
    next(error);
  }
});

// POST /api/admin/seed - Seed database with example services
app.post(
  '/api/admin/seed',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      logger.info('🌱 Seeding database with example services...');
      const services = await seedDatabase(registry);

      res.json({
        success: true,
        message: `Successfully seeded ${services.length} services`,
        services: services.map((s) => ({ id: s.id, name: s.name })),
      });
    } catch (error: unknown) {
      logger.error('Failed to seed database:', error);
      next(error);
    }
  }
);

// ============================================================================
// AI SERVICES (with x402 payment)
// ============================================================================

// Image Analysis Service
app.post('/api/ai/image/analyze', x402Middleware(), async (req, res, next) => {
  try {
    const { image, analysisType, detailLevel } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: image',
      });
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

    logger.info(
      `Processing image analysis request (type: ${analysisType || 'full'})`
    );

    const result = await imageAnalyzer.analyze({
      image,
      analysisType: analysisType as any,
      detailLevel: detailLevel as any,
    });

    const costStats = imageAnalyzer.getCostStats();

    res.json({
      ...result,
      pricing: {
        charged: process.env.IMAGE_ANALYZER_PRICE || '0.02',
        apiCost: costStats.lastRequestCost.toFixed(4),
        profitMargin: costStats.profitMargin.toFixed(4),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// Sentiment Analysis Service
app.post(
  '/api/ai/sentiment/analyze',
  x402Middleware(),
  async (req, res, next) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid required field: text',
        });
      }

      if (text.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Text too long. Maximum length is 10,000 characters',
        });
      }

      logger.info(
        `Processing sentiment analysis request (${text.length} chars)`
      );

      const result = sentimentAnalyzer.analyze(text);

      res.json({
        success: true,
        result,
        pricing: {
          charged: process.env.SENTIMENT_ANALYZER_PRICE || '0.01',
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// Text Summarization Service
app.post('/api/ai/text/summarize', x402Middleware(), async (req, res, next) => {
  try {
    const { text, length, style, focus, extractKeyPoints, includeTags } =
      req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: text',
      });
    }

    if (text.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long. Maximum length is 50,000 characters',
      });
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

    logger.info(
      `Processing text summarization request (${text.length} chars, ${length || 'medium'} length)`
    );

    const result = await textSummarizer.summarize({
      text,
      length: length as any,
      style: style as any,
      focus,
      extractKeyPoints,
      includeTags,
    });

    const stats = textSummarizer.getStats();

    res.json({
      ...result,
      pricing: {
        charged: process.env.TEXT_SUMMARIZER_PRICE || '0.015',
        apiCost: stats.averageCost.toFixed(4),
        profitMargin: stats.profitPerRequest.toFixed(4),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
});

// AI Services Health Check
app.get('/api/ai/health', (req, res) => {
  res.json({
    success: true,
    services: {
      imageAnalyzer: {
        available: imageAnalyzer.isAvailable(),
        price: process.env.IMAGE_ANALYZER_PRICE || '0.02',
        currency: 'USDC',
        endpoint: '/api/ai/image/analyze',
      },
      sentimentAnalyzer: {
        available: true, // Lexicon-based, always available
        price: process.env.SENTIMENT_ANALYZER_PRICE || '0.01',
        currency: 'USDC',
        endpoint: '/api/ai/sentiment/analyze',
      },
      textSummarizer: {
        available: textSummarizer.isAvailable(),
        price: process.env.TEXT_SUMMARIZER_PRICE || '0.015',
        currency: 'USDC',
        endpoint: '/api/ai/text/summarize',
      },
    },
  });
});

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

io.on('connection', (socket) => {
  logger.info('WebSocket client connected:', socket.id);

  // Send initial stats
  socket.emit('initial-stats', {
    services: registry.getAllServices().length,
  });

  // Orchestration event: Start orchestration via WebSocket
  socket.on('start-orchestration', async (data: { query: string }) => {
    logger.info(`🎯 Starting orchestration for: "${data.query}"`);

    try {
      // Broadcast that orchestration is starting
      io.emit('orchestration-started', {
        query: data.query,
        timestamp: Date.now(),
      });

      // Execute orchestration with real-time events
      const result = await orchestrator.executeComplexTask(data.query);

      // Broadcast completion with final deliverable (result already has success: true)
      io.emit('orchestration-completed', {
        ...result,
        timestamp: Date.now(),
      });
    } catch (error: unknown) {
      logger.error('❌ Orchestration failed:', error);
      const message = getErrorMessage(error);
      io.emit('orchestration-error', {
        error: message,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Helper function to broadcast transactions
export function broadcastTransaction(tx: Transaction) {
  io.emit('new-transaction', tx);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function start() {
  await initialize();

  // Start health monitoring (check every 5 minutes)
  const healthCheckInterval = parseInt(
    process.env.HEALTH_CHECK_INTERVAL_MINUTES || '5',
    10
  );
  healthMonitor.start(healthCheckInterval);

  httpServer.listen(PORT, () => {
    logger.info(
      `\n🚀 SentientExchange API Server running on http://localhost:${PORT}`
    );
    logger.info(`🔌 WebSocket server running on ws://localhost:${PORT}`);
    logger.info(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
    logger.info(`📝 Validation: Zod schemas active`);
    logger.info(
      `🏥 Health monitoring: Active (interval: ${healthCheckInterval}min)\n`
    );
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  void (async () => {
    healthMonitor.stop();
    logger.info('SIGTERM received, closing server gracefully...');
    httpServer.close(() => {
      void (async () => {
        await db.close();
        process.exit(0);
      })();
    });
  })();
});

process.on('SIGINT', () => {
  void (async () => {
    logger.info('\nSIGINT received, closing server gracefully...');
    httpServer.close(() => {
      void (async () => {
        await db.close();
        process.exit(0);
      })();
    });
  })();
});

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start API server:', err);
    process.exit(1);
  });
}

export { app, io, start, db, registry };

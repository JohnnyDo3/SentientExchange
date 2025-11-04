#!/usr/bin/env node
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Database } from '../registry/database.js';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { logger, securityLogger } from '../utils/logger.js';
import {
  apiLimiter,
  writeLimiter,
  registrationLimiter,
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
import { generateToken, verifyToken } from '../auth/jwt.js';
import { requireAuth, optionalAuth, checkOwnership } from '../middleware/auth.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: corsOptions
});

const PORT = process.env.API_PORT || 3333;
const db = new Database(process.env.DATABASE_PATH || './data/agentmarket.db');
const registry = new ServiceRegistry(db);

// ============================================================================
// MIDDLEWARE
// ============================================================================

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
  // API Server initialized
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
    message: '🤖 AgentMarket is alive and thriving'
  });
});

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
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/verify - Verify SIWE signature and return JWT
// SECURITY: Sets JWT in httpOnly cookie (XSS-safe) + returns in body (backwards compatibility)
app.post('/api/auth/verify', async (req, res, next) => {
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
  } catch (error: any) {
    // Security event: Authentication failed
    securityLogger.authFailure({
      reason: `SIWE verification failed: ${error.message}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
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

// GET /api/services - List all services
app.get('/api/services', async (req, res, next) => {
  try {
    const services = registry.getAllServices();
    res.json({ success: true, count: services.length, services });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/services/my-services - Get services owned by authenticated user
app.get('/api/services/my-services', requireAuth, async (req, res, next) => {
  try {
    const allServices = registry.getAllServices();

    // Filter services owned by authenticated user
    const myServices = allServices.filter(service =>
      service.metadata?.walletAddress?.toLowerCase() === req.user!.address.toLowerCase()
    );

    res.json({
      success: true,
      count: myServices.length,
      services: myServices
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/services/:id - Service details
app.get('/api/services/:id', async (req, res, next) => {
  try {
    const service = await registry.getService(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/services - Create new service (requires authentication)
app.post('/api/services', requireAuth, registrationLimiter, writeLimiter, async (req, res, next) => {
  try {
    // Validate input
    const validatedData = validateService(req.body);

    // Create service record
    const serviceInput: any = {
      name: validatedData.name,
      description: validatedData.description,
      provider: validatedData.provider,
      endpoint: validatedData.endpoint,
      capabilities: validatedData.capabilities,
      pricing: {
        perRequest: (validatedData.pricing as any).perRequest,
      },
      reputation: {
        rating: 5.0,
        reviews: 0,
        totalJobs: 0,
      },
      metadata: {
        walletAddress: validatedData.walletAddress,
        paymentAddresses: validatedData.paymentAddresses,
        image: validatedData.image || '🔮',
        color: validatedData.color || '#a855f7',
      },
    };

    // Use authenticated wallet address as creator
    const createdBy = req.user!.address;
    const service = await registry.registerService(serviceInput, createdBy);

    // Broadcast new service via WebSocket
    io.emit('new-service', service);

    res.status(201).json({
      success: true,
      service,
      message: 'Service registered successfully',
    });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/services/:id - Update service (requires ownership)
app.put('/api/services/:id', requireAuth, writeLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if service exists and verify ownership
    const existing = await registry.getService(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Service not found' });
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
    const updates: any = {};
    if (validatedData.name) updates.name = validatedData.name;
    if (validatedData.description) updates.description = validatedData.description;
    if (validatedData.provider) updates.provider = validatedData.provider;
    if (validatedData.endpoint) updates.endpoint = validatedData.endpoint;
    if (validatedData.capabilities) updates.capabilities = validatedData.capabilities;
    if (validatedData.pricing) updates.pricing = { perRequest: validatedData.pricing.perRequest };

    // Update metadata fields
    if (validatedData.image || validatedData.color || validatedData.walletAddress || validatedData.paymentAddresses) {
      updates.metadata = {
        ...existing?.metadata,
        ...(validatedData.image && { image: validatedData.image }),
        ...(validatedData.color && { color: validatedData.color }),
        ...(validatedData.walletAddress && { walletAddress: validatedData.walletAddress }),
        ...(validatedData.paymentAddresses && { paymentAddresses: validatedData.paymentAddresses }),
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
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/services/:id - Delete service (requires ownership)
app.delete('/api/services/:id', requireAuth, writeLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if service exists and verify ownership
    const existing = await registry.getService(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Service not found' });
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
  } catch (error: any) {
    next(error);
  }
});

// POST /api/services/search - Advanced search
app.post('/api/services/search', async (req, res, next) => {
  try {
    const validatedQuery = validateSearch(req.body);

    const results = await registry.searchServices({
      capabilities: validatedQuery.capabilities,
      maxPrice: validatedQuery.maxPrice,
      minRating: validatedQuery.minRating,
      sortBy: 'rating', // Default sort
    });

    // Apply pagination
    const offset = validatedQuery.offset || 0;
    const limit = validatedQuery.limit || 20;
    const paginatedResults = results.slice(offset, offset + limit);

    res.json({
      success: true,
      count: results.length,
      offset,
      limit,
      services: paginatedResults,
    });
  } catch (error: any) {
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
          req.headers['x-user-id'] as string || 'anonymous',
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
  } catch (error: any) {
    next(error);
  }
});

// ============================================================================
// STATS & ANALYTICS ENDPOINTS
// ============================================================================

// GET /api/stats - Marketplace stats
app.get('/api/stats', async (req, res, next) => {
  try {
    const services = registry.getAllServices();
    const query = 'SELECT COUNT(*) as count, SUM(CAST(SUBSTR(amount, 2) AS REAL)) as volume FROM transactions WHERE status = "completed"';
    const stats: any = await db.get(query);

    res.json({
      success: true,
      stats: {
        services: services.length,
        transactions: stats?.count || 0,
        volume: stats?.volume || 0,
        agents: 47, // Mock data
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/transactions/recent - Recent transactions
app.get('/api/transactions/recent', async (req, res, next) => {
  try {
    // Secure parseInt with bounds checking (prevent Infinity, NaN, negative, or excessive values)
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100
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

    const transactions: any[] = await db.all(query, [limit]);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        from: `Agent_${t.id.substring(0, 6)}`,
        to: t.service_name || 'Unknown Service',
        amount: t.amount,
        timestamp: t.timestamp,
      })),
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/services/:id/audit - Get audit history for a service
app.get('/api/services/:id/audit', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Secure parseInt with bounds checking (prevent Infinity, NaN, negative, or excessive values)
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 200
      ? rawLimit
      : 50;

    const history = await db.getAuditHistory('service', id, limit);

    res.json({
      success: true,
      count: history.length,
      audit: history,
    });
  } catch (error: any) {
    next(error);
  }
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

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Helper function to broadcast transactions
export function broadcastTransaction(tx: any) {
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
  httpServer.listen(PORT, () => {
    logger.info(`\n🚀 AgentMarket API Server running on http://localhost:${PORT}`);
    logger.info(`🔌 WebSocket server running on ws://localhost:${PORT}`);
    logger.info(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
    logger.info(`📝 Validation: Zod schemas active\n`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully...');
  httpServer.close(async () => {
    await db.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('\nSIGINT received, closing server gracefully...');
  httpServer.close(async () => {
    await db.close();
    process.exit(0);
  });
});

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start API server:', err);
    process.exit(1);
  });
}

export { app, io, start, db, registry };

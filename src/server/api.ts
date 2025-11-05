/**
 * API Server for AgentMarket Dashboard
 *
 * Provides REST API for triggering orchestration and WebSocket for real-time updates
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Database } from '../registry/database.js';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { MasterOrchestrator } from '../orchestrator/MasterOrchestrator.js';
import { OrchestrationWebSocket } from './websocket.js';
import { logger } from '../utils/logger.js';
import { seedDatabase } from './seed-endpoint.js';
import path from 'path';

const app = express();
const server = createServer(app);

// Middleware - allow both localhost and production domain
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.sentientexchange.com',
  'https://sentientexchange.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Initialize dependencies
const DB_PATH = path.join(process.cwd(), 'data', 'agentmarket.db');
const db = new Database(DB_PATH);
const registry = new ServiceRegistry(db);
const orchestrator = new MasterOrchestrator(registry);

// Initialize WebSocket
const wsServer = new OrchestrationWebSocket(server);
wsServer.connectOrchestrator(orchestrator);

// API Routes

/**
 * GET /api/services
 * Get all available services from registry
 */
app.get('/api/services', async (req, res) => {
  try {
    const services = registry.getAllServices();
    res.json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error: any) {
    logger.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrate
 * Trigger orchestration (synchronous - for non-WebSocket clients)
 */
app.post('/api/orchestrate', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
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
  } catch (error: any) {
    logger.error('Orchestration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agentmarket-api',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/seed
 * Seed database with example services (admin only)
 */
app.post('/api/admin/seed', async (req, res) => {
  try {
    logger.info('🌱 Seeding database with example services...');
    const services = await seedDatabase(registry);

    res.json({
      success: true,
      message: `Successfully seeded ${services.length} services`,
      services: services.map(s => ({ id: s.id, name: s.name }))
    });
  } catch (error: any) {
    logger.error('Failed to seed database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Initialize and start server
 */
export async function startAPIServer(port: number = 3333) {
  try {
    // Initialize database and registry
    await db.initialize();
    await registry.initialize();

    logger.info(`✅ Database initialized`);
    logger.info(`✅ Registry loaded with ${registry.getAllServices().length} services`);

    // Start server
    server.listen(port, () => {
      logger.info(`🚀 API Server started on port ${port}`);
      logger.info(`📡 WebSocket server ready for connections`);
      logger.info(`🌐 Dashboard: http://localhost:3001/swarm`);
      logger.info(`🔗 API: http://localhost:${port}`);
    });

    return server;
  } catch (error) {
    logger.error('❌ Failed to start API server:', error);
    throw error;
  }
}

export { app, server, wsServer, registry, orchestrator };

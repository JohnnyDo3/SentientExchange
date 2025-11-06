/**
 * API Server for SentientExchange Dashboard
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
import { getErrorMessage, getErrorStatusCode } from '../types/errors.js';
import { LLMSentimentAnalyzer } from '../services/ai/sentiment/llmSentimentAnalyzer.js';
import { ImageAnalyzer } from '../services/ai/image/imageAnalyzer.js';
import { TextSummarizer } from '../services/ai/text/textSummarizer.js';

const app = express();
const server = createServer(app);

// Middleware - allow both localhost and production domain
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.sentientexchange.com',
  'https://sentientexchange.com',
];

app.use(
  cors({
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
  })
);
app.use(express.json());

// Initialize dependencies
const DB_PATH = path.join(process.cwd(), 'data', 'agentmarket.db');
const db = new Database(DB_PATH);
const registry = new ServiceRegistry(db);
const orchestrator = new MasterOrchestrator(registry);

// Initialize AI services
const sentimentAnalyzer = new LLMSentimentAnalyzer();
const imageAnalyzer = new ImageAnalyzer();
const textSummarizer = new TextSummarizer();

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
  } catch (error: unknown) {
    logger.error('Error fetching services:', error);
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({
      success: false,
      error: message,
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
  } catch (error: unknown) {
    logger.error('Orchestration failed:', error);
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/ai/sentiment
 * Analyze sentiment of text
 */
app.post('/api/ai/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    if (!sentimentAnalyzer.isAvailable()) {
      return res.status(503).json({
        success: false,
        error:
          'Sentiment analyzer not available - ANTHROPIC_API_KEY not configured',
      });
    }

    const result = await sentimentAnalyzer.analyze(text);
    const stats = sentimentAnalyzer.getStats();

    res.json({
      success: true,
      result,
      stats,
    });
  } catch (error: unknown) {
    logger.error('Sentiment analysis failed:', error);
    const message = getErrorMessage(error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/ai/image
 * Analyze image content
 */
app.post('/api/ai/image', async (req, res) => {
  try {
    const { image, analysisType, detailLevel } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 encoded)',
      });
    }

    if (!imageAnalyzer.isAvailable()) {
      return res.status(503).json({
        success: false,
        error:
          'Image analyzer not available - ANTHROPIC_API_KEY not configured',
      });
    }

    const result = await imageAnalyzer.analyze({
      image,
      analysisType: analysisType || 'full',
      detailLevel: detailLevel || 'detailed',
    });

    res.json(result);
  } catch (error: unknown) {
    logger.error('Image analysis failed:', error);
    const message = getErrorMessage(error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/ai/text
 * Summarize text
 */
app.post('/api/ai/text', async (req, res) => {
  try {
    const { text, length, style, focus, extractKeyPoints, includeTags } =
      req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    if (!textSummarizer.isAvailable()) {
      return res.status(503).json({
        success: false,
        error:
          'Text summarizer not available - ANTHROPIC_API_KEY not configured',
      });
    }

    const result = await textSummarizer.summarize({
      text,
      length: length || 'medium',
      style: style || 'paragraph',
      focus,
      extractKeyPoints: extractKeyPoints || false,
      includeTags: includeTags || false,
    });

    res.json(result);
  } catch (error: unknown) {
    logger.error('Text summarization failed:', error);
    const message = getErrorMessage(error);
    res.status(500).json({
      success: false,
      error: message,
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
      services: services.map((s) => ({ id: s.id, name: s.name })),
    });
  } catch (error: unknown) {
    logger.error('Failed to seed database:', error);
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);
    res.status(statusCode).json({
      success: false,
      error: message,
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
    logger.info(
      `✅ Registry loaded with ${registry.getAllServices().length} services`
    );

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

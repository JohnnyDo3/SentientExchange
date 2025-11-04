import dotenv from 'dotenv';
dotenv.config(); // MUST be first before other imports that use process.env

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { x402Middleware } from './middleware/x402.js';
import { logger, expressLogger } from './middleware/logger.js';
import { validateAnalysisRequest } from './utils/validation.js';
import { HybridSentimentAnalyzer } from './services/hybridSentimentAnalyzer.js';
import { register, collectDefaultMetrics } from 'prom-client';

const app = express();
const PORT = process.env.PORT || 3001;
const analyzer = new HybridSentimentAnalyzer();

// Prometheus metrics
collectDefaultMetrics();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(expressLogger);

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint (no payment required)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sentiment-analyzer',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (no payment required)
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Service info endpoint (returns x402 payment requirements)
app.get('/info', (req: Request, res: Response) => {
  res.json({
    name: process.env.SERVICE_NAME || 'sentiment-analyzer',
    description: process.env.SERVICE_DESCRIPTION || 'AI-powered sentiment analysis service',
    version: '1.0.0',
    pricing: {
      currency: 'USDC',
      amount: parseFloat(process.env.PRICE_USDC || '0.01'),
      network: process.env.NETWORK || 'base-sepolia',
    },
    capabilities: [
      'LLM-powered analysis using Claude API (when available)',
      'Local ML fallback using RoBERTa (124M tweet training)',
      'Multi-dimensional emotion detection',
      'Polarity scoring (-1 to +1)',
      'Confidence and intensity measurement',
      'Mixed emotion recognition',
      'Context-aware keyword extraction',
      'Subjectivity analysis',
      'Handles slang, sarcasm, and evolving language',
      'Smart caching for performance'
    ],
    endpoints: {
      analyze: '/analyze',
    },
    paymentProtocol: 'x402',
  });
});

// Analyzer stats endpoint (no payment required)
app.get('/stats', (req: Request, res: Response) => {
  const stats = analyzer.getStats();
  res.json({
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// Main sentiment analysis endpoint (x402 payment required)
app.post('/analyze', x402Middleware, async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error, value } = validateAnalysisRequest(req.body);
    if (error) {
      logger.warn('Validation error:', { error: error.message });
      return res.status(400).json({
        error: 'Invalid request',
        details: error.message,
      });
    }

    const { text } = value;

    logger.info('Processing sentiment analysis request', {
      textLength: text.length,
      paidBy: (req as any).payment?.from,
    });

    // Perform analysis
    const startTime = Date.now();
    const { method, cached, ...result } = await analyzer.analyze(text);
    const analysisTime = Date.now() - startTime;

    logger.info('Analysis complete', {
      polarity: result.overall.polarity,
      category: result.overall.category,
      confidence: result.overall.confidence,
      emotionsDetected: result.emotions.length,
      analysisTimeMs: analysisTime,
      method,
      cached
    });

    // Return result
    res.json({
      success: true,
      result,
      metadata: {
        textLength: text.length,
        analysisTimeMs: analysisTime,
        method,
        cached,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
    });
  }
});

// Batch analysis endpoint (x402 payment required, higher cost)
app.post('/analyze/batch', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'texts must be a non-empty array',
      });
    }

    if (texts.length > 100) {
      return res.status(400).json({
        error: 'Batch too large',
        details: 'Maximum 100 texts per batch',
      });
    }

    logger.info('Processing batch sentiment analysis', {
      batchSize: texts.length,
      paidBy: (req as any).payment?.from,
    });

    const startTime = Date.now();
    const results = await Promise.all(
      texts.map(async (text: string, index: number) => {
        try {
          const result = await analyzer.analyze(text);
          return {
            index,
            success: true,
            result,
          };
        } catch (error: any) {
          return {
            index,
            success: false,
            error: error.message,
          };
        }
      })
    );
    const analysisTime = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;

    logger.info('Batch analysis complete', {
      totalTexts: texts.length,
      successCount,
      failureCount: texts.length - successCount,
      analysisTimeMs: analysisTime,
    });

    res.json({
      success: true,
      results,
      metadata: {
        totalTexts: texts.length,
        successCount,
        failureCount: texts.length - successCount,
        analysisTimeMs: analysisTime,
        averageTimePerText: Math.round(analysisTime / texts.length),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Batch analysis error:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      details: error.message,
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Sentiment Analyzer service started`, {
    port: PORT,
    network: process.env.NETWORK || 'base-sepolia',
    walletAddress: process.env.WALLET_ADDRESS,
    priceUSDC: process.env.PRICE_USDC || '0.01',
  });
  console.log(`\n🚀 Sentiment Analyzer service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Service info: http://localhost:${PORT}/info`);
  console.log(`💰 Payment required for /analyze endpoint\n`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;

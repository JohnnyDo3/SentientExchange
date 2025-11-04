import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { x402Middleware } from './middleware/x402';
import { logger } from './middleware/logger';
import { NewsAggregatorService } from './services/newsAggregatorService';
import { validateNewsRequest } from './utils/validation';

const app = express();
const newsService = new NewsAggregatorService();

// Security middleware
app.use(helmet());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

const limiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check (no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'news-aggregator',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (no payment required)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`# Web Scraper Metrics
# TYPE requests_total counter
# HELP requests_total Total number of scrape requests
requests_total 0

# TYPE uptime_seconds gauge
# HELP uptime_seconds Service uptime in seconds
uptime_seconds ${process.uptime()}
`);
});

// Main news fetch endpoint (requires x402 payment)
app.post('/fetch', x402Middleware, async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate request
    const validatedData = validateNewsRequest(req.body);

    logger.info('News fetch request received:', {
      topic: validatedData.topic,
      limit: validatedData.limit,
      payment: (req as any).payment?.txHash,
    });

    // Fetch news
    const result = await newsService.fetchNews(validatedData);

    const processingTime = Date.now() - startTime;

    logger.info('News fetch completed successfully:', {
      resultsCount: result.length,
      processingTime: `${processingTime}ms`,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        processingTime: `${processingTime}ms`,
        cost: `$${process.env.PRICE_USDC || '0.80'} USDC`,
        paymentTx: (req as any).payment?.txHash,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    logger.error('News fetch failed:', {
      error: error.message,
      processingTime: `${processingTime}ms`,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      meta: {
        processingTime: `${processingTime}ms`,
      },
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      'GET /health',
      'GET /metrics',
      'POST /fetch (requires x402 payment)',
    ],
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3005;

export function startServer() {
  return app.listen(PORT, () => {
    logger.info(`🚀 News Aggregator service started`);
    logger.info(`📡 Listening on port ${PORT}`);
    logger.info(`💰 Price: $${process.env.PRICE_USDC || '0.80'} USDC per request`);
    logger.info(`🔐 Wallet: ${process.env.WALLET_ADDRESS}`);
    logger.info(`🌐 Network: ${process.env.NETWORK || 'solana-devnet'}`);
  });
}

export default app;

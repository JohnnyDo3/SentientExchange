import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { x402Middleware } from './middleware/x402';
import { logger } from './middleware/logger';
import { CopywriterService } from './services/copywriterService';
import { validateCopyRequest } from './utils/validation';

const app = express();
const copywriterService = new CopywriterService();

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
    service: process.env.SERVICE_NAME || 'copywriter',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (no payment required)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`# Copywriter Metrics
# TYPE requests_total counter
# HELP requests_total Total number of copywriting requests
requests_total 0

# TYPE uptime_seconds gauge
# HELP uptime_seconds Service uptime in seconds
uptime_seconds ${process.uptime()}
`);
});

// Main copywriting endpoint (requires x402 payment)
app.post('/write', x402Middleware, async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate request
    const validatedData = validateCopyRequest(req.body);

    logger.info('Copywriting request received:', {
      type: validatedData.type,
      product: validatedData.product,
      tone: validatedData.tone,
      payment: (req as any).payment?.txHash,
    });

    // Generate copy
    const result = await copywriterService.generateCopy(validatedData);

    const processingTime = Date.now() - startTime;

    logger.info('Copywriting completed successfully:', {
      type: validatedData.type,
      processingTime: `${processingTime}ms`,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        processingTime: `${processingTime}ms`,
        cost: `$${process.env.PRICE_USDC || '1.00'} USDC`,
        paymentTx: (req as any).payment?.txHash,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    logger.error('Copywriting request failed:', {
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
      'POST /write (requires x402 payment)',
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

const PORT = process.env.PORT || 3015;

export function startServer() {
  return app.listen(PORT, () => {
    logger.info(`🚀 Copywriter service started`);
    logger.info(`📡 Listening on port ${PORT}`);
    logger.info(`💰 Price: $${process.env.PRICE_USDC || '1.00'} USDC per request`);
    logger.info(`🔐 Wallet: ${process.env.WALLET_ADDRESS}`);
    logger.info(`🌐 Network: ${process.env.NETWORK || 'solana-devnet'}`);
  });
}

export default app;

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { x402Middleware } from './middleware/x402';
import { TextSummarizer } from './services/textSummarizer';

const app = express();
const summarizer = new TextSummarizer();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser with larger limit for texts
app.use(express.json({ limit: '10mb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Health check endpoint (no payment required)
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'summarize-pro',
    uptime: process.uptime(),
    claudeAPI: summarizer.isAvailable() ? 'connected' : 'mock mode'
  });
});

// Service info endpoint (no payment required)
app.get('/info', (req: express.Request, res: express.Response) => {
  res.json({
    name: process.env.SERVICE_NAME || 'summarize-pro',
    description: process.env.SERVICE_DESCRIPTION || 'AI-powered text analysis',
    version: '1.0.0',
    pricing: {
      perRequest: `$${process.env.PRICE_USDC || '0.015'}`,
      currency: 'USDC',
      network: process.env.NETWORK || 'base-sepolia'
    },
    capabilities: [
      'text-summarization',
      'key-point-extraction',
      'topic-tagging',
      'multi-style-output',
      'compression-analysis',
      'reading-time-estimation'
    ],
    summaryLengths: ['brief', 'medium', 'detailed'],
    outputStyles: ['bullets', 'paragraph', 'executive'],
    features: ['focus-area', 'key-points', 'tags', 'statistics'],
    maxTextLength: '100KB'
  });
});

// Stats endpoint (no payment required)
app.get('/stats', (req: express.Request, res: express.Response) => {
  const stats = summarizer.getStats();
  res.json({
    service: 'summarize-pro',
    stats: stats,
    timestamp: new Date().toISOString()
  });
});

// Main text analysis endpoint (requires x402 payment)
app.post('/summarize', x402Middleware, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    // Validate request
    if (!req.body.text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }

    // Summarize text
    console.log(`Processing summarization request (style: ${req.body.style || 'paragraph'}, length: ${req.body.length || 'medium'})`);
    const result = await summarizer.summarize({
      text: req.body.text,
      length: req.body.length,
      style: req.body.style,
      focus: req.body.focus,
      extractKeyPoints: req.body.extractKeyPoints,
      includeTags: req.body.includeTags
    });

    // Add request metadata
    const response = {
      ...result,
      requestMetadata: {
        totalTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        paidAmount: `$${process.env.PRICE_USDC || '0.02'} USDC`
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: ['/health', '/info', '/stats', '/summarize']
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;

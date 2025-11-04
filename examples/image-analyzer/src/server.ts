import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { x402Middleware } from './middleware/x402';
import { ImageAnalyzer } from './services/imageAnalyzer';

const app = express();
const analyzer = new ImageAnalyzer();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser with larger limit for images
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
    service: process.env.SERVICE_NAME || 'vision-pro',
    uptime: process.uptime(),
    visionAPI: analyzer.isAvailable() ? 'connected' : 'mock mode'
  });
});

// Service info endpoint (no payment required)
app.get('/info', (req: express.Request, res: express.Response) => {
  res.json({
    name: process.env.SERVICE_NAME || 'vision-pro',
    description: process.env.SERVICE_DESCRIPTION || 'AI-powered image analysis',
    version: '1.0.0',
    pricing: {
      perRequest: `$${process.env.PRICE_USDC || '0.02'}`,
      currency: 'USDC',
      network: process.env.NETWORK || 'base-sepolia'
    },
    capabilities: [
      'object-detection',
      'scene-understanding',
      'text-extraction-ocr',
      'face-detection',
      'color-analysis',
      'image-description'
    ],
    analysisTypes: ['full', 'objects', 'text', 'faces', 'description'],
    detailLevels: ['basic', 'detailed'],
    maxImageSize: '10MB',
    supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
  });
});

// Stats endpoint (no payment required)
app.get('/stats', (req: express.Request, res: express.Response) => {
  const costStats = analyzer.getCostStats();
  res.json({
    service: 'vision-pro',
    costs: costStats,
    timestamp: new Date().toISOString()
  });
});

// Main image analysis endpoint (requires x402 payment)
app.post('/analyze', x402Middleware, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    // Validate request
    if (!req.body.image) {
      return res.status(400).json({
        error: 'Missing required field: image'
      });
    }

    // Analyze image
    console.log(`Processing image analysis request (type: ${req.body.analysisType || 'full'})`);
    const result = await analyzer.analyze({
      image: req.body.image,
      analysisType: req.body.analysisType,
      detailLevel: req.body.detailLevel
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
    availableEndpoints: ['/health', '/info', '/stats', '/analyze']
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

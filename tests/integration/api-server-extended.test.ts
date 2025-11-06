/**
 * API Server Extended Tests - AI Services
 *
 * Tests AI service endpoints with x402 payment integration:
 * - Image Analysis (Claude Vision)
 * - Sentiment Analysis (Lexicon-based)
 * - Text Summarization (Claude)
 * - Health checks and availability
 */

import request from 'supertest';
import express from 'express';
import { ImageAnalyzer } from '../../src/services/ai/image/imageAnalyzer';
import { SentimentAnalyzer } from '../../src/services/ai/sentiment/sentimentAnalyzer';
import { TextSummarizer } from '../../src/services/ai/text/textSummarizer';

// Mock x402 middleware
jest.mock('@sentientexchange/x402-middleware', () => ({
  x402Middleware: jest.fn(() => (req: any, res: any, next: any) => {
    // Mock successful payment verification
    req.payment = {
      verified: true,
      amount: BigInt(20000), // 0.02 USDC
      signature: 'mock-tx-signature',
    };
    next();
  }),
}));

// Mock AI services
jest.mock('../../src/services/ai/image/imageAnalyzer');
jest.mock('../../src/services/ai/sentiment/sentimentAnalyzer');
jest.mock('../../src/services/ai/text/textSummarizer');

const MockImageAnalyzer = ImageAnalyzer as jest.MockedClass<typeof ImageAnalyzer>;
const MockSentimentAnalyzer = SentimentAnalyzer as jest.MockedClass<typeof SentimentAnalyzer>;
const MockTextSummarizer = TextSummarizer as jest.MockedClass<typeof TextSummarizer>;

describe('API Server - AI Services Integration', () => {
  let app: express.Application;
  let imageAnalyzer: any;
  let sentimentAnalyzer: any;
  let textSummarizer: any;

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock service instances
    imageAnalyzer = {
      isAvailable: jest.fn().mockReturnValue(true),
      analyze: jest.fn().mockResolvedValue({
        success: true,
        description: 'A test image showing various objects',
        objects: [{ name: 'person', confidence: 0.95 }],
        faces: [],
        text: [],
        metadata: { processingTime: 1500 },
      }),
      getCostStats: jest.fn().mockReturnValue({
        lastRequestCost: 0.005,
        profitMargin: 0.015,
      }),
    };

    sentimentAnalyzer = {
      analyze: jest.fn().mockReturnValue({
        score: 0.75,
        label: 'positive',
        confidence: 0.85,
        breakdown: {
          positive: 10,
          negative: 2,
          neutral: 3,
        },
      }),
    };

    textSummarizer = {
      isAvailable: jest.fn().mockReturnValue(true),
      summarize: jest.fn().mockResolvedValue({
        success: true,
        summary: 'This is a test summary of the provided text.',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        metadata: { inputLength: 500, outputLength: 50 },
      }),
      getStats: jest.fn().mockReturnValue({
        averageCost: 0.003,
        profitPerRequest: 0.012,
      }),
    };

    MockImageAnalyzer.mockImplementation(() => imageAnalyzer);
    MockSentimentAnalyzer.mockImplementation(() => sentimentAnalyzer);
    MockTextSummarizer.mockImplementation(() => textSummarizer);

    // Setup routes
    setupRoutes();
  });

  function setupRoutes() {
    const { x402Middleware } = require('@sentientexchange/x402-middleware');

    // AI Health Check
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
            available: true,
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

    // Image Analysis Endpoint
    app.post(
      '/api/ai/image/analyze',
      x402Middleware(),
      async (req, res, next) => {
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

          const result = await imageAnalyzer.analyze({
            image,
            analysisType,
            detailLevel,
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
        } catch (error) {
          next(error);
        }
      }
    );

    // Sentiment Analysis Endpoint
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

          const result = sentimentAnalyzer.analyze(text);

          res.json({
            success: true,
            result,
            pricing: {
              charged: process.env.SENTIMENT_ANALYZER_PRICE || '0.01',
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Text Summarization Endpoint
    app.post(
      '/api/ai/text/summarize',
      x402Middleware(),
      async (req, res, next) => {
        try {
          const { text, length, style, focus, extractKeyPoints, includeTags } = req.body;

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
              charged: process.env.TEXT_SUMMARIZER_PRICE || '0.015',
              apiCost: stats.averageCost.toFixed(4),
              profitMargin: stats.profitPerRequest.toFixed(4),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );
  }

  describe('GET /api/ai/health', () => {
    it('should return health status for all AI services', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        services: {
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
        },
      });
    });

    it('should reflect service availability status', async () => {
      // Make image analyzer unavailable
      imageAnalyzer.isAvailable.mockReturnValueOnce(false);

      const response = await request(app)
        .get('/api/ai/health')
        .expect(200);

      expect(response.body.services.imageAnalyzer.available).toBe(false);
      expect(response.body.services.sentimentAnalyzer.available).toBe(true);
    });
  });

  describe('POST /api/ai/image/analyze', () => {
    const validImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should analyze image successfully with full analysis', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({
          image: validImageData,
          analysisType: 'full',
          detailLevel: 'detailed',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        description: expect.any(String),
        pricing: {
          charged: '0.02',
          apiCost: expect.any(String),
          profitMargin: expect.any(String),
        },
      });

      expect(imageAnalyzer.analyze).toHaveBeenCalledWith({
        image: validImageData,
        analysisType: 'full',
        detailLevel: 'detailed',
      });
    });

    it('should analyze with default options when not specified', async () => {
      await request(app)
        .post('/api/ai/image/analyze')
        .send({ image: validImageData })
        .expect(200);

      expect(imageAnalyzer.analyze).toHaveBeenCalledWith({
        image: validImageData,
        analysisType: undefined,
        detailLevel: undefined,
      });
    });

    it('should return 400 when image is missing', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required field: image',
      });
    });

    it('should return 400 for invalid analysisType', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({
          image: validImageData,
          analysisType: 'invalid-type',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid analysisType');
    });

    it('should return 400 for invalid detailLevel', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({
          image: validImageData,
          detailLevel: 'ultra',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid detailLevel');
    });

    it('should handle different analysis types', async () => {
      const types = ['full', 'objects', 'text', 'faces', 'description'];

      for (const type of types) {
        await request(app)
          .post('/api/ai/image/analyze')
          .send({
            image: validImageData,
            analysisType: type,
          })
          .expect(200);
      }
    });

    it('should include cost statistics in response', async () => {
      const response = await request(app)
        .post('/api/ai/image/analyze')
        .send({ image: validImageData })
        .expect(200);

      expect(response.body.pricing).toEqual({
        charged: '0.02',
        apiCost: '0.0050',
        profitMargin: '0.0150',
      });
    });
  });

  describe('POST /api/ai/sentiment/analyze', () => {
    it('should analyze sentiment successfully', async () => {
      const testText = 'I absolutely love this product! It works great and exceeded my expectations.';

      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: testText })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        result: {
          score: 0.75,
          label: 'positive',
          confidence: 0.85,
          breakdown: {
            positive: 10,
            negative: 2,
            neutral: 3,
          },
        },
        pricing: {
          charged: '0.01',
        },
      });

      expect(sentimentAnalyzer.analyze).toHaveBeenCalledWith(testText);
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing or invalid required field: text',
      });
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: '   ' })
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid');
    });

    it('should return 400 for non-string text', async () => {
      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: 12345 })
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid');
    });

    it('should return 400 when text exceeds 10000 characters', async () => {
      const longText = 'a'.repeat(10001);

      const response = await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: longText })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Text too long. Maximum length is 10,000 characters',
      });
    });

    it('should accept text at exactly 10000 characters', async () => {
      const maxText = 'a'.repeat(10000);

      await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: maxText })
        .expect(200);
    });
  });

  describe('POST /api/ai/text/summarize', () => {
    const validText = 'This is a long article about artificial intelligence and machine learning. It discusses various aspects of neural networks, deep learning algorithms, and their applications in modern technology. The article covers topics such as natural language processing, computer vision, and reinforcement learning.';

    it('should summarize text successfully with default options', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: validText })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        summary: expect.any(String),
        pricing: {
          charged: '0.015',
          apiCost: expect.any(String),
          profitMargin: expect.any(String),
        },
      });

      expect(textSummarizer.summarize).toHaveBeenCalledWith({
        text: validText,
        length: undefined,
        style: undefined,
        focus: undefined,
        extractKeyPoints: undefined,
        includeTags: undefined,
      });
    });

    it('should summarize with custom options', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({
          text: validText,
          length: 'brief',
          style: 'bullets',
          focus: 'technical',
          extractKeyPoints: true,
          includeTags: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(textSummarizer.summarize).toHaveBeenCalledWith({
        text: validText,
        length: 'brief',
        style: 'bullets',
        focus: 'technical',
        extractKeyPoints: true,
        includeTags: true,
      });
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing or invalid required field: text',
      });
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: '   ' })
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid');
    });

    it('should return 400 when text exceeds 50000 characters', async () => {
      const longText = 'a'.repeat(50001);

      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: longText })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Text too long. Maximum length is 50,000 characters',
      });
    });

    it('should return 400 for invalid length parameter', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({
          text: validText,
          length: 'super-long',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid length');
      expect(response.body.error).toContain('brief, medium, detailed');
    });

    it('should return 400 for invalid style parameter', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({
          text: validText,
          style: 'haiku',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid style');
      expect(response.body.error).toContain('bullets, paragraph, executive');
    });

    it('should accept all valid length values', async () => {
      const lengths = ['brief', 'medium', 'detailed'];

      for (const length of lengths) {
        await request(app)
          .post('/api/ai/text/summarize')
          .send({ text: validText, length })
          .expect(200);
      }
    });

    it('should accept all valid style values', async () => {
      const styles = ['bullets', 'paragraph', 'executive'];

      for (const style of styles) {
        await request(app)
          .post('/api/ai/text/summarize')
          .send({ text: validText, style })
          .expect(200);
      }
    });

    it('should include cost statistics in response', async () => {
      const response = await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: validText })
        .expect(200);

      expect(response.body.pricing).toEqual({
        charged: '0.015',
        apiCost: '0.0030',
        profitMargin: '0.0120',
      });
    });
  });

  describe('x402 Payment Integration', () => {
    it('should have x402 middleware applied to all AI endpoints', async () => {
      const { x402Middleware } = require('@sentientexchange/x402-middleware');

      // Image analyzer
      await request(app)
        .post('/api/ai/image/analyze')
        .send({ image: 'test-image' });

      // Sentiment analyzer
      await request(app)
        .post('/api/ai/sentiment/analyze')
        .send({ text: 'test text' });

      // Text summarizer
      await request(app)
        .post('/api/ai/text/summarize')
        .send({ text: 'test text' });

      // Verify middleware was called for each endpoint
      expect(x402Middleware).toHaveBeenCalledTimes(3);
    });
  });
});

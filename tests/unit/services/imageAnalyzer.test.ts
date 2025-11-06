/**
 * ImageAnalyzer Unit Tests
 *
 * Tests the Claude Vision-powered image analysis service including:
 * - Image analysis with different types (full, objects, text, faces, description)
 * - Detail levels (basic, detailed)
 * - Mock mode when API key not configured
 * - Cost calculation
 * - Base64 image processing
 */

import { ImageAnalyzer, ImageAnalysisRequest } from '../../../src/services/ai/image/imageAnalyzer';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('ImageAnalyzer', () => {
  const originalEnv = process.env;
  let mockMessagesCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Setup mock Anthropic client
    mockMessagesCreate = jest.fn();
    MockAnthropic.mockImplementation(
      () =>
        ({
          messages: {
            create: mockMessagesCreate,
          },
        } as any)
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const analyzer = new ImageAnalyzer();

      expect(analyzer.isAvailable()).toBe(true);
      expect(MockAnthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should initialize without API key (mock mode)', () => {
      delete process.env.ANTHROPIC_API_KEY;

      const analyzer = new ImageAnalyzer();

      expect(analyzer.isAvailable()).toBe(false);
      expect(MockAnthropic).not.toHaveBeenCalled();
    });
  });

  describe('Mock Mode (No API Key)', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should return mock analysis for full type', async () => {
      const analyzer = new ImageAnalyzer();

      const request: ImageAnalysisRequest = {
        image: 'base64-image-data',
        analysisType: 'full',
        detailLevel: 'detailed',
      };

      const result = await analyzer.analyze(request);

      expect(result.success).toBe(true);
      expect(result.analysis.description).toContain('Mock analysis');
      expect(result.analysis.description).toContain('full');
      expect(result.metadata.model).toBe('mock');
      expect(result.metadata.cost).toBe(0);
    });

    it('should return mock analysis for objects type', async () => {
      const analyzer = new ImageAnalyzer();

      const result = await analyzer.analyze({
        image: 'test',
        analysisType: 'objects',
      });

      expect(result.analysis.description).toContain('objects');
      expect(result.analysis.objects).toBeDefined();
    });

    it('should include processing time in mock response', async () => {
      const analyzer = new ImageAnalyzer();

      const result = await analyzer.analyze({ image: 'test' });

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Image Analysis with API', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      // Setup mock API response
      mockMessagesCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '**DESCRIPTION:** A test image.\n**OBJECTS:** laptop, coffee mug\n**TEXT CONTENT:** None\n**PEOPLE:** 0 faces\n**COLOR PALETTE:** #3366CC, #FFFFFF\n**QUALITY ASSESSMENT:** High quality\n**NOTABLE FEATURES:** Clean composition',
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 200,
        },
      });
    });

    it('should analyze image with full analysis type', async () => {
      const analyzer = new ImageAnalyzer();

      const request: ImageAnalysisRequest = {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        analysisType: 'full',
        detailLevel: 'detailed',
      };

      const result = await analyzer.analyze(request);

      expect(result.success).toBe(true);
      expect(result.analysis.description).toBeDefined();
      expect(result.metadata.analysisType).toBe('full');
      expect(result.metadata.detailLevel).toBe('detailed');
      expect(result.metadata.model).toBe('claude-3-5-sonnet (vision)');
    });

    it('should use default analysis type and detail level', async () => {
      const analyzer = new ImageAnalyzer();

      const result = await analyzer.analyze({
        image: 'base64-data',
      });

      expect(result.metadata.analysisType).toBe('full');
      expect(result.metadata.detailLevel).toBe('detailed');
    });

    it('should call Anthropic API with correct parameters', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'data:image/png;base64,ABCD1234',
        analysisType: 'objects',
        detailLevel: 'basic',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'ABCD1234',
                },
              },
              {
                type: 'text',
                text: expect.stringContaining('computer vision system'),
              },
            ],
          },
        ],
      });
    });

    it('should detect media type from data URI', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'data:image/jpeg;base64,JPEG_DATA',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content[0].source.media_type).toBe('image/jpeg');
    });

    it('should handle different media types', async () => {
      const analyzer = new ImageAnalyzer();

      const mediaTypes = [
        'data:image/png;base64,DATA',
        'data:image/jpeg;base64,DATA',
        'data:image/gif;base64,DATA',
        'data:image/webp;base64,DATA',
      ];

      for (const image of mediaTypes) {
        await analyzer.analyze({ image });

        const call = mockMessagesCreate.mock.calls[mockMessagesCreate.mock.calls.length - 1][0];
        const expected = image.match(/data:([^;]+);/)![1];
        expect(call.messages[0].content[0].source.media_type).toBe(expected);
      }
    });

    it('should default to JPEG for non-data-URI images', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'PLAIN_BASE64_DATA_NO_PREFIX',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content[0].source.media_type).toBe('image/jpeg');
    });

    it('should extract base64 data from data URI', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'data:image/png;base64,EXTRACTED_DATA',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content[0].source.data).toBe('EXTRACTED_DATA');
    });

    it('should use raw base64 data when no data URI prefix', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'RAW_BASE64',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content[0].source.data).toBe('RAW_BASE64');
    });

    it('should calculate cost correctly', async () => {
      const analyzer = new ImageAnalyzer();

      // Mock response with known token counts
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Analysis result' }],
        usage: {
          input_tokens: 1_000_000, // $3
          output_tokens: 1_000_000, // $15
        },
      });

      const result = await analyzer.analyze({ image: 'test' });

      // $3 + $15 = $18
      expect(result.metadata.cost).toBe(18);
    });

    it('should track processing time', async () => {
      const analyzer = new ImageAnalyzer();

      const result = await analyzer.analyze({ image: 'test' });

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processingTimeMs).toBeLessThan(5000); // Reasonable upper bound
    });
  });

  describe('Analysis Types', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Test analysis' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should use objects prompt for objects type', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'objects',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('computer vision system');
      expect(prompt).toContain('identify ALL visible objects');
    });

    it('should use text extraction prompt for text type', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'text',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('OCR specialist');
      expect(prompt).toContain('Extract ALL visible text');
    });

    it('should use faces prompt for faces type', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'faces',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('facial recognition analyst');
      expect(prompt).toContain('Count and analyze human faces');
    });

    it('should use description prompt for description type', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'description',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('art curator');
      expect(prompt).toContain('description of this image');
    });

    it('should use full prompt for full type', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'full',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('comprehensive multi-modal analysis');
      expect(prompt).toContain('DESCRIPTION:');
      expect(prompt).toContain('OBJECTS:');
    });
  });

  describe('Detail Levels', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Test' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should adjust prompt for detailed level', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'description',
        detailLevel: 'detailed',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('comprehensive');
      expect(prompt).toContain('Scene composition');
      expect(prompt).toContain('Emotional impact');
    });

    it('should adjust prompt for basic level', async () => {
      const analyzer = new ImageAnalyzer();

      await analyzer.analyze({
        image: 'test',
        analysisType: 'description',
        detailLevel: 'basic',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      const prompt = call.messages[0].content[1].text;
      expect(prompt).toContain('concise');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should throw error when API call fails', async () => {
      const analyzer = new ImageAnalyzer();

      mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(analyzer.analyze({ image: 'test' })).rejects.toThrow(
        'Image analysis failed: API error'
      );
    });

    it('should throw error for non-text response', async () => {
      const analyzer = new ImageAnalyzer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await expect(analyzer.analyze({ image: 'test' })).rejects.toThrow(
        'Unexpected response type'
      );
    });
  });

  describe('Cost Statistics', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should return cost stats after analysis', async () => {
      const analyzer = new ImageAnalyzer();
      process.env.PRICE_USDC = '0.02';

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Test' }],
        usage: { input_tokens: 100000, output_tokens: 10000 }, // $0.45
      });

      await analyzer.analyze({ image: 'test' });

      const stats = analyzer.getCostStats();

      expect(stats.lastRequestCost).toBeCloseTo(0.45, 2);
      expect(stats.priceUSDC).toBe(0.02);
      expect(stats.profitMargin).toBeCloseTo(-0.43, 2); // Negative margin for this test
    });

    it('should use default price when PRICE_USDC not set', async () => {
      const analyzer = new ImageAnalyzer();
      delete process.env.PRICE_USDC;

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Test' }],
        usage: { input_tokens: 1000, output_tokens: 100 },
      });

      await analyzer.analyze({ image: 'test' });

      const stats = analyzer.getCostStats();

      expect(stats.priceUSDC).toBe(0.02);
    });

    it('should return zero cost before any analysis', () => {
      const analyzer = new ImageAnalyzer();

      const stats = analyzer.getCostStats();

      expect(stats.lastRequestCost).toBe(0);
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should parse objects from full analysis', async () => {
      const analyzer = new ImageAnalyzer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Analysis with objects: laptop, mouse, keyboard',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await analyzer.analyze({
        image: 'test',
        analysisType: 'full',
      });

      expect(result.analysis.objects).toEqual(['laptop', 'mouse', 'keyboard']);
    });

    it('should parse face count from full analysis', async () => {
      const analyzer = new ImageAnalyzer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Analysis shows 3 people in the image',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await analyzer.analyze({
        image: 'test',
        analysisType: 'full',
      });

      expect(result.analysis.faces).toBe(3);
    });

    it('should include raw description in all analysis types', async () => {
      const analyzer = new ImageAnalyzer();

      const responseText = 'Detailed analysis of the image content';

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: responseText }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await analyzer.analyze({ image: 'test' });

      expect(result.analysis.description).toBe(responseText);
    });
  });
});

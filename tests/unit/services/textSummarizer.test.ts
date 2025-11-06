/**
 * TextSummarizer Unit Tests
 *
 * Comprehensive tests for the Claude-powered text summarization service including:
 * - Initialization and availability
 * - Mock mode (no API key)
 * - Summarization lengths (brief, medium, detailed)
 * - Output styles (bullets, paragraph, executive)
 * - Optional features (key points, tags, focus)
 * - Statistics and cost calculation
 * - Response parsing
 * - Error handling
 */

import {
  TextSummarizer,
  SummarizationRequest,
} from '../../../src/services/ai/text/textSummarizer';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('TextSummarizer', () => {
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

      const summarizer = new TextSummarizer();

      expect(summarizer.isAvailable()).toBe(true);
      expect(MockAnthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should initialize without API key (mock mode)', () => {
      delete process.env.ANTHROPIC_API_KEY;

      const summarizer = new TextSummarizer();

      expect(summarizer.isAvailable()).toBe(false);
      expect(MockAnthropic).not.toHaveBeenCalled();
    });
  });

  describe('Mock Mode (No API Key)', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should return mock summary when no API key', async () => {
      const summarizer = new TextSummarizer();

      const request: SummarizationRequest = {
        text: 'This is a long document that needs to be summarized. ' +
          'It contains multiple paragraphs and important information.',
      };

      const result = await summarizer.summarize(request);

      expect(result.success).toBe(true);
      expect(result.summary.text).toContain('Mock summary');
      expect(result.metadata.model).toBe('mock');
      expect(result.metadata.cost).toBe(0);
    });

    it('should include mock key points when requested', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({
        text: 'Test text',
        extractKeyPoints: true,
      });

      expect(result.summary.keyPoints).toBeDefined();
      expect(result.summary.keyPoints!.length).toBeGreaterThan(0);
    });

    it('should include mock tags when requested', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({
        text: 'Test text',
        includeTags: true,
      });

      expect(result.summary.tags).toBeDefined();
      expect(result.summary.tags!.length).toBeGreaterThan(0);
    });
  });

  describe('Summarization with API', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      // Setup mock API response
      mockMessagesCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'This is a concise summary of the original text highlighting the main points.',
          },
        ],
        usage: {
          input_tokens: 500,
          output_tokens: 100,
        },
      });
    });

    it('should summarize text successfully', async () => {
      const summarizer = new TextSummarizer();

      const request: SummarizationRequest = {
        text: 'This is a long document with multiple paragraphs. '.repeat(10),
      };

      const result = await summarizer.summarize(request);

      expect(result.success).toBe(true);
      expect(result.summary.text).toBeDefined();
      expect(result.metadata.model).toBe('claude-3-5-sonnet');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    });

    it('should call API with correct parameters', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test document',
        length: 'brief',
        style: 'paragraph',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256, // brief length
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Test document'),
          },
        ],
      });
    });

    it('should calculate statistics correctly', async () => {
      const summarizer = new TextSummarizer();

      const originalText = 'This is a test. '.repeat(50); // ~150 words
      const result = await summarizer.summarize({
        text: originalText,
      });

      expect(result.summary.statistics.originalLength).toBe(originalText.length);
      expect(result.summary.statistics.summaryLength).toBeGreaterThan(0);
      expect(result.summary.statistics.compressionRatio).toBeGreaterThan(0);
      expect(result.summary.statistics.compressionRatio).toBeLessThanOrEqual(100);
      expect(result.summary.statistics.readingTimeOriginal).toMatch(/\d+ min/);
      expect(result.summary.statistics.readingTimeSummary).toMatch(/\d+ min/);
    });

    it('should calculate cost correctly', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Summary' }],
        usage: {
          input_tokens: 1_000_000, // $3
          output_tokens: 1_000_000, // $15
        },
      });

      const result = await summarizer.summarize({ text: 'Test' });

      // $3 + $15 = $18
      expect(result.metadata.cost).toBe(18);
    });

    it('should track token usage', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Summary' }],
        usage: {
          input_tokens: 500,
          output_tokens: 100,
        },
      });

      const result = await summarizer.summarize({ text: 'Test' });

      expect(result.metadata.tokensUsed).toBe(600); // 500 + 100
    });
  });

  describe('Length Options', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should use default length (medium)', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({ text: 'Test' });

      expect(result.metadata.length).toBe('medium');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 512, // medium
        })
      );
    });

    it('should handle brief length', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({
        text: 'Test',
        length: 'brief',
      });

      expect(result.metadata.length).toBe('brief');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 256, // brief
        })
      );
    });

    it('should handle medium length', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test',
        length: 'medium',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 512, // medium
        })
      );
    });

    it('should handle detailed length', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test',
        length: 'detailed',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1024, // detailed
        })
      );
    });
  });

  describe('Style Options', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should use default style (paragraph)', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({ text: 'Test' });

      expect(result.metadata.style).toBe('paragraph');
      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('professional content synthesizer');
    });

    it('should handle bullets style', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test',
        style: 'bullets',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('information synthesizer');
      expect(call.messages[0].content).toContain('bullet');
    });

    it('should handle paragraph style', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test',
        style: 'paragraph',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('professional content synthesizer');
    });

    it('should handle executive style', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Test',
        style: 'executive',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('executive assistant');
      expect(call.messages[0].content).toContain('OVERVIEW');
    });
  });

  describe('Optional Features', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should extract key points when requested', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text:
              'This is the summary.\n\nKEY POINTS:\n- First key point\n- Second key point\n- Third key point',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({
        text: 'Test',
        extractKeyPoints: true,
      });

      expect(result.summary.keyPoints).toBeDefined();
      expect(result.summary.keyPoints!.length).toBe(3);
      expect(result.summary.keyPoints).toContain('First key point');
    });

    it('should include tags when requested', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text:
              'This is the summary.\n\nTAGS:\n#technology #ai #business #innovation #strategy',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({
        text: 'Test',
        includeTags: true,
      });

      expect(result.summary.tags).toBeDefined();
      expect(result.summary.tags!.length).toBeGreaterThan(0);
      expect(result.summary.tags![0]).toMatch(/^#/);
    });

    it('should handle focus area', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Focused summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await summarizer.summarize({
        text: 'Test',
        focus: 'technical details',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('technical details');
      expect(call.messages[0].content).toContain('FOCUS');
    });

    it('should handle both key points and tags', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text:
              'Summary text.\n\nKEY POINTS:\n- Point 1\n- Point 2\n\nTAGS:\n#tag1 #tag2',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({
        text: 'Test',
        extractKeyPoints: true,
        includeTags: true,
      });

      expect(result.summary.keyPoints).toBeDefined();
      expect(result.summary.tags).toBeDefined();
      expect(result.summary.keyPoints!.length).toBe(2);
      expect(result.summary.tags!.length).toBe(2);
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should parse summary without optional sections', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'This is a plain summary without any structured sections.',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({ text: 'Test' });

      expect(result.summary.text).toBe(
        'This is a plain summary without any structured sections.'
      );
      expect(result.summary.keyPoints).toBeUndefined();
      expect(result.summary.tags).toBeUndefined();
    });

    it('should parse bullet-style key points', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Summary\n\nKEY POINTS:\n• First point\n• Second point\n* Third point',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({
        text: 'Test',
        extractKeyPoints: true,
      });

      expect(result.summary.keyPoints!.length).toBe(3);
    });

    it('should normalize tag formatting', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Summary\n\nTAGS:\ntechnology, #ai, business-strategy',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await summarizer.summarize({
        text: 'Test',
        includeTags: true,
      });

      // All tags should start with #
      result.summary.tags!.forEach((tag) => {
        expect(tag).toMatch(/^#/);
      });
    });
  });

  describe('Statistics Calculation', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Short summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should calculate compression ratio', async () => {
      const summarizer = new TextSummarizer();

      const longText = 'This is a test. '.repeat(100); // ~300 words
      const result = await summarizer.summarize({ text: longText });

      expect(result.summary.statistics.compressionRatio).toBeGreaterThan(0);
      expect(result.summary.statistics.compressionRatio).toBeLessThanOrEqual(100);
    });

    it('should estimate reading time', async () => {
      const summarizer = new TextSummarizer();

      const text = 'word '.repeat(200); // ~1-2 minutes (accounts for trailing space)
      const result = await summarizer.summarize({ text });

      // Reading time calculation: words / 200 WPM, rounded up
      expect(result.summary.statistics.readingTimeOriginal).toMatch(/\d+ min/);
      expect(parseInt(result.summary.statistics.readingTimeOriginal)).toBeGreaterThanOrEqual(1);
      expect(parseInt(result.summary.statistics.readingTimeOriginal)).toBeLessThanOrEqual(2);
    });

    it('should estimate reading time for longer text', async () => {
      const summarizer = new TextSummarizer();

      const text = 'word '.repeat(600); // ~3-4 minutes
      const result = await summarizer.summarize({ text });

      expect(result.summary.statistics.readingTimeOriginal).toMatch(/\d+ min/);
      expect(parseInt(result.summary.statistics.readingTimeOriginal)).toBeGreaterThanOrEqual(3);
      expect(parseInt(result.summary.statistics.readingTimeOriginal)).toBeLessThanOrEqual(4);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should throw error when API call fails', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(summarizer.summarize({ text: 'Test' })).rejects.toThrow(
        'Summarization failed: API error'
      );
    });

    it('should throw error for non-text response', async () => {
      const summarizer = new TextSummarizer();

      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await expect(summarizer.summarize({ text: 'Test' })).rejects.toThrow(
        'Unexpected response type'
      );
    });
  });

  describe('Statistics Tracking', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should track request count', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({ text: 'Test 1' });
      await summarizer.summarize({ text: 'Test 2' });

      const stats = summarizer.getStats();
      expect(stats.requestCount).toBe(2);
    });

    it('should track total cost', async () => {
      const summarizer = new TextSummarizer();

      // Each request costs: (100/1M * $3) + (50/1M * $15) = $0.0003 + $0.00075 = $0.00105
      await summarizer.summarize({ text: 'Test 1' });
      await summarizer.summarize({ text: 'Test 2' });

      const stats = summarizer.getStats();
      expect(stats.totalCost).toBeCloseTo(0.0021, 4); // 2 * $0.00105
    });

    it('should calculate average cost', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({ text: 'Test 1' });
      await summarizer.summarize({ text: 'Test 2' });

      const stats = summarizer.getStats();
      expect(stats.averageCost).toBeCloseTo(0.00105, 5);
    });

    it('should calculate profit per request', async () => {
      const summarizer = new TextSummarizer();
      process.env.PRICE_USDC = '0.02'; // $0.02 per request

      await summarizer.summarize({ text: 'Test' });

      const stats = summarizer.getStats();
      expect(stats.priceUSDC).toBe(0.02);
      expect(stats.profitPerRequest).toBeGreaterThan(0.01); // Should be profitable
    });

    it('should use default price when PRICE_USDC not set', async () => {
      const summarizer = new TextSummarizer();
      delete process.env.PRICE_USDC;

      await summarizer.summarize({ text: 'Test' });

      const stats = summarizer.getStats();
      expect(stats.priceUSDC).toBe(0.015); // Default
    });

    it('should return zero cost before any requests', () => {
      const summarizer = new TextSummarizer();

      const stats = summarizer.getStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageCost).toBe(0);
    });
  });

  describe('Complex Combinations', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      mockMessagesCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '**OVERVIEW:** Summary\n\n**KEY POINTS:**\n- Point 1\n\nTAGS:\n#tag1',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it('should handle executive style with all options', async () => {
      const summarizer = new TextSummarizer();

      const result = await summarizer.summarize({
        text: 'Long document',
        length: 'detailed',
        style: 'executive',
        focus: 'business impact',
        extractKeyPoints: true,
        includeTags: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.style).toBe('executive');
      expect(result.metadata.length).toBe('detailed');

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('executive assistant');
      expect(call.messages[0].content).toContain('business impact');
      expect(call.max_tokens).toBe(1024);
    });

    it('should handle bullets style with brief length', async () => {
      const summarizer = new TextSummarizer();

      await summarizer.summarize({
        text: 'Document',
        length: 'brief',
        style: 'bullets',
      });

      const call = mockMessagesCreate.mock.calls[0][0];
      expect(call.messages[0].content).toContain('3-5 concise bullet points');
      expect(call.max_tokens).toBe(256);
    });
  });
});

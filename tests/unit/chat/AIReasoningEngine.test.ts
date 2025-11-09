import { AIReasoningEngine } from '../../../src/chat/AIReasoningEngine';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('AIReasoningEngine', () => {
  let engine: AIReasoningEngine;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreate = jest.fn();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
    });

    const mockAnthropic = {
      messages: {
        create: mockCreate
      }
    };

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropic as any);

    engine = new AIReasoningEngine('test-api-key');
  });

  describe('Intent Analysis', () => {
    it('should detect native task (no service needed)', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsService: false,
            reasoning: 'Simple conversation, can handle natively'
          })
        }]
      } as any);

      const result = await engine.analyzeIntent('Hello, how are you?', []);

      expect(result.needsService).toBe(false);
      expect(result.reasoning).toContain('natively');
    });

    it('should detect web search need', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsService: true,
            reasoning: 'User needs current information',
            serviceType: ['web-search'],
            taskDescription: 'latest AI news'
          })
        }]
      } as any);

      const result = await engine.analyzeIntent('What\'s the latest news on AI?', []);

      expect(result.needsService).toBe(true);
      expect(result.serviceType).toEqual(['web-search']);
      expect(result.taskDescription).toBe('latest AI news');
    });

    it('should detect x402 fetch need', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsService: true,
            reasoning: 'User provided a URL that may require payment',
            serviceType: ['x402-fetch'],
            taskDescription: 'Fetch paywalled content'
          })
        }]
      } as any);

      const result = await engine.analyzeIntent('Read this article: https://nyt.com/article', []);

      expect(result.needsService).toBe(true);
      expect(result.serviceType).toEqual(['x402-fetch']);
    });

    it('should detect marketplace service need', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsService: true,
            reasoning: 'User needs sentiment analysis',
            serviceType: ['sentiment-analysis'],
            taskDescription: 'Analyze tweet sentiment'
          })
        }]
      } as any);

      const result = await engine.analyzeIntent('Analyze sentiment: "I love this product!"', []);

      expect(result.needsService).toBe(true);
      expect(result.serviceType).toEqual(['sentiment-analysis']);
    });

    it('should handle multiple services in one request', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsService: true,
            reasoning: 'Needs web search then image analysis',
            serviceType: ['web-search', 'image-analysis']
          })
        }]
      } as any);

      const result = await engine.analyzeIntent('Search for cat images and analyze them', []);

      expect(result.serviceType).toHaveLength(2);
      expect(result.serviceType).toContain('web-search');
      expect(result.serviceType).toContain('image-analysis');
    });

    it('should include conversation history in analysis', async () => {
      const history = [
        { role: 'user' as const, content: 'What is AI?' },
        { role: 'assistant' as const, content: 'AI is artificial intelligence...' }
      ];

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('Tell me more', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            ...history,
            { role: 'user', content: 'Tell me more' }
          ]
        })
      );
    });

    it('should use correct model and parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('test', []);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.3,
        system: expect.stringContaining('SUPERPOWERS'),
        messages: expect.any(Array)
      });
    });
  });

  describe('Error Handling', () => {
    it('should fallback to native when JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: 'Invalid JSON response'
        }]
      } as any);

      const result = await engine.analyzeIntent('test', []);

      expect(result.needsService).toBe(false);
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should handle missing text content', async () => {
      mockCreate.mockResolvedValueOnce({
        content: []
      } as any);

      await expect(engine.analyzeIntent('test', [])).rejects.toThrow('No text response');
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API timeout'));

      await expect(engine.analyzeIntent('test', [])).rejects.toThrow('API timeout');
    });
  });

  describe('Native Response Generation', () => {
    it('should stream native response', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      const stream = await engine.generateNativeResponse('Hi', []);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should use higher temperature for creative responses', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'test' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      await engine.generateNativeResponse('test', []);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      );
    });

    it('should filter non-text deltas from stream', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_start' };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
          yield { type: 'content_block_stop' };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      const stream = await engine.generateNativeResponse('Hi', []);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']); // Only text deltas
    });
  });

  describe('Service Response Formatting', () => {
    it('should format single service result', async () => {
      const toolCalls = [{
        tool: 'sentiment-analysis',
        arguments: { text: 'I love this!' },
        result: { sentiment: 'positive', score: 0.95 },
        cost: '$0.01',
        status: 'completed' as const,
        startTime: Date.now(),
        endTime: Date.now()
      }];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'The sentiment is positive!' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      const stream = await engine.formatServiceResponse('Analyze this', toolCalls);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toContain('positive');
    });

    it('should format multiple service results', async () => {
      const toolCalls = [
        {
          tool: 'web-search',
          arguments: { query: 'AI news' },
          result: { results: [] },
          cost: '$0.00',
          status: 'completed' as const,
          startTime: Date.now(),
          endTime: Date.now()
        },
        {
          tool: 'sentiment-analysis',
          arguments: { text: 'test' },
          result: { sentiment: 'neutral' },
          cost: '$0.01',
          status: 'completed' as const,
          startTime: Date.now(),
          endTime: Date.now()
        }
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Results...' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      await engine.formatServiceResponse('test', toolCalls);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining('web-search')
            })
          ]
        })
      );
    });

    it('should include all service results in prompt', async () => {
      const toolCalls = [{
        tool: 'test-service',
        arguments: {},
        result: { data: 'test-data' },
        cost: '$0.01',
        status: 'completed' as const,
        startTime: Date.now(),
        endTime: Date.now()
      }];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'response' } };
        }
      };

      mockCreate.mockResolvedValueOnce(mockStream as any);

      await engine.formatServiceResponse('user question', toolCalls);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining('test-data')
            })
          ]
        })
      );
    });
  });

  describe('System Prompt', () => {
    it('should include web search capabilities in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('test', []);

      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toContain('Web Search');
      expect(call.system).toContain('Brave API');
    });

    it('should include x402 autopay capabilities in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('test', []);

      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toContain('x402 Autopay');
      expect(call.system).toContain('$0.50');
    });

    it('should include marketplace services in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('test', []);

      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toContain('Sentiment Analyzer');
      expect(call.system).toContain('Image Analyzer');
      expect(call.system).toContain('Text Summarizer');
    });

    it('should include safety & transparency requirements', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ needsService: false, reasoning: 'test' }) }]
      } as any);

      await engine.analyzeIntent('test', []);

      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toContain('health check');
      expect(call.system).toContain('transparency');
    });
  });
});

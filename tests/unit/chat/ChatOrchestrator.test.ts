import { ChatOrchestrator, ChatEvent } from '../../../src/chat/ChatOrchestrator';
import { AIReasoningEngine } from '../../../src/chat/AIReasoningEngine';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Database } from '../../../src/registry/database';
import { BraveSearchClient } from '../../../src/search/BraveSearchClient';
import { UniversalX402Client } from '../../../src/payment/UniversalX402Client';
import { SpendingLimitManager } from '../../../src/payment/SpendingLimitManager';

jest.mock('../../../src/chat/AIReasoningEngine');
jest.mock('../../../src/registry/ServiceRegistry');
jest.mock('../../../src/search/BraveSearchClient');
jest.mock('../../../src/payment/UniversalX402Client');

describe('ChatOrchestrator', () => {
  let orchestrator: ChatOrchestrator;
  let mockAIEngine: jest.Mocked<AIReasoningEngine>;
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockDatabase: jest.Mocked<Database>;
  let mockSpendingLimitManager: jest.Mocked<SpendingLimitManager>;
  let mockSearchClient: jest.Mocked<BraveSearchClient>;
  let mockX402Client: jest.Mocked<UniversalX402Client>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AIReasoningEngine
    mockAIEngine = {
      analyzeIntent: jest.fn(),
      generateNativeResponse: jest.fn(),
      formatServiceResponse: jest.fn()
    } as any;

    (AIReasoningEngine as jest.MockedClass<typeof AIReasoningEngine>).mockImplementation(
      () => mockAIEngine
    );

    // Mock ServiceRegistry
    mockRegistry = {
      searchServices: jest.fn(),
      getService: jest.fn()
    } as any;

    // Mock Database
    mockDatabase = {
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn()
    } as any;

    // Mock SpendingLimitManager
    mockSpendingLimitManager = {
      checkLimit: jest.fn()
    } as any;

    // Mock BraveSearchClient
    mockSearchClient = {
      search: jest.fn(),
      checkHealth: jest.fn()
    } as any;

    (BraveSearchClient as jest.MockedClass<typeof BraveSearchClient>).mockImplementation(
      () => mockSearchClient
    );

    // Mock UniversalX402Client
    mockX402Client = {
      fetchWithAutopay: jest.fn()
    } as any;

    (UniversalX402Client as jest.MockedClass<typeof UniversalX402Client>).mockImplementation(
      () => mockX402Client
    );

    orchestrator = new ChatOrchestrator(
      'test-api-key',
      mockRegistry,
      mockDatabase,
      mockSpendingLimitManager
    );
  });

  describe('Native Response (No Service)', () => {
    it('should handle simple conversation without services', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Hello, how are you?';

      // Mock conversation history (empty for this test)
      mockDatabase.all.mockResolvedValueOnce([]);

      // Mock intent analysis - no service needed
      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: false,
        reasoning: 'Simple greeting, can handle natively'
      });

      // Mock native response stream
      mockAIEngine.generateNativeResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Hello! ';
          yield 'I am doing well. ';
          yield 'How can I help you?';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify event flow
      expect(events[0].type).toBe('thinking');
      expect(events[1].type).toBe('intent');
      expect(events[1].data.needsService).toBe(false);

      // Verify token events
      const tokens = events.filter(e => e.type === 'token');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].data.token).toBe('Hello! ');

      expect(events[events.length - 1].type).toBe('done');

      // Verify no service calls
      expect(mockSearchClient.search).not.toHaveBeenCalled();
      expect(mockX402Client.fetchWithAutopay).not.toHaveBeenCalled();
    });

    it('should include conversation history in intent analysis', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Tell me more';

      const mockHistory = [
        {
          id: 'msg-1',
          session_id: sessionId,
          role: 'user',
          content: 'What is AI?',
          timestamp: Date.now() - 1000
        },
        {
          id: 'msg-2',
          session_id: sessionId,
          role: 'assistant',
          content: 'AI is artificial intelligence...',
          timestamp: Date.now() - 500
        }
      ];

      mockDatabase.all.mockResolvedValueOnce(mockHistory);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: false,
        reasoning: 'Continuation of previous conversation'
      });

      mockAIEngine.generateNativeResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Sure! AI involves...';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify history was passed to intent analysis
      expect(mockAIEngine.analyzeIntent).toHaveBeenCalledWith(
        userMessage,
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'What is AI?' }),
          expect.objectContaining({ role: 'assistant', content: 'AI is artificial intelligence...' })
        ])
      );
    });
  });

  describe('Web Search Routing', () => {
    it('should route to web search when intent detected', async () => {
      const sessionId = 'session-123';
      const userMessage = 'What\'s the latest news on AI?';

      mockDatabase.all.mockResolvedValueOnce([]);

      // Mock intent - needs web search
      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User needs current information',
        serviceType: ['web-search'],
        taskDescription: 'latest AI news'
      });

      // Mock search results
      mockSearchClient.search.mockResolvedValueOnce({
        query: 'latest AI news',
        results: [
          {
            title: 'AI Breakthrough',
            url: 'https://example.com/ai-news',
            description: 'New AI model announced',
            source: 'example.com'
          }
        ],
        totalResults: 1,
        healthCheckPassed: true,
        apiCallCost: '$0.005'
      });

      // Mock AI formatting response
      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Based on the search results, ';
          yield 'there was a recent AI breakthrough...';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify search was called
      expect(mockSearchClient.search).toHaveBeenCalledWith('latest AI news', { count: 5 });

      // Verify events
      const searchQuery = events.find(e => e.type === 'search_query');
      expect(searchQuery).toBeDefined();
      expect(searchQuery?.data.query).toBe('latest AI news');

      const searchResults = events.find(e => e.type === 'search_results');
      expect(searchResults).toBeDefined();
      expect(searchResults?.data.results).toHaveLength(1);
      expect(searchResults?.data.healthCheckPassed).toBe(true);
    });

    it('should handle search failures gracefully', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Search for something';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User wants search',
        serviceType: ['web-search'],
        taskDescription: 'something'
      });

      mockSearchClient.search.mockRejectedValueOnce(new Error('API timeout'));

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Search failed';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      const searchResults = events.find(e => e.type === 'search_results');
      expect(searchResults).toBeDefined();
      expect(searchResults?.data.error).toBe('API timeout');
      expect(searchResults?.data.healthCheckPassed).toBe(false);
    });
  });

  describe('x402 Payment Routing', () => {
    it('should route to x402 client for URL fetch', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Read this article: https://nyt.com/premium';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User provided a URL',
        serviceType: ['x402-fetch'],
        taskDescription: 'Fetch paywalled content'
      });

      mockX402Client.fetchWithAutopay.mockResolvedValueOnce({
        success: true,
        data: '<html>Article content</html>',
        paymentExecuted: true,
        paymentAmount: '0.25',
        paymentSignature: 'tx-sig-123',
        healthCheckPassed: true
      });

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Here\'s a summary of the article...';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify x402 client was called
      expect(mockX402Client.fetchWithAutopay).toHaveBeenCalledWith(
        'https://nyt.com/premium',
        expect.objectContaining({
          autopayThreshold: '0.50'
        })
      );

      // Verify payment request event
      const paymentRequest = events.find(e => e.type === 'payment_request');
      expect(paymentRequest).toBeDefined();
      expect(paymentRequest?.data.url).toBe('https://nyt.com/premium');

      // Verify payment complete event
      const paymentComplete = events.find(e => e.type === 'payment_complete');
      expect(paymentComplete).toBeDefined();
      expect(paymentComplete?.data.success).toBe(true);
      expect(paymentComplete?.data.paymentExecuted).toBe(true);
      expect(paymentComplete?.data.amount).toBe('0.25');
    });

    it('should handle payment approval needed', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Get https://premium.com/expensive';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User provided URL',
        serviceType: ['x402-fetch']
      });

      mockX402Client.fetchWithAutopay.mockResolvedValueOnce({
        success: false,
        needsUserApproval: true,
        paymentAmount: '2.00',
        paymentRecipient: 'RecipientAddr',
        paymentExecuted: false,
        healthCheckPassed: true
      });

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Payment approval needed for $2.00';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      const approvalNeeded = events.find(e => e.type === 'payment_approval_needed');
      expect(approvalNeeded).toBeDefined();
      expect(approvalNeeded?.data.amount).toBe('2.00');
      expect(approvalNeeded?.data.threshold).toBe('0.50');
    });

    it('should handle payment failure gracefully', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Fetch https://example.com';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User provided URL',
        serviceType: ['x402-fetch']
      });

      mockX402Client.fetchWithAutopay.mockRejectedValueOnce(new Error('Payment failed'));

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Failed';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      const paymentComplete = events.find(e => e.type === 'payment_complete');
      expect(paymentComplete?.data.success).toBe(false);
      expect(paymentComplete?.data.error).toBe('Payment failed');
    });
  });

  describe('Marketplace Service Discovery & Execution', () => {
    it('should discover and execute marketplace service', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Analyze sentiment: "I love this!"';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User needs sentiment analysis',
        serviceType: ['sentiment-analysis'],
        taskDescription: 'Analyze tweet sentiment'
      });

      // Mock service discovery
      const mockService = {
        id: 'service-123',
        name: 'Sentiment Analyzer',
        description: 'Analyze text sentiment',
        provider: '0xProvider123',
        capabilities: ['sentiment-analysis'],
        endpoint: '/api/ai/sentiment/analyze',
        pricing: {
          perRequest: '$0.01',
          amount: '$0.01',
          currency: 'USDC'
        },
        reputation: {
          totalJobs: 100,
          successRate: 95,
          avgResponseTime: '2.5s',
          rating: 4.5,
          reviews: 20
        },
        metadata: {
          apiVersion: 'v1'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockRegistry.searchServices.mockResolvedValueOnce([mockService]);
      mockRegistry.getService.mockResolvedValueOnce(mockService);

      // Mock axios for service execution
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: { sentiment: 'positive', score: 0.95 }
      });

      // Mock session for balance update
      mockDatabase.get.mockResolvedValueOnce({
        id: sessionId,
        current_balance: '10.00',
        initial_balance: '10.00'
      });

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'The sentiment is positive!';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify service discovery
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({
        capabilities: ['sentiment-analysis']
      });

      // Verify service call events
      const serviceCalls = events.filter(e => e.type === 'service_call');
      expect(serviceCalls.length).toBeGreaterThan(0);

      const completedCall = serviceCalls.find(s => s.data.status === 'completed');
      expect(completedCall).toBeDefined();

      // Verify balance update event
      const balanceUpdate = events.find(e => e.type === 'balance_update');
      expect(balanceUpdate).toBeDefined();
    });

    it('should handle service not found', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Do something';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'User wants unknown service',
        serviceType: ['unknown-service']
      });

      mockRegistry.searchServices.mockResolvedValueOnce([]);

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Service not available';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      const failedCall = events.find(
        e => e.type === 'service_call' && e.data.status === 'failed'
      );
      expect(failedCall).toBeDefined();
      expect(failedCall?.data.error).toContain('No matching service found');
    });
  });

  describe('Multiple Service Orchestration', () => {
    it('should handle multiple services in one request', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Search for cat images and analyze sentiment';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: true,
        reasoning: 'Needs both search and analysis',
        serviceType: ['web-search', 'sentiment-analysis']
      });

      // Mock search
      mockSearchClient.search.mockResolvedValueOnce({
        query: 'cat images',
        results: [],
        totalResults: 0,
        healthCheckPassed: true,
        apiCallCost: '$0.005'
      });

      // Mock service
      const mockService = {
        id: 'service-123',
        name: 'Sentiment Analyzer',
        description: 'Analyze text sentiment',
        provider: '0xProvider123',
        capabilities: ['sentiment-analysis'],
        endpoint: '/api/ai/sentiment/analyze',
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC'
        },
        reputation: {
          totalJobs: 100,
          successRate: 95,
          avgResponseTime: '2.5s',
          rating: 4.5,
          reviews: 20
        },
        metadata: {
          apiVersion: 'v1'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockRegistry.searchServices.mockResolvedValueOnce([mockService]);
      mockRegistry.getService.mockResolvedValueOnce(mockService);

      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: { sentiment: 'neutral' }
      });

      mockDatabase.get.mockResolvedValueOnce({
        id: sessionId,
        current_balance: '10.00'
      });

      mockAIEngine.formatServiceResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Results from both services...';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify both services were called
      expect(mockSearchClient.search).toHaveBeenCalled();
      expect(mockRegistry.searchServices).toHaveBeenCalled();

      // Verify both result types appear
      expect(events.find(e => e.type === 'search_results')).toBeDefined();
      expect(events.find(e => e.type === 'service_call')).toBeDefined();
    });
  });

  describe('Message Persistence', () => {
    it('should save user and assistant messages', async () => {
      const sessionId = 'session-123';
      const userMessage = 'Hello';

      mockDatabase.all.mockResolvedValueOnce([]);

      mockAIEngine.analyzeIntent.mockResolvedValueOnce({
        needsService: false,
        reasoning: 'Simple greeting'
      });

      mockAIEngine.generateNativeResponse.mockResolvedValueOnce(
        (async function* () {
          yield 'Hi there!';
        })()
      );

      const events: ChatEvent[] = [];
      for await (const event of orchestrator.processMessage(sessionId, userMessage)) {
        events.push(event);
      }

      // Verify user message was saved
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        expect.arrayContaining([
          expect.any(String), // id
          sessionId,
          'user',
          userMessage,
          null, // no tool calls
          expect.any(Number) // timestamp
        ])
      );

      // Verify assistant message was saved
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        expect.arrayContaining([
          expect.any(String),
          sessionId,
          'assistant',
          'Hi there!',
          expect.anything(),
          expect.any(Number)
        ])
      );
    });
  });
});

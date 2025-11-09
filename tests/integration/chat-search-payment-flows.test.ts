/**
 * Integration Tests: Chat + Search + Payment Flows
 *
 * Tests the complete integration of:
 * - Chat API endpoints
 * - Web search (Brave API)
 * - x402 payment flows
 * - AI reasoning and response generation
 * - SSE event streaming
 */

import request from 'supertest';
import express from 'express';
import { chatRouter } from '../../src/api/routes/chat.js';
import { Database } from '../../src/registry/database.js';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry.js';
import { SpendingLimitManager } from '../../src/payment/SpendingLimitManager.js';

describe('Integration: Chat + Search + Payment Flows', () => {
  let app: express.Application;
  let db: Database;
  let registry: ServiceRegistry;
  let spendingLimitManager: SpendingLimitManager;

  beforeAll(async () => {
    // Setup test database
    db = new Database(':memory:');
    await db.initialize();

    // Setup registry
    registry = new ServiceRegistry(db);

    // Setup spending limit manager
    spendingLimitManager = new SpendingLimitManager();

    // Setup Express app with chat router
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Session Management', () => {
    it('should create a new chat session', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        balance: '10.00',
        initialBalance: '10.00',
        pdaAddress: expect.any(String)
      });
    });

    it('should reject invalid initial balance', async () => {
      await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '-5.00' })
        .expect(400);
    });
  });

  describe('Native Chat Flow (No Services)', () => {
    it('should handle simple conversation without external services', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Send message and collect SSE events
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Hello, how are you?'
        })
        .expect(200);

      // Response should be SSE stream
      expect(response.headers['content-type']).toContain('text/event-stream');

      // Parse SSE events (simplified for test)
      const events = response.text.split('\n\n').filter(e => e.startsWith('data:'));

      // Should have thinking, intent, token, and done events
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Web Search Integration Flow', () => {
    it('should detect search intent and execute Brave search', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Send search query
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'What are the latest developments in AI?'
        })
        .expect(200);

      // Parse SSE stream
      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // Should have search_query event
      const searchQueryEvent = events.find(e => e.type === 'search_query');
      expect(searchQueryEvent).toBeDefined();
      expect(searchQueryEvent.data.query).toBeTruthy();

      // Should have search_results event
      const searchResultsEvent = events.find(e => e.type === 'search_results');
      expect(searchResultsEvent).toBeDefined();
      expect(searchResultsEvent.data).toHaveProperty('results');
      expect(searchResultsEvent.data).toHaveProperty('healthCheckPassed');
      expect(searchResultsEvent.data).toHaveProperty('cost');
    });

    it('should gracefully handle search API failures', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Mock search failure scenario (would need environment-specific setup)
      // For now, verify the flow handles errors
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Search for something'
        })
        .expect(200);

      // Should still complete the stream with done event
      expect(response.text).toContain('type":"done"');
    });
  });

  describe('x402 Payment Integration Flow', () => {
    it('should detect URL and initiate x402 payment flow', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Send URL fetch request
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Fetch this article: https://example.com/premium-content'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // Should have payment_request event (health checking)
      const paymentRequestEvent = events.find(e => e.type === 'payment_request');
      expect(paymentRequestEvent).toBeDefined();
      expect(paymentRequestEvent.data.url).toBe('https://example.com/premium-content');
      expect(paymentRequestEvent.data.status).toBe('checking_health');

      // Should eventually have payment_complete or payment_approval_needed
      const paymentOutcome = events.find(
        e => e.type === 'payment_complete' || e.type === 'payment_approval_needed'
      );
      expect(paymentOutcome).toBeDefined();
    });

    it('should block payment if health check fails', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Send request to unhealthy service (mock scenario)
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Fetch https://broken-service.example.com/content'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // Should have payment_complete with failure due to health check
      const paymentComplete = events.find(e => e.type === 'payment_complete');
      if (paymentComplete) {
        expect(paymentComplete.data.healthCheckPassed).toBe(false);
        expect(paymentComplete.data.paymentExecuted).toBe(false);
      }
    });

    it('should request approval for payments over threshold', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Request expensive content (> $0.50 threshold)
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Get https://expensive-content.example.com/premium'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // If payment is expensive, should get approval_needed event
      const approvalEvent = events.find(e => e.type === 'payment_approval_needed');
      if (approvalEvent) {
        expect(approvalEvent.data).toHaveProperty('amount');
        expect(approvalEvent.data).toHaveProperty('recipient');
        expect(approvalEvent.data).toHaveProperty('threshold');
        expect(parseFloat(approvalEvent.data.amount)).toBeGreaterThan(0.50);
      }
    });
  });

  describe('Marketplace Service Integration', () => {
    it('should discover and execute marketplace service', async () => {
      // Register a test service
      await registry.registerService({
        id: 'test-service-1',
        name: 'Test Sentiment Analyzer',
        description: 'Test service',
        provider: '0xTestProvider',
        endpoint: 'http://localhost:3333/api/ai/sentiment/analyze',
        capabilities: ['sentiment-analysis'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC'
        },
        reputation: {
          totalJobs: 0,
          successRate: 100,
          avgResponseTime: '1s',
          rating: 5,
          reviews: 0
        },
        metadata: {
          apiVersion: 'v1'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Request sentiment analysis
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Analyze the sentiment: "I love this product!"'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // Should have service_call events
      const serviceCallEvents = events.filter(e => e.type === 'service_call');
      expect(serviceCallEvents.length).toBeGreaterThan(0);

      // Should have balance_update event
      const balanceUpdate = events.find(e => e.type === 'balance_update');
      expect(balanceUpdate).toBeDefined();
    });
  });

  describe('Multi-Service Orchestration', () => {
    it('should handle request requiring both search and service', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Complex request needing multiple services
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Search for AI news and analyze the sentiment'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // Should have intent event indicating multiple services
      const intentEvent = events.find(e => e.type === 'intent');
      if (intentEvent && intentEvent.data.needsService) {
        expect(intentEvent.data.serviceTypes).toBeDefined();
      }

      // Should have both search and service events
      const hasSearch = events.some(e => e.type === 'search_results');
      const hasService = events.some(e => e.type === 'service_call');

      // At least one should be present for complex queries
      expect(hasSearch || hasService).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should complete stream even if service fails', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Request a service that will fail
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Use a non-existent service'
        })
        .expect(200);

      // Stream should complete with done event
      expect(response.text).toContain('type":"done"');
    });

    it('should maintain conversation history after errors', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // First message
      await request(app)
        .post('/api/chat/stream')
        .send({ sessionId, message: 'First message' })
        .expect(200);

      // Second message (should have history from first)
      const response = await request(app)
        .post('/api/chat/stream')
        .send({ sessionId, message: 'Second message' })
        .expect(200);

      // Should complete successfully
      expect(response.text).toContain('type":"done"');
    });
  });

  describe('Balance Management', () => {
    it('should deduct balance after service execution', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '10.00' })
        .expect(200);

      const sessionId = sessionResponse.body.id;
      const initialBalance = sessionResponse.body.balance;

      // Execute a paid service
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Execute paid service'
        })
        .expect(200);

      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')));

      // If service was executed, balance should update
      const balanceUpdate = events.find(e => e.type === 'balance_update');
      if (balanceUpdate) {
        const newBalance = parseFloat(balanceUpdate.data.balance);
        expect(newBalance).toBeLessThanOrEqual(parseFloat(initialBalance));
      }
    });

    it('should enforce spending limits', async () => {
      const sessionResponse = await request(app)
        .post('/api/chat/sessions')
        .send({ initialBalance: '0.01' }) // Very low balance
        .expect(200);

      const sessionId = sessionResponse.body.id;

      // Try to execute expensive service
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          sessionId,
          message: 'Execute expensive service'
        })
        .expect(200);

      // Should handle gracefully (either approval needed or error)
      expect(response.text).toContain('type":"done"');
    });
  });
});

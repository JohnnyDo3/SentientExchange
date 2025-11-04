import request from 'supertest';
import app from '../src/server';

describe('Sentiment Analyzer API', () => {
  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('sentiment-analyzer');
    });
  });

  describe('GET /info', () => {
    test('should return service information', async () => {
      const response = await request(app).get('/info');

      expect(response.status).toBe(200);
      expect(response.body.name).toBeDefined();
      expect(response.body.description).toBeDefined();
      expect(response.body.pricing).toBeDefined();
      expect(response.body.capabilities).toBeInstanceOf(Array);
      expect(response.body.paymentProtocol).toBe('x402');
    });
  });

  describe('GET /metrics', () => {
    test('should return Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });

  describe('POST /analyze', () => {
    test('should return 402 without payment header', async () => {
      const response = await request(app)
        .post('/analyze')
        .send({ text: 'I am happy!' });

      expect(response.status).toBe(402);
      expect(response.body.x402Version).toBe(1);
      expect(response.body.accepts).toBeInstanceOf(Array);
      expect(response.body.accepts[0].payTo).toBeDefined();
    });

    test('should reject invalid payment proof', async () => {
      const response = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify({ invalid: 'data' }))
        .send({ text: 'I am happy!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should reject empty text', async () => {
      // Mock valid payment for this test
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '1'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000', // 0.01 USDC in 6 decimals
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const response = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    test('should reject text exceeding max length', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '2'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const longText = 'a'.repeat(100001); // Exceeds 100KB limit

      const response = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ text: longText });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    test('should analyze text with valid payment', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '3'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const response = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ text: 'I am absolutely thrilled and ecstatic!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.overall).toBeDefined();
      expect(response.body.result.overall.polarity).toBeDefined();
      expect(response.body.result.overall.category).toBeDefined();
      expect(response.body.result.emotions).toBeInstanceOf(Array);
      expect(response.body.result.keywords).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    test('should prevent replay attacks', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '4'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      // First request should succeed
      const response1 = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ text: 'Test text' });

      expect(response1.status).toBe(200);

      // Second request with same txHash should fail
      const response2 = await request(app)
        .post('/analyze')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ text: 'Test text' });

      expect(response2.status).toBe(400);
      expect(response2.body.error).toBe('Transaction already used');
    });
  });

  describe('POST /analyze/batch', () => {
    test('should return 402 without payment header', async () => {
      const response = await request(app)
        .post('/analyze/batch')
        .send({ texts: ['I am happy!', 'I am sad.'] });

      expect(response.status).toBe(402);
    });

    test('should reject non-array texts', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '5'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const response = await request(app)
        .post('/analyze/batch')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ texts: 'not an array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    test('should reject batch exceeding 100 texts', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '6'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const texts = Array(101).fill('Test text');

      const response = await request(app)
        .post('/analyze/batch')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ texts });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Batch too large');
    });

    test('should analyze batch with valid payment', async () => {
      const mockPayment = {
        network: 'base-sepolia',
        txHash: '0x' + '7'.repeat(64),
        from: '0x' + '1'.repeat(40),
        to: process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
        amount: '10000',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const texts = [
        'I am very happy!',
        'I am sad.',
        'The weather is nice.',
      ];

      const response = await request(app)
        .post('/analyze/batch')
        .set('X-Payment', JSON.stringify(mockPayment))
        .send({ texts });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results.length).toBe(3);
      expect(response.body.metadata.successCount).toBe(3);
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});

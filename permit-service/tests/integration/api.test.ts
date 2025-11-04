/**
 * API Integration Tests
 * Tests for the Express API endpoints
 */

import request from 'supertest';
import app from '../../src/server';

describe('API Endpoints', () => {
  describe('Public Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('ai-permit-tampa');
    });

    it('GET /info should return service information', async () => {
      const res = await request(app).get('/info');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('ai-permit-tampa');
      expect(res.body.pricing).toBeDefined();
      expect(res.body.pricing).toHaveLength(3);
      expect(res.body.capabilities).toBeDefined();
    });

    it('GET /metrics should return Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('process_cpu_user_seconds_total');
    });
  });

  describe('Protected Endpoints', () => {
    describe('POST /api/v1/permit-info', () => {
      it('should return 402 without payment', async () => {
        const res = await request(app)
          .post('/api/v1/permit-info')
          .send({
            equipmentType: 'furnace',
            jobType: 'replacement',
            location: {
              address: '123 Main St',
              city: 'Tampa',
              county: 'hillsborough',
              zipCode: '33602',
            },
          });

        expect(res.status).toBe(402);
        expect(res.body.x402Version).toBe(1);
        expect(res.body.accepts).toBeDefined();
        expect(res.body.accepts[0].maxAmountRequired).toBe('5000000'); // $5 in USDC decimals
      });

      it('should return 400 for invalid input', async () => {
        const mockPayment = {
          network: 'base-sepolia',
          txHash: '0xabc123',
          from: '0x123',
          to: process.env.WALLET_ADDRESS,
          amount: '5000000',
          asset: process.env.USDC_CONTRACT,
        };

        const res = await request(app)
          .post('/api/v1/permit-info')
          .set('X-Payment', JSON.stringify(mockPayment))
          .send({
            equipmentType: 'invalid-type',
            jobType: 'replacement',
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid');
      });
    });

    describe('POST /api/v1/generate-form', () => {
      it('should return 402 without payment', async () => {
        const res = await request(app)
          .post('/api/v1/generate-form')
          .send({});

        expect(res.status).toBe(402);
        expect(res.body.x402Version).toBe(1);
        expect(res.body.accepts[0].maxAmountRequired).toBe('30000000'); // $30 in USDC decimals
      });
    });

    describe('POST /api/v1/submit-permit', () => {
      it('should return 402 without payment', async () => {
        const res = await request(app)
          .post('/api/v1/submit-permit')
          .send({});

        expect(res.status).toBe(402);
        expect(res.body.accepts[0].maxAmountRequired).toBe('150000000'); // $150 in USDC decimals
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
      expect(res.body.availableEndpoints).toBeDefined();
    });
  });
});

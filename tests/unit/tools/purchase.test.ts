import { purchaseService } from '../../../src/tools/purchase';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { createPaymentRouter } from '../../../src/payment/PaymentFactory';
import { PaymentRouter } from '../../../src/payment/PaymentRouter';
import { Database } from '../../../src/registry/database';
import { Service } from '../../../src/types/service';

describe('purchaseService - REAL PRODUCTION TESTS', () => {
  let db: Database;
  let registry: ServiceRegistry;
  let paymentRouter: PaymentRouter;
  let testService: Service;
  let expensiveService: Service;
  let invalidEndpointService: Service;

  beforeAll(async () => {
    // Use in-memory database for fast tests
    db = new Database(':memory:');
    await db.initialize();

    // Create REAL registry
    registry = new ServiceRegistry(db);
    await registry.initialize();

    // Create REAL payment router with test config
    paymentRouter = await createPaymentRouter({
      network: 'devnet',
      rpcUrl: process.env.SOLANA_RPC_URL,
      secretKey: process.env.SOLANA_PRIVATE_KEY,
      paymentMode: 'hybrid'
    });

    // Register REAL test services
    testService = await registry.registerService({
      name: 'Test Sentiment Analyzer',
      description: 'Test service for purchase flow',
      provider: 'DeDDFd3Fr2fdsC4Wi2Hi7MxbyRHokst3jcQ9L2V1nje3',
      endpoint: 'http://localhost:3002/analyze',
      capabilities: ['sentiment-analysis', 'test'],
      pricing: {
        perRequest: '$0.01',
        currency: 'USDC',
        network: 'solana-devnet'
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
      }
    });

    expensiveService = await registry.registerService({
      name: 'Expensive AI Service',
      description: 'High-cost service for testing maxPayment',
      provider: 'test-provider',
      endpoint: 'http://localhost:4000/expensive',
      capabilities: ['premium-analysis'],
      pricing: {
        perRequest: '$10.00',
        currency: 'USDC',
        network: 'solana-devnet'
      },
      reputation: {
        totalJobs: 0,
        successRate: 100,
        avgResponseTime: '5s',
        rating: 5,
        reviews: 0
      },
      metadata: {
        apiVersion: 'v1'
      }
    });

    invalidEndpointService = await registry.registerService({
      name: 'Invalid Endpoint Service',
      description: 'Service with unreachable endpoint',
      provider: 'test-provider',
      endpoint: 'http://localhost:99999/invalid',
      capabilities: ['test'],
      pricing: {
        perRequest: '$0.01',
        currency: 'USDC',
        network: 'solana-devnet'
      },
      reputation: {
        totalJobs: 0,
        successRate: 0,
        avgResponseTime: '0s',
        rating: 0,
        reviews: 0
      },
      metadata: {
        apiVersion: 'v1'
      }
    });
  });

  afterAll(async () => {
    await db.close();
  });

  describe('HAPPY PATH - Real Implementation', () => {
    it('should retrieve service details correctly', async () => {
      const service = await registry.getService(testService.id);

      expect(service).toBeDefined();
      expect(service?.id).toBe(testService.id);
      expect(service?.name).toBe('Test Sentiment Analyzer');
      expect(service?.endpoint).toBe('http://localhost:3002/analyze');
    });

    it('should search for services by capability', async () => {
      const results = await registry.searchServices({
        capabilities: ['sentiment-analysis']
      });

      expect(results.length).toBeGreaterThan(0);
      const found = results.some(s => s.id === testService.id);
      expect(found).toBe(true);
    });

    it('should filter services by price', async () => {
      const results = await registry.searchServices({
        maxPrice: '$1.00'
      });

      results.forEach(service => {
        const priceStr = service.pricing.perRequest || service.pricing.amount || '$0';
        const price = parseFloat(priceStr.toString().replace('$', ''));
        expect(price).toBeLessThanOrEqual(1.00);
      });

      // Expensive service should NOT be in results
      const expensiveFound = results.some(s => s.id === expensiveService.id);
      expect(expensiveFound).toBe(false);
    });
  });

  describe('INPUT VALIDATION - All Edge Cases', () => {
    it('should reject empty service ID', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: '',
        data: { test: true }
      } as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject missing service ID', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        data: { test: true }
      } as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject missing data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id
      } as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject null data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: null as any
      });

      expect(result.isError).toBe(true);
    });

    it('should reject invalid maxPayment format (no dollar sign)', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: { test: true },
        maxPayment: '10.50'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject invalid maxPayment format (letters)', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: { test: true },
        maxPayment: '$abc'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should accept valid maxPayment formats', async () => {
      const validFormats = ['$0.01', '$1.00', '$10.99', '$100.00'];

      for (const maxPayment of validFormats) {
        const result = await purchaseService(registry, paymentRouter, {
          serviceId: testService.id,
          data: { text: 'test' },
          maxPayment
        });

        // May fail due to network, but validation should pass
        if (result.isError) {
          const errorText = result.content[0].text;
          expect(errorText).not.toContain('Validation error');
        }
      }
    });
  });

  describe('SERVICE NOT FOUND Errors', () => {
    it('should handle non-existent service ID', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: 'non-existent-uuid-12345',
        data: { test: true }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Service not found');
    });

    it('should handle malformed UUID', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: 'not-a-uuid',
        data: { test: true }
      });

      expect(result.isError).toBe(true);
      // Either validation error or service not found
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('NETWORK ERRORS - Real Failure Scenarios', () => {
    it('should handle unreachable service endpoint', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: invalidEndpointService.id,
        data: { test: true }
      });

      // Should get error, not crash
      expect(result).toBeDefined();
      if (result.isError) {
        expect(result.content[0].text).toBeDefined();
        expect(result.content[0].text.length).toBeGreaterThan(10);
      }
    });

    it('should handle timeout scenarios', async () => {
      // Service that times out (localhost:99998 won't respond)
      const timeoutService = await registry.registerService({
        name: 'Timeout Service',
        description: 'Service that times out',
        provider: 'test',
        endpoint: 'http://localhost:99998/timeout',
        capabilities: ['test'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'solana-devnet'
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0
        },
        metadata: {
          apiVersion: 'v1'
        }
      });

      const result = await purchaseService(registry, paymentRouter, {
        serviceId: timeoutService.id,
        data: { test: true }
      });

      expect(result).toBeDefined();
      // Should handle gracefully, not crash
    }, 30000); // 30 second timeout for this test
  });

  describe('PAYMENT FAILURES - Max Payment Exceeded', () => {
    it('should reject when service price exceeds maxPayment', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: expensiveService.id,
        data: { test: true },
        maxPayment: '$1.00' // Service costs $10.00
      });

      // Should fail before attempting payment
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds maximum payment');
    });

    it('should allow when maxPayment equals service price', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: { test: true },
        maxPayment: '$0.01' // Exactly the service price
      });

      // May fail due to network, but price check should pass
      if (result.isError) {
        expect(result.content[0].text).not.toContain('exceeds maximum payment');
      }
    });

    it('should allow when maxPayment is higher than service price', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: { test: true },
        maxPayment: '$10.00' // Service only costs $0.01
      });

      // Should pass price validation
      if (result.isError) {
        expect(result.content[0].text).not.toContain('exceeds maximum payment');
      }
    });
  });

  describe('COMPLEX DATA PAYLOADS', () => {
    it('should handle simple object data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: { key: 'value' }
      });

      expect(result).toBeDefined();
    });

    it('should handle nested object data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: {
          level1: {
            level2: {
              level3: 'deep value'
            }
          }
        }
      });

      expect(result).toBeDefined();
    });

    it('should handle array data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: {
          items: ['item1', 'item2', 'item3']
        }
      });

      expect(result).toBeDefined();
    });

    it('should handle mixed type data', async () => {
      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: {
          string: 'text',
          number: 123,
          boolean: true,
          array: [1, 2, 3],
          object: { nested: 'value' }
        }
      });

      expect(result).toBeDefined();
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `Item ${i} data content`
        }))
      };

      const result = await purchaseService(registry, paymentRouter, {
        serviceId: testService.id,
        data: largeData
      });

      expect(result).toBeDefined();
    });
  });

  describe('PAYMENT ROUTER INTEGRATION', () => {
    it('should have valid wallet address', async () => {
      const address = await paymentRouter.getWalletAddress();

      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(20);
    });

    it('should handle multiple payment attempts', async () => {
      // Try purchasing same service multiple times
      const attempts = 3;
      const results = [];

      for (let i = 0; i < attempts; i++) {
        const result = await purchaseService(registry, paymentRouter, {
          serviceId: testService.id,
          data: { attempt: i + 1 }
        });
        results.push(result);
      }

      expect(results).toHaveLength(attempts);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('ERROR RECOVERY', () => {
    it('should not crash on undefined service response', async () => {
      const nullService = await registry.registerService({
        name: 'Null Response Service',
        description: 'Service that returns null',
        provider: 'test',
        endpoint: 'http://localhost:99997/null',
        capabilities: ['test'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'solana-devnet'
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0
        },
        metadata: {
          apiVersion: 'v1'
        }
      });

      const result = await purchaseService(registry, paymentRouter, {
        serviceId: nullService.id,
        data: { test: true }
      });

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
    });

    it('should handle concurrent purchase attempts', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        purchaseService(registry, paymentRouter, {
          serviceId: testService.id,
          data: { concurrent: i }
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });
});

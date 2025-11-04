import { Database } from '../../src/registry/database';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { Service } from '../../src/types';

describe('Database', () => {
  let db: Database;

  beforeAll(async () => {
    // Use in-memory database for fast tests
    db = new Database(':memory:');
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  test('should create tables successfully', async () => {
    // Verify services table exists
    const servicesTable = await db.get<any>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='services'"
    );
    expect(servicesTable).toBeDefined();
    expect(servicesTable?.name).toBe('services');

    // Verify transactions table exists
    const transactionsTable = await db.get<any>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    );
    expect(transactionsTable).toBeDefined();

    // Verify ratings table exists
    const ratingsTable = await db.get<any>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ratings'"
    );
    expect(ratingsTable).toBeDefined();
  });

  test('should create indexes successfully', async () => {
    const indexes = await db.all<any>(
      "SELECT name FROM sqlite_master WHERE type='index'"
    );

    const indexNames = indexes.map((idx) => idx.name);
    expect(indexNames).toContain('idx_services_capabilities');
    expect(indexNames).toContain('idx_transactions_service');
    expect(indexNames).toContain('idx_ratings_service');
  });

  test('should insert and retrieve data', async () => {
    await db.run(
      `INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'test-id',
        'test-service',
        'Test description',
        '0xProvider',
        'http://localhost:3000',
        JSON.stringify(['test']),
        JSON.stringify({ perRequest: '$0.01', currency: 'USDC', network: 'base-sepolia' }),
        JSON.stringify({ totalJobs: 0, successRate: 0, avgResponseTime: '0s', rating: 0, reviews: 0 }),
        JSON.stringify({ apiVersion: 'v1' }),
        null, // created_by
        null, // updated_by
        null, // deleted_at
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    const service = await db.get<any>('SELECT * FROM services WHERE id = ?', ['test-id']);
    expect(service).toBeDefined();
    expect(service?.name).toBe('test-service');
  });
});

describe('ServiceRegistry', () => {
  let db: Database;
  let registry: ServiceRegistry;

  beforeAll(async () => {
    db = new Database(':memory:');
    await db.initialize();
    registry = new ServiceRegistry(db);
    await registry.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('registerService', () => {
    test('should register a new service with auto-generated ID and timestamps', async () => {
      const service = await registry.registerService({
        name: 'test-service',
        description: 'Test service for unit tests',
        provider: '0xTestProvider',
        endpoint: 'http://localhost:3000/test',
        capabilities: ['testing'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      expect(service.id).toBeDefined();
      expect(service.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4
      expect(service.name).toBe('test-service');
      expect(service.createdAt).toBeDefined();
      expect(service.updatedAt).toBeDefined();
    });

    test('should persist service to database', async () => {
      const service = await registry.registerService({
        name: 'persistent-service',
        description: 'Service to test persistence',
        provider: '0xPersistentProvider',
        endpoint: 'http://localhost:3001/persistent',
        capabilities: ['persistence'],
        pricing: {
          perRequest: '$0.02',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 10,
          successRate: 100,
          avgResponseTime: '1s',
          rating: 5,
          reviews: 2,
        },
        metadata: {
          apiVersion: 'v1',
          rateLimit: '100/min',
        },
      });

      // Retrieve directly from database
      const dbService = await db.get<any>('SELECT * FROM services WHERE id = ?', [service.id]);
      expect(dbService).toBeDefined();
      expect(dbService?.name).toBe('persistent-service');
      expect(JSON.parse(dbService?.capabilities)).toEqual(['persistence']);
    });
  });

  describe('getService', () => {
    test('should retrieve service from cache', async () => {
      const registered = await registry.registerService({
        name: 'cache-test',
        description: 'Test cache retrieval',
        provider: '0xCacheProvider',
        endpoint: 'http://localhost:3002/cache',
        capabilities: ['caching'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      const retrieved = await registry.getService(registered.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.name).toBe('cache-test');
    });

    test('should return undefined for non-existent service', async () => {
      const service = await registry.getService('non-existent-id');
      expect(service).toBeUndefined();
    });
  });

  describe('searchServices', () => {
    let imageService: Service;
    let textService: Service;
    let expensiveService: Service;

    beforeAll(async () => {
      imageService = await registry.registerService({
        name: 'image-analyzer',
        description: 'Image analysis service',
        provider: '0xImageProvider',
        endpoint: 'http://localhost:4001/analyze',
        capabilities: ['image-analysis', 'ocr'],
        pricing: {
          perRequest: '$0.05',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 100,
          successRate: 98,
          avgResponseTime: '2s',
          rating: 4.5,
          reviews: 20,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      textService = await registry.registerService({
        name: 'text-analyzer',
        description: 'Text analysis service',
        provider: '0xTextProvider',
        endpoint: 'http://localhost:4002/analyze',
        capabilities: ['text-analysis', 'sentiment'],
        pricing: {
          perRequest: '$0.02',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 200,
          successRate: 99,
          avgResponseTime: '1s',
          rating: 4.8,
          reviews: 50,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      expensiveService = await registry.registerService({
        name: 'premium-service',
        description: 'Premium high-cost service',
        provider: '0xPremiumProvider',
        endpoint: 'http://localhost:4003/premium',
        capabilities: ['premium', 'advanced'],
        pricing: {
          perRequest: '$0.50',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 50,
          successRate: 100,
          avgResponseTime: '5s',
          rating: 5.0,
          reviews: 10,
        },
        metadata: {
          apiVersion: 'v2',
        },
      });
    });

    test('should search by capabilities', async () => {
      const results = await registry.searchServices({
        capabilities: ['image-analysis'],
      });

      expect(results.length).toBeGreaterThan(0);
      const imageResults = results.filter((s) => s.capabilities.includes('image-analysis'));
      expect(imageResults.length).toBeGreaterThan(0);
      expect(imageResults[0].capabilities).toContain('image-analysis');
    });

    test('should search by multiple capabilities (OR logic)', async () => {
      const results = await registry.searchServices({
        capabilities: ['image-analysis', 'text-analysis'],
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((s) => s.name);
      expect(names).toContain('image-analyzer');
      expect(names).toContain('text-analyzer');
    });

    test('should filter by max price', async () => {
      const results = await registry.searchServices({
        maxPrice: '$0.10',
      });

      // All results should be <= $0.10
      results.forEach((service) => {
        const price = parseFloat((service.pricing.perRequest || service.pricing.amount || '$0').replace('$', ''));
        expect(price).toBeLessThanOrEqual(0.10);
      });

      // Premium service should not be included
      const premiumIncluded = results.some((s) => s.name === 'premium-service');
      expect(premiumIncluded).toBe(false);
    });

    test('should filter by minimum rating', async () => {
      const results = await registry.searchServices({
        minRating: 4.7,
      });

      results.forEach((service) => {
        expect(service.reputation.rating).toBeGreaterThanOrEqual(4.7);
      });
    });

    test('should sort by price (ascending)', async () => {
      const results = await registry.searchServices({
        sortBy: 'price',
      });

      for (let i = 0; i < results.length - 1; i++) {
        const priceA = parseFloat((results[i].pricing.perRequest || results[i].pricing.amount || '$0').replace('$', ''));
        const priceB = parseFloat((results[i + 1].pricing.perRequest || results[i + 1].pricing.amount || '$0').replace('$', ''));
        expect(priceA).toBeLessThanOrEqual(priceB);
      }
    });

    test('should sort by rating (descending)', async () => {
      const results = await registry.searchServices({
        sortBy: 'rating',
      });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].reputation.rating).toBeGreaterThanOrEqual(results[i + 1].reputation.rating);
      }
    });

    test('should sort by popularity (total jobs descending)', async () => {
      const results = await registry.searchServices({
        sortBy: 'popularity',
      });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].reputation.totalJobs).toBeGreaterThanOrEqual(results[i + 1].reputation.totalJobs);
      }
    });

    test('should combine filters and sorting', async () => {
      const results = await registry.searchServices({
        maxPrice: '$0.10',
        minRating: 4.0,
        sortBy: 'rating',
      });

      results.forEach((service) => {
        const price = parseFloat((service.pricing.perRequest || service.pricing.amount || '$0').replace('$', ''));
        expect(price).toBeLessThanOrEqual(0.10);
        expect(service.reputation.rating).toBeGreaterThanOrEqual(4.0);
      });

      // Verify sorted by rating
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].reputation.rating).toBeGreaterThanOrEqual(results[i + 1].reputation.rating);
      }
    });
  });

  describe('updateReputation', () => {
    test('should update reputation with weighted average', async () => {
      const service = await registry.registerService({
        name: 'reputation-test',
        description: 'Test reputation updates',
        provider: '0xReputationProvider',
        endpoint: 'http://localhost:5000/test',
        capabilities: ['testing'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      // First rating: 5 stars
      await registry.updateReputation(service.id, 5);
      let updated = await registry.getService(service.id);
      expect(updated?.reputation.reviews).toBe(1);
      expect(updated?.reputation.rating).toBe(5.0);

      // Second rating: 3 stars (weighted average: (5*1 + 3) / 2 = 4.0)
      await registry.updateReputation(service.id, 3);
      updated = await registry.getService(service.id);
      expect(updated?.reputation.reviews).toBe(2);
      expect(updated?.reputation.rating).toBe(4.0);

      // Third rating: 4 stars (weighted average: (4.0*2 + 4) / 3 = 4.0)
      await registry.updateReputation(service.id, 4);
      updated = await registry.getService(service.id);
      expect(updated?.reputation.reviews).toBe(3);
      expect(updated?.reputation.rating).toBe(4.0);
    });

    test('should round rating to 1 decimal place', async () => {
      const service = await registry.registerService({
        name: 'rounding-test',
        description: 'Test rating rounding',
        provider: '0xRoundingProvider',
        endpoint: 'http://localhost:5001/test',
        capabilities: ['testing'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 4.5,
          reviews: 2,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      // Add rating that would result in 4.666... (should round to 4.7)
      // (4.5 * 2 + 5) / 3 = 14 / 3 = 4.666...
      await registry.updateReputation(service.id, 5);
      const updated = await registry.getService(service.id);
      expect(updated?.reputation.rating).toBe(4.7);
    });

    test('should update updatedAt timestamp', async () => {
      const service = await registry.registerService({
        name: 'timestamp-test',
        description: 'Test timestamp updates',
        provider: '0xTimestampProvider',
        endpoint: 'http://localhost:5002/test',
        capabilities: ['testing'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      const originalTimestamp = service.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await registry.updateReputation(service.id, 5);
      const updated = await registry.getService(service.id);
      expect(updated?.updatedAt).not.toBe(originalTimestamp);
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(new Date(originalTimestamp).getTime());
    });

    test('should sync cache with database', async () => {
      const service = await registry.registerService({
        name: 'sync-test',
        description: 'Test cache-database sync',
        provider: '0xSyncProvider',
        endpoint: 'http://localhost:5003/test',
        capabilities: ['testing'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'base-sepolia',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      await registry.updateReputation(service.id, 5);

      // Check database directly
      const dbService = await db.get<any>('SELECT * FROM services WHERE id = ?', [service.id]);
      const reputation = JSON.parse(dbService?.reputation);
      expect(reputation.rating).toBe(5.0);
      expect(reputation.reviews).toBe(1);
    });
  });
});

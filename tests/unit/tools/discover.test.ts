import { discoverServices } from '../../../src/tools/discover';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Service } from '../../../src/types/service';

// Mock ServiceRegistry
jest.mock('../../../src/registry/ServiceRegistry');

describe('discoverServices', () => {
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  const createMockService = (overrides: Partial<Service>): Service => ({
    id: 'service-1',
    name: 'Test Service',
    description: 'Test description',
    provider: '0xprovider',
    endpoint: 'https://test.xyz',
    capabilities: ['test'],
    pricing: { perRequest: '$0.01', currency: 'USDC', network: 'base-sepolia' },
    reputation: { totalJobs: 10, successRate: 90, avgResponseTime: '1s', rating: 4.0, reviews: 5 },
    metadata: { apiVersion: 'v1' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(() => {
    mockRegistry = {
      searchServices: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should discover all services with no filters', async () => {
      // Arrange
      const services = [
        createMockService({ id: 'service-1', name: 'Service 1' }),
        createMockService({ id: 'service-2', name: 'Service 2' })
      ];
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {});

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({});
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(2);
      expect(response.count).toBe(2);
    });

    it('should filter by capability', async () => {
      // Arrange
      const services = [
        createMockService({ id: 'service-1', capabilities: ['image-analysis', 'ocr'] }),
        createMockService({ id: 'service-2', capabilities: ['sentiment-analysis'] })
      ];
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {
        capability: 'image-analysis'
      });

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({
        capabilities: ['image-analysis']
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(2);
    });

    it('should filter by maxPrice', async () => {
      // Arrange
      const services = [
        createMockService({ id: 'service-1', pricing: { perRequest: '$0.01', currency: 'USDC', network: 'base-sepolia' } }),
        createMockService({ id: 'service-2', pricing: { perRequest: '$0.05', currency: 'USDC', network: 'base-sepolia' } })
      ];
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {
        maxPrice: '$0.10'
      });

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({
        maxPrice: '$0.10'
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(2);
    });

    it('should filter by minRating', async () => {
      // Arrange
      const services = [
        createMockService({ id: 'service-1', reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2s', rating: 4.5, reviews: 20 } }),
        createMockService({ id: 'service-2', reputation: { totalJobs: 50, successRate: 98, avgResponseTime: '1s', rating: 4.8, reviews: 10 } })
      ];
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {
        minRating: 4.0
      });

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({
        minRating: 4.0
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(2);
      expect(response.services[0].rating).toBeGreaterThanOrEqual(4.0);
    });

    it('should combine multiple filters', async () => {
      // Arrange
      const services = [
        createMockService({
          id: 'service-1',
          capabilities: ['image-analysis'],
          pricing: { perRequest: '$0.02', currency: 'USDC', network: 'base-sepolia' },
          reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2s', rating: 4.5, reviews: 20 }
        })
      ];
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {
        capability: 'image-analysis',
        maxPrice: '$0.10',
        minRating: 4.0
      });

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({
        capabilities: ['image-analysis'],
        maxPrice: '$0.10',
        minRating: 4.0
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(1);
    });

    it('should limit results to specified limit', async () => {
      // Arrange
      const services = Array.from({ length: 50 }, (_, i) =>
        createMockService({ id: `service-${i}`, name: `Service ${i}` })
      );
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, { limit: 5 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(5);
      expect(response.count).toBe(5);
    });

    it('should use default limit of 10', async () => {
      // Arrange
      const services = Array.from({ length: 20 }, (_, i) =>
        createMockService({ id: `service-${i}` })
      );
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await discoverServices(mockRegistry, {});

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(10);
      expect(response.count).toBe(10);
    });

    it('should format services with correct fields', async () => {
      // Arrange
      const service = createMockService({
        id: 'service-1',
        name: 'Vision Pro',
        description: 'Image analysis',
        capabilities: ['image-analysis', 'ocr'],
        pricing: { perRequest: '$0.02', currency: 'USDC', network: 'base-sepolia' },
        reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2s', rating: 4.5, reviews: 20 }
      });
      mockRegistry.searchServices.mockResolvedValue([service]);

      // Act
      const result = await discoverServices(mockRegistry, {});

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services[0]).toEqual({
        id: 'service-1',
        name: 'Vision Pro',
        description: 'Image analysis',
        price: '$0.02',
        rating: 4.5,
        capabilities: ['image-analysis', 'ocr']
      });
    });

    it('should handle empty results', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([]);

      // Act
      const result = await discoverServices(mockRegistry, { capability: 'nonexistent' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(0);
      expect(response.count).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should reject invalid maxPrice format', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        maxPrice: '0.50' // Missing $
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('maxPrice');
    });

    it('should reject minRating below 1', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        minRating: 0.5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('minRating');
    });

    it('should reject minRating above 5', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        minRating: 5.5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('minRating');
    });

    it('should reject limit below 1', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        limit: 0
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('limit');
    });

    it('should reject limit above 100', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        limit: 101
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('limit');
    });

    it('should reject non-integer limit', async () => {
      // Act
      const result = await discoverServices(mockRegistry, {
        limit: 5.5
      } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should accept valid maxPrice formats', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([]);

      // Act - test various valid formats
      await discoverServices(mockRegistry, { maxPrice: '$1.00' });
      await discoverServices(mockRegistry, { maxPrice: '$0.50' });
      await discoverServices(mockRegistry, { maxPrice: '$10.99' });

      // Assert - should not throw validation errors
      expect(mockRegistry.searchServices).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Cases', () => {
    it('should return error when registry search fails', async () => {
      // Arrange
      mockRegistry.searchServices.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await discoverServices(mockRegistry, {});

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database connection lost');
    });

    it('should return error when registry throws unexpected error', async () => {
      // Arrange
      mockRegistry.searchServices.mockRejectedValue(new Error('Unexpected server error'));

      // Act
      const result = await discoverServices(mockRegistry, { capability: 'test' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Unexpected server error');
    });
  });
});

import { listAllServices } from '../../../src/tools/list';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Service } from '../../../src/types/service';

// Mock ServiceRegistry
jest.mock('../../../src/registry/ServiceRegistry');

describe('listAllServices', () => {
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  const mockService1: Service = {
    id: 'service-1',
    name: 'Vision Pro',
    description: 'Image analysis service',
    provider: '0xprovider1',
    endpoint: 'https://vision-pro.xyz/analyze',
    capabilities: ['image-analysis', 'ocr'],
    pricing: { perRequest: '$0.02', currency: 'USDC', network: 'base-sepolia' },
    reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2.3s', rating: 4.5, reviews: 20 },
    metadata: { apiVersion: 'v1' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  const mockService2: Service = {
    id: 'service-2',
    name: 'Sentiment Analyzer',
    description: 'Text sentiment analysis',
    provider: '0xprovider2',
    endpoint: 'https://sentiment.xyz/analyze',
    capabilities: ['sentiment-analysis', 'text-classification'],
    pricing: { perRequest: '$0.01', currency: 'USDC', network: 'base-sepolia' },
    reputation: { totalJobs: 50, successRate: 98, avgResponseTime: '1.2s', rating: 4.8, reviews: 10 },
    metadata: { apiVersion: 'v1' },
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z'
  };

  beforeEach(() => {
    mockRegistry = {
      searchServices: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should list all services with default limit', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([mockService1, mockService2]);

      // Act
      const result = await listAllServices(mockRegistry);

      // Assert
      expect(mockRegistry.searchServices).toHaveBeenCalledWith({});
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(2);
      expect(response.count).toBe(2);
      expect(response.total).toBe(2);
      expect(response.services[0].id).toBe('service-1');
      expect(response.services[1].id).toBe('service-2');
    });

    it('should limit results when limit is specified', async () => {
      // Arrange
      const services = Array.from({ length: 100 }, (_, i) => ({
        ...mockService1,
        id: `service-${i}`,
        name: `Service ${i}`
      }));
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await listAllServices(mockRegistry, { limit: 10 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(10);
      expect(response.count).toBe(10);
      expect(response.total).toBe(100);
    });

    it('should handle empty service list', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([]);

      // Act
      const result = await listAllServices(mockRegistry);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(0);
      expect(response.count).toBe(0);
      expect(response.total).toBe(0);
    });

    it('should format services with simplified fields', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([mockService1]);

      // Act
      const result = await listAllServices(mockRegistry);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services[0]).toEqual({
        id: 'service-1',
        name: 'Vision Pro',
        description: 'Image analysis service',
        price: '$0.02'
      });
      // Should NOT include capabilities, reputation, etc.
      expect(response.services[0].capabilities).toBeUndefined();
      expect(response.services[0].reputation).toBeUndefined();
    });

    it('should respect custom limit of 1', async () => {
      // Arrange
      mockRegistry.searchServices.mockResolvedValue([mockService1, mockService2]);

      // Act
      const result = await listAllServices(mockRegistry, { limit: 1 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(1);
      expect(response.count).toBe(1);
      expect(response.total).toBe(2);
      expect(response.services[0].id).toBe('service-1');
    });

    it('should handle maximum limit of 200', async () => {
      // Arrange
      const services = Array.from({ length: 300 }, (_, i) => ({
        ...mockService1,
        id: `service-${i}`
      }));
      mockRegistry.searchServices.mockResolvedValue(services);

      // Act
      const result = await listAllServices(mockRegistry, { limit: 200 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.services).toHaveLength(200);
      expect(response.count).toBe(200);
      expect(response.total).toBe(300);
    });
  });

  describe('Validation', () => {
    it('should reject limit below 1', async () => {
      // Act
      const result = await listAllServices(mockRegistry, { limit: 0 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('limit');
    });

    it('should reject limit above 200', async () => {
      // Act
      const result = await listAllServices(mockRegistry, { limit: 201 });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('limit');
    });

    it('should reject non-integer limit', async () => {
      // Act
      const result = await listAllServices(mockRegistry, { limit: 10.5 } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('Error Cases', () => {
    it('should return error when registry search fails', async () => {
      // Arrange
      mockRegistry.searchServices.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await listAllServices(mockRegistry);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database connection lost');
    });
  });
});

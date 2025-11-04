import { getServiceDetails } from '../../../src/tools/details';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Service } from '../../../src/types/service';

// Mock ServiceRegistry
jest.mock('../../../src/registry/ServiceRegistry');

describe('getServiceDetails', () => {
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  const mockService: Service = {
    id: 'service-123',
    name: 'Vision Pro',
    description: 'Advanced image analysis service',
    provider: '0xprovideraddress',
    endpoint: 'https://vision-pro.xyz/analyze',
    capabilities: ['image-analysis', 'ocr', 'object-detection'],
    pricing: { perRequest: '$0.02', currency: 'USDC', network: 'base-sepolia' },
    reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2.3s', rating: 4.5, reviews: 20 },
    metadata: { apiVersion: 'v1', rateLimit: '100/min', maxPayload: '10MB' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T12:30:00Z'
  };

  beforeEach(() => {
    mockRegistry = {
      getService: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should return complete service details', async () => {
      // Arrange
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'service-123' });

      // Assert
      expect(mockRegistry.getService).toHaveBeenCalledWith('service-123');
      const response = JSON.parse(result.content[0].text);
      expect(response.service).toEqual(mockService);
      expect(response.service.id).toBe('service-123');
      expect(response.service.name).toBe('Vision Pro');
      expect(response.service.capabilities).toEqual(['image-analysis', 'ocr', 'object-detection']);
      expect(response.service.pricing.perRequest).toBe('$0.02');
      expect(response.service.reputation.rating).toBe(4.5);
      expect(response.service.metadata.apiVersion).toBe('v1');
    });

    it('should return service with minimal metadata', async () => {
      // Arrange
      const minimalService = {
        ...mockService,
        metadata: { apiVersion: 'v1' }
      };
      mockRegistry.getService.mockResolvedValue(minimalService);

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'minimal-service' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.service.metadata).toEqual({ apiVersion: 'v1' });
      expect(response.service.metadata.rateLimit).toBeUndefined();
      expect(response.service.metadata.maxPayload).toBeUndefined();
    });
  });

  describe('Not Found Cases', () => {
    it('should return error when service does not exist', async () => {
      // Arrange
      mockRegistry.getService.mockResolvedValue(undefined);

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'nonexistent' });

      // Assert
      expect(mockRegistry.getService).toHaveBeenCalledWith('nonexistent');
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Service not found: nonexistent');
    });

    it('should return error when service is undefined', async () => {
      // Arrange
      mockRegistry.getService.mockResolvedValue(undefined as any);

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'undefined-service' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Service not found: undefined-service');
    });
  });

  describe('Validation', () => {
    it('should reject missing serviceId', async () => {
      // Act
      const result = await getServiceDetails(mockRegistry, {} as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('serviceId');
    });

    it('should reject empty serviceId', async () => {
      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: '' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should reject non-string serviceId', async () => {
      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 123 } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('Error Cases', () => {
    it('should return error when registry throws error', async () => {
      // Arrange
      mockRegistry.getService.mockRejectedValue(new Error('Database query failed'));

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'service-123' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database query failed');
    });

    it('should return error when registry connection lost', async () => {
      // Arrange
      mockRegistry.getService.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await getServiceDetails(mockRegistry, { serviceId: 'service-456' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Connection timeout');
    });
  });
});

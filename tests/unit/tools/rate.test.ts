import { rateService } from '../../../src/tools/rate';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Database } from '../../../src/registry/database';
import { Service } from '../../../src/types/service';

// Mock dependencies
jest.mock('../../../src/registry/ServiceRegistry');
jest.mock('../../../src/registry/database');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mocked-uuid-123')
}));

describe('rateService', () => {
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockDb: jest.Mocked<Database>;
  const mockTransaction = {
    id: 'tx-123',
    serviceId: 'service-456',
    buyer: '0xbuyer',
    seller: '0xseller',
    amount: '0.02',
    currency: 'USDC',
    status: 'completed',
    paymentHash: '0xtxhash',
    request: { method: 'POST', endpoint: 'https://api.xyz', payload: {} },
    response: { status: 200, data: { result: 'success' }, responseTime: 150 },
    timestamp: '2025-01-15T10:00:00Z'
  };

  const mockService: Service = {
    id: 'service-456',
    name: 'Vision Pro',
    description: 'Image analysis',
    provider: '0xseller',
    endpoint: 'https://api.xyz',
    capabilities: ['image-analysis'],
    pricing: { perRequest: '$0.02', currency: 'USDC', network: 'base-sepolia' },
    reputation: { totalJobs: 100, successRate: 95, avgResponseTime: '2s', rating: 4.5, reviews: 20 },
    metadata: { apiVersion: 'v1' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    mockRegistry = {
      updateReputation: jest.fn(),
      getService: jest.fn()
    } as any;

    mockDb = {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should submit rating with review', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5,
        review: 'Excellent service!'
      });

      // Assert
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM transactions WHERE id = ?',
        ['tx-123']
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ratings'),
        expect.arrayContaining([
          'mocked-uuid-123',
          'tx-123',
          'service-456',
          '0xbuyer',
          5,
          'Excellent service!',
          expect.any(String)
        ])
      );
      expect(mockRegistry.updateReputation).toHaveBeenCalledWith('service-456', 5);
      expect(mockRegistry.getService).toHaveBeenCalledWith('service-456');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.ratingId).toBe('mocked-uuid-123');
      expect(response.serviceId).toBe('service-456');
      expect(response.newRating).toBe(4.5);
      expect(response.message).toBe('Rating submitted successfully');
    });

    it('should submit rating without review', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 4
      });

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ratings'),
        expect.arrayContaining([
          'mocked-uuid-123',
          'tx-123',
          'service-456',
          '0xbuyer',
          4,
          null, // No review
          expect.any(String)
        ])
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should handle minimum score of 1', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 1,
        review: 'Poor service'
      });

      // Assert
      expect(mockRegistry.updateReputation).toHaveBeenCalledWith('service-456', 1);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should handle maximum score of 5', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5,
        review: 'Perfect!'
      });

      // Assert
      expect(mockRegistry.updateReputation).toHaveBeenCalledWith('service-456', 5);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should use score as newRating when service is not found', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(undefined);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 4
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.newRating).toBe(4); // Falls back to score
    });
  });

  describe('Not Found Cases', () => {
    it('should return error when transaction does not exist', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(undefined);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'nonexistent',
        score: 5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Transaction not found: nonexistent');
      expect(mockDb.run).not.toHaveBeenCalled();
      expect(mockRegistry.updateReputation).not.toHaveBeenCalled();
    });

    it('should return error when transaction is null', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(null as any);

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'null-tx',
        score: 3
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Transaction not found: null-tx');
    });
  });

  describe('Validation', () => {
    it('should reject missing transactionId', async () => {
      // Act
      const result = await rateService(mockRegistry, mockDb, {
        score: 5
      } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('transactionId');
    });

    it('should reject missing score', async () => {
      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123'
      } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('score');
    });

    it('should reject score below 1', async () => {
      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 0
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('score');
    });

    it('should reject score above 5', async () => {
      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 6
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('score');
    });

    it('should reject non-integer score', async () => {
      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 3.5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should accept optional review', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockResolvedValue(mockService);

      // Act - review is optional
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 4
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should return error when database get fails', async () => {
      // Arrange
      mockDb.get.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database connection lost');
    });

    it('should return error when database insert fails', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockDb.run.mockRejectedValue(new Error('Insert failed'));

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Insert failed');
    });

    it('should return error when updateReputation fails', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockDb.run.mockResolvedValue(undefined);
      mockRegistry.updateReputation.mockRejectedValue(new Error('Reputation update failed'));

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Reputation update failed');
    });

    it('should return error when getService fails', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(mockTransaction);
      mockDb.run.mockResolvedValue(undefined);
      mockRegistry.updateReputation.mockResolvedValue(undefined);
      mockRegistry.getService.mockRejectedValue(new Error('Service lookup failed'));

      // Act
      const result = await rateService(mockRegistry, mockDb, {
        transactionId: 'tx-123',
        score: 5
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Service lookup failed');
    });
  });
});

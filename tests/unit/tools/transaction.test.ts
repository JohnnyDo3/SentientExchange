import { getTransaction } from '../../../src/tools/transaction';
import { Database } from '../../../src/registry/database';

// Mock Database
jest.mock('../../../src/registry/database');

describe('getTransaction', () => {
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
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
    it('should return transaction with parsed JSON fields', async () => {
      // Arrange
      const mockTransaction = {
        id: 'tx-123',
        serviceId: 'service-456',
        buyer: '0xbuyer',
        seller: '0xseller',
        amount: '0.02',
        currency: 'USDC',
        status: 'completed',
        paymentHash: '0xtxhash',
        request: JSON.stringify({ method: 'POST', endpoint: 'https://api.xyz', payload: { test: true } }),
        response: JSON.stringify({ status: 200, data: { result: 'success' }, responseTime: 150 }),
        timestamp: '2025-01-15T10:30:00Z'
      };
      mockDb.get.mockResolvedValue(mockTransaction);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'tx-123' });

      // Assert
      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM transactions WHERE id = ?', ['tx-123']);
      const response = JSON.parse(result.content[0].text);
      expect(response.transaction.id).toBe('tx-123');
      expect(response.transaction.serviceId).toBe('service-456');
      expect(response.transaction.buyer).toBe('0xbuyer');
      expect(response.transaction.seller).toBe('0xseller');
      expect(response.transaction.amount).toBe('0.02');
      expect(response.transaction.currency).toBe('USDC');
      expect(response.transaction.status).toBe('completed');
      expect(response.transaction.paymentHash).toBe('0xtxhash');
      expect(response.transaction.request).toEqual({
        method: 'POST',
        endpoint: 'https://api.xyz',
        payload: { test: true }
      });
      expect(response.transaction.response).toEqual({
        status: 200,
        data: { result: 'success' },
        responseTime: 150
      });
      expect(response.transaction.timestamp).toBe('2025-01-15T10:30:00Z');
    });

    it('should handle transaction with null response', async () => {
      // Arrange
      const mockTransaction = {
        id: 'tx-456',
        serviceId: 'service-789',
        buyer: '0xbuyer',
        seller: '0xseller',
        amount: '0.01',
        currency: 'USDC',
        status: 'pending',
        paymentHash: null,
        request: JSON.stringify({ method: 'POST', endpoint: 'https://api.xyz', payload: {} }),
        response: null,
        timestamp: '2025-01-15T11:00:00Z'
      };
      mockDb.get.mockResolvedValue(mockTransaction);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'tx-456' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.transaction.response).toBeNull();
      expect(response.transaction.paymentHash).toBeNull();
      expect(response.transaction.status).toBe('pending');
    });

    it('should handle transaction with failed status', async () => {
      // Arrange
      const mockTransaction = {
        id: 'tx-789',
        serviceId: 'service-abc',
        buyer: '0xbuyer',
        seller: '0xseller',
        amount: '0.05',
        currency: 'USDC',
        status: 'failed',
        paymentHash: '0xtxhash',
        request: JSON.stringify({ method: 'POST', endpoint: 'https://api.xyz', payload: {} }),
        response: JSON.stringify({ status: 402, data: null, responseTime: 50 }),
        timestamp: '2025-01-15T12:00:00Z'
      };
      mockDb.get.mockResolvedValue(mockTransaction);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'tx-789' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.transaction.status).toBe('failed');
      expect(response.transaction.response.status).toBe(402);
    });
  });

  describe('Not Found Cases', () => {
    it('should return error when transaction does not exist', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(undefined);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'nonexistent' });

      // Assert
      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM transactions WHERE id = ?', ['nonexistent']);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Transaction not found: nonexistent');
    });

    it('should return error when transaction is null', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(null as any);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'null-tx' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Transaction not found: null-tx');
    });
  });

  describe('Validation', () => {
    it('should reject missing transactionId', async () => {
      // Act
      const result = await getTransaction(mockDb, {} as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(response.error).toContain('transactionId');
    });

    it('should reject empty transactionId', async () => {
      // Act
      const result = await getTransaction(mockDb, { transactionId: '' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should reject non-string transactionId', async () => {
      // Act
      const result = await getTransaction(mockDb, { transactionId: 123 } as any);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('Error Cases', () => {
    it('should return error when database query fails', async () => {
      // Arrange
      mockDb.get.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'tx-123' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Database connection lost');
    });

    it('should return error when JSON parsing fails', async () => {
      // Arrange
      const mockTransaction = {
        id: 'tx-999',
        serviceId: 'service-999',
        buyer: '0xbuyer',
        seller: '0xseller',
        amount: '0.01',
        currency: 'USDC',
        status: 'completed',
        paymentHash: '0xtx',
        request: 'invalid-json{{{',
        response: null,
        timestamp: '2025-01-15T12:00:00Z'
      };
      mockDb.get.mockResolvedValue(mockTransaction);

      // Act
      const result = await getTransaction(mockDb, { transactionId: 'tx-999' });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Unexpected token');
    });
  });
});

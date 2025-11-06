/**
 * Tests for submit-payment tool
 * Tests payment verification and service request completion
 */

// Mock dependencies
const mockBs58Decode = jest.fn();
jest.mock('bs58', () => ({
  default: {
    decode: mockBs58Decode,
  },
  __esModule: true,
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  default: {
    post: mockAxiosPost,
  },
  __esModule: true,
}));

import {
  submitPayment,
  SubmitPaymentArgs,
} from '../../../src/tools/submit-payment';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { SolanaVerifier } from '../../../src/payment/SolanaVerifier';
import { Database } from '../../../src/registry/database';
import { Service } from '../../../src/types/service';

// Mock ServiceRegistry, SolanaVerifier, Database
jest.mock('../../../src/registry/ServiceRegistry');
jest.mock('../../../src/payment/SolanaVerifier');
jest.mock('../../../src/registry/database');

describe('submit-payment Tool', () => {
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockVerifier: jest.Mocked<SolanaVerifier>;
  let mockDb: jest.Mocked<Database>;

  const mockService: Service = {
    id: 'service-123',
    name: 'Test Service',
    description: 'A test service',
    provider: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    endpoint: 'https://api.example.com/test',
    capabilities: ['test'],
    pricing: {
      billingModel: 'perRequest',
      amount: '$0.50',
      perRequest: '$0.50',
      currency: 'USDC',
      network: 'devnet',
    },
    reputation: {
      rating: 5.0,
      totalJobs: 100,
      successRate: 100,
      avgResponseTime: '1.2s',
      reviews: 50,
    },
    metadata: {
      apiVersion: 'v1',
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const validArgs: SubmitPaymentArgs = {
    transactionId: 'tx-123',
    signature: '5JJL9K5yVB7XBvv8Q7Y7YDpJZq4vYzHK9WqZzK5yVB7XBvv8Q7Y7YDpJZq',
    serviceId: 'service-123',
    requestData: { query: 'test' },
  };

  beforeEach(() => {
    // Create mock instances
    mockRegistry = {
      getService: jest.fn(),
    } as any;

    mockVerifier = {
      verifyPayment: jest.fn(),
    } as any;

    mockDb = {
      run: jest.fn(),
    } as any;

    // Setup defaults
    mockRegistry.getService.mockResolvedValue(mockService);
    mockBs58Decode.mockReturnValue(new Uint8Array(64));
    mockVerifier.verifyPayment.mockResolvedValue({
      verified: true,
      actualAmount: BigInt(500000), // $0.50 in USDC (6 decimals)
      actualRecipient: mockService.provider,
    });
    mockAxiosPost.mockResolvedValue({
      data: { result: 'success', output: 'test output' },
      status: 200,
    });
    mockDb.run.mockResolvedValue(undefined);

    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should successfully verify payment and complete service request', async () => {
      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.serviceResult).toEqual({
        result: 'success',
        output: 'test output',
      });
      expect(response.payment).toEqual({
        transactionId: 'tx-123',
        signature: validArgs.signature,
        amount: '$0.50',
        status: 'confirmed',
      });

      // Verify all steps were called
      expect(mockBs58Decode).toHaveBeenCalledWith(validArgs.signature);
      expect(mockRegistry.getService).toHaveBeenCalledWith('service-123');
      expect(mockVerifier.verifyPayment).toHaveBeenCalledWith({
        signature: validArgs.signature,
        expectedAmount: BigInt(500000), // $0.50 in USDC units
        expectedRecipient: mockService.provider,
        expectedToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        network: 'devnet',
      });
      expect(mockAxiosPost).toHaveBeenCalledWith(
        mockService.endpoint,
        validArgs.requestData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Payment': expect.any(String),
          }),
          timeout: 30000,
        })
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          validArgs.transactionId,
          'service-123',
          'client-wallet',
        ])
      );
    });

    it('should correctly construct X-Payment header', async () => {
      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockAxiosPost).toHaveBeenCalled();
      const callArgs = mockAxiosPost.mock.calls[0];
      const headers = callArgs[2].headers;
      const paymentProof = JSON.parse(headers['X-Payment']);

      expect(paymentProof).toEqual({
        network: 'devnet',
        txHash: validArgs.signature,
        from: 'client-wallet',
        to: mockService.provider,
        amount: '0.50', // Dollar sign removed
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      });
    });

    it('should log successful transaction to database', async () => {
      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [
          'tx-123',
          'service-123',
          'client-wallet',
          mockService.provider,
          '$0.50',
          'USDC',
          'completed',
          JSON.stringify(validArgs.requestData),
          JSON.stringify({ result: 'success', output: 'test output' }),
          validArgs.signature,
          expect.any(String), // timestamp
        ]
      );
    });
  });

  describe('Validation', () => {
    it('should reject missing transactionId', async () => {
      const args = { ...validArgs, transactionId: undefined } as any;

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        args
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
      expect(mockRegistry.getService).not.toHaveBeenCalled();
    });

    it('should reject missing signature', async () => {
      const args = { ...validArgs, signature: undefined } as any;

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        args
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });

    it('should reject missing serviceId', async () => {
      const args = { ...validArgs, serviceId: undefined } as any;

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        args
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });

    it('should reject invalid signature format', async () => {
      mockBs58Decode.mockImplementationOnce(() => {
        throw new Error('Invalid base58');
      });

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Invalid transaction signature format');
      expect(mockRegistry.getService).not.toHaveBeenCalled();
    });
  });

  describe('Service Lookup', () => {
    it('should return error when service not found', async () => {
      mockRegistry.getService.mockResolvedValue(undefined);

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service not found');
      expect(mockVerifier.verifyPayment).not.toHaveBeenCalled();
    });
  });

  describe('Payment Verification', () => {
    it('should return error when payment verification fails', async () => {
      mockVerifier.verifyPayment.mockResolvedValue({
        verified: false,
        error: 'Payment amount mismatch',
      });

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment verification failed');
      expect(response.details).toContain('Payment amount mismatch');
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('should calculate correct USDC amount (6 decimals)', async () => {
      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockVerifier.verifyPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedAmount: BigInt(500000), // $0.50 * 100 cents * 10000 USDC units per cent
        })
      );
    });

    it('should handle different price formats', async () => {
      mockRegistry.getService.mockResolvedValue({
        ...mockService,
        pricing: {
          ...mockService.pricing,
          perRequest: '$1.25',
        },
      });

      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockVerifier.verifyPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedAmount: BigInt(1250000), // $1.25 in USDC units
        })
      );
    });
  });

  describe('Service Request After Payment', () => {
    it('should handle service failure after payment', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Service unavailable'));

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service request failed after payment');
      expect(response.payment.status).toBe('confirmed');
      expect(response.payment.note).toContain(
        'Payment was successful but service failed'
      );

      // Verify failed transaction was logged
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          'tx-123-failed',
          'service-123',
          'client-wallet',
          mockService.provider,
          '$0.50',
          'USDC',
          'failed',
        ])
      );
    });

    it('should handle service timeout', async () => {
      mockAxiosPost.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service request failed after payment');
    });

    it('should handle service 500 error', async () => {
      mockAxiosPost.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service request failed after payment');
      expect(response.details).toEqual({ error: 'Internal server error' });
    });
  });

  describe('Database Logging', () => {
    it('should log completed transaction with all fields', async () => {
      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      const call = mockDb.run.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO transactions');
      expect(call[1]).toBeDefined();
      expect(call[1]!).toHaveLength(11); // All 11 fields for completed transaction
      expect(call[1]![6]).toBe('completed'); // status field
    });

    it('should log failed transaction when service fails', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Service error'));

      await submitPayment(mockRegistry, mockVerifier, mockDb, validArgs);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      const call = mockDb.run.mock.calls[0];
      expect(call[1]).toBeDefined();
      expect(call[1]!).toHaveLength(12); // Failed transactions have 12 fields (includes error field)
      expect(call[1]![6]).toBe('failed'); // status field
      expect(call[1]![10]).toContain('Service error'); // error field (index 10)
      expect(call[1]![11]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // timestamp field (index 11)
    });

    it('should handle database logging failure gracefully', async () => {
      mockDb.run.mockRejectedValue(new Error('Database error'));

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle registry getService failure', async () => {
      mockRegistry.getService.mockRejectedValue(
        new Error('Registry connection failed')
      );

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });

    it('should handle verifier failure', async () => {
      mockVerifier.verifyPayment.mockRejectedValue(
        new Error('Blockchain RPC timeout')
      );

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted MCP response on success', async () => {
      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('serviceResult');
      expect(response).toHaveProperty('payment');
    });

    it('should return properly formatted MCP error response', async () => {
      mockVerifier.verifyPayment.mockResolvedValue({
        verified: false,
        error: 'Test error',
      });

      const result = await submitPayment(
        mockRegistry,
        mockVerifier,
        mockDb,
        validArgs
      );

      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('error');
    });
  });
});

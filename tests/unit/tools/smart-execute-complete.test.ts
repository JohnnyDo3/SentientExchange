import { completeServiceWithPayment } from '../../../src/tools/smart-execute-complete';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { SolanaVerifier } from '../../../src/payment/SolanaVerifier';
import { Database } from '../../../src/registry/database';
import { sessionManager } from '../../../src/utils/SessionManager';
import axios from 'axios';
import type { Service } from '../../../src/types';

jest.mock('axios');
jest.mock('../../../src/utils/SessionManager', () => ({
  sessionManager: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;

describe('completeServiceWithPayment', () => {
  let registry: jest.Mocked<ServiceRegistry>;
  let verifier: jest.Mocked<SolanaVerifier>;
  let db: jest.Mocked<Database>;

  const mockService: Service = {
    id: 'service-1',
    name: 'Sentiment Analyzer',
    description: 'AI sentiment analysis',
    provider: 'provider-wallet',
    endpoint: 'http://localhost:3001',
    capabilities: ['sentiment-analysis'],
    pricing: {
      perRequest: '$0.01',
      currency: 'USDC',
      network: 'devnet',
    },
    reputation: {
      totalJobs: 100,
      successRate: 95,
      avgResponseTime: '2.5s',
      rating: 4.5,
      reviews: 20,
    },
    metadata: {
      apiVersion: 'v1',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSession = {
    sessionId: 'session-123',
    status: 'payment_ready' as const,
    selectedService: mockService,
    alternativeServices: [
      { ...mockService, id: 'service-2', name: 'Backup Service 1' },
      { ...mockService, id: 'service-3', name: 'Backup Service 2' },
    ],
    requestData: { text: 'I love this!' },
    transactionId: 'tx-123',
    paymentInstructions: {
      amount: '10000',
      currency: 'USDC',
      recipient: 'provider-wallet',
      token: 'USDC-token',
      network: 'devnet',
    } as any,
    createdAt: Date.now(),
    expiresAt: Date.now() + 900000,
    retryCount: 0,
    maxRetries: 2,
    requireHealthCheck: true,
  };

  beforeEach(() => {
    registry = {
      getService: jest.fn(),
    } as any;

    verifier = {
      verifyPayment: jest.fn(),
    } as any;

    db = {
      run: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('successful completion', () => {
    it('should verify payment and complete service request', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          result: {
            overall: { label: 'positive', score: 0.95 },
          },
        },
      });

      db.run.mockResolvedValueOnce(undefined);

      const result = await completeServiceWithPayment(
        registry,
        verifier,
        db,
        {
          sessionId: 'session-123',
          signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        }
      );

      expect(result.content[0].text).toContain('success');
      const response = JSON.parse(result.content[0].text);

      expect(response.serviceResult.result.overall.label).toBe('positive');
      expect(response.payment.signature).toBe('5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq');
      expect(response.payment.verifiedOnChain).toBe(true);
      expect(response.metadata.retriesUsed).toBe(0);
    });

    it('should update session status to completed', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: { sentiment: 'positive' } },
      });

      db.run.mockResolvedValueOnce(undefined);

      await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
      });

      expect(mockedSessionManager.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should log transaction to database', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: {} },
      });

      db.run.mockResolvedValueOnce(undefined);

      await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          'tx-123',
          'service-1',
          'client-wallet',
          'provider-wallet',
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should return error for expired session', async () => {
      mockedSessionManager.get.mockReturnValueOnce(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'non-existent',
        signature: 'tx-signature',
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Session not found or expired');
    });

    it('should return error for invalid signature format', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: 'invalid!!!signature',
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Invalid transaction signature format');
    });

    it('should return error when payment verification fails', async () => {
      // Session without backup services to prevent retry logic
      const sessionWithoutBackups = {
        ...mockSession,
        alternativeServices: [],
      };

      mockedSessionManager.get.mockReturnValueOnce(sessionWithoutBackups);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: false,
        error: 'Amount mismatch',
      });

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service failed after payment');
      expect(response.serviceError).toContain('Payment verification failed');
    });
  });

  describe('retry with backup services', () => {
    it('should retry with backup service when primary fails', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValue({
        verified: true,
        transaction: null as any,
      });

      // Primary service fails
      mockedAxios.post.mockRejectedValueOnce(new Error('Service timeout'));

      // Backup service succeeds
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: { sentiment: 'positive' } },
      });

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: true,
      });

      expect(result.content[0].text).toContain('success');
      const response = JSON.parse(result.content[0].text);

      expect(response.metadata.retriesUsed).toBe(1);
      expect(response.metadata.primaryServiceFailed).toBe(true);
      expect(response.service.name).toBe('Backup Service 1');
    });

    it('should try multiple backup services until success', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValue({
        verified: true,
        transaction: null as any,
      });

      // Primary fails
      mockedAxios.post.mockRejectedValueOnce(new Error('Primary failed'));

      // First backup fails
      mockedAxios.post.mockRejectedValueOnce(new Error('Backup 1 failed'));

      // Second backup succeeds
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: {} },
      });

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: true,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.metadata.retriesUsed).toBe(2);
      expect(response.service.name).toBe('Backup Service 2');
    });

    it('should return error when all services fail', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValue({
        verified: true,
        transaction: null as any,
      });

      // All services fail
      mockedAxios.post.mockRejectedValue(new Error('Service failed'));

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: true,
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('All services failed');
      expect(response.backupServicesTried).toBeDefined();
    });

    it('should not retry when retryOnFailure=false', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockRejectedValueOnce(new Error('Service failed'));

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: false,
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service failed after payment');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only primary attempt
    });

    it('should not retry when no backup services available', async () => {
      const sessionWithoutBackups = {
        ...mockSession,
        alternativeServices: [],
      };

      mockedSessionManager.get.mockReturnValueOnce(sessionWithoutBackups);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockRejectedValueOnce(new Error('Service failed'));

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: true,
      });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Service failed after payment');
    });
  });

  describe('transaction logging', () => {
    it('should log successful transaction', async () => {
      mockedSessionManager.get.mockReturnValueOnce(mockSession);

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: {} },
      });

      db.run.mockResolvedValueOnce(undefined);

      await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          expect.any(String), // transactionId
          'service-1',
          'client-wallet',
          'provider-wallet',
          '0.01',
          'USDC',
          'completed',
        ])
      );
    });

    it('should log failed transaction when service errors', async () => {
      mockedSessionManager.get.mockReturnValueOnce({
        ...mockSession,
        alternativeServices: [], // No backups
      });

      verifier.verifyPayment.mockResolvedValueOnce({
        verified: true,
        transaction: null as any,
      });

      // Service fails after payment verification
      mockedAxios.post.mockRejectedValueOnce(new Error('Service error'));

      db.run.mockResolvedValue(undefined);

      const result = await completeServiceWithPayment(registry, verifier, db, {
        sessionId: 'session-123',
        signature: '5XvZ8p3nHhkXNyf1f4Gzev3qPzBpHRBfBFcQjJy1D1VrcmQRxC3hZxPTjQLyU7zN6hR4Y3k1tPq',
        retryOnFailure: false,
      });

      expect(result.isError).toBe(true);

      // Should be called twice: once for failed transaction, once might be for retry logic
      // Find the call with 'failed' status
      const failedCall = db.run.mock.calls.find((call: any[]) =>
        call[1] && call[1].includes('failed')
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0]).toContain('INSERT INTO transactions');
      expect(failedCall![1]).toContain('service-1');
      expect(failedCall![1]).toContain('failed');
    });
  });
});

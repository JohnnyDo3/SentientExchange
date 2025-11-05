import { discoverAndPrepareService } from '../../../src/tools/smart-discover-prepare';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { SpendingLimitManager } from '../../../src/payment/SpendingLimitManager';
import { sessionManager } from '../../../src/utils/SessionManager';
import axios from 'axios';
import type { Service } from '../../../src/types';

jest.mock('axios');
jest.mock('../../../src/utils/SessionManager', () => ({
  sessionManager: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;

describe('discoverAndPrepareService', () => {
  let registry: jest.Mocked<ServiceRegistry>;
  let limitManager: jest.Mocked<SpendingLimitManager>;

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

  beforeEach(() => {
    registry = {
      searchServices: jest.fn(),
      getService: jest.fn(),
    } as any;

    limitManager = {
      checkLimit: jest.fn(),
    } as any;

    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedSessionManager.create.mockReset();
    mockedSessionManager.update.mockReset();
  });

  describe('successful discovery and preparation', () => {
    it('should discover service, health check, and prepare payment', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      // Mock health check
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      // Mock 402 response
      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'recipient-wallet',
            maxAmountRequired: '10000',
            tokenAddress: 'USDC-token',
            network: 'devnet',
          }],
        },
      });

      mockedSessionManager.create.mockReturnValueOnce({
        sessionId: 'session-123',
        status: 'preparing',
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        retryCount: 0,
        maxRetries: 2,
        requireHealthCheck: true,
      } as any);

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'I love this!' },
        },
        limitManager
      );

      expect(result.content[0].text).toContain('success');
      const response = JSON.parse(result.content[0].text);

      expect(response.sessionId).toBe('session-123');
      expect(response.selectedService.name).toBe('Sentiment Analyzer');
      expect(response.paymentReady.paymentInstructions).toBeDefined();
      expect(response.paymentReady.paymentInstructions.amount).toBe('10000');
    });

    it('should skip health check when checkHealth=false', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'recipient-wallet',
            maxAmountRequired: '10000',
          }],
        },
      });

      mockedSessionManager.create.mockReturnValueOnce({
        sessionId: 'session-123',
        status: 'preparing',
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        retryCount: 0,
        maxRetries: 2,
        requireHealthCheck: false,
      } as any);

      await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
          checkHealth: false,
        }
      );

      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should include spending limit check when userId provided', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'recipient-wallet',
            maxAmountRequired: '10000',
          }],
        },
      });

      limitManager.checkLimit.mockResolvedValueOnce({
        allowed: true,
        currentSpending: {
          userId: 'user-1',
          totalToday: '$0.50',
          totalThisMonth: '$5.00',
          transactionCount: 10,
        },
        limits: {
          userId: 'user-1',
          perTransaction: '$5.00',
          daily: '$50.00',
          monthly: '$500.00',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      mockedSessionManager.create.mockReturnValueOnce({
        sessionId: 'session-123',
        status: 'preparing',
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        retryCount: 0,
        maxRetries: 2,
        requireHealthCheck: true,
      } as any);

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
          userId: 'user-1',
        },
        limitManager
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.paymentReady.spendingCheck).toBeDefined();
      expect(response.paymentReady.spendingCheck.allowed).toBe(true);
      expect(limitManager.checkLimit).toHaveBeenCalledWith('user-1', '$0.01');
    });
  });

  describe('error handling', () => {
    it('should return error when no services found', async () => {
      registry.searchServices.mockResolvedValueOnce([]);

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'nonexistent-capability',
          requestData: { text: 'test' },
        }
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('No services found');
    });

    it('should return error when all services fail health check', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
          checkHealth: true,
        }
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('failed health check');
    });

    it('should return error when price exceeds maxPayment', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'recipient-wallet',
            maxAmountRequired: '10000',
          }],
        },
      });

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
          maxPayment: '$0.00', // Lower than service price of $0.01
        }
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('exceeds maximum payment');
    });

    it('should return error when spending limit exceeded', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      limitManager.checkLimit.mockResolvedValueOnce({
        allowed: false,
        reason: 'Daily limit exceeded',
        currentSpending: {
          userId: 'user-1',
          totalToday: '$50.00',
          totalThisMonth: '$150.00',
          transactionCount: 100,
        },
        limits: {
          userId: 'user-1',
          perTransaction: '$5.00',
          daily: '$50.00',
          monthly: '$500.00',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
          userId: 'user-1',
        },
        limitManager
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Spending limit exceeded');
    });

    it('should return error when service request fails', async () => {
      registry.searchServices.mockResolvedValueOnce([mockService]);

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' },
      });

      mockedAxios.post.mockRejectedValueOnce(new Error('Service unreachable'));

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData: { text: 'test' },
        }
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Failed to contact service');
    });

    it('should validate input arguments', async () => {
      const result = await discoverAndPrepareService(
        registry,
        {
          capability: '', // Invalid empty capability
          requestData: { text: 'test' },
        } as any
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('service ranking and selection', () => {
    const services: Service[] = [
      {
        ...mockService,
        id: 'service-1',
        name: 'Service A',
        pricing: { perRequest: '$0.05', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 4.0 },
      },
      {
        ...mockService,
        id: 'service-2',
        name: 'Service B',
        pricing: { perRequest: '$0.01', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 5.0 },
      },
      {
        ...mockService,
        id: 'service-3',
        name: 'Service C',
        pricing: { perRequest: '$0.03', currency: 'USDC' },
        reputation: { ...mockService.reputation, rating: 3.5 },
      },
    ];

    it('should select best service based on health + rating + price', async () => {
      registry.searchServices.mockResolvedValueOnce(services);

      // All healthy
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'wallet',
            maxAmountRequired: '10000',
          }],
        },
      });

      mockedSessionManager.create.mockReturnValueOnce({
        sessionId: 'session-123',
        status: 'preparing',
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        retryCount: 0,
        maxRetries: 2,
        requireHealthCheck: true,
      } as any);

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'test',
          requestData: {},
        }
      );

      const response = JSON.parse(result.content[0].text);

      // Debug: log response if test fails
      if (!response.selectedService) {
        console.log('Response:', JSON.stringify(response, null, 2));
      }

      // Service B should be selected (best rating, lowest price)
      expect(response.selectedService).toBeDefined();
      expect(response.selectedService.name).toBe('Service B');
      expect(response.alternativeServices).toHaveLength(2);
    });

    it('should provide alternative services as backups', async () => {
      registry.searchServices.mockResolvedValueOnce(services);

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' },
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 402,
        data: {
          accepts: [{
            receiverAddress: 'wallet',
            maxAmountRequired: '10000',
          }],
        },
      });

      mockedSessionManager.create.mockReturnValueOnce({
        sessionId: 'session-123',
        status: 'preparing',
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        retryCount: 0,
        maxRetries: 2,
        requireHealthCheck: true,
      } as any);

      const result = await discoverAndPrepareService(
        registry,
        {
          capability: 'test',
          requestData: {},
        }
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.alternativeServices).toBeDefined();
      expect(response.alternativeServices.length).toBeGreaterThan(0);
    });
  });
});

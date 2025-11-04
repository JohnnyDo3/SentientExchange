import { X402Client } from '../../../src/payment/X402Client';
import { WalletManager } from '../../../src/payment/WalletManager';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/payment/WalletManager');

describe('X402Client', () => {
  let x402Client: X402Client;
  let mockWalletManager: jest.Mocked<WalletManager>;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  const mockServiceUrl = 'https://api.example.com/service';
  const mockRequestData = {
    prompt: 'Test request',
    parameters: { temperature: 0.7 }
  };

  beforeEach(() => {
    // Setup mock wallet manager
    mockWalletManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getAddress: jest.fn().mockResolvedValue('0xSenderAddress'),
      transferUsdc: jest.fn().mockResolvedValue('0xTransactionHash123'),
      getBalance: jest.fn().mockResolvedValue('10000000'),
      requestFaucetFunds: jest.fn().mockResolvedValue('0xFaucetTxHash'),
      isReady: jest.fn().mockReturnValue(true),
      getWallet: jest.fn()
    } as any;

    // Create axios mock instance
    mockAxios.create = jest.fn().mockReturnValue({
      request: jest.fn(),
      head: jest.fn()
    } as any);

    // Create client instance
    x402Client = new X402Client(mockWalletManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create X402Client with wallet manager', () => {
      expect(x402Client).toBeDefined();
    });

    it('should configure axios with correct timeout', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        timeout: 30000,
        validateStatus: expect.any(Function)
      });
    });
  });

  describe('makePayment', () => {
    let mockHttp: any;

    beforeEach(() => {
      mockHttp = {
        request: jest.fn()
      };
      mockAxios.create = jest.fn().mockReturnValue(mockHttp);
      x402Client = new X402Client(mockWalletManager);
    });

    it('should handle 402 response and execute payment', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '1000000',
            asset: 'usdc'
          }]
        }
      };

      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success', output: 'Test output' }
      };

      mockHttp.request
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      // Verify transaction was returned
      expect(result.status).toBe('completed');
      expect(result.response?.status).toBe(200);

      // Verify payment was executed
      expect(mockWalletManager.transferUsdc).toHaveBeenCalledWith(
        '0xRecipient123',
        expect.any(String)
      );
    });

    it('should reject if price exceeds maxPayment', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '10000000', // 10 USDC
            asset: 'usdc'
          }]
        }
      };

      mockHttp.request.mockResolvedValueOnce(mock402Response);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00' // Max is 5 USDC, but service wants 10
      );

      // Should fail due to price check
      expect(result.status).toBe('failed');
      expect(result.error).toContain('exceeds maximum');

      // Verify payment was NOT executed
      expect(mockWalletManager.transferUsdc).not.toHaveBeenCalled();
    });

    it('should handle 200 OK response (no payment needed)', async () => {
      const mockSuccessResponse = {
        status: 200,
        data: { result: 'free service', output: 'No payment needed' }
      };

      mockHttp.request.mockResolvedValueOnce(mockSuccessResponse);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('completed');
      expect(result.response?.status).toBe(200);

      // Verify no payment was executed
      expect(mockWalletManager.transferUsdc).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockHttp.request.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Network timeout');
    });

    it('should construct X-Payment header correctly', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '1000000',
            asset: 'usdc'
          }]
        }
      };

      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success' }
      };

      mockHttp.request
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      // Get the second call (retry with payment)
      const retryCall = mockHttp.request.mock.calls[1];
      const headers = retryCall[0]?.headers;

      expect(headers).toHaveProperty('X-Payment');

      const paymentHeader = JSON.parse(headers['X-Payment']);
      expect(paymentHeader.txHash).toBe('0xTransactionHash123');
      expect(paymentHeader.from).toBe('0xSenderAddress');
      expect(paymentHeader.to).toBe('0xRecipient123');
    });

    it('should handle invalid 402 response format', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [] // Empty accepts array
        }
      };

      mockHttp.request.mockResolvedValueOnce(mock402Response);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toContain('no payment methods accepted');
    });

    it('should handle payment transfer failures', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '1000000',
            asset: 'usdc'
          }]
        }
      };

      mockHttp.request.mockResolvedValueOnce(mock402Response);
      mockWalletManager.transferUsdc.mockRejectedValueOnce(
        new Error('Insufficient funds')
      );

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Insufficient funds');
    });

    it('should handle retry failure after payment', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '1000000',
            asset: 'usdc'
          }]
        }
      };

      mockHttp.request
        .mockResolvedValueOnce(mock402Response)
        .mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('failed');

      // Payment should still have been executed
      expect(mockWalletManager.transferUsdc).toHaveBeenCalled();
    });

    it('should send correct request data on initial call', async () => {
      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success' }
      };

      mockHttp.request.mockResolvedValueOnce(mockSuccessResponse);

      await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      const firstCall = mockHttp.request.mock.calls[0][0];
      expect(firstCall.method).toBe('POST');
      expect(firstCall.url).toBe(mockServiceUrl);
      expect(firstCall.data).toEqual(mockRequestData);
    });

    it('should preserve all request data in retry', async () => {
      const complexRequestData = {
        prompt: 'Complex request',
        parameters: {
          temperature: 0.7,
          maxTokens: 100,
          nested: {
            value: 'test'
          }
        },
        metadata: {
          userId: 'user-123'
        }
      };

      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '1000000',
            asset: 'usdc'
          }]
        }
      };

      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success' }
      };

      mockHttp.request
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        complexRequestData,
        '$5.00'
      );

      // Verify retry contains original request data
      const retryCall = mockHttp.request.mock.calls[1][0];
      expect(retryCall.data).toEqual(complexRequestData);
    });
  });

  describe('supportsX402', () => {
    let mockHttp: any;

    beforeEach(() => {
      mockHttp = {
        head: jest.fn()
      };
      mockAxios.create = jest.fn().mockReturnValue(mockHttp);
      x402Client = new X402Client(mockWalletManager);
    });

    it('should detect x402 support from headers', async () => {
      mockHttp.head.mockResolvedValueOnce({
        status: 200,
        headers: {
          'x-payment-required': 'true'
        }
      });

      const supports = await x402Client.supportsX402(mockServiceUrl);

      expect(supports).toBe(true);
      expect(mockHttp.head).toHaveBeenCalledWith(mockServiceUrl);
    });

    it('should return false if header is missing', async () => {
      mockHttp.head.mockResolvedValueOnce({
        status: 200,
        headers: {}
      });

      const supports = await x402Client.supportsX402(mockServiceUrl);

      expect(supports).toBe(false);
    });

    it('should return false if request returns 402', async () => {
      mockHttp.head.mockResolvedValueOnce({
        status: 402,
        headers: {}
      });

      const supports = await x402Client.supportsX402(mockServiceUrl);

      expect(supports).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      mockHttp.head.mockRejectedValueOnce(new Error('Network error'));

      const supports = await x402Client.supportsX402(mockServiceUrl);

      expect(supports).toBe(false);
    });
  });

  describe('edge cases', () => {
    let mockHttp: any;

    beforeEach(() => {
      mockHttp = {
        request: jest.fn()
      };
      mockAxios.create = jest.fn().mockReturnValue(mockHttp);
      x402Client = new X402Client(mockWalletManager);
    });

    it('should handle zero amount payments', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '0',
            asset: 'usdc'
          }]
        }
      };

      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success' }
      };

      mockHttp.request
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('completed');
      expect(mockWalletManager.transferUsdc).toHaveBeenCalledWith(
        '0xRecipient123',
        '0.000000'
      );
    });

    it('should handle very large payment amounts', async () => {
      const mock402Response = {
        status: 402,
        data: {
          accepts: [{
            network: 'base-sepolia',
            payTo: '0xRecipient123',
            maxAmountRequired: '999999999999',
            asset: 'usdc'
          }]
        }
      };

      mockHttp.request.mockResolvedValueOnce(mock402Response);

      const result = await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toContain('exceeds maximum');
    });

    it('should handle wallet initialization if not ready', async () => {
      mockWalletManager.isReady.mockReturnValue(false);

      const mockSuccessResponse = {
        status: 200,
        data: { result: 'success' }
      };

      mockHttp.request.mockResolvedValueOnce(mockSuccessResponse);

      await x402Client.makePayment(
        mockServiceUrl,
        'POST',
        mockRequestData,
        '$5.00'
      );

      expect(mockWalletManager.initialize).toHaveBeenCalled();
    });
  });
});

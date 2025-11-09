import { UniversalX402Client } from '../../../src/payment/UniversalX402Client';
import { SolanaPaymentCoordinator } from '../../../src/payment/SolanaPaymentCoordinator';
import { SpendingLimitManager } from '../../../src/payment/SpendingLimitManager';
import axios from 'axios';
import jwt from 'jsonwebtoken';

jest.mock('axios');
jest.mock('jsonwebtoken');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('UniversalX402Client', () => {
  let client: UniversalX402Client;
  let mockPaymentCoordinator: jest.Mocked<SolanaPaymentCoordinator>;
  let mockSpendingLimitManager: jest.Mocked<SpendingLimitManager>;
  let mockAxiosInstance: jest.Mock;

  const mockX402Response = {
    accepts: [{
      chainId: 'solana-devnet',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '250000', // 0.25 USDC in base units
      receiverAddress: 'TestRecipient123456789'
    }],
    payTo: 'TestRecipient123456789'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaymentCoordinator = {
      executePayment: jest.fn(),
      verifyTransaction: jest.fn(),
      createPaymentInstruction: jest.fn()
    } as any;

    mockSpendingLimitManager = {
      checkLimit: jest.fn()
    } as any;

    // Mock axios.head for health checks
    mockedAxios.head = jest.fn().mockResolvedValue({ status: 200 });

    // Mock axios() default function for main requests
    mockAxiosInstance = jest.fn();
    (mockedAxios as any).mockImplementation(mockAxiosInstance);

    client = new UniversalX402Client(
      mockPaymentCoordinator,
      'test-user',
      mockSpendingLimitManager
    );
  });

  describe('Health Check (CRITICAL)', () => {
    it('should perform health check before attempting payment', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      await client.fetchWithAutopay('https://example.com/content');

      expect(mockedAxios.head).toHaveBeenCalledWith('https://example.com/content', {
        timeout: 5000,
        validateStatus: expect.any(Function)
      });
    });

    it('should NEVER pay if health check fails', async () => {
      mockedAxios.head.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.healthCheckPassed).toBe(false);
      expect(result.paymentExecuted).toBe(false);
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
      expect(result.error).toContain('health check');
    });

    it('should NEVER pay if service returns 5xx on health check', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 500 });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.healthCheckPassed).toBe(false);
      expect(result.paymentExecuted).toBe(false);
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });

    it('should allow payment if health check returns 402 (paywall)', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 402 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      const result = await client.fetchWithAutopay('https://example.com/content');

      // Health check should pass (402 is acceptable)
      expect(result.healthCheckPassed).toBe(true);
    });

    it('should allow payment if health check returns 401 (auth required)', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 401 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.healthCheckPassed).toBe(true);
    });
  });

  describe('Successful Content Fetch (No Payment)', () => {
    it('should return content immediately if no payment required', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({
        status: 200,
        data: '<html>Free content</html>'
      });

      const result = await client.fetchWithAutopay('https://example.com/free-content');

      expect(result.success).toBe(true);
      expect(result.data).toBe('<html>Free content</html>');
      expect(result.paymentExecuted).toBe(false);
      expect(result.healthCheckPassed).toBe(true);
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Pay Under Threshold', () => {
    it('should auto-pay when amount is under threshold ($0.50)', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance
        .mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response }) // Initial 402
        .mockResolvedValueOnce({ status: 200, data: '<html>Paid content</html>' }); // After payment

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-signature-123');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('payment-proof-jwt' as any);

      const result = await client.fetchWithAutopay('https://example.com/content', {
        autopayThreshold: '0.50'
      });

      expect(result.success).toBe(true);
      expect(result.paymentExecuted).toBe(true);
      expect(result.paymentAmount).toBe('0.25');
      expect(result.paymentSignature).toBe('tx-signature-123');
      expect(mockPaymentCoordinator.executePayment).toHaveBeenCalled();
    });

    it('should verify payment on-chain before retrying request', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance
        .mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response })
        .mockResolvedValueOnce({ status: 200, data: 'content' });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);

      await client.fetchWithAutopay('https://example.com/content');

      expect(mockPaymentCoordinator.verifyTransaction).toHaveBeenCalledWith(
        'tx-sig',
        'TestRecipient123456789',
        '250000',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
    });

    it('should include payment proof in retry request', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance
        .mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response })
        .mockResolvedValueOnce({ status: 200, data: 'content' });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('payment-jwt' as any);

      await client.fetchWithAutopay('https://example.com/content');

      expect(mockAxiosInstance).toHaveBeenNthCalledWith(3, expect.objectContaining({
        headers: expect.objectContaining({
          'X-Payment': 'payment-jwt'
        })
      }));
    });
  });

  describe('Payment Approval Flow (Over Threshold)', () => {
    it('should request approval when payment exceeds threshold', async () => {
      const highCostResponse = {
        accepts: [{
          chainId: 'solana-devnet',
          tokenAddress: 'USDC',
          amount: '2000000', // $2.00 in base units
          receiverAddress: 'RecipientAddr'
        }]
      };

      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: highCostResponse });

      const result = await client.fetchWithAutopay('https://example.com/premium', {
        autopayThreshold: '0.50'
      });

      expect(result.needsUserApproval).toBe(true);
      expect(result.paymentAmount).toBe('2.00');
      expect(result.paymentRecipient).toBe('RecipientAddr');
      expect(result.paymentExecuted).toBe(false);
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });

    it('should respect custom autopay threshold', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance
        .mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response }) // $0.25
        .mockResolvedValueOnce({ status: 200, data: 'content' });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);

      // With $0.10 threshold, $0.25 should need approval
      const result = await client.fetchWithAutopay('https://example.com/content', {
        autopayThreshold: '0.10'
      });

      expect(result.needsUserApproval).toBe(true);
    });
  });

  describe('Spending Limit Enforcement', () => {
    it('should check spending limits before payment', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: false, reason: 'Daily limit exceeded' });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(mockSpendingLimitManager.checkLimit).toHaveBeenCalledWith('test-user', '0.25');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily limit exceeded');
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });

    it('should check max payment limit', async () => {
      const expensiveResponse = {
        accepts: [{
          chainId: 'solana-devnet',
          amount: '15000000', // $15.00
          receiverAddress: 'Recipient'
        }]
      };

      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: expensiveResponse });

      const result = await client.fetchWithAutopay('https://example.com/content', {
        maxPayment: '10.00'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });
  });

  describe('Payment Verification Failures', () => {
    it('should fail if payment verification fails', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(false); // Verification fails

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('verification failed');
    });

    it('should handle payment execution errors', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockRejectedValueOnce(new Error('Insufficient funds'));

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.paymentExecuted).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });
  });

  describe('Service Failures After Payment', () => {
    it('should return error if service fails after payment', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance
        .mockResolvedValueOnce({ status: 402, headers: {}, data: mockX402Response })
        .mockResolvedValueOnce({ status: 500, data: { error: 'Server error' } }); // Service fails

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.paymentExecuted).toBe(true);
      expect(result.paymentSignature).toBe('tx-sig');
      expect(result.error).toContain('failed after payment');
    });
  });

  describe('x402 Response Parsing', () => {
    it('should parse x402 payment details from response body', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, data: mockX402Response });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);

      await client.fetchWithAutopay('https://example.com/content');

      expect(mockPaymentCoordinator.executePayment).toHaveBeenCalledWith(
        mockX402Response,
        'TestRecipient123456789'
      );
    });

    it('should parse x402 payment details from X-Accept-Payment header', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({
        status: 402,
        headers: {
          'x-accept-payment': JSON.stringify(mockX402Response)
        },
        data: {}
      });

      mockSpendingLimitManager.checkLimit.mockResolvedValueOnce({ allowed: true });
      mockPaymentCoordinator.executePayment.mockResolvedValueOnce('tx-sig');
      mockPaymentCoordinator.verifyTransaction.mockResolvedValueOnce(true);

      await client.fetchWithAutopay('https://example.com/content');

      expect(mockPaymentCoordinator.executePayment).toHaveBeenCalled();
    });

    it('should fail gracefully if 402 response missing payment details', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({
        status: 402,
        headers: {},
        data: {} // No payment details
      });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing payment details');
      expect(mockPaymentCoordinator.executePayment).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeouts during fetch', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout' });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.success).toBe(false);
      expect(result.paymentExecuted).toBe(false);
    });

    it('should handle POST requests with data', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 200, data: 'response' });

      await client.fetchWithAutopay('https://example.com/api', {
        method: 'POST',
        data: { key: 'value' }
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        data: { key: 'value' }
      }));
    });

    it('should handle custom headers', async () => {
      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 200, data: 'response' });

      await client.fetchWithAutopay('https://example.com/api', {
        headers: { 'X-Custom': 'value' }
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value'
        })
      }));
    });
  });

  describe('Multiple Currency Support', () => {
    it('should extract USDC amount correctly (6 decimals)', async () => {
      const response = {
        accepts: [{
          chainId: 'solana-devnet',
          amount: '1500000', // 1.50 USDC
          receiverAddress: 'Recipient'
        }]
      };

      mockedAxios.head.mockResolvedValueOnce({ status: 200 });
      mockAxiosInstance.mockResolvedValueOnce({ status: 402, data: response });

      const result = await client.fetchWithAutopay('https://example.com/content');

      expect(result.paymentAmount).toBe('1.50');
    });
  });
});

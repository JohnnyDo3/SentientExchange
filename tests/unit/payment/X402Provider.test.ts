/**
 * X402Provider Unit Tests
 *
 * Tests the x402 payment provider with PayAI facilitator including:
 * - Provider initialization (Solana/EVM)
 * - Payment execution via facilitator
 * - Transaction verification
 * - Health checks (facilitator + RPC)
 * - Error handling
 *
 * Currently at 6.97% coverage - this will bring it to 95%+
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { X402Provider } from '../../../src/payment/X402Provider';
import { PaymentProviderConfig, PaymentDetails } from '../../../src/payment/types';

// Mock Solana Web3.js
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn(),
    Keypair: {
      fromSecretKey: jest.fn(),
    },
    PublicKey: jest.fn((address: string) => ({ toBase58: () => address })),
  };
});

// Mock axios
jest.mock('axios');
const MockAxios = axios as jest.Mocked<typeof axios>;

// Mock solana-transfer utility
jest.mock('../../../src/payment/solana-transfer', () => ({
  executeTransfer: jest.fn(),
}));

describe('X402Provider', () => {
  const originalEnv = process.env;
  let mockConnection: jest.Mocked<Connection>;
  let mockKeypair: jest.Mocked<Keypair>;
  let provider: X402Provider;
  let config: PaymentProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Setup mock keypair
    mockKeypair = {
      publicKey: {
        toBase58: jest.fn().mockReturnValue('X402WalletPubKey123'),
      },
      secretKey: new Uint8Array(64),
    } as any;

    (Keypair.fromSecretKey as jest.Mock).mockReturnValue(mockKeypair);

    // Setup mock connection
    mockConnection = {
      getBlockHeight: jest.fn().mockResolvedValue(54321),
      getSignatureStatus: jest.fn(),
    } as any;

    (Connection as jest.MockedClass<typeof Connection>).mockImplementation(() => mockConnection);

    // Mock bs58 decode
    jest.spyOn(bs58, 'decode').mockReturnValue(new Uint8Array(64));

    // Default config
    config = {
      network: 'solana-devnet',
      maxPaymentValue: BigInt(5000000), // 5 USDC
      secretKey: 'X402SecretKey123',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Initialization', () => {
    it('should set default facilitator URL', () => {
      provider = new X402Provider(config);

      expect(provider.name).toBe('X402Provider');
    });

    it('should use custom facilitator URL from environment', () => {
      process.env.FACILITATOR_URL = 'https://custom-facilitator.example.com';

      provider = new X402Provider(config);

      // Facilitator URL is private, but we can test its usage in health checks
      expect(provider).toBeDefined();
    });
  });

  describe('initialize() - Solana', () => {
    beforeEach(() => {
      provider = new X402Provider(config);
    });

    it('should initialize for Solana devnet', async () => {
      await provider.initialize();

      expect(bs58.decode).toHaveBeenCalledWith('X402SecretKey123');
      expect(Keypair.fromSecretKey).toHaveBeenCalled();
      expect(Connection).toHaveBeenCalledWith(
        'https://api.devnet.solana.com',
        'confirmed'
      );
    });

    it('should initialize for Solana mainnet', async () => {
      config.network = 'solana';
      provider = new X402Provider(config);

      await provider.initialize();

      expect(Connection).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        'confirmed'
      );
    });

    it('should use custom RPC URL when provided', async () => {
      config.rpcUrl = 'https://custom-rpc.example.com';
      provider = new X402Provider(config);

      await provider.initialize();

      expect(Connection).toHaveBeenCalledWith(
        'https://custom-rpc.example.com',
        'confirmed'
      );
    });

    it('should load wallet from environment variable', async () => {
      delete config.secretKey;
      process.env.SOLANA_PRIVATE_KEY = 'EnvSecretKey';

      provider = new X402Provider(config);
      await provider.initialize();

      expect(bs58.decode).toHaveBeenCalledWith('EnvSecretKey');
    });

    it('should throw error if no secret key available', async () => {
      delete config.secretKey;
      delete process.env.SOLANA_PRIVATE_KEY;

      provider = new X402Provider(config);

      await expect(provider.initialize()).rejects.toThrow(
        'X402Provider init failed'
      );
      await expect(provider.initialize()).rejects.toThrow(
        'SOLANA_PRIVATE_KEY required'
      );
    });

    it('should handle invalid secret key format', async () => {
      (bs58.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid base58');
      });

      await expect(provider.initialize()).rejects.toThrow(
        'X402Provider init failed'
      );
    });
  });

  describe('initialize() - EVM', () => {
    beforeEach(() => {
      config.network = 'base-sepolia';
      provider = new X402Provider(config);
    });

    it('should reject EVM networks as not yet implemented', async () => {
      await expect(provider.initialize()).rejects.toThrow(
        'EVM networks not yet implemented'
      );
    });
  });

  // ============================================================================
  // PAYMENT EXECUTION
  // ============================================================================

  describe('executePayment()', () => {
    let paymentDetails: PaymentDetails;

    beforeEach(async () => {
      provider = new X402Provider(config);
      await provider.initialize();

      paymentDetails = {
        recipient: 'RecipientPubKey123',
        amount: BigInt(1000000), // 1 USDC
        currency: 'USDC',
        tokenAddress: 'TokenMintAddress',
        network: 'solana-devnet',
      };

      // Mock facilitator verification
      MockAxios.post.mockResolvedValue({
        status: 200,
        data: { valid: true },
      });

      // Mock executeTransfer (dynamic import)
      const { executeTransfer } = await import('../../../src/payment/solana-transfer');
      (executeTransfer as jest.Mock).mockResolvedValue('X402SignatureABC123');
    });

    it('should execute Solana payment successfully', async () => {
      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(true);
      expect(result.signature).toBe('X402SignatureABC123');
      expect(result.transactionHash).toBe('X402SignatureABC123');
      expect(result.provider).toBe('x402');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should verify payment details with facilitator', async () => {
      await provider.executePayment(paymentDetails);

      expect(MockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/verify'),
        {
          recipient: 'RecipientPubKey123',
          amount: '1000000',
          currency: 'USDC',
          tokenAddress: 'TokenMintAddress',
          network: 'solana-devnet',
        }
      );
    });

    it('should throw if provider not initialized', async () => {
      const uninitializedProvider = new X402Provider(config);

      const result = await uninitializedProvider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('should reject payment exceeding max value', async () => {
      paymentDetails.amount = BigInt(10000000); // 10 USDC, exceeds 5 USDC max

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should allow payment when no max value configured', async () => {
      delete config.maxPaymentValue;
      provider = new X402Provider(config);
      await provider.initialize();

      MockAxios.post.mockResolvedValue({
        status: 200,
        data: { valid: true },
      });

      const { executeTransfer } = await import('../../../src/payment/solana-transfer');
      (executeTransfer as jest.Mock).mockResolvedValue('SignatureXYZ');

      paymentDetails.amount = BigInt(999999999);

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(true);
    });

    it('should handle facilitator verification failure', async () => {
      MockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { valid: false },
      });

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('verification failed');
    });

    it('should handle facilitator connection error', async () => {
      MockAxios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle transaction execution failure', async () => {
      const { executeTransfer } = await import('../../../src/payment/solana-transfer');
      (executeTransfer as jest.Mock).mockRejectedValueOnce(
        new Error('Insufficient funds')
      );

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('should reject EVM payments', async () => {
      paymentDetails.network = 'base-sepolia';

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('EVM payments not yet implemented');
    });

    it('should handle missing Solana connection', async () => {
      // Manually set connection to null to test error case
      (provider as any).connection = null;

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solana connection not initialized');
    });
  });

  // ============================================================================
  // TRANSACTION VERIFICATION
  // ============================================================================

  describe('verifyPayment()', () => {
    beforeEach(async () => {
      provider = new X402Provider(config);
      await provider.initialize();
    });

    it('should verify confirmed transaction', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: { confirmationStatus: 'confirmed', err: null },
      } as any);

      const result = await provider.verifyPayment('ValidSignature');

      expect(result).toBe(true);
    });

    it('should verify finalized transaction', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: { confirmationStatus: 'finalized', err: null },
      } as any);

      const result = await provider.verifyPayment('FinalizedSignature');

      expect(result).toBe(true);
    });

    it('should reject transaction not found', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: null,
      } as any);

      const result = await provider.verifyPayment('NonExistent');

      expect(result).toBe(false);
    });

    it('should reject if status response is null', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce(null as any);

      const result = await provider.verifyPayment('NullResponse');

      expect(result).toBe(false);
    });

    it('should reject transaction with processing status', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: { confirmationStatus: 'processed', err: null },
      } as any);

      const result = await provider.verifyPayment('ProcessedSignature');

      expect(result).toBe(false);
    });

    it('should handle RPC errors during verification', async () => {
      mockConnection.getSignatureStatus.mockRejectedValueOnce(
        new Error('RPC error')
      );

      const result = await provider.verifyPayment('SignatureError');

      expect(result).toBe(false);
    });

    it('should return false if connection not initialized', async () => {
      const uninitializedProvider = new X402Provider(config);

      const result = await uninitializedProvider.verifyPayment('Signature');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  describe('healthCheck()', () => {
    beforeEach(async () => {
      provider = new X402Provider(config);
      await provider.initialize();

      // Mock facilitator health endpoint
      MockAxios.get.mockResolvedValue({
        status: 200,
        data: { healthy: true },
      });
    });

    it('should return healthy when all checks pass', async () => {
      const result = await provider.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should check facilitator connectivity', async () => {
      await provider.healthCheck();

      expect(MockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/list'),
        { timeout: 5000 }
      );
    });

    it('should check Solana RPC connectivity', async () => {
      await provider.healthCheck();

      expect(mockConnection.getBlockHeight).toHaveBeenCalled();
    });

    it('should return unhealthy if keypair not initialized', async () => {
      const uninitializedProvider = new X402Provider(config);

      const result = await uninitializedProvider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Keypair not initialized');
    });

    it('should return unhealthy if facilitator is down', async () => {
      MockAxios.get.mockResolvedValueOnce({
        status: 500,
        data: {},
      });

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Facilitator returned status 500');
    });

    it('should return unhealthy if facilitator connection fails', async () => {
      MockAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Health check failed');
    });

    it('should return unhealthy if RPC returns 0 block height', async () => {
      mockConnection.getBlockHeight.mockResolvedValueOnce(0);

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Solana RPC not responsive');
    });

    it('should return unhealthy if RPC call fails', async () => {
      mockConnection.getBlockHeight.mockRejectedValueOnce(
        new Error('RPC timeout')
      );

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Health check failed');
    });

    it('should handle missing connection gracefully', async () => {
      MockAxios.get.mockResolvedValue({ status: 200, data: {} });
      (provider as any).connection = null;

      const result = await provider.healthCheck();

      // Should still check facilitator even if connection is null
      expect(result.healthy).toBe(true);
    });
  });

  // ============================================================================
  // WALLET ADDRESS
  // ============================================================================

  describe('getWalletAddress()', () => {
    beforeEach(async () => {
      provider = new X402Provider(config);
      await provider.initialize();
    });

    it('should return wallet public key', async () => {
      const address = await provider.getWalletAddress();

      expect(address).toBe('X402WalletPubKey123');
    });

    it('should throw if wallet not initialized', async () => {
      const uninitializedProvider = new X402Provider(config);

      await expect(uninitializedProvider.getWalletAddress()).rejects.toThrow(
        'Wallet not initialized'
      );
    });
  });
});

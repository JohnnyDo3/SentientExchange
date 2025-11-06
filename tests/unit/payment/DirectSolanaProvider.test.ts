/**
 * DirectSolanaProvider Unit Tests
 *
 * Tests the direct Solana blockchain payment provider including:
 * - Provider initialization with wallet loading
 * - Payment execution
 * - Transaction verification
 * - SPL token transfer verification
 * - Health checks
 * - Error handling
 *
 * Currently at 6.31% coverage - this will bring it to 95%+
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { DirectSolanaProvider } from '../../../src/payment/DirectSolanaProvider';
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

// Mock solana-transfer utility
jest.mock('../../../src/payment/solana-transfer', () => ({
  executeTransfer: jest.fn(),
}));

import { executeTransfer } from '../../../src/payment/solana-transfer';

describe('DirectSolanaProvider', () => {
  const originalEnv = process.env;
  let mockConnection: jest.Mocked<Connection>;
  let mockWallet: jest.Mocked<Keypair>;
  let provider: DirectSolanaProvider;
  let config: PaymentProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Setup mock wallet
    mockWallet = {
      publicKey: {
        toBase58: jest.fn().mockReturnValue('WalletPubKey1234567890'),
      },
      secretKey: new Uint8Array(64),
    } as any;

    (Keypair.fromSecretKey as jest.Mock).mockReturnValue(mockWallet);

    // Setup mock connection
    mockConnection = {
      getBlockHeight: jest.fn().mockResolvedValue(12345),
      getParsedTransaction: jest.fn(),
      getSignatureStatus: jest.fn(),
    } as any;

    (Connection as jest.MockedClass<typeof Connection>).mockImplementation(() => mockConnection);

    // Default config
    config = {
      network: 'solana-devnet',
      maxPaymentValue: BigInt(1000000), // 1 USDC
      secretKey: 'TestSecretKey12345',
    };

    // Mock bs58 decode
    jest.spyOn(bs58, 'decode').mockReturnValue(new Uint8Array(64));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with default devnet RPC URL', () => {
      provider = new DirectSolanaProvider(config);

      expect(Connection).toHaveBeenCalledWith(
        'https://api.devnet.solana.com',
        'confirmed'
      );
    });

    it('should use custom RPC URL when provided', () => {
      config.rpcUrl = 'https://custom-rpc.example.com';
      provider = new DirectSolanaProvider(config);

      expect(Connection).toHaveBeenCalledWith(
        'https://custom-rpc.example.com',
        'confirmed'
      );
    });

    it('should initialize with mainnet RPC URL', () => {
      config.network = 'mainnet-beta';
      provider = new DirectSolanaProvider(config);

      expect(Connection).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        'confirmed'
      );
    });

    it('should initialize with testnet RPC URL', () => {
      config.network = 'testnet';
      provider = new DirectSolanaProvider(config);

      expect(Connection).toHaveBeenCalledWith(
        'https://api.testnet.solana.com',
        'confirmed'
      );
    });

    it('should have correct provider name', () => {
      provider = new DirectSolanaProvider(config);
      expect(provider.name).toBe('DirectSolanaProvider');
    });
  });

  describe('initialize()', () => {
    beforeEach(() => {
      provider = new DirectSolanaProvider(config);
    });

    it('should load wallet from config secret key', async () => {
      await provider.initialize();

      expect(bs58.decode).toHaveBeenCalledWith('TestSecretKey12345');
      expect(Keypair.fromSecretKey).toHaveBeenCalled();
    });

    it('should load wallet from environment variable', async () => {
      delete config.secretKey;
      process.env.SOLANA_PRIVATE_KEY = 'EnvSecretKey67890';

      provider = new DirectSolanaProvider(config);
      await provider.initialize();

      expect(bs58.decode).toHaveBeenCalledWith('EnvSecretKey67890');
    });

    it('should test RPC connection', async () => {
      await provider.initialize();

      expect(mockConnection.getBlockHeight).toHaveBeenCalled();
    });

    it('should throw error if no secret key available', async () => {
      delete config.secretKey;
      delete process.env.SOLANA_PRIVATE_KEY;

      provider = new DirectSolanaProvider(config);

      await expect(provider.initialize()).rejects.toThrow(
        'DirectSolanaProvider init failed'
      );
      await expect(provider.initialize()).rejects.toThrow(
        'SOLANA_PRIVATE_KEY required'
      );
    });

    it('should handle invalid secret key format', async () => {
      (bs58.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid base58 encoding');
      });

      await expect(provider.initialize()).rejects.toThrow(
        'DirectSolanaProvider init failed'
      );
    });

    it('should handle RPC connection failure', async () => {
      mockConnection.getBlockHeight.mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      await expect(provider.initialize()).rejects.toThrow(
        'DirectSolanaProvider init failed'
      );
    });
  });

  // ============================================================================
  // PAYMENT EXECUTION
  // ============================================================================

  describe('executePayment()', () => {
    let paymentDetails: PaymentDetails;

    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();

      paymentDetails = {
        recipient: 'RecipientPublicKey123',
        amount: BigInt(100000), // 0.1 USDC
        currency: 'USDC',
        tokenAddress: 'TokenMintAddress123',
        network: 'solana-devnet',
      };

      (executeTransfer as jest.Mock).mockResolvedValue('SignatureABC123');
    });

    it('should execute payment successfully', async () => {
      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(true);
      expect(result.signature).toBe('SignatureABC123');
      expect(result.transactionHash).toBe('SignatureABC123');
      expect(result.provider).toBe('direct-solana');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details).toEqual(paymentDetails);
    });

    it('should call executeTransfer with correct parameters', async () => {
      await provider.executePayment(paymentDetails);

      expect(executeTransfer).toHaveBeenCalledWith(
        mockConnection,
        mockWallet,
        expect.any(Object), // PublicKey instance
        expect.any(Object), // TokenMint PublicKey
        BigInt(100000)
      );
    });

    it('should throw if provider not initialized', async () => {
      const uninitializedProvider = new DirectSolanaProvider(config);

      const result = await uninitializedProvider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('should reject payment exceeding max value', async () => {
      paymentDetails.amount = BigInt(2000000); // 2 USDC, exceeds 1 USDC max

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should handle transfer failure', async () => {
      (executeTransfer as jest.Mock).mockRejectedValueOnce(
        new Error('Insufficient funds')
      );

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
      expect(result.provider).toBe('direct-solana');
    });

    it('should allow payment when no max value configured', async () => {
      delete config.maxPaymentValue;
      provider = new DirectSolanaProvider(config);
      await provider.initialize();

      paymentDetails.amount = BigInt(999999999);

      const result = await provider.executePayment(paymentDetails);

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // TRANSACTION VERIFICATION
  // ============================================================================

  describe('verifyPayment()', () => {
    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();
    });

    it('should verify successful transaction', async () => {
      mockConnection.getParsedTransaction.mockResolvedValueOnce({
        meta: { err: null },
        transaction: {},
      } as any);

      const result = await provider.verifyPayment('ValidSignature123');

      expect(result).toBe(true);
      expect(mockConnection.getParsedTransaction).toHaveBeenCalledWith(
        'ValidSignature123',
        {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        }
      );
    });

    it('should reject if transaction not found', async () => {
      mockConnection.getParsedTransaction.mockResolvedValueOnce(null);

      const result = await provider.verifyPayment('NonExistentSignature');

      expect(result).toBe(false);
    });

    it('should reject if transaction has no meta', async () => {
      mockConnection.getParsedTransaction.mockResolvedValueOnce({
        meta: null,
      } as any);

      const result = await provider.verifyPayment('SignatureNoMeta');

      expect(result).toBe(false);
    });

    it('should reject if transaction failed', async () => {
      mockConnection.getParsedTransaction.mockResolvedValueOnce({
        meta: { err: { InstructionError: [0, 'InsufficientFunds'] } },
      } as any);

      const result = await provider.verifyPayment('FailedSignature');

      expect(result).toBe(false);
    });

    it('should handle RPC errors during verification', async () => {
      mockConnection.getParsedTransaction.mockRejectedValueOnce(
        new Error('RPC timeout')
      );

      const result = await provider.verifyPayment('SignatureRPCError');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // SPL TOKEN TRANSFER VERIFICATION
  // ============================================================================

  describe('verifySplTokenTransfer()', () => {
    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();
    });

    it('should verify valid SPL token transfer', async () => {
      const mockTransaction = {
        meta: {
          err: null,
          preTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1000000' },
            },
          ],
          postTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1100000' },
            },
          ],
        },
      };

      mockConnection.getParsedTransaction.mockResolvedValueOnce(mockTransaction as any);

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'RecipientAddress456',
        BigInt(100000),
        'TokenMintAddress123'
      );

      expect(result).toBe(true);
    });

    it('should reject if transaction not found', async () => {
      mockConnection.getParsedTransaction.mockResolvedValueOnce(null);

      const result = await provider.verifySplTokenTransfer(
        'NonExistent',
        'Recipient',
        BigInt(100),
        'TokenMint'
      );

      expect(result).toBe(false);
    });

    it('should reject if no token transfer found for recipient', async () => {
      const mockTransaction = {
        meta: {
          err: null,
          preTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'WrongRecipient',
              uiTokenAmount: { amount: '1000000' },
            },
          ],
          postTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'WrongRecipient',
              uiTokenAmount: { amount: '1100000' },
            },
          ],
        },
      };

      mockConnection.getParsedTransaction.mockResolvedValueOnce(mockTransaction as any);

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'ExpectedRecipient',
        BigInt(100000),
        'TokenMintAddress123'
      );

      expect(result).toBe(false);
    });

    it('should reject if wrong token mint', async () => {
      const mockTransaction = {
        meta: {
          err: null,
          preTokenBalances: [
            {
              mint: 'WrongTokenMint',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1000000' },
            },
          ],
          postTokenBalances: [
            {
              mint: 'WrongTokenMint',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1100000' },
            },
          ],
        },
      };

      mockConnection.getParsedTransaction.mockResolvedValueOnce(mockTransaction as any);

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'RecipientAddress456',
        BigInt(100000),
        'ExpectedTokenMint'
      );

      expect(result).toBe(false);
    });

    it('should reject if amount is insufficient', async () => {
      const mockTransaction = {
        meta: {
          err: null,
          preTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1000000' },
            },
          ],
          postTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '1050000' }, // Only 50k transferred, expected 100k
            },
          ],
        },
      };

      mockConnection.getParsedTransaction.mockResolvedValueOnce(mockTransaction as any);

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'RecipientAddress456',
        BigInt(100000),
        'TokenMintAddress123'
      );

      expect(result).toBe(false);
    });

    it('should handle missing preTokenBalances', async () => {
      const mockTransaction = {
        meta: {
          err: null,
          preTokenBalances: null,
          postTokenBalances: [
            {
              mint: 'TokenMintAddress123',
              owner: 'RecipientAddress456',
              uiTokenAmount: { amount: '100000' },
            },
          ],
        },
      };

      mockConnection.getParsedTransaction.mockResolvedValueOnce(mockTransaction as any);

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'RecipientAddress456',
        BigInt(100000),
        'TokenMintAddress123'
      );

      expect(result).toBe(false); // Should fail without pre-balance data to calculate delta
    });

    it('should handle RPC errors during SPL verification', async () => {
      mockConnection.getParsedTransaction.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await provider.verifySplTokenTransfer(
        'SignatureABC',
        'Recipient',
        BigInt(100),
        'TokenMint'
      );

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  describe('healthCheck()', () => {
    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();
    });

    it('should return healthy when all checks pass', async () => {
      const result = await provider.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return unhealthy if wallet not initialized', async () => {
      const uninitializedProvider = new DirectSolanaProvider(config);

      const result = await uninitializedProvider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Wallet not initialized');
    });

    it('should return unhealthy if RPC returns 0 block height', async () => {
      mockConnection.getBlockHeight.mockResolvedValueOnce(0);

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Solana RPC not responsive');
    });

    it('should return unhealthy if RPC call fails', async () => {
      mockConnection.getBlockHeight.mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const result = await provider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Health check failed');
    });
  });

  // ============================================================================
  // WALLET ADDRESS
  // ============================================================================

  describe('getWalletAddress()', () => {
    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();
    });

    it('should return wallet public key', async () => {
      const address = await provider.getWalletAddress();

      expect(address).toBe('WalletPubKey1234567890');
      expect(mockWallet.publicKey.toBase58).toHaveBeenCalled();
    });

    it('should throw if wallet not initialized', async () => {
      const uninitializedProvider = new DirectSolanaProvider(config);

      await expect(uninitializedProvider.getWalletAddress()).rejects.toThrow(
        'Wallet not initialized'
      );
    });
  });

  // ============================================================================
  // TRANSACTION STATUS
  // ============================================================================

  describe('getTransactionStatus()', () => {
    beforeEach(async () => {
      provider = new DirectSolanaProvider(config);
      await provider.initialize();
    });

    it('should return finalized for finalized transaction', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: { confirmationStatus: 'finalized', err: null },
      } as any);

      const status = await provider.getTransactionStatus('SignatureABC');

      expect(status).toBe('finalized');
    });

    it('should return confirmed for confirmed transaction', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: { confirmationStatus: 'confirmed', err: null },
      } as any);

      const status = await provider.getTransactionStatus('SignatureDEF');

      expect(status).toBe('confirmed');
    });

    it('should return not_found if status is null', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce({
        context: { slot: 12345 },
        value: null,
      } as any);

      const status = await provider.getTransactionStatus('NonExistent');

      expect(status).toBe('not_found');
    });

    it('should return not_found if RPC call fails', async () => {
      mockConnection.getSignatureStatus.mockRejectedValueOnce(
        new Error('RPC error')
      );

      const status = await provider.getTransactionStatus('SignatureError');

      expect(status).toBe('not_found');
    });

    it('should return not_found if response is undefined', async () => {
      mockConnection.getSignatureStatus.mockResolvedValueOnce(null as any);

      const status = await provider.getTransactionStatus('UndefinedSignature');

      expect(status).toBe('not_found');
    });
  });

  // ============================================================================
  // SIGNATURE VALIDATION
  // ============================================================================

  describe('isValidSignature()', () => {
    it('should validate correct signature format (87 chars)', () => {
      const validSignature = '3' + 'A'.repeat(86); // 87 chars base58

      expect(DirectSolanaProvider.isValidSignature(validSignature)).toBe(true);
    });

    it('should validate correct signature format (88 chars)', () => {
      const validSignature = '5' + 'B'.repeat(87); // 88 chars base58

      expect(DirectSolanaProvider.isValidSignature(validSignature)).toBe(true);
    });

    it('should reject signature too short', () => {
      const shortSignature = '1'.repeat(86);

      expect(DirectSolanaProvider.isValidSignature(shortSignature)).toBe(false);
    });

    it('should reject signature too long', () => {
      const longSignature = '1'.repeat(89);

      expect(DirectSolanaProvider.isValidSignature(longSignature)).toBe(false);
    });

    it('should reject signature with invalid characters', () => {
      const invalidSignature = '0' + 'A'.repeat(86); // '0' not valid in base58

      expect(DirectSolanaProvider.isValidSignature(invalidSignature)).toBe(false);
    });

    it('should reject signature with lowercase L (not in base58)', () => {
      const invalidSignature = 'l' + 'A'.repeat(86); // 'l' not valid in base58

      expect(DirectSolanaProvider.isValidSignature(invalidSignature)).toBe(false);
    });

    it('should reject signature with uppercase O (not in base58)', () => {
      const invalidSignature = 'O' + 'A'.repeat(86); // 'O' not valid in base58

      expect(DirectSolanaProvider.isValidSignature(invalidSignature)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(DirectSolanaProvider.isValidSignature('')).toBe(false);
    });

    it('should reject signature with special characters', () => {
      const invalidSignature = '@#$%' + 'A'.repeat(83);

      expect(DirectSolanaProvider.isValidSignature(invalidSignature)).toBe(false);
    });
  });
});

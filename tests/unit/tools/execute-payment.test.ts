/**
 * Tests for execute-payment tool
 * Tests Solana payment execution with USDC tokens and native SOL
 */

// Mock Solana SDK BEFORE imports
const mockSendAndConfirmTransaction = jest.fn();
const mockGetAssociatedTokenAddress = jest.fn();
const mockCreateTransferInstruction = jest.fn();
const mockConnection = jest.fn();
const mockKeypairFromSecretKey = jest.fn();
const mockKeypair = {
  fromSecretKey: mockKeypairFromSecretKey,
};
const mockPublicKey = jest.fn();
const mockTransaction = jest.fn();
const mockSystemProgram = {
  transfer: jest.fn(),
};

jest.mock('@solana/web3.js', () => ({
  Connection: mockConnection,
  Keypair: mockKeypair,
  PublicKey: mockPublicKey,
  Transaction: mockTransaction,
  SystemProgram: mockSystemProgram,
  sendAndConfirmTransaction: mockSendAndConfirmTransaction,
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: mockGetAssociatedTokenAddress,
  createTransferInstruction: mockCreateTransferInstruction,
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}));

const mockBs58Decode = jest.fn();
jest.mock('bs58', () => ({
  default: {
    decode: mockBs58Decode,
  },
  __esModule: true,
}));

import {
  executePayment,
  ExecutePaymentArgs,
  PaymentInstructions,
} from '../../../src/tools/execute-payment';

describe('execute-payment Tool', () => {
  let mockPayerKeypair: any;
  let mockRecipientPublicKey: any;
  let mockMintPublicKey: any;
  let mockTransactionInstance: any;

  const originalEnv = process.env;

  // Valid test payment instructions
  const validUSDCPayment: PaymentInstructions = {
    transactionId: 'test-tx-id-123',
    amount: '1000000', // 1 USDC (6 decimals)
    currency: 'USDC',
    recipient: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet
    network: 'mainnet-beta',
  };

  const validSOLPayment: PaymentInstructions = {
    transactionId: 'test-tx-id-456',
    amount: '1000000000', // 1 SOL (9 decimals)
    currency: 'SOL',
    recipient: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    network: 'devnet',
  };

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.SOLANA_PRIVATE_KEY =
      '5JJL9K5yVB7XBvv8Q7Y7YDpJZq4vYzHK9WqZzK5yVB7XBvv8Q7Y7YDpJZq'; // Mock key
    delete process.env.SOLANA_RPC_URL; // Remove custom RPC URL to test defaults

    // Setup mock keypair
    mockPayerKeypair = {
      publicKey: {
        toBase58: jest.fn().mockReturnValue('5JJL9K5y...'),
      },
      secretKey: new Uint8Array(64),
    };

    mockKeypairFromSecretKey.mockReturnValue(mockPayerKeypair);

    // Setup mock public keys
    mockRecipientPublicKey = {
      toBase58: jest.fn().mockReturnValue('9WzDXwBb...'),
    };
    mockMintPublicKey = {
      toBase58: jest.fn().mockReturnValue('EPjFWdd5...'),
    };

    mockPublicKey.mockImplementation((key: string) => {
      if (key.includes('EPj')) return mockMintPublicKey;
      if (key.includes('9Wz')) return mockRecipientPublicKey;
      return { toBase58: () => key };
    });

    // Setup mock connection
    const mockConnectionInstance = {
      getBalance: jest.fn().mockResolvedValue(1000000000),
      getRecentBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 12345,
      }),
    };
    mockConnection.mockReturnValue(mockConnectionInstance);

    // Setup mock transaction
    mockTransactionInstance = {
      add: jest.fn().mockReturnThis(),
      recentBlockhash: null,
      sign: jest.fn(),
    };
    mockTransaction.mockReturnValue(mockTransactionInstance);

    // Setup bs58
    mockBs58Decode.mockReturnValue(new Uint8Array(64));

    // Setup SPL token mocks
    mockGetAssociatedTokenAddress.mockResolvedValue({
      toBase58: jest.fn().mockReturnValue('associated-token-account'),
    });

    mockCreateTransferInstruction.mockReturnValue({
      keys: [],
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      data: Buffer.from([]),
    });

    // Setup system program
    mockSystemProgram.transfer.mockReturnValue({
      keys: [],
      programId: '11111111111111111111111111111111',
      data: Buffer.from([]),
    });

    // Setup sendAndConfirmTransaction
    mockSendAndConfirmTransaction.mockResolvedValue(
      'mock-signature-hash-123abc'
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Happy Path - USDC Token Transfer', () => {
    it('should successfully execute USDC token transfer with valid instructions', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      // Verify success response
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.signature).toBe('mock-signature-hash-123abc');
      expect(response.transactionId).toBe('test-tx-id-123');
      expect(response.network).toBe('mainnet-beta');

      // Verify Solana SDK calls
      expect(mockConnection).toHaveBeenCalledWith(
        'https://api.mainnet-beta.solana.com',
        'confirmed'
      );
      expect(mockKeypairFromSecretKey).toHaveBeenCalled();
      expect(mockGetAssociatedTokenAddress).toHaveBeenCalledTimes(2); // Source + destination
      expect(mockCreateTransferInstruction).toHaveBeenCalled();
      expect(mockSendAndConfirmTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [mockPayerKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );
    });

    it('should correctly parse amount as BigInt for token transfer', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      await executePayment(args);

      // Verify amount passed to createTransferInstruction is BigInt
      expect(mockCreateTransferInstruction).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        BigInt('1000000'),
        [],
        expect.anything()
      );
    });
  });

  describe('Happy Path - Native SOL Transfer', () => {
    it('should successfully execute native SOL transfer', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: validSOLPayment,
      };

      const result = await executePayment(args);

      // Verify success response
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.signature).toBe('mock-signature-hash-123abc');
      expect(response.transactionId).toBe('test-tx-id-456');

      // Verify SOL transfer path
      expect(mockConnection).toHaveBeenCalledWith(
        'https://api.devnet.solana.com',
        'confirmed'
      );
      expect(mockSystemProgram.transfer).toHaveBeenCalledWith({
        fromPubkey: mockPayerKeypair.publicKey,
        toPubkey: expect.anything(),
        lamports: BigInt('1000000000'),
      });
      expect(mockGetAssociatedTokenAddress).not.toHaveBeenCalled(); // SPL token methods not called
    });

    it('should handle testnet network correctly', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validSOLPayment,
          network: 'testnet',
        },
      };

      await executePayment(args);

      expect(mockConnection).toHaveBeenCalledWith(
        'https://api.testnet.solana.com',
        'confirmed'
      );
    });
  });

  describe('Validation - Input Validation', () => {
    it('should reject payment with missing transactionId', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validUSDCPayment,
          transactionId: undefined as any,
        },
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
      expect(mockSendAndConfirmTransaction).not.toHaveBeenCalled();
    });

    it('should reject payment with missing amount', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validUSDCPayment,
          amount: undefined as any,
        },
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should reject payment with invalid network', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validUSDCPayment,
          network: 'invalid-network' as any,
        },
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });

    it('should reject payment with missing recipient', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validUSDCPayment,
          recipient: undefined as any,
        },
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('Environment Configuration', () => {
    it('should return error when SOLANA_PRIVATE_KEY is not set', async () => {
      delete process.env.SOLANA_PRIVATE_KEY;

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('SOLANA_PRIVATE_KEY not configured');
      expect(response.error).toContain('MCP client environment');
      expect(mockSendAndConfirmTransaction).not.toHaveBeenCalled();
    });

    it('should use custom RPC URL from environment if provided', async () => {
      process.env.SOLANA_RPC_URL = 'https://custom-rpc.example.com';

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      await executePayment(args);

      expect(mockConnection).toHaveBeenCalledWith(
        'https://custom-rpc.example.com',
        'confirmed'
      );
    });
  });

  describe('Error Handling - Transaction Failures', () => {
    it('should handle transaction send failure', async () => {
      mockSendAndConfirmTransaction.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment execution failed');
      expect(response.details).toContain('Network timeout');
    });

    it('should handle invalid private key format', async () => {
      mockBs58Decode.mockImplementationOnce(() => {
        throw new Error('Invalid base58 encoding');
      });

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment execution failed');
    });

    it('should handle Solana connection failure', async () => {
      mockConnection.mockImplementationOnce(() => {
        throw new Error('Failed to connect to Solana RPC');
      });

      const args: ExecutePaymentArgs = {
        paymentInstructions: validSOLPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment execution failed');
      expect(response.details).toContain('Failed to connect to Solana RPC');
    });

    it('should handle invalid recipient address', async () => {
      mockPublicKey.mockImplementationOnce(() => {
        throw new Error('Invalid public key');
      });

      const args: ExecutePaymentArgs = {
        paymentInstructions: validSOLPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment execution failed');
      expect(response.details).toContain('Invalid public key');
    });

    it('should handle token account creation failure', async () => {
      mockGetAssociatedTokenAddress.mockRejectedValueOnce(
        new Error('Token account not found')
      );

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Payment execution failed');
      expect(response.details).toContain('Token account not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      const largeAmount = '999999999999999999'; // Max safe integer range
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validSOLPayment,
          amount: largeAmount,
        },
      };

      const result = await executePayment(args);

      expect(result.isError).toBeUndefined();
      expect(mockSystemProgram.transfer).toHaveBeenCalledWith({
        fromPubkey: expect.anything(),
        toPubkey: expect.anything(),
        lamports: BigInt(largeAmount),
      });
    });

    it('should handle zero amount (should pass validation but may fail on-chain)', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: {
          ...validSOLPayment,
          amount: '0',
        },
      };

      const result = await executePayment(args);

      // Validation passes (amount is provided)
      expect(result.isError).toBeUndefined();
      expect(mockSystemProgram.transfer).toHaveBeenCalledWith({
        fromPubkey: expect.anything(),
        toPubkey: expect.anything(),
        lamports: BigInt(0),
      });
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted MCP response on success', async () => {
      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('signature');
      expect(response).toHaveProperty('transactionId');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('network');
    });

    it('should return properly formatted MCP error response on failure', async () => {
      delete process.env.SOLANA_PRIVATE_KEY;

      const args: ExecutePaymentArgs = {
        paymentInstructions: validUSDCPayment,
      };

      const result = await executePayment(args);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', true);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('error');
      expect(response.success).toBeUndefined();
    });
  });
});

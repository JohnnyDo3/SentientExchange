import { SolanaVerifier, PaymentVerification, VerificationResult } from '../../../src/payment/SolanaVerifier';
import { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { logger } from '../../../src/utils/logger';

// Mock logger to reduce noise
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create shared mock connection methods
const mockGetParsedTransaction = jest.fn();
const mockGetSignatureStatus = jest.fn();

// Mock Solana Connection
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getParsedTransaction: mockGetParsedTransaction,
      getSignatureStatus: mockGetSignatureStatus,
    })),
  };
});

describe('SolanaVerifier', () => {
  let verifier: SolanaVerifier;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParsedTransaction.mockReset();
    mockGetSignatureStatus.mockReset();
    verifier = new SolanaVerifier();
  });

  describe('Constructor', () => {
    it('should initialize connections for all networks', () => {
      const ConnectionMock = Connection as jest.MockedClass<typeof Connection>;

      // Should create 3 connections: mainnet-beta, devnet, testnet
      expect(ConnectionMock).toHaveBeenCalledTimes(3);

      // Check mainnet connection (may use env var SOLANA_RPC_URL or default)
      expect(ConnectionMock).toHaveBeenCalledWith(
        expect.any(String),
        'confirmed'
      );

      // Check devnet connection
      expect(ConnectionMock).toHaveBeenCalledWith(
        'https://api.devnet.solana.com',
        'confirmed'
      );

      // Check testnet connection
      expect(ConnectionMock).toHaveBeenCalledWith(
        'https://api.testnet.solana.com',
        'confirmed'
      );
    });
  });

  describe('verifyPayment - USDC Token Transfers', () => {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const RECIPIENT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

    it('should successfully verify USDC token transfer with correct amount, recipient, and token', async () => {
      const expectedAmount = BigInt(20000); // 0.02 USDC (6 decimals)

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        blockTime: Date.now(),
        transaction: {
          message: {
            accountKeys: [],
            instructions: [
              {
                parsed: {
                  type: 'transferChecked',
                  info: {
                    amount: '20000',
                    destination: RECIPIENT,
                    mint: USDC_MINT,
                    tokenAmount: {
                      amount: '20000',
                      decimals: 6,
                      uiAmount: 0.02,
                    },
                  },
                },
                program: 'spl-token',
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
              },
            ],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [],
          postBalances: [],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        expectedToken: USDC_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
      expect(result.transaction).toBe(mockTx);
      expect(result.actualAmount).toBe(expectedAmount);
      expect(result.actualRecipient).toBe(RECIPIENT);
      expect(result.error).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        '✅ Token payment verified successfully',
        expect.objectContaining({ amount: expectedAmount.toString() })
      );
    });

    it('should fail verification when token amount does not match', async () => {
      const expectedAmount = BigInt(20000); // 0.02 USDC
      const actualAmount = BigInt(10000); // 0.01 USDC (wrong amount)

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [],
            instructions: [
              {
                parsed: {
                  type: 'transfer',
                  info: {
                    amount: actualAmount.toString(),
                    destination: RECIPIENT,
                    mint: USDC_MINT,
                  },
                },
                program: 'spl-token',
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
              },
            ],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [],
          postBalances: [],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        expectedToken: USDC_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Amount mismatch');
      expect(result.error).toContain(expectedAmount.toString());
      expect(result.error).toContain(actualAmount.toString());
      expect(result.actualAmount).toBe(actualAmount);
    });

    it('should fail verification when token mint does not match', async () => {
      const expectedAmount = BigInt(20000);
      const wrongMint = 'So11111111111111111111111111111111111111112'; // Wrapped SOL instead of USDC

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [],
            instructions: [
              {
                parsed: {
                  type: 'transfer',
                  info: {
                    amount: expectedAmount.toString(),
                    destination: RECIPIENT,
                    mint: wrongMint,
                  },
                },
                program: 'spl-token',
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
              },
            ],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [],
          postBalances: [],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        expectedToken: USDC_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Token mismatch');
      expect(result.error).toContain(USDC_MINT);
      expect(result.error).toContain(wrongMint);
    });

    it('should fail when no token transfer found in transaction', async () => {
      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [],
            instructions: [
              {
                parsed: {
                  type: 'createAccount', // Not a transfer
                  info: {},
                },
                program: 'system',
                programId: new PublicKey('11111111111111111111111111111111'),
              },
            ],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [],
          postBalances: [],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(20000),
        expectedRecipient: RECIPIENT,
        expectedToken: USDC_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('No token transfer found in transaction');
    });
  });

  describe('verifyPayment - SOL Transfers', () => {
    const SENDER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const RECIPIENT = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
    const SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

    it('should successfully verify SOL transfer with correct amount and recipient', async () => {
      const expectedAmount = BigInt(1000000000); // 1 SOL in lamports

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        blockTime: Date.now(),
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey(SENDER), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey(RECIPIENT), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0], // Sender had 2 SOL, recipient had 0
          postBalances: [999995000, 1000000000], // Sender now has ~1 SOL (minus fee), recipient has 1 SOL
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
      expect(result.transaction).toBe(mockTx);
      expect(result.actualAmount).toBe(expectedAmount);
      expect(result.actualRecipient).toBe(RECIPIENT);
      expect(result.error).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        '✅ SOL payment verified successfully',
        expect.objectContaining({ recipient: RECIPIENT })
      );
    });

    it('should allow small fee discrepancies within tolerance', async () => {
      const expectedAmount = BigInt(1000000000); // 1 SOL
      const actualAmount = BigInt(1000003000); // 1 SOL + 3000 lamports (within 5000 tolerance)

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey(SENDER), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey(RECIPIENT), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0],
          postBalances: [999992000, actualAmount], // Slightly more than expected
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
      expect(result.actualAmount).toBe(actualAmount);
    });

    it('should fail verification when SOL amount is outside tolerance', async () => {
      const expectedAmount = BigInt(1000000000); // 1 SOL
      const actualAmount = BigInt(500000000); // 0.5 SOL (way off)

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey(SENDER), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey(RECIPIENT), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0],
          postBalances: [1499995000, actualAmount],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount,
        expectedRecipient: RECIPIENT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Amount mismatch');
      expect(result.error).toContain(expectedAmount.toString());
      expect(result.error).toContain(actualAmount.toString());
    });

    it('should fail when recipient not found in transaction', async () => {
      const wrongRecipient = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey(SENDER), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey(RECIPIENT), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0],
          postBalances: [999995000, 1000000000],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(1000000000),
        expectedRecipient: wrongRecipient,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Recipient');
      expect(result.error).toContain('not found in transaction');
    });
  });

  describe('verifyPayment - Error Cases', () => {
    const SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

    it('should fail when transaction not found on-chain', async () => {
      mockGetParsedTransaction.mockResolvedValue(null);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(1000000),
        expectedRecipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Transaction not found on blockchain');
      expect(logger.warn).toHaveBeenCalledWith(
        'Transaction not found on-chain',
        { signature: SIGNATURE }
      );
    });

    it('should fail when transaction failed on-chain', async () => {
      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: [SIGNATURE],
        },
        meta: {
          err: { InstructionError: [0, 'Custom'] }, // Transaction failed
          fee: 5000,
          preBalances: [],
          postBalances: [],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(1000000),
        expectedRecipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Transaction failed on-chain');
      expect(result.transaction).toBe(mockTx);
    });

    it('should fail with unsupported network', async () => {
      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(1000000),
        expectedRecipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'invalid-network' as any,
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Unsupported network');
    });

    it('should handle RPC errors gracefully', async () => {
      mockGetParsedTransaction.mockRejectedValue(
        new Error('RPC node timeout')
      );

      const params: PaymentVerification = {
        signature: SIGNATURE,
        expectedAmount: BigInt(1000000),
        expectedRecipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Verification error');
      expect(result.error).toContain('RPC node timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Payment verification failed',
        expect.objectContaining({ signature: SIGNATURE })
      );
    });
  });

  describe('transactionExists', () => {
    const SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

    it('should return true when transaction exists and is confirmed', async () => {
      mockGetSignatureStatus.mockResolvedValue({
        context: { slot: 123456 },
        value: {
          slot: 123456,
          confirmations: 10,
          err: null,
          confirmationStatus: 'confirmed',
        },
      });

      const exists = await verifier.transactionExists(SIGNATURE, 'devnet');

      expect(exists).toBe(true);
    });

    it('should return false when transaction does not exist', async () => {
      mockGetSignatureStatus.mockResolvedValue({
        context: { slot: 123456 },
        value: null, // Transaction not found
      });

      const exists = await verifier.transactionExists(SIGNATURE, 'devnet');

      expect(exists).toBe(false);
    });

    it('should return false for invalid network', async () => {
      const exists = await verifier.transactionExists(SIGNATURE, 'invalid-network');

      expect(exists).toBe(false);
    });

    it('should return false on RPC error', async () => {
      mockGetSignatureStatus.mockRejectedValue(
        new Error('Network error')
      );

      const exists = await verifier.transactionExists(SIGNATURE, 'devnet');

      expect(exists).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to check transaction existence',
        expect.any(Error)
      );
    });
  });

  describe('Multi-network Support', () => {
    it('should verify transaction on mainnet-beta', async () => {
      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: ['sig'],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0],
          postBalances: [999995000, 1000000000],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: 'sig',
        expectedAmount: BigInt(1000000000),
        expectedRecipient: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        network: 'mainnet-beta',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
    });

    it('should verify transaction on testnet', async () => {
      const mockTx: ParsedTransactionWithMeta = {
        slot: 123456,
        transaction: {
          message: {
            accountKeys: [
              { pubkey: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'), signer: true, writable: true, source: 'transaction' },
              { pubkey: new PublicKey('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'), signer: false, writable: true, source: 'transaction' },
            ],
            instructions: [],
            recentBlockhash: 'test',
          },
          signatures: ['sig'],
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [2000000000, 0],
          postBalances: [999995000, 1000000000],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
          rewards: [],
          loadedAddresses: { readonly: [], writable: [] },
          computeUnitsConsumed: 1000,
        },
      } as any;

      mockGetParsedTransaction.mockResolvedValue(mockTx);

      const params: PaymentVerification = {
        signature: 'sig',
        expectedAmount: BigInt(1000000000),
        expectedRecipient: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        network: 'testnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
    });
  });
});

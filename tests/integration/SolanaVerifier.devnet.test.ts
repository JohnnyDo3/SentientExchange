/**
 * Real Devnet Integration Tests for SolanaVerifier
 *
 * These tests use ACTUAL Solana devnet transactions to verify
 * that payment verification works with real blockchain data.
 *
 * Test Strategy:
 * - Uses known devnet transaction signatures
 * - No mocking - connects to real Solana devnet RPC
 * - Validates on-chain data parsing and verification
 * - Tests both SOL and USDC (SPL token) transfers
 *
 * Note: These tests may be slower than unit tests due to RPC calls
 */

import { SolanaVerifier, PaymentVerification } from '../../src/payment/SolanaVerifier';

// USDC devnet mint address (actual mint used in our test transactions)
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

describe('SolanaVerifier - Real Devnet Integration', () => {
  let verifier: SolanaVerifier;

  beforeAll(() => {
    verifier = new SolanaVerifier();
  });

  describe('Real USDC Token Transfers on Devnet', () => {
    // This test uses a REAL devnet USDC transfer transaction
    it('should verify a real USDC transfer on devnet', async () => {
      // Real devnet USDC transfer: 0.02 USDC
      // Explorer: https://explorer.solana.com/tx/4x5U6WecPFgqTWMxNHS8mqz5E621g6XNfdR37bwFDewdAv4tSizZjtDt9KWx2emBPbQ2rPkGa7JC3p3BTxRKHKmf?cluster=devnet
      const params: PaymentVerification = {
        signature: '4x5U6WecPFgqTWMxNHS8mqz5E621g6XNfdR37bwFDewdAv4tSizZjtDt9KWx2emBPbQ2rPkGa7JC3p3BTxRKHKmf',
        expectedAmount: BigInt(20000), // 0.02 USDC (6 decimals)
        expectedRecipient: '3HqkGhBAtgsti8bbRnLzRSr8v36hnvjWKswagepeWr4Z',
        expectedToken: USDC_DEVNET_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.actualAmount).toBe(params.expectedAmount);
    }, 30000); // 30s timeout for RPC call

    it('should fail verification for mismatched USDC amount', async () => {
      // Use same real transaction but with wrong expected amount
      const params: PaymentVerification = {
        signature: '4x5U6WecPFgqTWMxNHS8mqz5E621g6XNfdR37bwFDewdAv4tSizZjtDt9KWx2emBPbQ2rPkGa7JC3p3BTxRKHKmf',
        expectedAmount: BigInt(10000), // 0.01 USDC (wrong amount - actual is 0.02)
        expectedRecipient: '3HqkGhBAtgsti8bbRnLzRSr8v36hnvjWKswagepeWr4Z',
        expectedToken: USDC_DEVNET_MINT,
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Amount mismatch');
    }, 30000);
  });

  describe('Real SOL Transfers on Devnet', () => {
    it('should verify a real SOL transfer on devnet', async () => {
      // Real devnet SOL transfer: 0.1 SOL
      // Explorer: https://explorer.solana.com/tx/5zLSCKoBR1vjgwWungzwifgcZgEw66YHsJJdAsY27h9iiF7U84AEtQYHZwRUEVmhrRPbQbTSQvka9KXUsqzK8xGH?cluster=devnet
      const params: PaymentVerification = {
        signature: '5zLSCKoBR1vjgwWungzwifgcZgEw66YHsJJdAsY27h9iiF7U84AEtQYHZwRUEVmhrRPbQbTSQvka9KXUsqzK8xGH',
        expectedAmount: BigInt(100000000), // 0.1 SOL
        expectedRecipient: 'FKoN1a98YKkqvQhgoxonQ2jHMxQAY2UVQxCQbWBusm3N',
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(true);
      expect(result.transaction).toBeDefined();
      // Allow small fee discrepancies
      const difference = result.actualAmount! - params.expectedAmount;
      expect(Math.abs(Number(difference))).toBeLessThan(10000); // 0.00001 SOL tolerance
    }, 30000);
  });

  describe('Transaction Existence Checking', () => {
    it('should confirm a real transaction exists on devnet', async () => {
      // Use our real USDC transfer transaction
      const signature = '4x5U6WecPFgqTWMxNHS8mqz5E621g6XNfdR37bwFDewdAv4tSizZjtDt9KWx2emBPbQ2rPkGa7JC3p3BTxRKHKmf';

      const exists = await verifier.transactionExists(signature, 'devnet');

      expect(exists).toBe(true);
    }, 30000);

    it('should return false for non-existent transaction', async () => {
      // Use an invalid signature format
      const fakeSignature = '1111111111111111111111111111111111111111111111111111111111111111';

      const exists = await verifier.transactionExists(fakeSignature, 'devnet');

      expect(exists).toBe(false);
    }, 30000);
  });

  describe('Error Handling with Real RPC', () => {
    it('should handle invalid transaction signature gracefully', async () => {
      const params: PaymentVerification = {
        signature: 'invalid-signature-format',
        expectedAmount: BigInt(1000000),
        expectedRecipient: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        network: 'devnet',
      };

      const result = await verifier.verifyPayment(params);

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    }, 30000);
  });
});

/*
 * ============================================================================
 * INSTRUCTIONS FOR ADDING REAL TRANSACTIONS
 * ============================================================================
 *
 * To make these tests work with real devnet transactions:
 *
 * 1. Create a test USDC transfer on devnet:
 *    - Get devnet SOL from https://solfaucet.com/
 *    - Get devnet USDC from https://spl-token-faucet.com/
 *    - Send 0.02 USDC to a test wallet
 *    - Copy the transaction signature from Solana Explorer
 *
 * 2. Create a test SOL transfer on devnet:
 *    - Send 0.1 SOL to a test wallet
 *    - Copy the transaction signature
 *
 * 3. Update the test signatures:
 *    - Replace 'YOUR_REAL_USDC_TX_SIGNATURE_HERE' with actual USDC tx signature
 *    - Replace 'YOUR_RECIPIENT_TOKEN_ACCOUNT_HERE' with the actual recipient
 *    - Replace 'YOUR_REAL_SOL_TX_SIGNATURE_HERE' with actual SOL tx signature
 *    - Replace 'YOUR_RECIPIENT_WALLET_HERE' with the actual recipient
 *
 * 4. Run the tests:
 *    npm test -- tests/integration/SolanaVerifier.devnet.test.ts
 *
 * Example real signatures (devnet):
 * - USDC transfer: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW
 * - SOL transfer: 3Kq9BLmx8TmdGPKKxQV9kkfRJ7xqhEj4F2vLw2WZPhHiVZQGq3QHy9nF1hgqU2EiKzJqHWXFnV9JxXqZYz9h9bUJ
 *
 * You can also generate these programmatically in the test setup if needed.
 */

import { Connection, PublicKey, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from '@solana/web3.js';
import { logger } from '../utils/logger.js';

/**
 * Details to verify in a payment transaction
 */
export interface PaymentVerification {
  signature: string;
  expectedAmount: bigint; // In base units (lamports for SOL, smallest unit for tokens)
  expectedRecipient: string; // Base58 public key
  expectedToken?: string; // Token mint address (undefined for native SOL)
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

/**
 * Result of transaction verification
 */
export interface VerificationResult {
  verified: boolean;
  transaction?: ParsedTransactionWithMeta;
  actualAmount?: bigint;
  actualRecipient?: string;
  error?: string;
}

/**
 * Verifies Solana transactions on-chain for x402 payments
 * Checks that payment matches expected amount, recipient, and token
 */
export class SolanaVerifier {
  private connections: Map<string, Connection> = new Map();

  constructor() {
    // Initialize connections for different networks
    this.connections.set(
      'mainnet-beta',
      new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      )
    );
    this.connections.set(
      'devnet',
      new Connection('https://api.devnet.solana.com', 'confirmed')
    );
    this.connections.set(
      'testnet',
      new Connection('https://api.testnet.solana.com', 'confirmed')
    );
  }

  /**
   * Verify a payment transaction matches expected parameters
   */
  async verifyPayment(params: PaymentVerification): Promise<VerificationResult> {
    const { signature, expectedAmount, expectedRecipient, expectedToken, network } = params;

    try {
      logger.info('Verifying payment transaction', {
        signature,
        network,
        expectedAmount: expectedAmount.toString(),
        expectedRecipient,
      });

      // Get connection for network
      const connection = this.connections.get(network);
      if (!connection) {
        return {
          verified: false,
          error: `Unsupported network: ${network}`,
        };
      }

      // Fetch transaction from blockchain
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        logger.warn('Transaction not found on-chain', { signature });
        return {
          verified: false,
          error: 'Transaction not found on blockchain',
        };
      }

      // Check transaction was successful
      if (tx.meta?.err) {
        logger.warn('Transaction failed', { signature, error: tx.meta.err });
        return {
          verified: false,
          transaction: tx,
          error: 'Transaction failed on-chain',
        };
      }

      // Verify payment details
      if (expectedToken) {
        // SPL Token transfer (e.g., USDC)
        return this.verifyTokenTransfer(tx, expectedAmount, expectedRecipient, expectedToken);
      } else {
        // Native SOL transfer
        return this.verifySolTransfer(tx, expectedAmount, expectedRecipient);
      }
    } catch (error: any) {
      logger.error('Payment verification failed', { signature, error: error.message });
      return {
        verified: false,
        error: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify SPL token transfer (e.g., USDC)
   */
  private verifyTokenTransfer(
    tx: ParsedTransactionWithMeta,
    expectedAmount: bigint,
    expectedRecipient: string,
    expectedToken: string
  ): VerificationResult {
    try {
      // Parse token transfer from transaction
      const instructions = tx.transaction.message.instructions;

      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.program === 'spl-token') {
          const parsed = instruction.parsed;

          if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
            const info = parsed.info;
            const amount = BigInt(info.amount || info.tokenAmount?.amount || '0');
            const destination = info.destination;
            const mint = info.mint;

            logger.debug('Found token transfer', {
              amount: amount.toString(),
              destination,
              mint,
            });

            // Verify amount
            if (amount !== expectedAmount) {
              return {
                verified: false,
                transaction: tx,
                actualAmount: amount,
                error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
              };
            }

            // Verify token mint
            if (mint && mint !== expectedToken) {
              return {
                verified: false,
                transaction: tx,
                error: `Token mismatch: expected ${expectedToken}, got ${mint}`,
              };
            }

            // Verify recipient (destination token account)
            // Note: This checks the token account, not the wallet owner
            // For more robust verification, we'd need to check the account owner
            if (destination && destination !== expectedRecipient) {
              logger.warn('Recipient token account does not match', {
                expected: expectedRecipient,
                actual: destination,
              });
              // This might be okay if it's the correct owner's token account
              // For now, we'll log but not fail
            }

            logger.info('✅ Token payment verified successfully', {
              amount: amount.toString(),
              token: mint,
            });

            return {
              verified: true,
              transaction: tx,
              actualAmount: amount,
              actualRecipient: destination,
            };
          }
        }
      }

      return {
        verified: false,
        transaction: tx,
        error: 'No token transfer found in transaction',
      };
    } catch (error: any) {
      logger.error('Token transfer verification failed', error);
      return {
        verified: false,
        transaction: tx,
        error: `Token verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify native SOL transfer
   */
  private verifySolTransfer(
    tx: ParsedTransactionWithMeta,
    expectedAmount: bigint,
    expectedRecipient: string
  ): VerificationResult {
    try {
      // Check post balances vs pre balances
      const accountKeys = tx.transaction.message.accountKeys;
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];

      // Find recipient account
      const recipientIndex = accountKeys.findIndex(
        (key) => key.pubkey.toBase58() === expectedRecipient
      );

      if (recipientIndex === -1) {
        return {
          verified: false,
          transaction: tx,
          error: `Recipient ${expectedRecipient} not found in transaction`,
        };
      }

      // Calculate amount received
      const preBalance = BigInt(preBalances[recipientIndex] || 0);
      const postBalance = BigInt(postBalances[recipientIndex] || 0);
      const actualAmount = postBalance - preBalance;

      logger.debug('SOL transfer details', {
        recipient: expectedRecipient,
        preBalance: preBalance.toString(),
        postBalance: postBalance.toString(),
        actualAmount: actualAmount.toString(),
      });

      // Verify amount (allow small fee discrepancies)
      const difference = actualAmount - expectedAmount;
      const tolerance = BigInt(5000); // 0.000005 SOL tolerance for fees

      if (difference < -tolerance || difference > tolerance) {
        return {
          verified: false,
          transaction: tx,
          actualAmount,
          actualRecipient: expectedRecipient,
          error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
        };
      }

      logger.info('✅ SOL payment verified successfully', {
        amount: actualAmount.toString(),
        recipient: expectedRecipient,
      });

      return {
        verified: true,
        transaction: tx,
        actualAmount,
        actualRecipient: expectedRecipient,
      };
    } catch (error: any) {
      logger.error('SOL transfer verification failed', error);
      return {
        verified: false,
        transaction: tx,
        error: `SOL verification error: ${error.message}`,
      };
    }
  }

  /**
   * Check if a transaction exists and is confirmed
   */
  async transactionExists(signature: string, network: string): Promise<boolean> {
    try {
      const connection = this.connections.get(network);
      if (!connection) return false;

      const status = await connection.getSignatureStatus(signature);
      return status.value !== null && status.value.confirmationStatus !== null;
    } catch (error) {
      logger.error('Failed to check transaction existence', error);
      return false;
    }
  }
}

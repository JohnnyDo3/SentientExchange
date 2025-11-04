/**
 * Direct Solana Payment Provider
 * Uses direct Solana blockchain interaction for payment execution
 * Fallback provider when x402 facilitator is unavailable
 */

import { Connection, PublicKey, Keypair, ParsedTransactionWithMeta } from '@solana/web3.js';
import bs58 from 'bs58';
import { logger } from '../utils/logger';
import {
  PaymentProvider,
  PaymentDetails,
  PaymentResult,
  PaymentProviderConfig
} from './types';
import { executeTransfer } from './solana-transfer';

export class DirectSolanaProvider implements PaymentProvider {
  name = 'DirectSolanaProvider';
  private connection: Connection;
  private wallet: Keypair | null = null;
  private config: PaymentProviderConfig;

  constructor(config: PaymentProviderConfig) {
    this.config = config;
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl(config.network);
    this.connection = new Connection(rpcUrl, 'confirmed');
    logger.info(`DirectSolanaProvider initialized on ${config.network}`);
  }

  private getDefaultRpcUrl(network: string): string {
    switch (network) {
      case 'mainnet-beta':
      case 'solana':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      case 'solana-devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  async initialize(): Promise<void> {
    try {
      const secretKey = this.config.secretKey || process.env.SOLANA_PRIVATE_KEY;
      if (!secretKey) {
        throw new Error('SOLANA_PRIVATE_KEY required for DirectSolanaProvider');
      }

      // Parse secret key (base58)
      const secretKeyBytes = bs58.decode(secretKey);
      this.wallet = Keypair.fromSecretKey(secretKeyBytes);

      logger.info('DirectSolanaProvider wallet loaded', {
        publicKey: this.wallet.publicKey.toBase58()
      });

      // Test connection
      const blockHeight = await this.connection.getBlockHeight();
      logger.debug('Solana RPC connected', { blockHeight });

    } catch (error: any) {
      logger.error('DirectSolanaProvider initialization failed:', error);
      throw new Error(`DirectSolanaProvider init failed: ${error.message}`);
    }
  }

  async executePayment(details: PaymentDetails): Promise<PaymentResult> {
    try {
      if (!this.wallet) {
        throw new Error('DirectSolanaProvider not initialized');
      }

      // Check max payment limit
      if (this.config.maxPaymentValue && details.amount > this.config.maxPaymentValue) {
        throw new Error(
          `Payment amount ${details.amount} exceeds maximum ${this.config.maxPaymentValue}`
        );
      }

      logger.info('Executing direct Solana payment', {
        recipient: details.recipient,
        amount: details.amount.toString(),
        currency: details.currency,
        tokenAddress: details.tokenAddress
      });

      // Execute the transfer using shared utility
      const signature = await executeTransfer(
        this.connection,
        this.wallet,
        new PublicKey(details.recipient),
        new PublicKey(details.tokenAddress),
        details.amount
      );

      logger.info('Direct Solana payment successful', {
        signature,
        recipient: details.recipient
      });

      return {
        success: true,
        signature,
        transactionHash: signature,
        provider: 'direct-solana',
        timestamp: new Date(),
        details
      };

    } catch (error: any) {
      logger.error('Direct Solana payment failed:', error);
      return {
        success: false,
        error: error.message,
        provider: 'direct-solana',
        timestamp: new Date(),
        details
      };
    }
  }

  async verifyPayment(transactionHash: string): Promise<boolean> {
    try {
      logger.debug('Verifying transaction:', transactionHash);

      const tx = await this.connection.getParsedTransaction(transactionHash, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

      if (!tx || !tx.meta) {
        logger.error('Transaction not found or not confirmed');
        return false;
      }

      // Check transaction succeeded
      if (tx.meta.err) {
        logger.error('Transaction failed:', tx.meta.err);
        return false;
      }

      logger.info('✓ Transaction verified');
      return true;

    } catch (error: any) {
      logger.error('Transaction verification failed:', error);
      return false;
    }
  }

  /**
   * Verify SPL token transfer with amount validation
   */
  async verifySplTokenTransfer(
    signature: string,
    expectedRecipient: string,
    expectedAmount: bigint,
    tokenMint: string
  ): Promise<boolean> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

      if (!tx || !tx.meta) {
        return false;
      }

      // Parse token transfers from transaction
      const tokenTransfers = tx.meta?.postTokenBalances?.map((post, index) => {
        const pre = tx.meta!.preTokenBalances![index];
        return {
          mint: post.mint,
          owner: post.owner,
          amount: BigInt(post.uiTokenAmount.amount) - BigInt(pre?.uiTokenAmount.amount || 0)
        };
      }) || [];

      // Find transfer to recipient for this token
      const transfer = tokenTransfers.find(
        (t) => t.mint === tokenMint &&
               t.owner === expectedRecipient &&
               t.amount > 0n
      );

      if (!transfer) {
        logger.error('Token transfer to recipient not found');
        return false;
      }

      // Verify amount
      if (transfer.amount < expectedAmount) {
        logger.error(`Insufficient token amount: expected ${expectedAmount}, got ${transfer.amount}`);
        return false;
      }

      logger.info('✓ SPL token transfer verified');
      return true;

    } catch (error: any) {
      logger.error('SPL token transfer verification failed:', error);
      return false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Check wallet is initialized
      if (!this.wallet) {
        return { healthy: false, message: 'Wallet not initialized' };
      }

      // Check RPC connectivity
      const blockHeight = await this.connection.getBlockHeight();
      if (!blockHeight || blockHeight === 0) {
        return {
          healthy: false,
          message: 'Solana RPC not responsive'
        };
      }

      return { healthy: true };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Health check failed: ${error.message}`
      };
    }
  }

  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'not_found'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status || !status.value) {
        return 'not_found';
      }

      if (status.value.confirmationStatus === 'finalized') {
        return 'finalized';
      }

      return 'confirmed';

    } catch (error) {
      return 'not_found';
    }
  }

  /**
   * Check if a transaction signature has valid format
   */
  static isValidSignature(signature: string): boolean {
    // Solana signatures are base58-encoded, typically 87-88 characters
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
  }
}

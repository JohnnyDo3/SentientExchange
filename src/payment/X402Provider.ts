/**
 * X402 Payment Provider
 * Uses x402 protocol with PayAI facilitator for automatic payment handling
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { logger } from '../utils/logger';
import {
  PaymentProvider,
  PaymentDetails,
  PaymentResult,
  PaymentProviderConfig
} from './types';

export class X402Provider implements PaymentProvider {
  name = 'X402Provider';
  private keypair: Keypair | null = null;
  private walletPublicKey: string | null = null;
  private config: PaymentProviderConfig;
  private facilitatorUrl: string;
  private connection: Connection | null = null;

  constructor(config: PaymentProviderConfig) {
    this.config = config;
    // Default to PayAI facilitator
    this.facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';
  }

  async initialize(): Promise<void> {
    try {
      const network = this.config.network as any;

      // For Solana networks, create keypair from secret key
      if (network.includes('solana')) {
        const secretKey = this.config.secretKey || process.env.SOLANA_PRIVATE_KEY;
        if (!secretKey) {
          throw new Error('SOLANA_PRIVATE_KEY required for Solana payments');
        }

        // Parse secret key (base58)
        const secretKeyBytes = bs58.decode(secretKey);
        this.keypair = Keypair.fromSecretKey(secretKeyBytes);
        this.walletPublicKey = this.keypair.publicKey.toBase58();

        // Initialize Solana connection
        const rpcUrl = this.config.rpcUrl ||
          (network === 'solana'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com');
        this.connection = new Connection(rpcUrl, 'confirmed');

        logger.info(`X402Provider initialized for ${network}`, {
          walletAddress: this.walletPublicKey,
          facilitator: this.facilitatorUrl
        });
      } else {
        // For EVM networks
        throw new Error('EVM networks not yet implemented in X402Provider');
      }
    } catch (error: any) {
      logger.error('X402Provider initialization failed:', error);
      throw new Error(`X402Provider init failed: ${error.message}`);
    }
  }

  async executePayment(details: PaymentDetails): Promise<PaymentResult> {
    const startTime = Date.now();

    try {
      if (!this.keypair) {
        throw new Error('X402Provider not initialized');
      }

      // Check max payment limit
      if (this.config.maxPaymentValue && details.amount > this.config.maxPaymentValue) {
        throw new Error(
          `Payment amount ${details.amount} exceeds maximum ${this.config.maxPaymentValue}`
        );
      }

      logger.info('Executing x402 payment', {
        recipient: details.recipient,
        amount: details.amount.toString(),
        currency: details.currency,
        network: details.network
      });

      // For Solana payments, use x402 Solana implementation
      if (details.network.includes('solana')) {
        const result = await this.executeSolanaPayment(details);
        return result;
      } else {
        // For EVM payments
        throw new Error('EVM payments not yet implemented in X402Provider');
      }
    } catch (error: any) {
      logger.error('X402 payment execution failed:', error);
      return {
        success: false,
        error: error.message,
        provider: 'x402',
        timestamp: new Date(),
        details
      };
    }
  }

  private async executeSolanaPayment(details: PaymentDetails): Promise<PaymentResult> {
    try {
      if (!this.connection) {
        throw new Error('Solana connection not initialized');
      }

      // Use facilitator to verify and settle payment
      // This is where PayAI facilitator handles the complexity

      // Step 1: Verify payment details with facilitator
      const verifyResponse = await axios.post(`${this.facilitatorUrl}/verify`, {
        recipient: details.recipient,
        amount: details.amount.toString(),
        currency: details.currency,
        tokenAddress: details.tokenAddress,
        network: details.network
      });

      if (!verifyResponse.data.valid) {
        throw new Error('Payment details verification failed');
      }

      // Step 2: Create and sign transaction using x402 signer
      // The x402 SDK handles the transaction creation and signing

      // For now, we'll use a simplified direct approach
      // In production, this would use the full x402 protocol flow

      const secretKey = this.config.secretKey || process.env.SOLANA_PRIVATE_KEY;
      if (!secretKey) {
        throw new Error('SOLANA_PRIVATE_KEY required');
      }

      // Use Solana payment coordinator logic with PayAI facilitator
      // The x402 protocol would normally involve:
      // 1. Facilitator verification
      // 2. Transaction signing with x402 payload
      // 3. Settlement via facilitator

      // For now, using direct Solana transfer
      // TODO: Integrate full x402 protocol flow
      if (!this.keypair) {
        throw new Error('Keypair not initialized');
      }

      const { executeTransfer } = await import('./solana-transfer');
      const signature = await executeTransfer(
        this.connection,
        this.keypair,
        new PublicKey(details.recipient),
        new PublicKey(details.tokenAddress),
        details.amount
      );

      logger.info('X402 Solana payment successful', {
        signature,
        recipient: details.recipient,
        amount: details.amount.toString()
      });

      return {
        success: true,
        signature,
        transactionHash: signature,
        provider: 'x402',
        timestamp: new Date(),
        details
      };

    } catch (error: any) {
      logger.error('Solana payment execution failed:', error);
      throw error;
    }
  }

  async verifyPayment(transactionHash: string): Promise<boolean> {
    try {
      if (!this.connection) {
        logger.warn('Cannot verify payment: Solana connection not initialized');
        return false;
      }

      // For Solana, check transaction status
      const status = await this.connection.getSignatureStatus(transactionHash);

      if (!status || !status.value) {
        return false;
      }

      // Transaction is confirmed if it has a confirmation status and no errors
      return status.value.confirmationStatus === 'confirmed' ||
             status.value.confirmationStatus === 'finalized';

    } catch (error: any) {
      logger.error('Payment verification failed:', error);
      return false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Check keypair is initialized
      if (!this.keypair) {
        return { healthy: false, message: 'Keypair not initialized' };
      }

      // Check facilitator connectivity
      const response = await axios.get(`${this.facilitatorUrl}/list`, {
        timeout: 5000
      });

      if (response.status !== 200) {
        return {
          healthy: false,
          message: `Facilitator returned status ${response.status}`
        };
      }

      // Check Solana RPC if available
      if (this.connection) {
        const blockHeight = await this.connection.getBlockHeight();
        if (!blockHeight || blockHeight === 0) {
          return {
            healthy: false,
            message: 'Solana RPC not responsive'
          };
        }
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
    if (!this.walletPublicKey) {
      throw new Error('Wallet not initialized');
    }
    return this.walletPublicKey;
  }
}

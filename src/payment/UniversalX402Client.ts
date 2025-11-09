import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { SolanaPaymentCoordinator, X402PaymentDetails } from './SolanaPaymentCoordinator.js';
import { SpendingLimitManager } from './SpendingLimitManager.js';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';

export interface FetchWithAutopayOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  maxPayment?: string; // Max amount user is willing to pay (in USDC)
  autopayThreshold?: string; // Auto-pay if under this amount, else ask permission
  timeout?: number; // Request timeout in ms
}

export interface FetchWithAutopayResult {
  success: boolean;
  data?: any;
  statusCode?: number;
  paymentExecuted: boolean;
  paymentAmount?: string;
  paymentRecipient?: string;
  paymentSignature?: string;
  error?: string;
  healthCheckPassed: boolean;
  needsUserApproval?: boolean; // True if cost exceeds autopay threshold
  paymentDetails?: X402PaymentDetails; // Returned if needs approval
}

/**
 * UniversalX402Client
 *
 * Fetches ANY URL with automatic x402 payment handling.
 * CRITICAL: Always performs health check before payment to avoid wasting funds.
 */
export class UniversalX402Client {
  private paymentCoordinator: SolanaPaymentCoordinator;
  private spendingLimitManager?: SpendingLimitManager;
  private userId: string;

  constructor(
    paymentCoordinator: SolanaPaymentCoordinator,
    userId: string = 'default',
    spendingLimitManager?: SpendingLimitManager
  ) {
    this.paymentCoordinator = paymentCoordinator;
    this.userId = userId;
    this.spendingLimitManager = spendingLimitManager;
  }

  /**
   * MANDATORY: Health check before payment
   * Performs HEAD request to verify URL is reachable
   */
  private async checkUrlHealth(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      logger.info(`🏥 Health check: ${url}`);

      const response = await axios.head(url, {
        timeout,
        validateStatus: (status) => status < 500 // Accept 402, 401, etc. but not 5xx
      });

      const isHealthy = response.status < 500;

      if (isHealthy) {
        logger.info(`✓ URL is healthy (status ${response.status})`);
      } else {
        logger.error(`✗ URL is unhealthy (status ${response.status})`);
      }

      return isHealthy;

    } catch (error: any) {
      logger.error(`✗ Health check failed for ${url}:`, error.message);
      return false;
    }
  }

  /**
   * Fetch URL with automatic x402 payment handling
   *
   * Flow:
   * 1. Health check (HEAD request)
   * 2. Make request
   * 3. If 402, parse payment details
   * 4. Check spending limits
   * 5. Check autopay threshold
   * 6. If under threshold: auto-pay
   * 7. If over threshold: return needsUserApproval=true
   * 8. Execute payment
   * 9. Retry with payment proof
   * 10. Return result
   */
  async fetchWithAutopay(
    url: string,
    options: FetchWithAutopayOptions = {}
  ): Promise<FetchWithAutopayResult> {
    const {
      method = 'GET',
      data,
      headers = {},
      maxPayment = '10.00', // Default max: $10
      autopayThreshold = '0.50', // Default autopay threshold: $0.50
      timeout = 30000
    } = options;

    // STEP 1: MANDATORY HEALTH CHECK
    const isHealthy = await this.checkUrlHealth(url, 5000);

    if (!isHealthy) {
      logger.warn(`⚠️  URL failed health check - aborting to protect user funds`);
      return {
        success: false,
        error: 'URL failed health check - service may be down',
        paymentExecuted: false,
        healthCheckPassed: false
      };
    }

    // STEP 2: Make initial request
    try {
      logger.info(`🌐 ${method} ${url}`);

      const config: AxiosRequestConfig = {
        method,
        url,
        data,
        headers: {
          ...headers,
          'User-Agent': 'AgentMarket/1.0 (AI Agent with x402 support)'
        },
        timeout,
        validateStatus: () => true // Accept all status codes (including 402)
      };

      const response = await axios(config);

      // STEP 3: Success - no payment needed
      if (response.status === 200) {
        logger.info(`✓ Request successful (no payment required)`);
        return {
          success: true,
          data: response.data,
          statusCode: 200,
          paymentExecuted: false,
          healthCheckPassed: true
        };
      }

      // STEP 4: Handle 402 Payment Required
      if (response.status === 402) {
        logger.info('💳 402 Payment Required detected');

        // Parse x402 payment details from response headers/body
        const paymentDetails = this.parseX402Response(response);

        if (!paymentDetails) {
          return {
            success: false,
            error: '402 response missing payment details',
            paymentExecuted: false,
            healthCheckPassed: true
          };
        }

        // Get payment amount
        const paymentAmount = this.extractPaymentAmount(paymentDetails);
        const recipient = this.extractRecipient(paymentDetails);

        logger.info(`Payment required: $${paymentAmount} to ${recipient}`);

        // STEP 5: Check spending limits
        if (this.spendingLimitManager) {
          const limitCheck = await this.spendingLimitManager.checkLimit(
            this.userId,
            paymentAmount
          );

          if (!limitCheck.allowed) {
            logger.warn(`⚠️  Payment blocked: ${limitCheck.reason}`);
            return {
              success: false,
              error: `Payment blocked: ${limitCheck.reason}`,
              paymentExecuted: false,
              healthCheckPassed: true
            };
          }
        }

        // Check max payment
        if (parseFloat(paymentAmount) > parseFloat(maxPayment)) {
          logger.warn(`⚠️  Payment amount ($${paymentAmount}) exceeds max ($${maxPayment})`);
          return {
            success: false,
            error: `Payment amount ($${paymentAmount}) exceeds maximum allowed ($${maxPayment})`,
            paymentExecuted: false,
            healthCheckPassed: true
          };
        }

        // STEP 6: Check autopay threshold
        if (parseFloat(paymentAmount) > parseFloat(autopayThreshold)) {
          logger.info(`💡 Payment ($${paymentAmount}) exceeds autopay threshold ($${autopayThreshold}) - user approval needed`);
          return {
            success: false,
            paymentExecuted: false,
            healthCheckPassed: true,
            needsUserApproval: true,
            paymentAmount,
            paymentRecipient: recipient,
            paymentDetails
          };
        }

        // STEP 7: Execute payment (auto-pay)
        logger.info(`💸 Auto-paying $${paymentAmount} (under threshold)`);

        try {
          const signature = await this.paymentCoordinator.executePayment(
            paymentDetails,
            recipient
          );

          logger.info(`✓ Payment executed: ${signature}`);

          // STEP 8: Verify payment on-chain
          const verified = await this.paymentCoordinator.verifyTransaction(
            signature,
            recipient,
            this.convertToBaseUnits(paymentAmount),
            this.extractTokenMint(paymentDetails)
          );

          if (!verified) {
            throw new Error('Payment verification failed');
          }

          // STEP 9: Retry request with payment proof
          const paymentProof = this.generatePaymentProof(signature, recipient, paymentAmount);

          const retryResponse = await axios({
            ...config,
            headers: {
              ...config.headers,
              'X-Payment': paymentProof
            }
          });

          if (retryResponse.status === 200) {
            logger.info('✓ Request successful with payment');
            return {
              success: true,
              data: retryResponse.data,
              statusCode: 200,
              paymentExecuted: true,
              paymentAmount,
              paymentRecipient: recipient,
              paymentSignature: signature,
              healthCheckPassed: true
            };
          } else {
            logger.error(`Request failed after payment: ${retryResponse.status}`);
            return {
              success: false,
              error: `Request failed after payment (status ${retryResponse.status})`,
              paymentExecuted: true,
              paymentAmount,
              paymentSignature: signature,
              healthCheckPassed: true
            };
          }

        } catch (paymentError: any) {
          logger.error('Payment execution failed:', paymentError.message);
          return {
            success: false,
            error: `Payment failed: ${paymentError.message}`,
            paymentExecuted: false,
            healthCheckPassed: true
          };
        }
      }

      // Other status codes (404, 401, etc.)
      return {
        success: false,
        error: `Request failed with status ${response.status}`,
        statusCode: response.status,
        paymentExecuted: false,
        healthCheckPassed: true
      };

    } catch (error: any) {
      logger.error('Fetch failed:', error.message);
      return {
        success: false,
        error: error.message,
        paymentExecuted: false,
        healthCheckPassed: true
      };
    }
  }

  /**
   * Parse x402 payment details from 402 response
   */
  private parseX402Response(response: AxiosResponse): X402PaymentDetails | null {
    try {
      // Check X-Accept-Payment header (standard x402)
      const acceptPaymentHeader = response.headers['x-accept-payment'];

      if (acceptPaymentHeader) {
        return JSON.parse(acceptPaymentHeader);
      }

      // Check response body
      if (response.data && response.data.accepts) {
        return response.data as X402PaymentDetails;
      }

      return null;

    } catch (error) {
      logger.error('Failed to parse x402 response:', error);
      return null;
    }
  }

  /**
   * Extract payment amount from payment details
   */
  private extractPaymentAmount(details: X402PaymentDetails): string {
    const solanaPayment = details.accepts.find((a) => {
      const chain = a.chainId || a.network || '';
      return chain.includes('solana') || chain === 'devnet' || chain === 'mainnet-beta';
    });

    const amountInBaseUnits = solanaPayment?.amount || solanaPayment?.maxAmountRequired || '0';

    // Convert from base units to USDC (6 decimals)
    const decimals = 6;
    return (parseFloat(amountInBaseUnits) / Math.pow(10, decimals)).toFixed(2);
  }

  /**
   * Extract recipient address
   */
  private extractRecipient(details: X402PaymentDetails): string {
    const solanaPayment = details.accepts.find((a) => {
      const chain = a.chainId || a.network || '';
      return chain.includes('solana');
    });

    return solanaPayment?.receiverAddress || solanaPayment?.payTo || details.payTo || '';
  }

  /**
   * Extract token mint address
   */
  private extractTokenMint(details: X402PaymentDetails): string {
    const solanaPayment = details.accepts.find((a) => {
      const chain = a.chainId || a.network || '';
      return chain.includes('solana');
    });

    return solanaPayment?.tokenAddress || solanaPayment?.asset || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mainnet
  }

  /**
   * Convert USDC amount to base units (multiply by 10^6)
   */
  private convertToBaseUnits(usdcAmount: string): string {
    const decimals = 6;
    return (parseFloat(usdcAmount) * Math.pow(10, decimals)).toString();
  }

  /**
   * Generate JWT payment proof
   */
  private generatePaymentProof(signature: string, recipient: string, amount: string): string {
    const secret = process.env.JWT_SECRET || 'agentmarket-secret';

    return jwt.sign(
      {
        signature,
        recipient,
        amount,
        timestamp: Date.now()
      },
      secret,
      { expiresIn: '1h' }
    );
  }
}

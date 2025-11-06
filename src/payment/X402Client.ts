import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { Transaction } from '../types';
import { WalletManager } from './WalletManager';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';

/**
 * x402 Payment Client
 *
 * Handles HTTP 402 Payment Required flow for micropayment services.
 * Implements the complete 3-step x402 protocol:
 * 1. Initial request → 402 response with payment requirements
 * 2. Execute blockchain payment
 * 3. Retry request with payment proof in X-Payment header
 */

export class X402Client {
  private wallet: WalletManager;
  private http: AxiosInstance;

  constructor(wallet: WalletManager) {
    this.wallet = wallet;

    // Configure axios to not throw on 402 status
    this.http = axios.create({
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 600, // Don't throw on any status < 600
    });
  }

  /**
   * Make a request to an x402-enabled service with automatic payment handling
   *
   * @param endpoint - Service endpoint URL
   * @param method - HTTP method (GET, POST, etc.)
   * @param data - Request payload
   * @param maxPayment - Maximum acceptable payment (e.g., "$0.05")
   * @returns Transaction object with request, response, and payment details
   */
  async makePayment(
    endpoint: string,
    method: string,
    data: Record<string, unknown>,
    maxPayment: string
  ): Promise<Transaction> {
    // Ensure wallet is initialized
    if (!this.wallet.isReady()) {
      await this.wallet.initialize();
    }

    // Get buyer address (async operation)
    const buyerAddress = await this.wallet.getAddress();

    // Initialize transaction record
    const transaction: Transaction = {
      id: randomUUID(),
      serviceId: '', // Will be filled by caller
      buyer: buyerAddress,
      seller: '', // Will be filled from 402 response
      amount: '0',
      currency: 'USDC',
      status: 'pending',
      request: {
        method,
        endpoint,
        payload: data,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // ============================================================
      // STEP 1: Make initial request (expect 402 Payment Required)
      // ============================================================
      logger.info(`[x402] Step 1: Making initial request to ${endpoint}`);

      const initialResponse = await this.http.request({
        method,
        url: endpoint,
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info(`[x402] Received status: ${initialResponse.status}`);

      // ============================================================
      // Handle 402 Payment Required response
      // ============================================================
      if (initialResponse.status === 402) {
        logger.info('[x402] Step 2: Processing 402 Payment Required response');

        // Parse payment requirements from 402 response
        const paymentInfo = initialResponse.data;

        if (!paymentInfo.accepts || paymentInfo.accepts.length === 0) {
          throw new Error('Invalid 402 response: no payment methods accepted');
        }

        // Use the first accepted payment method
        const acceptedPayment = paymentInfo.accepts[0];

        // Extract payment details
        transaction.seller = acceptedPayment.payTo;

        // Convert micro-USDC to USDC (divide by 1,000,000)
        const microUsdcAmount = parseInt(acceptedPayment.maxAmountRequired);
        const usdcAmount = (microUsdcAmount / 1_000_000).toFixed(6);
        transaction.amount = usdcAmount;

        logger.info(`[x402] Payment required: ${transaction.amount} USDC to ${transaction.seller}`);

        // ============================================================
        // Verify price is acceptable
        // ============================================================
        const requestedPrice = parseFloat(transaction.amount);
        const maxPrice = parseFloat(maxPayment.replace('$', ''));

        if (requestedPrice > maxPrice) {
          transaction.status = 'failed';
          transaction.error = `Price ${requestedPrice} USDC exceeds maximum ${maxPrice} USDC`;
          logger.error(`[x402] ${transaction.error}`);
          return transaction;
        }

        logger.info(`[x402] Price ${requestedPrice} USDC is acceptable (max: ${maxPrice} USDC)`);

        // ============================================================
        // STEP 2: Execute blockchain payment
        // ============================================================
        logger.info('[x402] Step 3: Executing USDC payment on blockchain');

        const paymentHash = await this.wallet.transferUsdc(
          acceptedPayment.payTo,
          usdcAmount
        );

        transaction.paymentHash = paymentHash;
        logger.info(`[x402] Payment completed. Transaction hash: ${paymentHash}`);

        // ============================================================
        // STEP 3: Retry request with payment proof
        // ============================================================
        logger.info('[x402] Step 4: Retrying request with payment proof');

        const startTime = Date.now();

        const paidResponse = await this.http.request({
          method,
          url: endpoint,
          data,
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': JSON.stringify({
              network: acceptedPayment.network,
              txHash: paymentHash,
              from: buyerAddress,
              to: acceptedPayment.payTo,
              amount: acceptedPayment.maxAmountRequired,
              asset: acceptedPayment.asset,
            }),
          },
        });

        const responseTime = Date.now() - startTime;

        // Record response
        transaction.response = {
          status: paidResponse.status,
          data: paidResponse.data,
          responseTime,
        };

        // Update transaction status
        if (paidResponse.status === 200) {
          transaction.status = 'completed';
          logger.info(`[x402] Request completed successfully in ${responseTime}ms`);
        } else {
          transaction.status = 'failed';
          transaction.error = `Service returned status ${paidResponse.status} after payment`;
          logger.error(`[x402] ${transaction.error}`);
        }

      }
      // ============================================================
      // Handle 200 OK (service doesn't require payment)
      // ============================================================
      else if (initialResponse.status === 200) {
        logger.info('[x402] Service returned 200 OK - no payment required');

        transaction.response = {
          status: 200,
          data: initialResponse.data,
          responseTime: 0,
        };
        transaction.status = 'completed';
      }
      // ============================================================
      // Handle other status codes
      // ============================================================
      else {
        transaction.status = 'failed';
        transaction.error = `Unexpected status code: ${initialResponse.status}`;
        transaction.response = {
          status: initialResponse.status,
          data: initialResponse.data,
          responseTime: 0,
        };
        logger.error(`[x402] ${transaction.error}`);
      }

    } catch (error: unknown) {
      // Handle network errors, payment failures, etc.
      const message = getErrorMessage(error);
      transaction.status = 'failed';
      transaction.error = message;
      logger.error(`[x402] Transaction failed: ${message}`);
    }

    return transaction;
  }

  /**
   * Check if a service endpoint supports x402 payments
   * Makes a HEAD request to check for x402 support
   */
  async supportsX402(endpoint: string): Promise<boolean> {
    try {
      const response = await this.http.head(endpoint);
      return response.headers['x-payment-required'] === 'true' ||
             response.status === 402;
    } catch (error) {
      return false;
    }
  }
}

import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SolanaVerifier } from '../payment/SolanaVerifier';
import { Database } from '../registry/database';
import axios from 'axios';
import bs58 from 'bs58';

/**
 * Arguments for submit_payment tool
 */
export interface SubmitPaymentArgs {
  transactionId: string;
  signature: string;
  serviceId: string;
  requestData: Record<string, unknown>;
}

/**
 * Validation schema for submit_payment
 */
const submitPaymentSchema = Joi.object({
  transactionId: Joi.string().required().description('Transaction ID from purchase_service'),
  signature: Joi.string().required().description('Transaction signature from execute_payment'),
  serviceId: Joi.string().required().description('Service ID from payment instruction'),
  requestData: Joi.object().required().description('Original request data for the service')
});

/**
 * Submit payment and complete service purchase
 *
 * Client has executed payment and provides transaction signature.
 * This tool verifies the payment on-chain using SolanaVerifier and retries the service request.
 *
 * @param registry - Service registry instance
 * @param verifier - Solana blockchain verifier
 * @param db - Database instance
 * @param args - Transaction signature and service details
 * @returns MCP response with service result or error
 */
export async function submitPayment(
  registry: ServiceRegistry,
  verifier: SolanaVerifier,
  db: Database,
  args: SubmitPaymentArgs
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Validate arguments
    const { error, value } = submitPaymentSchema.validate(args);
    if (error) {
      logger.error('Invalid arguments for submit_payment:', error.details);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.details[0].message })
        }],
        isError: true
      };
    }

    const { transactionId, signature, serviceId, requestData } = value;

    logger.info(`Submitting payment for transaction: ${transactionId}`);
    logger.info(`Service ID: ${serviceId}`);
    logger.info(`Transaction signature: ${signature}`);

    // Validate signature format (basic check)
    try {
      bs58.decode(signature);
    } catch {
      logger.error('Invalid transaction signature format');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Invalid transaction signature format. Expected base58-encoded Solana signature.'
          })
        }],
        isError: true
      };
    }

    // Get service details
    const service = await registry.getService(serviceId);
    if (!service) {
      logger.error(`Service not found: ${serviceId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Service not found: ${serviceId}` })
        }],
        isError: true
      };
    }

    // Verify payment on-chain
    logger.info('🔍 Verifying payment on blockchain...');

    const priceString = (service.pricing.perRequest || service.pricing.amount || "0").replace('$', '');
    const priceInCents = Math.round(parseFloat(priceString) * 100); // Convert dollars to cents
    const priceInTokenUnits = BigInt(priceInCents * 10000); // USDC has 6 decimals, so $0.01 = 10000 units

    const verificationResult = await verifier.verifyPayment({
      signature,
      expectedAmount: priceInTokenUnits,
      expectedRecipient: service.provider, // Service provider's wallet address
      expectedToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC devnet
      network: (service.pricing.network || process.env.NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet',
    });

    if (!verificationResult.verified) {
      logger.error('❌ Payment verification failed:', verificationResult.error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Payment verification failed',
            details: verificationResult.error,
            transactionId,
            signature,
          })
        }],
        isError: true
      };
    }

    logger.info('✅ Payment verified successfully on-chain');

    // Retry service request with payment proof (X-Payment header)
    logger.info(`Retrying service request with payment proof...`);
    logger.info(`Service endpoint: ${service.endpoint}`);

    // Construct payment proof object for x402 protocol
    const paymentProof = {
      network: service.pricing.network || 'solana-devnet',
      txHash: signature,
      from: 'client-wallet', // Client manages their own wallet
      to: service.provider,
      amount: (service.pricing.perRequest || service.pricing.amount || "0").replace('$', ''), // Remove $ sign
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Solana USDC
    };

    try {
      const response = await axios.post(
        service.endpoint,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': JSON.stringify(paymentProof)
          },
          timeout: 30000 // 30 second timeout
        }
      );

      logger.info('Service request successful');

      // Log successful transaction
      await db.run(
        `INSERT INTO transactions (
          id, serviceId, buyer, seller, amount, currency, status,
          request, response, paymentHash, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          serviceId,
          'client-wallet', // Client manages their own wallet
          service.provider,
          (service.pricing.perRequest || service.pricing.amount || "0"),
          'USDC',
          'completed',
          JSON.stringify(requestData),
          JSON.stringify(response.data),
          signature,
          new Date().toISOString()
        ]
      );

      // TODO: Update service reputation (increment total jobs)
      // For now, reputation updates happen via rate_service tool

      logger.info('Transaction logged successfully');

      // Return service result
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            serviceResult: response.data,
            payment: {
              transactionId,
              signature,
              amount: (service.pricing.perRequest || service.pricing.amount || "0"),
              status: 'confirmed'
            }
          }, null, 2)
        }]
      };

    } catch (serviceError: unknown) {
      const errorMessage = getErrorMessage(serviceError);
      logger.error('Service request failed after payment:', errorMessage);

      // Log failed transaction
      await db.run(
        `INSERT INTO transactions (
          id, serviceId, buyer, seller, amount, currency, status,
          request, response, paymentHash, error, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId + '-failed',
          serviceId,
          'client-wallet',
          service.provider,
          (service.pricing.perRequest || service.pricing.amount || "0"),
          'USDC',
          'failed',
          JSON.stringify(requestData),
          null,
          signature,
          errorMessage,
          new Date().toISOString()
        ]
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service request failed after payment',
            details: (serviceError && typeof serviceError === 'object' && 'response' in serviceError && serviceError.response && typeof serviceError.response === 'object' && 'data' in serviceError.response ? serviceError.response.data : null) || errorMessage,
            payment: {
              transactionId,
              signature,
              amount: (service.pricing.perRequest || service.pricing.amount || "0"),
              status: 'confirmed',
              note: 'Payment was successful but service failed. Contact service provider for refund.'
            }
          })
        }],
        isError: true
      };
    }

  } catch (error: unknown) {
    logger.error('Error in submit_payment:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error) || 'Unknown error during payment submission'
        })
      }],
      isError: true
    };
  }
}

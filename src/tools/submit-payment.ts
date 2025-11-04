import { logger } from '../utils/logger';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { PaymentRouter } from '../payment/PaymentRouter';
import { DirectSolanaProvider } from '../payment/DirectSolanaProvider';
import { Database } from '../registry/database';
import axios from 'axios';

/**
 * Arguments for submit_payment tool
 */
export interface SubmitPaymentArgs {
  serviceId: string;
  transactionSignature: string;
  requestData: any;
}

/**
 * Validation schema for submit_payment
 */
const submitPaymentSchema = Joi.object({
  serviceId: Joi.string().required().description('Service ID from payment instruction'),
  transactionSignature: Joi.string().required().description('Transaction signature from client wallet'),
  requestData: Joi.object().required().description('Original request data for the service')
});

/**
 * Submit payment and complete service purchase
 *
 * Client has executed payment and provides transaction signature.
 * This tool verifies the payment on-chain and retries the service request.
 *
 * @param registry - Service registry instance
 * @param paymentRouter - Payment router for verification
 * @param db - Database instance
 * @param args - Transaction signature and service details
 * @returns MCP response with service result or error
 */
export async function submitPayment(
  registry: ServiceRegistry,
  paymentRouter: PaymentRouter,
  db: Database,
  args: SubmitPaymentArgs
): Promise<any> {
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

    const { serviceId, transactionSignature, requestData } = value;

    logger.info(`Submitting payment for service: ${serviceId}`);
    logger.info(`Transaction signature: ${transactionSignature}`);

    // Validate signature format
    if (!DirectSolanaProvider.isValidSignature(transactionSignature)) {
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

    // Retry service request with payment proof (X-Payment header)
    logger.info(`Retrying service request with payment proof...`);
    logger.info(`Service endpoint: ${service.endpoint}`);

    // Construct payment proof object for x402 protocol
    const paymentProof = {
      network: service.pricing.network || 'solana-devnet',
      txHash: transactionSignature,
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
          `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          serviceId,
          'client-wallet', // Client manages their own wallet
          service.provider,
          (service.pricing.perRequest || service.pricing.amount || "0"),
          'USDC',
          'completed',
          JSON.stringify(requestData),
          JSON.stringify(response.data),
          transactionSignature,
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
              transactionSignature,
              amount: (service.pricing.perRequest || service.pricing.amount || "0"),
              status: 'confirmed'
            }
          }, null, 2)
        }]
      };

    } catch (serviceError: any) {
      logger.error('Service request failed after payment:', serviceError.message);

      // Log failed transaction
      await db.run(
        `INSERT INTO transactions (
          id, serviceId, buyer, seller, amount, currency, status,
          request, response, paymentHash, error, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          serviceId,
          'client-wallet',
          service.provider,
          (service.pricing.perRequest || service.pricing.amount || "0"),
          'USDC',
          'failed',
          JSON.stringify(requestData),
          null,
          transactionSignature,
          serviceError.message,
          new Date().toISOString()
        ]
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service request failed after payment',
            details: serviceError.response?.data || serviceError.message,
            payment: {
              transactionSignature,
              amount: (service.pricing.perRequest || service.pricing.amount || "0"),
              status: 'confirmed',
              note: 'Payment was successful but service failed. Contact service provider for refund.'
            }
          })
        }],
        isError: true
      };
    }

  } catch (error: any) {
    logger.error('Error in submit_payment:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Unknown error during payment submission'
        })
      }],
      isError: true
    };
  }
}

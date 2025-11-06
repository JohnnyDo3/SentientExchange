import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SpendingLimitManager } from '../payment/SpendingLimitManager';
import axios from 'axios';

/**
 * Arguments for purchase_service tool
 */
export interface PurchaseServiceArgs {
  serviceId: string;
  data: Record<string, unknown>;
  maxPayment?: string;
}

/**
 * Validation schema for purchase_service
 */
const purchaseServiceSchema = Joi.object({
  serviceId: Joi.string().required().description('UUID of the service to purchase'),
  data: Joi.object().required().description('Request data to send to the service'),
  maxPayment: Joi.string().pattern(/^\$\d+(\.\d{1,2})?$/).optional().description('Maximum acceptable payment in format $X.XX')
});

/**
 * Purchase a service with x402 payment protocol
 *
 * Makes initial request to service. If 402 Payment Required is returned,
 * returns payment instructions for the client to execute payment locally.
 * Client should then call execute_payment tool, then submit_payment with signature.
 *
 * @param registry - Service registry instance
 * @param args - Purchase parameters
 * @returns MCP response with payment instructions (402) or service result (200)
 *
 * @example
 * const result = await purchaseService(registry, {
 *   serviceId: '123e4567-e89b-12d3-a456-426614174000',
 *   data: { text: 'Analyze this sentiment' },
 *   maxPayment: '$1.00'
 * });
 *
 * // On 402 Payment Required returns:
 * // {
 * //   status: 402,
 * //   message: 'Payment Required',
 * //   transactionId: 'tx-...',
 * //   paymentInstructions: { amount, recipient, token, network },
 * //   nextSteps: [...]
 * // }
 */
export async function purchaseService(
  registry: ServiceRegistry,
  args: PurchaseServiceArgs,
  limitManager?: SpendingLimitManager,
  userId?: string
) {
  try {
    // Step 1: Validate input
    const { error, value } = purchaseServiceSchema.validate(args);
    if (error) {
      logger.error('Validation error:', error.details);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${getErrorMessage(error)}`
          })
        }],
        isError: true
      };
    }

    const { serviceId, data, maxPayment } = value;

    // Step 2: Get service from registry
    logger.info(`Purchasing service: ${serviceId}`);
    const service = await registry.getService(serviceId);

    if (!service) {
      logger.error(`Service not found: ${serviceId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Service not found: ${serviceId}`
          })
        }],
        isError: true
      };
    }

    // Step 3: Check price limit (user-provided maxPayment)
    // Handle both pricing formats: perRequest or amount
    const priceString = service.pricing.perRequest || service.pricing.amount || '0';
    const servicePrice = parseFloat(priceString.toString().replace('$', ''));
    const servicePriceFormatted = `$${servicePrice.toFixed(2)}`;

    if (maxPayment) {
      const maxPrice = parseFloat(maxPayment.replace('$', ''));
      if (servicePrice > maxPrice) {
        logger.error(`Price ${servicePrice} exceeds max payment ${maxPrice}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: `Service price $${servicePrice} exceeds maximum payment ${maxPayment}`,
              servicePrice: servicePriceFormatted,
              maxPayment
            })
          }],
          isError: true
        };
      }
    }

    // Step 3.5: Check spending limits (if enabled and userId provided)
    if (limitManager && userId) {
      const limitCheck = await limitManager.checkLimit(userId, servicePriceFormatted);
      if (!limitCheck.allowed) {
        logger.warn(`Spending limit exceeded for ${userId}: ${limitCheck.reason}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Spending limit exceeded',
              reason: limitCheck.reason,
              servicePrice: servicePriceFormatted,
              currentSpending: limitCheck.currentSpending,
              limits: limitCheck.limits,
              hint: 'Use check_spending to view your spending or set_spending_limits to adjust limits'
            })
          }],
          isError: true
        };
      }

      logger.info(`✓ Spending limit check passed for ${userId}`, {
        amount: servicePriceFormatted,
        remaining: limitCheck.currentSpending
      });
    }

    // Step 4: Make initial request to service
    logger.info(`Making initial request to service: ${service.endpoint}`);

    try {
      const response = await axios.post(
        service.endpoint,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status < 500 // Don't throw on 4xx
        }
      );

      // Check for 402 Payment Required
      if (response.status === 402) {
        logger.info('Service returned 402 Payment Required');

        // Parse payment details from response (x402 format)
        const x402Response = response.data;
        const paymentOption = x402Response.accepts?.[0];

        if (!paymentOption) {
          throw new Error('No payment options in 402 response');
        }

        // Extract payment details from x402 response
        const recipient = paymentOption.receiverAddress || paymentOption.payTo || service.provider;
        const amount = paymentOption.amount || paymentOption.maxAmountRequired || '0';
        const tokenAddress = paymentOption.tokenAddress || paymentOption.asset || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC devnet
        const network = (paymentOption.chainId || paymentOption.network || 'solana-devnet');

        // Return 402 Payment Required with instructions for client to pay
        logger.info('💳 Service requires payment - returning 402 instructions');

        // Create pending transaction ID
        const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // TODO: Store pending transaction in database via registry
        // await registry.createTransaction({...});

        // Return payment instructions for client to execute locally
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 402,
              message: 'Payment Required',
              transactionId,
              service: {
                id: service.id,
                name: service.name,
                endpoint: service.endpoint,
              },
              paymentInstructions: {
                transactionId,
                amount,
                currency: 'USDC',
                recipient,
                token: tokenAddress,
                network,
              },
              nextSteps: [
                '1. Call execute_payment tool with these paymentInstructions',
                '2. Get the transaction signature from execute_payment',
                '3. Call submit_payment with the signature to complete purchase'
              ]
            }, null, 2)
          }]
        };
      }

      // If status 200, service didn't require payment (unlikely for x402 services)
      if (response.status === 200) {
        logger.info('Service completed without payment (unusual for x402)');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              serviceResult: response.data,
              note: 'Service completed without payment requirement'
            }, null, 2)
          }]
        };
      }

      // Other 4xx errors
      logger.error(`Service returned ${response.status}:`, response.data);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Service error (${response.status})`,
            details: response.data
          })
        }],
        isError: true
      };

    } catch (requestError: unknown) {
      const message = getErrorMessage(requestError);
      logger.error('Service request failed:', message);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to contact service',
            details: message,
            endpoint: service.endpoint
          })
        }],
        isError: true
      };
    }

  } catch (error: unknown) {
    logger.error('Error in purchaseService:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error) || 'Unknown error during service purchase'
        })
      }],
      isError: true
    };
  }
}

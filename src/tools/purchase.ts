import { logger } from '../utils/logger';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { PaymentRouter } from '../payment/PaymentRouter';
import { PaymentDetails } from '../payment/types';
import axios from 'axios';

/**
 * Arguments for purchase_service tool
 */
export interface PurchaseServiceArgs {
  serviceId: string;
  data: any;
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
 * Purchase and execute a service with x402 payment
 *
 * Makes initial request to service. If 402 Payment Required is returned,
 * automatically executes payment using PaymentRouter (x402 or direct Solana).
 * Retries service request with payment proof.
 *
 * @param registry - Service registry instance
 * @param paymentRouter - Payment router with intelligent failover
 * @param args - Purchase parameters
 * @returns MCP response with service result and payment details
 *
 * @example
 * const result = await purchaseService(registry, paymentRouter, {
 *   serviceId: '123e4567-e89b-12d3-a456-426614174000',
 *   data: { text: 'Analyze this sentiment' },
 *   maxPayment: '$1.00'
 * });
 *
 * // On success returns:
 * // {
 * //   success: true,
 * //   serviceResult: { ... },
 * //   payment: {
 * //     transactionSignature: "...",
 * //     amount: "$0.01",
 * //     provider: "x402",
 * //     status: "confirmed"
 * //   }
 * // }
 */
export async function purchaseService(
  registry: ServiceRegistry,
  paymentRouter: PaymentRouter,
  args: PurchaseServiceArgs
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
            error: `Validation error: ${error.message}`
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

    // Step 3: Check price limit
    // Handle both pricing formats: perRequest or amount
    const priceString = service.pricing.perRequest || service.pricing.amount || '0';
    const servicePrice = parseFloat(priceString.toString().replace('$', ''));

    if (maxPayment) {
      const maxPrice = parseFloat(maxPayment.replace('$', ''));
      if (servicePrice > maxPrice) {
        logger.error(`Price ${servicePrice} exceeds max payment ${maxPrice}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: `Service price $${servicePrice} exceeds maximum payment ${maxPayment}`,
              servicePrice: `$${servicePrice}`,
              maxPayment
            })
          }],
          isError: true
        };
      }
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

        // Convert x402 format to PaymentDetails
        const paymentDetails: PaymentDetails = {
          recipient: paymentOption.receiverAddress || paymentOption.payTo || service.provider,
          amount: BigInt(paymentOption.amount || paymentOption.maxAmountRequired || '0'),
          currency: 'USDC',
          tokenAddress: paymentOption.tokenAddress || paymentOption.asset || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          network: (paymentOption.chainId || paymentOption.network || 'solana-devnet') as any,
          metadata: {
            serviceId: service.id,
            serviceName: service.name
          }
        };

        // Execute payment AUTOMATICALLY by MCP server using PaymentRouter!
        logger.info('🤖 Executing autonomous payment via PaymentRouter...');

        try {
          const paymentResult = await paymentRouter.executePayment(paymentDetails);

          if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Payment failed');
          }

          logger.info('✅ Payment executed successfully:', {
            signature: paymentResult.signature,
            provider: paymentResult.provider
          });

          // Now retry the service request with payment proof
          const paymentProof = {
            network: paymentDetails.network,
            txHash: paymentResult.signature,
            from: await paymentRouter.getWalletAddress(),
            to: paymentDetails.recipient,
            amount: paymentDetails.amount.toString(),
            asset: paymentDetails.tokenAddress
          };

          const serviceResponse = await axios.post(
            service.endpoint,
            data,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Payment': JSON.stringify(paymentProof)
              },
              timeout: 30000
            }
          );

          logger.info('✅ Service completed successfully');

          // Return service result directly
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                serviceResult: serviceResponse.data,
                payment: {
                  transactionSignature: paymentResult.signature,
                  amount: `$${servicePrice}`,
                  provider: paymentResult.provider,
                  status: 'confirmed'
                }
              }, null, 2)
            }]
          };

        } catch (paymentError: any) {
          logger.error('Payment execution failed:', paymentError.message);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Autonomous payment failed',
                details: paymentError.message,
                service: service.name,
                price: `$${servicePrice}`
              }, null, 2)
            }],
            isError: true
          };
        }
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

    } catch (requestError: any) {
      logger.error('Service request failed:', requestError.message);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to contact service',
            details: requestError.message,
            endpoint: service.endpoint
          })
        }],
        isError: true
      };
    }

  } catch (error: any) {
    logger.error('Error in purchaseService:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Unknown error during service purchase'
        })
      }],
      isError: true
    };
  }
}

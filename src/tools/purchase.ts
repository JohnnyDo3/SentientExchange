import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SpendingLimitManager } from '../payment/SpendingLimitManager';
import { SolanaVerifier } from '../payment/SolanaVerifier';
import { Database } from '../registry/database';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

/**
 * Arguments for purchase_service tool (Step 1: Get payment instructions)
 */
export interface PurchaseServiceArgs {
  serviceId: string;
  data: Record<string, unknown>;
  maxPayment?: string;
}

/**
 * Arguments for submit_payment tool (Step 2: Submit payment proof)
 */
export interface SubmitPaymentArgs {
  serviceId: string;
  txSignature: string;
  data: Record<string, unknown>;
}

/**
 * Validation schemas
 */
const purchaseServiceSchema = Joi.object({
  serviceId: Joi.string().required().description('UUID of the service to purchase'),
  data: Joi.object().required().description('Request data to send to the service'),
  maxPayment: Joi.string().pattern(/^\$\d+(\.\d{1,2})?$/).optional().description('Maximum acceptable payment in format $X.XX')
});

const submitPaymentSchema = Joi.object({
  serviceId: Joi.string().required().description('UUID of the service'),
  txSignature: Joi.string().required().description('Solana transaction signature'),
  data: Joi.object().required().description('Request data to send to the service')
});

/**
 * STEP 1: Purchase Service (Returns 402 Payment Required)
 *
 * Initiates service purchase. Returns 402 with payment instructions.
 * Client pays service owner directly on Solana, then calls submitPayment.
 *
 * NEW ARCHITECTURE:
 * - WE return 402 (not the service)
 * - Payment goes to service owner's wallet
 * - We verify payment and proxy request with JWT
 *
 * @param registry - Service registry instance
 * @param args - Purchase parameters
 * @returns MCP response with payment instructions (402)
 */
export async function purchaseService(
  registry: ServiceRegistry,
  args: PurchaseServiceArgs,
  limitManager?: SpendingLimitManager,
  userId?: string
) {
  try {
    // Validate input
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

    // Get service from registry
    logger.info(`Initiating purchase for service: ${serviceId}`);
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

    // Check service status
    if ((service as any).status !== 'approved') {
      logger.error(`Service not approved: ${serviceId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service is not approved',
            status: (service as any).status
          })
        }],
        isError: true
      };
    }

    // Check price limit
    const priceString = service.pricing.perRequest || service.pricing.amount || '0';
    const servicePrice = parseFloat(priceString.toString().replace('$', ''));
    const servicePriceFormatted = `$${servicePrice.toFixed(2)}`;

    if (maxPayment) {
      const maxPrice = parseFloat(maxPayment.replace('$', ''));
      if (servicePrice > maxPrice) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: `Service price ${servicePriceFormatted} exceeds maximum payment ${maxPayment}`,
              servicePrice: servicePriceFormatted,
              maxPayment
            })
          }],
          isError: true
        };
      }
    }

    // Check spending limits
    if (limitManager && userId) {
      const limitCheck = await limitManager.checkLimit(userId, servicePriceFormatted);
      if (!limitCheck.allowed) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Spending limit exceeded',
              reason: limitCheck.reason,
              servicePrice: servicePriceFormatted,
              currentSpending: limitCheck.currentSpending,
              limits: limitCheck.limits,
              hint: 'Use check_spending or set_spending_limits to adjust'
            })
          }],
          isError: true
        };
      }
    }

    // Return 402 Payment Required with service owner's wallet
    const providerWallet = (service as any).provider_wallet || (service as any).providerWallet || service.provider;
    const network = (service as any).network || 'solana';
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC devnet
    const amountInCents = Math.round(servicePrice * 100); // Convert to cents
    const amountInSmallestUnit = amountInCents * 10000; // USDC has 6 decimals, so $0.01 = 10000

    logger.info('💳 Returning 402 Payment Required', {
      serviceId: service.id,
      price: servicePriceFormatted,
      recipient: providerWallet
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 402,
          message: 'Payment Required',
          service: {
            id: service.id,
            name: service.name,
            description: service.description,
            provider: service.provider
          },
          paymentInstructions: {
            amount: amountInSmallestUnit.toString(),
            currency: 'USDC',
            recipient: providerWallet,
            token: tokenAddress,
            network: network,
            priceFormatted: servicePriceFormatted,
          },
          nextSteps: [
            '1. Pay the specified amount to the recipient wallet on Solana',
            '2. Get the transaction signature from your wallet',
            '3. Call submit_payment tool with the signature to complete the request'
          ]
        }, null, 2)
      }]
    };

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

/**
 * STEP 2: Submit Payment (Verify payment and execute service)
 *
 * After client pays service owner on Solana:
 * 1. Verify payment on blockchain using SolanaVerifier
 * 2. Check replay prevention (requestId not used)
 * 3. Generate signed JWT with payment details
 * 4. Call service with JWT in X-AgentMarket-Auth header
 * 5. Return service result
 *
 * @param registry - Service registry
 * @param db - Database for replay prevention
 * @param verifier - Solana payment verifier
 * @param args - Payment submission args
 * @returns Service result or error
 */
export async function submitPayment(
  registry: ServiceRegistry,
  db: Database,
  verifier: SolanaVerifier,
  args: SubmitPaymentArgs,
  limitManager?: SpendingLimitManager,
  userId?: string
) {
  try {
    // Validate input
    const { error, value } = submitPaymentSchema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: `Validation error: ${getErrorMessage(error)}` })
        }],
        isError: true
      };
    }

    const { serviceId, txSignature, data } = value;

    // Get service
    const service = await registry.getService(serviceId);
    if (!service) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Service not found' })
        }],
        isError: true
      };
    }

    // Get payment details
    const priceString = service.pricing.perRequest || service.pricing.amount || '0';
    const servicePrice = parseFloat(priceString.toString().replace('$', ''));
    const providerWallet = (service as any).provider_wallet || (service as any).providerWallet;
    const network = (service as any).network || 'devnet';
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC devnet

    // Calculate expected amount in smallest unit (USDC has 6 decimals)
    const amountInCents = Math.round(servicePrice * 100);
    const expectedAmount = BigInt(amountInCents * 10000);

    logger.info('🔍 Verifying payment on Solana', {
      txSignature,
      expectedAmount: expectedAmount.toString(),
      recipient: providerWallet,
      network
    });

    // Step 1: Verify payment on blockchain
    const verificationResult = await verifier.verifyPayment({
      signature: txSignature,
      expectedAmount,
      expectedRecipient: providerWallet,
      expectedToken: tokenAddress,
      network: network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet'
    });

    if (!verificationResult.verified) {
      logger.error('Payment verification failed', verificationResult);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Payment verification failed',
            details: verificationResult.error
          })
        }],
        isError: true
      };
    }

    logger.info('✅ Payment verified successfully');

    // Step 2: Generate unique requestId and check replay
    const requestId = uuid();

    // Check if this tx signature was already used
    const alreadyUsed = await db.get<{ request_id: string }>(
      'SELECT request_id FROM used_request_ids WHERE tx_signature = ?',
      [txSignature]
    );

    if (alreadyUsed) {
      logger.error('Transaction already used (replay attack prevented)', { txSignature });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Payment already used',
            details: 'This transaction signature has already been used for a previous request'
          })
        }],
        isError: true
      };
    }

    // Step 3: Record requestId as used
    const now = Date.now();
    const expiresAt = now + 3600000; // 1 hour

    await db.run(`
      INSERT INTO used_request_ids (request_id, service_id, tx_signature, used_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [requestId, serviceId, txSignature, now, expiresAt]);

    logger.info('✓ Request ID recorded', { requestId });

    // Step 4: Generate signed JWT
    const privateKey = process.env.JWT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('JWT_PRIVATE_KEY not configured');
    }

    // Parse the private key (handle escaped newlines)
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const jwtPayload = {
      serviceId: service.id,
      requestId,
      txSignature,
      walletAddress: providerWallet,
      price: priceString,
      timestamp: now,
      exp: Math.floor((now + 300000) / 1000) // 5 min expiry
    };

    const token = jwt.sign(jwtPayload, formattedKey, { algorithm: 'RS256' });

    logger.info('✓ JWT generated', { requestId, expiresIn: '5min' });

    // Step 5: Call service with JWT
    logger.info(`🚀 Calling service with JWT: ${service.endpoint}`);

    const serviceResponse = await axios.post(
      service.endpoint,
      data,
      {
        headers: {
          'X-AgentMarket-Auth': token,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500
      }
    );

    // Handle service response
    if (serviceResponse.status === 402) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service still requires payment',
            details: 'Service middleware may not be configured correctly',
            hint: 'Service should accept our JWT in X-AgentMarket-Auth header'
          })
        }],
        isError: true
      };
    }

    if (serviceResponse.status === 401) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service rejected payment proof',
            details: serviceResponse.data
          })
        }],
        isError: true
      };
    }

    if (serviceResponse.status !== 200) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Service error (${serviceResponse.status})`,
            details: serviceResponse.data
          })
        }],
        isError: true
      };
    }

    // Step 7: Record transaction in database
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await db.run(`
      INSERT INTO transactions (id, serviceId, buyer, seller, amount, currency, status, request, response, paymentHash, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      transactionId,
      serviceId,
      userId || 'anonymous',
      service.provider,
      priceString,
      'USDC',
      'completed',
      JSON.stringify(data),
      JSON.stringify(serviceResponse.data),
      txSignature,
      new Date().toISOString()
    ]);

    logger.info('✅ Transaction completed successfully', { serviceId, requestId, transactionId });

    // Return service result
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          service: {
            id: service.id,
            name: service.name
          },
          payment: {
            amount: `$${servicePrice.toFixed(2)}`,
            txSignature,
            verified: true
          },
          result: serviceResponse.data
        }, null, 2)
      }]
    };

  } catch (error: unknown) {
    logger.error('Error in submitPayment:', error);
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

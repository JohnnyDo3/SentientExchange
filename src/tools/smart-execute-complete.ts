import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SolanaVerifier } from '../payment/SolanaVerifier';
import { Database } from '../registry/database';
import { sessionManager } from '../utils/SessionManager';
import axios from 'axios';
import bs58 from 'bs58';
import type { Service } from '../types';

/**
 * Arguments for complete_service_with_payment tool
 */
export interface CompleteServiceWithPaymentArgs {
  sessionId: string;
  signature: string;
  retryOnFailure?: boolean;
}

/**
 * Validation schema
 */
const completeServiceSchema = Joi.object({
  sessionId: Joi.string().required().description('Session ID from discover_and_prepare_service'),
  signature: Joi.string().required().description('Transaction signature from execute_payment'),
  retryOnFailure: Joi.boolean().optional().default(true).description('Retry with backup services if primary fails'),
});

/**
 * Complete service purchase with payment verification and retry logic (Phase 2 of smart 2-call flow)
 *
 * After the user executes payment via execute_payment, this tool:
 * - Verifies payment on-chain
 * - Submits payment proof to service
 * - Returns service result
 * - If service fails: automatically retries with backup services
 *
 * @param registry - Service registry instance
 * @param verifier - Solana blockchain verifier
 * @param db - Database instance
 * @param args - Session ID and transaction signature
 * @returns MCP response with service result or detailed error
 */
export async function completeServiceWithPayment(
  registry: ServiceRegistry,
  verifier: SolanaVerifier,
  db: Database,
  args: CompleteServiceWithPaymentArgs
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Validate input
    const { error, value } = completeServiceSchema.validate(args);
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

    const { sessionId, signature, retryOnFailure = true } = value;

    logger.info(`🔄 Completing service purchase - Session: ${sessionId}`);

    // Step 1: Get session
    const session = sessionManager.get(sessionId);
    if (!session) {
      logger.error(`Session not found or expired: ${sessionId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Session not found or expired',
            sessionId,
            suggestion: 'Call discover_and_prepare_service again to create a new session',
          })
        }],
        isError: true
      };
    }

    if (!session.selectedService || !session.paymentInstructions || !session.requestData) {
      logger.error('Invalid session state - missing required data');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Invalid session state',
            sessionId,
            suggestion: 'Session is corrupted. Call discover_and_prepare_service again.',
          })
        }],
        isError: true
      };
    }

    // Update session
    sessionManager.update(sessionId, {
      status: 'executing',
      signature,
    });

    // Validate signature format
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

    // Step 2: Try with primary service
    const primaryService = session.selectedService;
    const requestData = session.requestData;

    logger.info(`Attempting with primary service: ${primaryService.name}`);
    const primaryResult = await attemptServiceCompletion(
      primaryService,
      requestData,
      signature,
      session.transactionId!,
      verifier,
      db,
      registry
    );

    if (primaryResult.success) {
      sessionManager.update(sessionId, {
        status: 'completed',
        serviceResult: primaryResult.serviceResult,
      });

      logger.info('✅ Service completed successfully');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId,
            serviceResult: primaryResult.serviceResult,
            payment: primaryResult.payment,
            service: {
              id: primaryService.id,
              name: primaryService.name,
            },
            metadata: {
              retriesUsed: 0,
              totalTime: primaryResult.responseTime,
            },
          }, null, 2)
        }]
      };
    }

    // Step 3: If primary failed and retry enabled, try backup services
    if (!retryOnFailure || !session.alternativeServices || session.alternativeServices.length === 0) {
      logger.error('Primary service failed and no backups available');
      sessionManager.update(sessionId, {
        status: 'failed',
        lastError: primaryResult.error,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Service failed after payment',
            primaryService: {
              id: primaryService.id,
              name: primaryService.name,
            },
            serviceError: primaryResult.error,
            payment: primaryResult.payment,
            refundOptions: {
              message: 'Payment confirmed but service failed. Options:',
              options: [
                `1. Contact service provider: ${primaryService.provider}`,
                '2. File dispute (future feature)',
                '3. Transaction logged for refund tracking',
              ],
            },
            transactionId: session.transactionId,
          })
        }],
        isError: true
      };
    }

    // Step 4: Retry with backup services
    logger.warn(`⚠️ Primary service failed: ${primaryResult.error}`);
    logger.info(`Retrying with ${session.alternativeServices.length} backup services...`);

    const maxRetries = Math.min(session.maxRetries, session.alternativeServices.length);
    let retriesUsed = 0;

    for (let i = 0; i < maxRetries; i++) {
      const backupService = session.alternativeServices[i];
      logger.info(`Retry ${i + 1}/${maxRetries}: Trying ${backupService.name}`);

      retriesUsed++;
      sessionManager.update(sessionId, {
        retryCount: retriesUsed,
      });

      const backupResult = await attemptServiceCompletion(
        backupService,
        requestData,
        signature,
        `${session.transactionId}-retry-${i + 1}`,
        verifier,
        db,
        registry
      );

      if (backupResult.success) {
        sessionManager.update(sessionId, {
          status: 'completed',
          serviceResult: backupResult.serviceResult,
        });

        logger.info(`✅ Backup service succeeded: ${backupService.name}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              sessionId,
              serviceResult: backupResult.serviceResult,
              payment: backupResult.payment,
              service: {
                id: backupService.id,
                name: backupService.name,
              },
              metadata: {
                retriesUsed,
                primaryServiceFailed: true,
                primaryServiceError: primaryResult.error,
                totalTime: backupResult.responseTime,
              },
              note: `Primary service (${primaryService.name}) failed. Successfully completed with backup service.`,
            }, null, 2)
          }]
        };
      }

      logger.warn(`Backup service ${backupService.name} failed: ${backupResult.error}`);
    }

    // All services failed
    sessionManager.update(sessionId, {
      status: 'failed',
      lastError: 'All services failed after payment',
    });

    logger.error('❌ All services failed (primary + backups)');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'All services failed after payment',
          primaryService: {
            id: primaryService.id,
            name: primaryService.name,
            error: primaryResult.error,
          },
          backupServicesTried: session.alternativeServices.slice(0, retriesUsed).map((s, i) => ({
            id: s.id,
            name: s.name,
            error: `Backup service ${i + 1} failed`,
          })),
          payment: primaryResult.payment,
          refundOptions: {
            message: 'Payment confirmed but all services failed. Options:',
            options: [
              '1. Contact primary service provider for refund',
              '2. File dispute (future feature)',
              '3. All transactions logged for audit',
            ],
          },
          transactionId: session.transactionId,
        })
      }],
      isError: true
    };

  } catch (error: unknown) {
    logger.error('Error in completeServiceWithPayment:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error) || 'Unknown error during service completion',
        })
      }],
      isError: true
    };
  }
}

/**
 * Attempt to complete service with a specific service provider
 */
async function attemptServiceCompletion(
  service: Service,
  requestData: Record<string, unknown>,
  signature: string,
  transactionId: string,
  verifier: SolanaVerifier,
  db: Database,
  _registry: ServiceRegistry
): Promise<{
  success: boolean;
  serviceResult?: unknown;
  payment?: Record<string, unknown>;
  error?: string;
  responseTime?: number;
}> {
  const startTime = Date.now();

  try {
    // Step 1: Verify payment on-chain
    logger.info(`🔍 Verifying payment on blockchain for ${service.name}...`);

    const priceString = (service.pricing.perRequest || service.pricing.amount || '0').replace('$', '');
    const priceInCents = Math.round(parseFloat(priceString) * 100);
    const priceInTokenUnits = BigInt(priceInCents * 10000); // USDC: 6 decimals, $0.01 = 10000 units

    const verificationResult = await verifier.verifyPayment({
      signature,
      expectedAmount: priceInTokenUnits,
      expectedRecipient: service.provider,
      expectedToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC devnet
      network: (service.pricing.network || process.env.NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet',
    });

    if (!verificationResult.verified) {
      logger.error(`❌ Payment verification failed for ${service.name}:`, verificationResult.error);
      return {
        success: false,
        error: `Payment verification failed: ${verificationResult.error}`,
      };
    }

    logger.info(`✅ Payment verified for ${service.name}`);

    // Step 2: Construct payment proof
    const paymentProof = {
      network: service.pricing.network || 'solana-devnet',
      txHash: signature,
      from: 'client-wallet',
      to: service.provider,
      amount: priceString,
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    };

    // Step 3: Submit request with payment proof
    logger.info(`📡 Submitting request to ${service.name} with payment proof...`);

    const response = await axios.post(
      service.endpoint,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': JSON.stringify(paymentProof),
        },
        timeout: 30000,
      }
    );

    const responseTime = Date.now() - startTime;
    logger.info(`✅ Service ${service.name} completed successfully (${responseTime}ms)`);

    // Step 4: Log successful transaction
    await db.run(
      `INSERT INTO transactions (
        id, serviceId, buyer, seller, amount, currency, status,
        request, response, paymentHash, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        service.id,
        'client-wallet',
        service.provider,
        priceString,
        'USDC',
        'completed',
        JSON.stringify(requestData),
        JSON.stringify(response.data),
        signature,
        new Date().toISOString(),
      ]
    );

    logger.info(`Transaction logged: ${transactionId}`);

    return {
      success: true,
      serviceResult: response.data,
      payment: {
        transactionId,
        signature,
        amount: `$${priceString}`,
        status: 'confirmed',
        verifiedOnChain: true,
      },
      responseTime,
    };

  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    logger.error(`❌ Service ${service.name} failed:`, getErrorMessage(error));

    // Log failed transaction
    try {
      await db.run(
        `INSERT INTO transactions (
          id, serviceId, buyer, seller, amount, currency, status,
          request, response, paymentHash, error, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${transactionId}-failed`,
          service.id,
          'client-wallet',
          service.provider,
          (service.pricing.perRequest || service.pricing.amount || '0').replace('$', ''),
          'USDC',
          'failed',
          JSON.stringify(requestData),
          null,
          signature,
          getErrorMessage(error),
          new Date().toISOString(),
        ]
      );
    } catch (dbError: unknown) {
      logger.error('Failed to log transaction:', dbError);
    }

    return {
      success: false,
      error: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data ? String(error.response.data.error) : null) || getErrorMessage(error) || 'Service request failed',
      payment: {
        transactionId,
        signature,
        status: 'confirmed',
        note: 'Payment verified but service failed',
      },
      responseTime,
    };
  }
}

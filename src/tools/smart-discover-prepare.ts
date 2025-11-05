import { logger } from '../utils/logger';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { SpendingLimitManager } from '../payment/SpendingLimitManager';
import { sessionManager, type PurchaseSession } from '../utils/SessionManager';
import {
  checkMultipleServicesHealth,
  filterHealthyServices,
  rankServices,
} from '../utils/health-check';
import axios from 'axios';
import type { Service } from '../types';

/**
 * Arguments for discover_and_prepare_service tool
 */
export interface DiscoverAndPrepareArgs {
  capability: string;
  requestData: any;
  requirements?: {
    maxPrice?: string;
    minRating?: number;
    mustSupportBatch?: boolean;
    preferredProviders?: string[];
  };
  checkHealth?: boolean;
  maxPayment?: string;
  userId?: string;
  maxRetries?: number;
}

/**
 * Validation schema
 */
const discoverAndPrepareSchema = Joi.object({
  capability: Joi.string().required().description('Service capability to search for (e.g., "sentiment-analysis")'),
  requestData: Joi.any().required().description('Data to send to the service'),
  requirements: Joi.object({
    maxPrice: Joi.string().pattern(/^\$\d+(\.\d{1,2})?$/).optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    mustSupportBatch: Joi.boolean().optional(),
    preferredProviders: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  checkHealth: Joi.boolean().optional().default(true),
  maxPayment: Joi.string().pattern(/^\$\d+(\.\d{1,2})?$/).optional(),
  userId: Joi.string().optional(),
  maxRetries: Joi.number().min(0).max(5).optional().default(2),
});

/**
 * Discover and prepare service for purchase (Phase 1 of smart 2-call flow)
 *
 * This tool combines discovery + health checks + payment preparation into a single call.
 * It finds the best service matching your criteria, verifies it's healthy, checks spending
 * limits, and prepares payment instructions - all in one shot.
 *
 * Returns payment details ready for execute_and_complete_service (Phase 2).
 *
 * @param registry - Service registry instance
 * @param args - Discovery and preparation parameters
 * @returns MCP response with selected service + payment instructions + backups
 */
export async function discoverAndPrepareService(
  registry: ServiceRegistry,
  args: DiscoverAndPrepareArgs,
  limitManager?: SpendingLimitManager
) {
  try {
    // Validate input
    const { error, value } = discoverAndPrepareSchema.validate(args);
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

    const {
      capability,
      requestData,
      requirements = {},
      checkHealth = true,
      maxPayment,
      userId,
      maxRetries = 2,
    } = value;

    logger.info(`🔍 Smart discovery: capability="${capability}", health=${checkHealth}`);

    // Step 1: Discover services by capability
    const { maxPrice, minRating, preferredProviders } = requirements;
    const candidateServices = await registry.searchServices({
      capabilities: [capability],
      maxPrice,
      minRating,
    });

    if (candidateServices.length === 0) {
      logger.warn(`No services found for capability: ${capability}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'No services found',
            capability,
            suggestion: 'Try a different capability or remove filters',
          })
        }],
        isError: true
      };
    }

    logger.info(`Found ${candidateServices.length} candidate services`);

    // Filter by preferred providers if specified
    let filteredServices = candidateServices;
    if (preferredProviders && preferredProviders.length > 0) {
      const preferredProvidersStrings = preferredProviders.map(String);
      filteredServices = candidateServices.filter((s) =>
        preferredProvidersStrings.includes(s.provider)
      );
      if (filteredServices.length === 0) {
        logger.warn('No services match preferred providers, using all candidates');
        filteredServices = candidateServices;
      }
    }

    // Step 2: Health check top candidates (limit to 5 for performance)
    const servicesToCheck = filteredServices.slice(0, 5);
    let healthyServices = servicesToCheck;
    const healthResults = [];

    if (checkHealth) {
      logger.info(`🏥 Health checking top ${servicesToCheck.length} services...`);
      const healthChecks = await checkMultipleServicesHealth(servicesToCheck, {
        timeout: 5000,
        parallel: true,
      });
      healthResults.push(...healthChecks);

      const { healthy, unhealthy } = filterHealthyServices(servicesToCheck, healthChecks);
      logger.info(`Health results: ${healthy.length} healthy, ${unhealthy.length} unhealthy`);

      if (healthy.length === 0) {
        logger.warn('No healthy services found');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'All services failed health check',
              capability,
              checkedServices: servicesToCheck.map((s) => ({
                id: s.id,
                name: s.name,
                endpoint: s.endpoint,
              })),
              healthResults: healthChecks.map((h) => ({
                serviceId: h.serviceId,
                status: h.status,
                error: h.error,
              })),
              suggestion: 'Services may be temporarily unavailable. Try again later or disable health checks.',
            })
          }],
          isError: true
        };
      }

      healthyServices = healthy;
    }

    // Step 3: Rank services by health + rating + price
    const rankedServices = checkHealth
      ? rankServices(healthyServices, healthResults)
      : healthyServices.sort((a, b) => {
          // Simple sort by rating then price if no health checks
          const ratingDiff = (b.reputation?.rating || 0) - (a.reputation?.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          const priceA = parseFloat((a.pricing.perRequest || a.pricing.amount || '0').replace('$', ''));
          const priceB = parseFloat((b.pricing.perRequest || b.pricing.amount || '0').replace('$', ''));
          return priceA - priceB;
        });

    const selectedService = rankedServices[0];
    const alternativeServices = rankedServices.slice(1, 3); // Top 2 backups

    logger.info(`✅ Selected service: ${selectedService.name} (${selectedService.id})`);

    // Step 4: Validate price against maxPayment
    const servicePriceStr = selectedService.pricing.perRequest || selectedService.pricing.amount || '$0.00';
    const servicePrice = parseFloat(servicePriceStr.replace('$', ''));
    const servicePriceFormatted = `$${servicePrice.toFixed(2)}`;

    if (maxPayment) {
      const maxPrice = parseFloat(maxPayment.replace('$', ''));
      if (servicePrice > maxPrice) {
        logger.error(`Price ${servicePrice} exceeds max payment ${maxPrice}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: `Service price $${servicePrice.toFixed(2)} exceeds maximum payment ${maxPayment}`,
              selectedService: {
                id: selectedService.id,
                name: selectedService.name,
                price: servicePriceFormatted,
              },
              maxPayment,
              alternativeServices: alternativeServices.map((s) => ({
                id: s.id,
                name: s.name,
                price: s.pricing.perRequest || s.pricing.amount || '$0.00',
              })),
            })
          }],
          isError: true
        };
      }
    }

    // Step 5: Check spending limits
    let spendingCheck = undefined;
    if (limitManager && userId) {
      const limitCheckResult = await limitManager.checkLimit(userId, servicePriceFormatted);
      if (!limitCheckResult.allowed) {
        logger.warn(`Spending limit exceeded for ${userId}: ${limitCheckResult.reason}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Spending limit exceeded',
              reason: limitCheckResult.reason,
              servicePrice: servicePriceFormatted,
              currentSpending: limitCheckResult.currentSpending,
              limits: limitCheckResult.limits,
              selectedService: {
                id: selectedService.id,
                name: selectedService.name,
              },
              hint: 'Use check_spending to view your spending or set_spending_limits to adjust limits',
            })
          }],
          isError: true
        };
      }

      // Calculate remaining amounts
      const limits = limitCheckResult.limits;
      const stats = limitCheckResult.currentSpending;

      spendingCheck = {
        allowed: true,
        remainingDaily: limits && stats
          ? `$${(parseFloat(limits.daily.replace('$', '')) - parseFloat(stats.totalToday.replace('$', ''))).toFixed(2)}`
          : undefined,
        remainingMonthly: limits && stats
          ? `$${(parseFloat(limits.monthly.replace('$', '')) - parseFloat(stats.totalThisMonth.replace('$', ''))).toFixed(2)}`
          : undefined,
      };

      logger.info(`✓ Spending limit check passed for ${userId}`);
    }

    // Step 6: Make initial request to get payment details
    logger.info(`📡 Making initial request to: ${selectedService.endpoint}`);

    try {
      const response = await axios.post(
        selectedService.endpoint,
        requestData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          validateStatus: (status) => status < 500,
        }
      );

      // Expect 402 Payment Required
      if (response.status !== 402) {
        logger.warn(`Unexpected status ${response.status}, expected 402`);

        if (response.status === 200) {
          // Service completed without payment (unusual)
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                serviceResult: response.data,
                note: 'Service completed without payment requirement (unusual for x402)',
                service: {
                  id: selectedService.id,
                  name: selectedService.name,
                },
              }, null, 2)
            }]
          };
        }

        throw new Error(`Service returned ${response.status} instead of 402 Payment Required`);
      }

      // Parse x402 response
      const x402Response = response.data;
      const paymentOption = x402Response.accepts?.[0];

      if (!paymentOption) {
        throw new Error('No payment options in 402 response');
      }

      // Extract payment details
      const recipient = paymentOption.receiverAddress || paymentOption.payTo || selectedService.provider;
      const amount = paymentOption.amount || paymentOption.maxAmountRequired || '0';
      const tokenAddress = paymentOption.tokenAddress || paymentOption.asset || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const network = paymentOption.chainId || paymentOption.network || 'solana-devnet';

      // Step 7: Create session
      const session: PurchaseSession = sessionManager.create(userId, {
        maxRetries,
        requireHealthCheck: checkHealth,
      });

      // Store context in session
      sessionManager.update(session.sessionId, {
        status: 'payment_ready',
        selectedService,
        alternativeServices,
        healthCheckResults: checkHealth
          ? Object.fromEntries(
              healthResults.map((h) => [
                h.serviceId,
                h.status,
              ])
            )
          : undefined,
        requestData,
        transactionId: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        paymentInstructions: {
          amount,
          currency: 'USDC',
          recipient,
          token: tokenAddress,
          network,
        } as any,
      });

      logger.info(`✅ Payment ready - Session: ${session.sessionId}`);

      // Return success with payment instructions
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId: session.sessionId,
            selectedService: {
              id: selectedService.id,
              name: selectedService.name,
              description: selectedService.description,
              price: servicePriceFormatted,
              rating: selectedService.reputation?.rating || null,
              endpoint: selectedService.endpoint,
              healthStatus: checkHealth
                ? healthResults.find((h) => h.serviceId === selectedService.id)?.status
                : 'unknown',
            },
            paymentReady: {
              transactionId: session.transactionId,
              paymentInstructions: {
                amount,
                currency: 'USDC',
                recipient,
                token: tokenAddress,
                network,
              },
              estimatedCost: servicePriceFormatted,
              spendingCheck,
            },
            alternativeServices: alternativeServices.map((s) => ({
              id: s.id,
              name: s.name,
              price: s.pricing.perRequest || s.pricing.amount || '$0.00',
              rating: s.reputation?.rating || null,
            })),
            nextStep: `Call execute_and_complete_service with sessionId: ${session.sessionId}`,
          }, null, 2)
        }]
      };

    } catch (requestError: any) {
      logger.error('Service request failed:', requestError.message);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to contact service',
            details: requestError.message,
            service: {
              id: selectedService.id,
              name: selectedService.name,
              endpoint: selectedService.endpoint,
            },
            alternativeServices: alternativeServices.map((s) => ({
              id: s.id,
              name: s.name,
              endpoint: s.endpoint,
            })),
            suggestion: 'Service may be down. Try an alternative service.',
          })
        }],
        isError: true
      };
    }

  } catch (error: any) {
    logger.error('Error in discoverAndPrepareService:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Unknown error during service discovery and preparation',
        })
      }],
      isError: true
    };
  }
}

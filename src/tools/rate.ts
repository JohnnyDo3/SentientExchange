import { logger } from '../utils/logger';
import { ServiceError as _ServiceError, PaymentError as _PaymentError, ValidationError as _ValidationError, getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { randomUUID } from 'crypto';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { Database } from '../registry/database';
import { Transaction as _Transaction } from '../types/transaction';

/**
 * Arguments for rate_service tool
 */
export interface RateServiceArgs {
  transactionId: string;
  score: number;
  review?: string;
}

/**
 * Validation schema for rate_service
 */
const rateServiceSchema = Joi.object({
  transactionId: Joi.string().required().description('UUID of the transaction to rate'),
  score: Joi.number().integer().min(1).max(5).required().description('Rating score from 1 to 5'),
  review: Joi.string().optional().description('Optional written review')
});

/**
 * Submit a rating and review for a completed service
 *
 * @param registry - Service registry instance
 * @param db - Database instance
 * @param args - Rating parameters
 * @returns MCP response with success message and new rating
 *
 * @example
 * const result = await rateService(registry, db, {
 *   transactionId: '123e4567-e89b-12d3-a456-426614174000',
 *   score: 5,
 *   review: 'Excellent service, very fast and accurate!'
 * });
 */
export async function rateService(
  registry: ServiceRegistry,
  db: Database,
  args: RateServiceArgs
) {
  try {
    // Step 1: Validate input
    const { error, value } = rateServiceSchema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${getErrorMessage(error)}`
          })
        }]
      };
    }

    // Step 2: Get transaction from database
    interface TransactionRow {
      id: string;
      serviceId: string;
      buyer: string;
      status: string;
    }
    const transaction = await db.get<TransactionRow>(
      'SELECT * FROM transactions WHERE id = ?',
      [value.transactionId]
    );

    if (!transaction) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Transaction not found: ${value.transactionId}`
          })
        }]
      };
    }

    // Step 3: Create rating record
    const ratingId = randomUUID();
    const timestamp = new Date().toISOString();

    // Step 4: Save rating to database
    await db.run(
      `INSERT INTO ratings (id, transactionId, serviceId, rater, score, review, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ratingId,
        value.transactionId,
        transaction.serviceId,
        transaction.buyer,
        value.score,
        value.review || null,
        timestamp
      ]
    );

    // Step 5: Update service reputation
    await registry.updateReputation(transaction.serviceId, value.score);

    // Step 6: Get updated service to return new rating
    const service = await registry.getService(transaction.serviceId);
    const newRating = service?.reputation.rating || value.score;

    // Step 7: Return success response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          ratingId: ratingId,
          serviceId: transaction.serviceId,
          newRating: newRating,
          message: 'Rating submitted successfully'
        }, null, 2)
      }]
    };

  } catch (error: unknown) {
    logger.error('Error in rateService:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error)
        })
      }]
    };
  }
}

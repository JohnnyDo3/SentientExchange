import { logger } from '../utils/logger';
import Joi from 'joi';
import { Database } from '../registry/database';
import { Transaction } from '../types/transaction';

/**
 * Arguments for get_transaction tool
 */
export interface GetTransactionArgs {
  transactionId: string;
}

/**
 * Validation schema for get_transaction
 */
const getTransactionSchema = Joi.object({
  transactionId: Joi.string().required().description('UUID of the transaction to retrieve')
});

/**
 * Retrieve transaction details by ID
 *
 * @param db - Database instance
 * @param args - Transaction ID
 * @returns MCP response with complete transaction details
 *
 * @example
 * const result = await getTransaction(db, {
 *   transactionId: '123e4567-e89b-12d3-a456-426614174000'
 * });
 */
export async function getTransaction(
  db: Database,
  args: GetTransactionArgs
) {
  try {
    // Step 1: Validate input
    const { error, value } = getTransactionSchema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${error.message}`
          })
        }]
      };
    }

    // Step 2: Query database for transaction
    const transaction = await db.get<any>(
      'SELECT * FROM transactions WHERE id = ?',
      [value.transactionId]
    );

    // Step 3: Handle not found
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

    // Step 4: Parse JSON fields
    const formattedTransaction = {
      id: transaction.id,
      serviceId: transaction.serviceId,
      buyer: transaction.buyer,
      seller: transaction.seller,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      paymentHash: transaction.paymentHash,
      request: transaction.request ? JSON.parse(transaction.request) : null,
      response: transaction.response ? JSON.parse(transaction.response) : null,
      timestamp: transaction.timestamp
    };

    // Step 5: Return complete transaction
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          transaction: formattedTransaction
        }, null, 2)
      }]
    };

  } catch (error: any) {
    logger.error('Error in getTransaction:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message
        })
      }]
    };
  }
}

import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { SpendingLimitManager } from '../payment/SpendingLimitManager.js';

/**
 * Arguments for set_spending_limits tool
 */
export interface SetSpendingLimitsArgs {
  perTransaction?: string;
  daily?: string;
  monthly?: string;
  enabled?: boolean;
}

/**
 * Arguments for check_spending tool
 */
export interface CheckSpendingArgs {
  amount?: string;
}

/**
 * Validation schemas
 */
const pricePattern = /^\$\d+(\.\d{1,2})?$/;

const setSpendingLimitsSchema = Joi.object({
  perTransaction: Joi.string().pattern(pricePattern).optional(),
  daily: Joi.string().pattern(pricePattern).optional(),
  monthly: Joi.string().pattern(pricePattern).optional(),
  enabled: Joi.boolean().optional()
});

const checkSpendingSchema = Joi.object({
  amount: Joi.string().pattern(pricePattern).optional()
});

/**
 * Set spending limits for the current user
 *
 * Allows users to control their AI agent's spending by setting:
 * - Per-transaction limit
 * - Daily spending limit
 * - Monthly spending limit
 *
 * @param limitManager - Spending limit manager instance
 * @param userId - User wallet address
 * @param args - Spending limit configuration
 */
export async function setSpendingLimits(
  limitManager: SpendingLimitManager,
  userId: string,
  args: SetSpendingLimitsArgs
) {
  try {
    // Validate input
    const { error, value } = setSpendingLimitsSchema.validate(args);
    if (error) {
      logger.error('Validation error:', error.details);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${error.message}`,
            hint: 'Use format $X.XX for all amounts'
          })
        }],
        isError: true
      };
    }

    // Set limits
    const limits = await limitManager.setLimits(userId, value);

    logger.info(`✓ Spending limits configured for ${userId}`);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Spending limits updated successfully',
          limits: {
            perTransaction: limits.perTransaction,
            daily: limits.daily,
            monthly: limits.monthly,
            enabled: limits.enabled
          },
          note: limits.enabled
            ? 'Limits are active. All purchases will be checked against these limits.'
            : 'Limits are disabled. Set enabled: true to activate.'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    logger.error('Error setting spending limits:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Failed to set spending limits'
        })
      }],
      isError: true
    };
  }
}

/**
 * Check current spending and limits
 *
 * Returns:
 * - Current spending limits
 * - Today's spending
 * - This month's spending
 * - Whether a hypothetical transaction would be allowed
 *
 * @param limitManager - Spending limit manager instance
 * @param userId - User wallet address
 * @param args - Optional amount to check
 */
export async function checkSpending(
  limitManager: SpendingLimitManager,
  userId: string,
  args: CheckSpendingArgs = {}
) {
  try {
    // Validate input
    const { error, value } = checkSpendingSchema.validate(args);
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

    // Get limits and stats
    const limits = await limitManager.getLimits(userId);
    const stats = await limitManager.getSpendingStats(userId);

    const response: any = {
      currentSpending: {
        today: stats.totalToday,
        thisMonth: stats.totalThisMonth,
        transactionCount: stats.transactionCount,
        lastTransaction: stats.lastTransaction || 'None'
      }
    };

    if (limits) {
      response.limits = {
        perTransaction: limits.perTransaction,
        daily: limits.daily,
        monthly: limits.monthly,
        enabled: limits.enabled
      };

      // Calculate remaining budget
      const todaySpent = parseFloat(stats.totalToday.replace('$', ''));
      const monthSpent = parseFloat(stats.totalThisMonth.replace('$', ''));
      const dailyLimit = parseFloat(limits.daily.replace('$', ''));
      const monthlyLimit = parseFloat(limits.monthly.replace('$', ''));

      response.remaining = {
        today: `$${Math.max(0, dailyLimit - todaySpent).toFixed(2)}`,
        thisMonth: `$${Math.max(0, monthlyLimit - monthSpent).toFixed(2)}`
      };
    } else {
      response.limits = 'No spending limits set';
      response.note = 'Use set_spending_limits to configure spending controls';
    }

    // If amount provided, check if it would be allowed
    if (value.amount) {
      const check = await limitManager.checkLimit(userId, value.amount);
      response.hypotheticalTransaction = {
        amount: value.amount,
        allowed: check.allowed,
        reason: check.reason || 'Transaction would be allowed'
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error: any) {
    logger.error('Error checking spending:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Failed to check spending'
        })
      }],
      isError: true
    };
  }
}

/**
 * Reset spending limits (remove all limits)
 *
 * @param limitManager - Spending limit manager instance
 * @param userId - User wallet address
 */
export async function resetSpendingLimits(
  limitManager: SpendingLimitManager,
  userId: string
) {
  try {
    await limitManager.resetLimits(userId);

    logger.info(`✓ Spending limits reset for ${userId}`);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Spending limits have been removed',
          note: 'You can set new limits anytime with set_spending_limits'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    logger.error('Error resetting spending limits:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message || 'Failed to reset spending limits'
        })
      }],
      isError: true
    };
  }
}

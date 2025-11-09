import Joi from 'joi';
import { UniversalX402Client } from '../payment/UniversalX402Client.js';
import { SpendingLimitManager } from '../payment/SpendingLimitManager.js';

export interface FetchWithAutopayArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  maxPayment?: string;
  autopayThreshold?: string;
}

const schema = Joi.object({
  url: Joi.string().uri().required().description('URL to fetch'),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').optional().description('HTTP method'),
  data: Joi.any().optional().description('Request body data'),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional().description('Custom headers'),
  maxPayment: Joi.string().pattern(/^\d+(\.\d{1,2})?$/).optional().description('Maximum payment in USDC (e.g., "5.00")'),
  autopayThreshold: Joi.string().pattern(/^\d+(\.\d{1,2})?$/).optional().description('Auto-pay if under this amount (default: $0.50)')
});

/**
 * fetch_url_with_autopay - Fetch any URL with automatic x402 payment handling
 *
 * CRITICAL SAFETY FEATURES:
 * 1. MANDATORY health check before payment (HEAD request)
 * 2. Never pays for unreachable/broken services
 * 3. Checks spending limits before payment
 * 4. Auto-pays only if under threshold, else returns needsUserApproval
 * 5. Gracefully degrades if external service fails
 *
 * @param x402Client - UniversalX402Client instance
 * @param limitManager - SpendingLimitManager instance
 * @param userId - User ID for spending limit tracking
 * @param args - Fetch parameters
 * @returns MCP tool response with fetched content or payment request
 */
export async function fetchUrlWithAutopay(
  x402Client: UniversalX402Client,
  limitManager: SpendingLimitManager | undefined,
  userId: string,
  args: FetchWithAutopayArgs
) {
  try {
    // Validate input
    const { error, value } = schema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Invalid input: ${error.message}`,
            healthCheckPassed: false
          }, null, 2)
        }],
        isError: true
      };
    }

    const {
      url,
      method = 'GET',
      data,
      headers,
      maxPayment = '10.00',
      autopayThreshold = '0.50'
    } = value;

    // Execute fetch with autopay (includes mandatory health check)
    const result = await x402Client.fetchWithAutopay(url, {
      method,
      data,
      headers,
      maxPayment,
      autopayThreshold
    });

    // CASE 1: Health check failed - never attempted payment
    if (!result.healthCheckPassed) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: result.error || 'Health check failed - service may be down',
            healthCheckPassed: false,
            paymentExecuted: false,
            gracefulDegradation: true,
            message: 'Falling back to native knowledge - external source unavailable'
          }, null, 2)
        }],
        isError: false // Not an error - graceful degradation
      };
    }

    // CASE 2: Needs user approval (cost exceeds autopay threshold)
    if (result.needsUserApproval) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsUserApproval: true,
            paymentAmount: result.paymentAmount,
            paymentRecipient: result.paymentRecipient,
            autopayThreshold,
            message: `Payment required: $${result.paymentAmount} to ${result.paymentRecipient}`,
            instructions: 'This exceeds your autopay threshold. Approve payment to continue.',
            healthCheckPassed: true,
            paymentExecuted: false
          }, null, 2)
        }],
        isError: false
      };
    }

    // CASE 3: Success with payment
    if (result.success && result.paymentExecuted) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result.data,
            paymentExecuted: true,
            paymentAmount: result.paymentAmount,
            paymentRecipient: result.paymentRecipient,
            paymentSignature: result.paymentSignature,
            healthCheckPassed: true,
            message: `✓ Content fetched successfully after paying $${result.paymentAmount}`
          }, null, 2)
        }]
      };
    }

    // CASE 4: Success without payment (free content)
    if (result.success && !result.paymentExecuted) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result.data,
            paymentExecuted: false,
            healthCheckPassed: true,
            message: 'Content fetched successfully (no payment required)'
          }, null, 2)
        }]
      };
    }

    // CASE 5: Failed after payment (service took money but didn't deliver)
    if (!result.success && result.paymentExecuted) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: result.error,
            paymentExecuted: true,
            paymentAmount: result.paymentAmount,
            paymentSignature: result.paymentSignature,
            healthCheckPassed: true,
            warning: 'Payment was executed but service failed to deliver content',
            message: 'This transaction is recorded. Contact service provider for refund.'
          }, null, 2)
        }],
        isError: true
      };
    }

    // CASE 6: Failed (no payment executed)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: result.error,
          paymentExecuted: false,
          healthCheckPassed: true,
          gracefulDegradation: true,
          message: 'Failed to fetch content - falling back to native knowledge'
        }, null, 2)
      }],
      isError: false // Graceful degradation
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          healthCheckPassed: false,
          paymentExecuted: false,
          gracefulDegradation: true
        }, null, 2)
      }],
      isError: false // Graceful degradation
    };
  }
}

import Stripe from 'stripe';
import { logger } from '../middleware/logger';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder_add_your_key_here') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
    typescript: true,
  });
} else {
  logger.warn('STRIPE_SECRET_KEY not set - Stripe payments will not work');
}

export type PaymentTier = 'tier1' | 'tier2';

export interface PaymentMetadata {
  sessionId: string;
  userId?: string;
  tier: PaymentTier;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

/**
 * Create a Stripe payment intent for permit purchase
 *
 * @param amountCents - Amount in cents (e.g., 3000 for $30)
 * @param tier - Payment tier ('tier1' for PDF download, 'tier2' for PDF + Accela submission)
 * @param metadata - Session and user information
 * @returns Payment intent with client secret
 */
export async function createPaymentIntent(
  amountCents: number,
  tier: PaymentTier,
  metadata: PaymentMetadata
): Promise<PaymentIntentResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }

  try {
    logger.info('Creating Stripe payment intent', {
      amount: amountCents,
      tier,
      sessionId: metadata.sessionId,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tier,
        sessionId: metadata.sessionId,
        userId: metadata.userId || 'guest',
        service: 'ai-permit-tampa',
      },
      description: tier === 'tier1'
        ? 'Permit Package (PDFs only)'
        : 'Permit Package with Auto-Submission',
    });

    logger.info('Payment intent created successfully', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error: any) {
    logger.error('Failed to create payment intent', {
      error: error.message,
      code: error.code,
      type: error.type,
    });
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
}

/**
 * Verify Stripe webhook signature
 *
 * @param payload - Raw request body string
 * @param signature - Stripe-Signature header value
 * @returns Verified Stripe event
 * @throws Error if signature verification fails
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    logger.info('Webhook signature verified', {
      eventType: event.type,
      eventId: event.id,
    });

    return event;
  } catch (error: any) {
    logger.error('Webhook signature verification failed', {
      error: error.message,
    });
    throw new Error(`Webhook verification failed: ${error.message}`);
  }
}

/**
 * Extract metadata from payment intent
 *
 * @param paymentIntent - Stripe payment intent object
 * @returns Typed metadata
 */
export function extractPaymentMetadata(
  paymentIntent: Stripe.PaymentIntent
): PaymentMetadata {
  const metadata = paymentIntent.metadata;

  return {
    sessionId: metadata.sessionId,
    userId: metadata.userId === 'guest' ? undefined : metadata.userId,
    tier: metadata.tier as PaymentTier,
  };
}

/**
 * Get payment intent details by ID
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @returns Payment intent object
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe client not initialized');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    logger.debug('Retrieved payment intent', {
      paymentIntentId,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    return paymentIntent;
  } catch (error: any) {
    logger.error('Failed to retrieve payment intent', {
      paymentIntentId,
      error: error.message,
    });
    throw new Error(`Payment intent retrieval failed: ${error.message}`);
  }
}

/**
 * Check if payment intent is successfully paid
 *
 * @param paymentIntent - Stripe payment intent object
 * @returns True if payment succeeded
 */
export function isPaymentSuccessful(paymentIntent: Stripe.PaymentIntent): boolean {
  return paymentIntent.status === 'succeeded';
}

/**
 * Get pricing for tier from environment
 *
 * @param tier - Payment tier
 * @returns Amount in cents
 */
export function getTierPricing(tier: PaymentTier): number {
  const tier1Price = parseInt(process.env.TIER1_PRICE_CENTS || '3000', 10);
  const tier2Price = parseInt(process.env.TIER2_PRICE_CENTS || '15000', 10);

  return tier === 'tier1' ? tier1Price : tier2Price;
}

export default {
  createPaymentIntent,
  verifyWebhookSignature,
  extractPaymentMetadata,
  getPaymentIntent,
  isPaymentSuccessful,
  getTierPricing,
};

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { permitInfoAuth, formGeneratorAuth, autoSubmitAuth, PRICING } from './middleware/x402';
import { logger, expressLogger } from './middleware/logger';
import {
  validatePermitInfo,
  validateFormGenerator,
  validateAutoSubmit,
} from './utils/validation';
import { PermitInfoService } from './services/permitInfo';
import { FormGeneratorService } from './services/formGenerator';
import { AutoSubmitterService } from './services/autoSubmitter';
import { AccelaSubmitter } from './integrations/accelaSubmitter';
import { register, collectDefaultMetrics } from 'prom-client';
import { processMessage, generateDataSummary } from './services/conversationalAgent';
import { chatSessions, submissions } from './db/database';
import { randomUUID } from 'crypto';
import {
  createPaymentIntent,
  verifyWebhookSignature,
  extractPaymentMetadata,
  isPaymentSuccessful,
  getTierPricing,
  type PaymentTier,
} from './services/stripePayment';
import organizationRoutes from './services/organizationRoutes';
import { sendPreviewLinkEmail, sendSubmissionConfirmationEmail } from './services/emailService';

const app = express();
const PORT = process.env.PORT || 3010;

// Initialize services
const permitInfoService = new PermitInfoService();
const formGeneratorService = new FormGeneratorService();
const autoSubmitterService = new AutoSubmitterService();

// Helper: Sanitize error messages for production
function getErrorMessage(error: any): string {
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred while processing your request';
  }
  return error.message || 'Unknown error';
}

// Prometheus metrics
collectDefaultMetrics();

// Security middleware
app.use(helmet());

// CORS configuration - restrict origins for security
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ALLOWED_ORIGINS?.split(',') || [])
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3010'];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(expressLogger);

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ==================== Public Endpoints (No Payment) ====================

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ai-permit-tampa',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Metrics endpoint (Prometheus)
 */
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

/**
 * Service info endpoint - Returns pricing and capabilities
 */
app.get('/info', (req: Request, res: Response) => {
  res.json({
    name: process.env.SERVICE_NAME || 'ai-permit-tampa',
    description:
      process.env.SERVICE_DESCRIPTION ||
      'AI-powered HVAC permit automation for Tampa Bay',
    version: '1.0.0',
    jurisdiction: {
      counties: ['hillsborough', 'pinellas', 'pasco'],
      primary: 'hillsborough',
      state: 'Florida',
    },
    pricing: [
      {
        tier: 'permit-info',
        endpoint: '/api/v1/permit-info',
        description: 'Get permit requirements, fees, and timeline',
        price: PRICING.PERMIT_INFO,
        currency: 'USDC',
        network: process.env.NETWORK || 'base-sepolia',
      },
      {
        tier: 'form-generator',
        endpoint: '/api/v1/generate-form',
        description: 'Generate submission-ready PDF permit forms',
        price: PRICING.FORM_GENERATOR,
        currency: 'USDC',
        network: process.env.NETWORK || 'base-sepolia',
      },
      {
        tier: 'auto-submit',
        endpoint: '/api/v1/submit-permit',
        description: 'Fully automated permit submission (Phase 3 - Coming Soon)',
        price: PRICING.AUTO_SUBMIT,
        currency: 'USDC',
        network: process.env.NETWORK || 'base-sepolia',
        status: 'coming-soon',
      },
    ],
    capabilities: [
      'Intelligent permit type classification using Claude AI',
      'Accurate fee calculation based on county rules',
      'Comprehensive requirements lookup',
      'PDF form generation matching county format',
      'Support for residential and commercial HVAC',
      'Multi-county support (Hillsborough, Pinellas, Pasco)',
      'Real-time Accela Civic Platform integration',
    ],
    paymentProtocol: 'x402',
    documentation: 'https://github.com/agentmarket/ai-permit-tampa',
  });
});

// ==================== Conversational AI Chat API (New) ====================

/**
 * POST /api/v1/chat/message
 * Chat with AI to gather permit information conversationally
 * No payment required for chat - payment happens when generating package
 */
app.post('/api/v1/chat/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create or get session
    let session;
    let newSessionId = sessionId;

    if (!sessionId) {
      // Create new session
      newSessionId = randomUUID();
      chatSessions.create(newSessionId, userId || null);
      session = chatSessions.get(newSessionId);
    } else {
      // Get existing session
      session = chatSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Add user message to history
    chatSessions.addMessage(newSessionId, 'user', message);

    // Process with AI
    const aiResponse = await processMessage(message, session.messages);

    // Add AI response to history
    chatSessions.addMessage(newSessionId, 'assistant', aiResponse.message);

    // Update extracted data if any
    if (aiResponse.extractedData) {
      chatSessions.updateExtractedData(newSessionId, aiResponse.extractedData);
    }

    // Mark complete if ready
    if (aiResponse.isComplete) {
      chatSessions.markComplete(newSessionId);
    }

    // Generate data summary
    const dataSummary = aiResponse.extractedData
      ? generateDataSummary(aiResponse.extractedData)
      : null;

    res.json({
      sessionId: newSessionId,
      aiResponse: aiResponse.message,
      extractedData: aiResponse.extractedData,
      dataSummary,
      missingFields: aiResponse.missingFields,
      isComplete: aiResponse.isComplete,
      conversationState: aiResponse.conversationState,
    });
  } catch (error: any) {
    logger.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/v1/chat/session/:sessionId
 * Get chat session details
 */
app.get('/api/v1/chat/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = chatSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const dataSummary = session.extracted_data
      ? generateDataSummary(session.extracted_data)
      : null;

    res.json({
      sessionId: session.id,
      messages: session.messages,
      extractedData: session.extracted_data,
      dataSummary,
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    });
  } catch (error: any) {
    logger.error('Session retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve session',
      details: getErrorMessage(error),
    });
  }
});

// ==================== Stripe Payment Endpoints (Contractor Web Payments) ====================

/**
 * POST /api/v1/payments/create-intent
 * Create a Stripe payment intent for permit package purchase
 * No authentication required - payment happens in client
 */
app.post('/api/v1/payments/create-intent', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, tier } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!tier || !['tier1', 'tier2'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier. Must be "tier1" or "tier2"',
        availableTiers: {
          tier1: 'PDF Package Download ($30)',
          tier2: 'PDF Package + Auto-Submission ($150)',
        },
      });
    }

    // Verify session exists and has complete data
    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        error: 'Session incomplete',
        details: 'Please complete the chat conversation before purchasing',
      });
    }

    if (!session.extracted_data) {
      return res.status(400).json({
        error: 'No permit data extracted',
        details: 'Session does not contain valid permit information',
      });
    }

    // Get pricing for tier
    const amount = getTierPricing(tier as PaymentTier);

    // Create payment intent
    const paymentIntent = await createPaymentIntent(amount, tier as PaymentTier, {
      sessionId,
      userId,
      tier: tier as PaymentTier,
    });

    logger.info('Payment intent created for contractor', {
      sessionId,
      tier,
      amount,
      paymentIntentId: paymentIntent.paymentIntentId,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: paymentIntent.amount,
      tier,
      description: tier === 'tier1'
        ? 'Permit Package (PDF Download)'
        : 'Permit Package with Auto-Submission',
    });
  } catch (error: any) {
    logger.error('Payment intent creation failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to create payment',
      details: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/v1/payments/confirm
 * Confirm payment completion and update session status
 * Called by frontend after Stripe confirmPayment succeeds
 */
app.post('/api/v1/payments/confirm', async (req: Request, res: Response) => {
  try {
    const { sessionId, paymentIntentId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    // Get session data
    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'paid') {
      // Already confirmed (possibly by webhook)
      logger.info('Payment already confirmed', { sessionId, paymentIntentId });
      return res.json({
        success: true,
        alreadyConfirmed: true,
        sessionStatus: session.status,
      });
    }

    // Verify session has extracted data
    if (!session.extracted_data) {
      return res.status(400).json({
        error: 'No permit data',
        details: 'Session does not contain valid permit information',
      });
    }

    logger.info('Confirming payment', {
      sessionId,
      paymentIntentId,
      currentStatus: session.status,
    });

    // Mark session as paid
    chatSessions.updateStatus(sessionId, 'paid');

    // Get submission record or create if it doesn't exist
    let submission = submissions.getBySessionId(sessionId);

    if (!submission) {
      // Create submission record
      const submissionId = randomUUID();

      // Get tier from existing payment intent metadata (we can't access Stripe here without the full SDK)
      // For now, we'll need the frontend to pass the tier
      const tier = req.body.tier as PaymentTier;
      const amountCents = getTierPricing(tier) * 100;

      submissions.create({
        id: submissionId,
        userId: session.user_id || null,
        sessionId,
        tier,
        amountCents,
        permitData: session.extracted_data,
      });

      logger.info('Submission created from payment confirmation', {
        submissionId,
        sessionId,
        tier,
      });
    }

    logger.info('Payment confirmed successfully', {
      sessionId,
      paymentIntentId,
      newStatus: 'paid',
    });

    res.json({
      success: true,
      sessionStatus: 'paid',
      message: 'Payment confirmed and session updated',
    });
  } catch (error: any) {
    logger.error('Payment confirmation failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/v1/webhooks/stripe
 * Stripe webhook handler for payment confirmations
 *
 * IMPORTANT: Must use raw body (not JSON parsed) for signature verification
 */
app.post('/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        logger.warn('Webhook received without signature');
        return res.status(400).json({ error: 'No signature provided' });
      }

      // Verify webhook signature
      const event = await verifyWebhookSignature(req.body, signature);

      logger.info('Stripe webhook received', {
        eventType: event.type,
        eventId: event.id,
      });

      // Handle payment_intent.succeeded event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as any;

        if (!isPaymentSuccessful(paymentIntent)) {
          logger.warn('Payment intent not successful', {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          });
          return res.json({ received: true });
        }

        // Extract metadata
        const metadata = extractPaymentMetadata(paymentIntent);
        const { sessionId, userId, tier } = metadata;

        logger.info('Payment successful, creating submission', {
          sessionId,
          tier,
          amount: paymentIntent.amount,
        });

        // Get session data
        const session = chatSessions.get(sessionId);
        if (!session || !session.extracted_data) {
          logger.error('Cannot create submission: session data missing', {
            sessionId,
            sessionFound: !!session,
            hasData: !!session?.extracted_data,
          });
          return res.json({ received: true, error: 'Session data missing' });
        }

        // Mark session as paid
        chatSessions.updateStatus(sessionId, 'paid');

        // Create submission record
        const submissionId = randomUUID();
        submissions.create({
          id: submissionId,
          userId: userId || null,
          sessionId,
          tier,
          amountCents: paymentIntent.amount,
          permitData: session.extracted_data,
        });

        logger.info('Submission created successfully', {
          submissionId,
          sessionId,
          tier,
        });

        // Note: Package generation will be triggered separately via /api/v1/generate-package
        // This allows us to show immediate payment confirmation in the UI
      }

      // Handle other event types (optional)
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as any;
        logger.warn('Payment failed', {
          paymentIntentId: paymentIntent.id,
          lastPaymentError: paymentIntent.last_payment_error,
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Webhook processing failed', { error: error.message });
      res.status(400).json({
        error: 'Webhook processing failed',
        details: getErrorMessage(error),
      });
    }
});

// ==================== Package Generation Endpoint ====================

/**
 * GET /api/v1/payments/status/:sessionId
 * Check payment status for a session
 */
app.get('/api/v1/payments/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const submission = submissions.getBySessionId(sessionId);

    res.json({
      sessionStatus: session.status,
      isPaid: session.status === 'paid',
      hasSubmission: !!submission,
      submissionId: submission?.id || null,
      hasPdfPackage: !!submission?.pdf_package,
    });
  } catch (error: any) {
    logger.error('Payment status check failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to check payment status',
      details: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/v1/generate-package
 * Generate PDF package after successful payment
 * Creates PDFs and returns either direct download (Tier 1) or approval link (Tier 2)
 */
app.post('/api/v1/generate-package', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Get session data
    const session = chatSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'paid') {
      return res.status(400).json({
        error: 'Session not paid',
        details: 'Payment must be completed before generating package',
        sessionStatus: session.status,
      });
    }

    if (!session.extracted_data) {
      return res.status(400).json({
        error: 'No permit data',
        details: 'Session does not contain valid permit information',
      });
    }

    // Get submission record
    const submission = submissions.getBySessionId(sessionId);
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        details: 'No submission record found for this session',
      });
    }

    if (submission.pdf_package) {
      // Package already generated
      logger.info('Package already exists', {
        submissionId: submission.id,
        tier: submission.tier,
      });

      if (submission.tier === 'tier2' && submission.approval_token) {
        return res.json({
          success: true,
          submissionId: submission.id,
          tier: submission.tier,
          approvalToken: submission.approval_token,
          approvalExpiresAt: submission.approval_expires_at,
          previewUrl: `/preview/${submission.approval_token}`,
          pdfPackage: submission.pdf_package,
        });
      }

      return res.json({
        success: true,
        submissionId: submission.id,
        tier: submission.tier,
        pdfPackage: submission.pdf_package,
      });
    }

    logger.info('Generating PDF package', {
      sessionId,
      submissionId: submission.id,
      tier: submission.tier,
    });

    // Generate PDF package using form generator service
    const result = await formGeneratorService.generateForm(session.extracted_data);

    if (!result.success) {
      logger.error('PDF generation failed', {
        sessionId,
        submissionId: submission.id,
        error: result.error,
        missingFields: result.missingFields,
      });
      return res.status(400).json({
        error: 'PDF generation failed',
        details: result.error,
        missingFields: result.missingFields || [],
        message: result.missingFields && result.missingFields.length > 0
          ? `Missing required information: ${result.missingFields.join(', ')}`
          : result.error,
      });
    }

    // Prepare PDF package
    const pdfPackage = {
      mainForm: result.form,
      additionalDocuments: result.additionalDocuments || [],
    };

    // Save PDFs to submission
    submissions.setPdfPackage(submission.id, pdfPackage);

    logger.info('PDF package generated successfully', {
      sessionId,
      submissionId: submission.id,
      tier: submission.tier,
      documentCount: pdfPackage.additionalDocuments.length + 1,
    });

    // Handle Tier 1 vs Tier 2
    if (submission.tier === 'tier2') {
      // Tier 2: Create approval token for review workflow
      const approvalToken = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      submissions.setApprovalToken(submission.id, approvalToken, expiresAt);

      logger.info('Approval token created for Tier 2', {
        submissionId: submission.id,
        approvalToken,
        expiresAt,
      });

      // Send preview link email to contractor
      const contractorEmail = session.extracted_data?.contractor?.email;
      const contractorName = session.extracted_data?.contractor?.name;

      if (contractorEmail) {
        const previewUrl = `${process.env.SITE_URL || 'http://localhost:3010'}/preview/${approvalToken}`;

        sendPreviewLinkEmail({
          to: contractorEmail,
          customerName: contractorName,
          previewUrl,
          expiresAt,
          submissionId: submission.id,
        }).catch(error => {
          logger.error('Failed to send preview link email', {
            error: error.message,
            submissionId: submission.id,
            to: contractorEmail,
          });
          // Don't fail the request if email fails - log and continue
        });

        logger.info('Preview link email queued', {
          to: contractorEmail,
          submissionId: submission.id,
        });
      } else {
        logger.warn('No contractor email available for preview link', {
          submissionId: submission.id,
        });
      }

      return res.json({
        success: true,
        submissionId: submission.id,
        tier: 'tier2',
        approvalToken,
        approvalExpiresAt: expiresAt.toISOString(),
        previewUrl: `/preview/${approvalToken}`,
        message: 'Please review your package and approve for submission',
        pdfPackage,
      });
    } else {
      // Tier 1: Just return PDFs for download
      return res.json({
        success: true,
        submissionId: submission.id,
        tier: 'tier1',
        message: 'Your permit package is ready for download',
        pdfPackage,
      });
    }
  } catch (error: any) {
    logger.error('Package generation error', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate package',
      details: getErrorMessage(error),
    });
  }
});

/**
 * GET /preview/:token
 * HTML preview page for Tier 2 approval workflow
 * Shows PDF list and allows customer to approve for Accela submission
 */
app.get('/preview/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Get submission by token
    const submission = submissions.getByToken(token);

    if (!submission) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Token</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid or Expired Token</h1>
            <p>This approval link is invalid or has expired. Approval tokens are valid for 24 hours.</p>
            <p>If you need assistance, please contact support.</p>
          </body>
        </html>
      `);
    }

    // Check if token expired
    const expiresAt = new Date(submission.approval_expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Token Expired</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Approval Token Expired</h1>
            <p>This approval link expired on ${expiresAt.toLocaleString()}.</p>
            <p>Approval tokens are valid for 24 hours. Please contact support to generate a new token.</p>
          </body>
        </html>
      `);
    }

    // Check if already submitted
    if (submission.status === 'submitted') {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Already Submitted</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              .success { color: #2e7d32; }
              .info-box { background: #e8f5e9; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1 class="success">✓ Already Submitted</h1>
            <div class="info-box">
              <p><strong>Accela Record ID:</strong> ${submission.accela_record_id}</p>
              <p><strong>Submitted:</strong> ${new Date(submission.submitted_at).toLocaleString()}</p>
              ${submission.accela_url ? `<p><a href="${submission.accela_url}" target="_blank">View in Accela Portal</a></p>` : ''}
            </div>
            <p>Your permit application has already been submitted to Tampa's Accela system.</p>
          </body>
        </html>
      `);
    }

    // Render approval page
    const pdfPackage = submission.pdf_package;
    const documents = [
      { name: 'Main Permit Application', ...pdfPackage.mainForm },
      ...pdfPackage.additionalDocuments,
    ];

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Review Your Permit Package</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .header {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #1976d2;
              margin: 0 0 10px 0;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .pdf-list {
              margin: 20px 0;
            }
            .pdf-item {
              background: white;
              margin: 10px 0;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .pdf-item h3 {
              margin: 0 0 5px 0;
              color: #333;
            }
            .pdf-item p {
              color: #666;
              margin: 5px 0;
              font-size: 14px;
            }
            .pdf-item a {
              display: inline-block;
              margin-top: 10px;
              padding: 8px 16px;
              background: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 14px;
            }
            .pdf-item a:hover {
              background: #1565c0;
            }
            .actions {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-top: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              text-align: center;
            }
            .btn {
              padding: 15px 40px;
              font-size: 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
            }
            .btn-primary {
              background: #2e7d32;
              color: white;
            }
            .btn-primary:hover {
              background: #1b5e20;
            }
            .btn-primary:disabled {
              background: #ccc;
              cursor: not-allowed;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ff9800;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .loading {
              display: none;
              margin-top: 15px;
              color: #666;
            }
            .error {
              display: none;
              background: #ffebee;
              border-left: 4px solid #d32f2f;
              padding: 15px;
              margin-top: 15px;
              border-radius: 4px;
              color: #c62828;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏗️ Review Your Permit Package</h1>
            <p class="subtitle">Submission ID: ${submission.id}</p>
            <p class="subtitle">Created: ${new Date(submission.created_at).toLocaleString()}</p>
            <p class="subtitle">Expires: ${expiresAt.toLocaleString()}</p>
          </div>

          <div class="warning">
            <strong>⚠️ Please Review Carefully</strong>
            <p>Review all documents for accuracy before approving. Once approved, your permit application will be automatically submitted to Tampa's Accela system.</p>
          </div>

          <div class="pdf-list">
            <h2>Documents in Package (${documents.length})</h2>
            ${documents.map((doc, index) => `
              <div class="pdf-item">
                <h3>${index + 1}. ${doc.name || 'Document'}</h3>
                ${doc.description ? `<p>${doc.description}</p>` : ''}
                <a href="data:application/pdf;base64,${doc.pdf}" download="${doc.name || 'document'}.pdf">
                  📄 Download PDF
                </a>
              </div>
            `).join('')}
          </div>

          <div class="actions">
            <h2>Ready to Submit?</h2>
            <p>Click below to approve and automatically submit to Tampa's Accela portal.</p>
            <button id="approveBtn" class="btn btn-primary" onclick="approveAndSubmit()">
              ✓ Approve & Submit to Accela
            </button>
            <div id="loading" class="loading">
              <p>⏳ Submitting to Accela... This may take a moment.</p>
            </div>
            <div id="error" class="error"></div>
          </div>

          <script>
            async function approveAndSubmit() {
              const btn = document.getElementById('approveBtn');
              const loading = document.getElementById('loading');
              const errorDiv = document.getElementById('error');

              // Disable button and show loading
              btn.disabled = true;
              loading.style.display = 'block';
              errorDiv.style.display = 'none';

              try {
                const response = await fetch('/api/v1/submit-to-accela', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    approvalToken: '${token}',
                    confirmed: true
                  })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                  // Success!
                  alert('✓ Successfully submitted to Accela!\\n\\nRecord ID: ' + data.accelaRecordId);
                  window.location.reload();
                } else {
                  // Error
                  errorDiv.textContent = 'Error: ' + (data.error || data.details || 'Submission failed');
                  errorDiv.style.display = 'block';
                  btn.disabled = false;
                  loading.style.display = 'none';
                }
              } catch (error) {
                errorDiv.textContent = 'Network error: ' + error.message;
                errorDiv.style.display = 'block';
                btn.disabled = false;
                loading.style.display = 'none';
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    logger.error('Preview page error', { error: error.message });
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Error Loading Preview</h1>
          <p>An error occurred while loading the preview page.</p>
          <p style="color: #666; font-size: 14px;">${error.message}</p>
        </body>
      </html>
    `);
  }
});

/**
 * POST /api/v1/submit-to-accela
 * Submit approved permit application to Accela (Tier 2 only)
 * Requires approval token from preview page
 */
app.post('/api/v1/submit-to-accela', async (req: Request, res: Response) => {
  try {
    const { approvalToken, confirmed } = req.body;

    if (!approvalToken) {
      return res.status(400).json({ error: 'approvalToken is required' });
    }

    if (!confirmed) {
      return res.status(400).json({
        error: 'Confirmation required',
        details: 'You must explicitly confirm submission',
      });
    }

    // Get submission by token
    const submission = submissions.getByToken(approvalToken);

    if (!submission) {
      return res.status(404).json({
        error: 'Invalid or expired token',
        details: 'Approval token not found',
      });
    }

    // Check if token expired
    const expiresAt = new Date(submission.approval_expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({
        error: 'Token expired',
        details: `Approval token expired on ${expiresAt.toLocaleString()}`,
      });
    }

    // Check if already submitted
    if (submission.status === 'submitted') {
      logger.info('Submission already processed', {
        submissionId: submission.id,
        accelaRecordId: submission.accela_record_id,
      });

      return res.json({
        success: true,
        alreadySubmitted: true,
        accelaRecordId: submission.accela_record_id,
        accelaUrl: submission.accela_url,
        submittedAt: submission.submitted_at,
        pdfPackage: submission.pdf_package,
      });
    }

    // Verify tier is tier2
    if (submission.tier !== 'tier2') {
      return res.status(400).json({
        error: 'Invalid tier',
        details: 'Only Tier 2 submissions can be auto-submitted to Accela',
      });
    }

    // Verify PDF package exists
    if (!submission.pdf_package) {
      return res.status(400).json({
        error: 'No PDF package',
        details: 'PDF package must be generated before submission',
      });
    }

    logger.info('Starting Accela auto-submission', {
      submissionId: submission.id,
      sessionId: submission.session_id,
    });

    try {
      // Initialize Accela submitter
      const submitter = new AccelaSubmitter();

      // Parse stored JSON data
      const permitData = typeof submission.permit_data === 'string'
        ? JSON.parse(submission.permit_data)
        : submission.permit_data;

      const pdfPackage = typeof submission.pdf_package === 'string'
        ? JSON.parse(submission.pdf_package)
        : submission.pdf_package;

      // Prepare documents for upload
      const documents = [
        {
          name: pdfPackage.mainForm.filename || 'Main Permit Application',
          description: pdfPackage.mainForm.description || 'Primary permit application form',
          pdf: pdfPackage.mainForm.pdf,
        },
        ...(pdfPackage.additionalDocuments || []).map((doc: any) => ({
          name: doc.filename || doc.name,
          description: doc.description || 'Supporting document',
          pdf: doc.pdf,
        })),
      ];

      // Submit to Accela
      const result = await submitter.submitToTampa(
        permitData,
        documents
      );

      // Update submission with Accela info
      submissions.setAccelaSubmission(
        submission.id,
        result.recordId,
        result.url
      );

      logger.info('Accela submission successful', {
        submissionId: submission.id,
        accelaRecordId: result.recordId,
        accelaUrl: result.url,
        mockMode: result.mockMode,
      });

      // Send submission confirmation email to contractor
      const contractorEmail = permitData?.contractor?.email;
      const contractorName = permitData?.contractor?.name;

      if (contractorEmail) {
        sendSubmissionConfirmationEmail({
          to: contractorEmail,
          customerName: contractorName,
          accelaRecordId: result.recordId,
          accelaUrl: result.url,
          submissionId: submission.id,
        }).catch(error => {
          logger.error('Failed to send submission confirmation email', {
            error: error.message,
            submissionId: submission.id,
            to: contractorEmail,
          });
          // Don't fail the request if email fails - log and continue
        });

        logger.info('Submission confirmation email queued', {
          to: contractorEmail,
          submissionId: submission.id,
          accelaRecordId: result.recordId,
        });
      } else {
        logger.warn('No contractor email available for confirmation', {
          submissionId: submission.id,
        });
      }

      // Return success response with PDFs
      res.json({
        success: true,
        accelaRecordId: result.recordId,
        accelaUrl: result.url,
        mockMode: result.mockMode,
        message: result.mockMode
          ? 'Submitted in MOCK MODE (no real Accela submission)'
          : 'Successfully submitted to Tampa Accela portal',
        pdfPackage: submission.pdf_package,
      });
    } catch (submissionError: any) {
      logger.error('Accela submission failed', {
        submissionId: submission.id,
        error: submissionError.message,
        stack: submissionError.stack,
      });

      // Still return PDFs to customer even if submission fails
      res.status(500).json({
        success: false,
        error: 'Accela submission failed',
        details: submissionError.message,
        message: 'Your PDFs are still available for manual submission',
        pdfPackage: submission.pdf_package,
      });
    }
  } catch (error: any) {
    logger.error('Submit-to-Accela endpoint error', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      details: getErrorMessage(error),
    });
  }
});

// ==================== Phase 1: Permit Info API ($5) ====================

/**
 * POST /api/v1/permit-info
 *
 * Get permit requirements, fees, and timeline for an HVAC job
 *
 * Requires x402 payment: $5 USDC
 */
app.post(
  '/api/v1/permit-info',
  permitInfoAuth,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = validatePermitInfo(req.body);
      if (!validation.success) {
        logger.warn('Permit info validation failed', {
          error: validation.error,
        });
        return res.status(400).json({
          error: 'Invalid request',
          details: validation.error,
        });
      }

      logger.info('Processing permit info request', {
        equipmentType: validation.data!.equipmentType,
        jobType: validation.data!.jobType,
        paidBy: (req as any).payment?.from,
      });

      // Process request
      const result = await permitInfoService.getPermitInfo(validation.data!);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Permit info request error', { error: error.message });
      res.status(500).json({
        error: 'Internal server error',
        details: getErrorMessage(error),
      });
    }
  }
);

// ==================== Phase 2: Form Generator ($30) ====================

/**
 * POST /api/v1/generate-form
 *
 * Generate submission-ready PDF permit forms
 *
 * Requires x402 payment: $30 USDC
 */
app.post(
  '/api/v1/generate-form',
  formGeneratorAuth,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = validateFormGenerator(req.body);
      if (!validation.success) {
        logger.warn('Form generator validation failed', {
          error: validation.error,
        });
        return res.status(400).json({
          error: 'Invalid request',
          details: validation.error,
        });
      }

      logger.info('Processing form generation request', {
        equipmentType: validation.data!.permitInfo.equipmentType,
        contractor: validation.data!.contractor.name,
        paidBy: (req as any).payment?.from,
      });

      // Generate form
      const result = await formGeneratorService.generateForm(validation.data!);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Form generation error', { error: error.message });
      res.status(500).json({
        error: 'Internal server error',
        details: getErrorMessage(error),
      });
    }
  }
);

// ==================== Phase 3: Auto-Submit ($150) - STUB ====================

/**
 * POST /api/v1/submit-permit
 *
 * Fully automated permit submission (Phase 3 - Not yet implemented)
 *
 * Requires x402 payment: $150 USDC
 */
app.post(
  '/api/v1/submit-permit',
  autoSubmitAuth,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = validateAutoSubmit(req.body);
      if (!validation.success) {
        logger.warn('Auto-submit validation failed', {
          error: validation.error,
        });
        return res.status(400).json({
          error: 'Invalid request',
          details: validation.error,
        });
      }

      logger.info('Auto-submit request received (Phase 3 not active)', {
        equipmentType: validation.data!.permitInfo.equipmentType,
        paidBy: (req as any).payment?.from,
      });

      // Call stub service
      const result = await autoSubmitterService.submitPermit(validation.data!);

      // Return 503 Service Unavailable since Phase 3 not implemented
      res.status(503).json(result);
    } catch (error: any) {
      logger.error('Auto-submit error', { error: error.message });
      res.status(500).json({
        error: 'Internal server error',
        details: getErrorMessage(error),
      });
    }
  }
);

/**
 * GET /api/v1/submit-permit/:applicationId/status
 *
 * Get status of submitted permit (Phase 3)
 */
app.get(
  '/api/v1/submit-permit/:applicationId/status',
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      logger.info('Status check request (Phase 3 not active)', {
        applicationId,
      });

      const result = await autoSubmitterService.getStatus(applicationId);

      res.status(503).json(result);
    } catch (error: any) {
      logger.error('Status check error', { error: error.message });
      res.status(500).json({
        error: 'Internal server error',
        details: getErrorMessage(error),
      });
    }
  }
);

// ==================== Organization Management Routes ====================

/**
 * Organization, member, Accela credentials, and sharing routes
 */
app.use('/api/v1/organizations', organizationRoutes);

// ==================== Error Handlers ====================

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /info',
      'GET /metrics',
      'POST /api/v1/permit-info',
      'POST /api/v1/generate-form',
      'POST /api/v1/submit-permit (Phase 3 - Coming Soon)',
    ],
  });
});

/**
 * Global error handler
 */
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== Server Startup ====================

const server = app.listen(PORT, () => {
  logger.info('AI-Permit-Tampa service started', {
    port: PORT,
    network: process.env.NETWORK || 'base-sepolia',
    walletAddress: process.env.WALLET_ADDRESS,
    pricing: {
      permitInfo: PRICING.PERMIT_INFO,
      formGenerator: PRICING.FORM_GENERATOR,
      autoSubmit: PRICING.AUTO_SUBMIT,
    },
  });

  console.log(`\n🏗️  AI-Permit-Tampa service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Service info: http://localhost:${PORT}/info`);
  console.log(`\n💰 Payment-protected endpoints:`);
  console.log(`   Phase 1 ($${PRICING.PERMIT_INFO}): POST /api/v1/permit-info`);
  console.log(`   Phase 2 ($${PRICING.FORM_GENERATOR}): POST /api/v1/generate-form`);
  console.log(`   Phase 3 ($${PRICING.AUTO_SUBMIT}): POST /api/v1/submit-permit (Coming Soon)\n`);
});

// ==================== Graceful Shutdown ====================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;

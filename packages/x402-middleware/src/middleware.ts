import { Request, Response, NextFunction } from 'express';
import { verifyPaymentToken } from './verifier';
import { AgentMarketPayload } from './constants';

/**
 * Extend Express Request type to include payment info
 */
declare global {
  namespace Express {
    interface Request {
      agentMarketPayment?: AgentMarketPayload;
    }
  }
}

/**
 * x402 Payment Required Middleware
 *
 * ZERO CONFIGURATION REQUIRED!
 * This middleware verifies payment authorization JWTs from AgentMarket.
 *
 * Usage:
 * ```typescript
 * import { x402Middleware } from '@sentientexchange/x402-middleware';
 *
 * app.post('/your-endpoint', x402Middleware(), (req, res) => {
 *   // Access payment info: req.agentMarketPayment
 *   res.json({ result: 'Your service logic here' });
 * });
 * ```
 *
 * How it works:
 * 1. Checks for X-AgentMarket-Auth header (JWT)
 * 2. Verifies JWT signature (signed by AgentMarket backend)
 * 3. Checks token not expired
 * 4. Adds payment details to req.agentMarketPayment
 * 5. Calls next() to proceed to your handler
 *
 * If no valid token:
 * - Returns 402 Payment Required
 * - Instructs user to register service at sentientexchange.com
 */
export function x402Middleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Check for payment token header
      const authHeader = req.headers['x-agentmarket-auth'];
      const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;

      if (!token) {
        res.status(402).json({
          error: 'Payment Required',
          message: 'This service requires payment via AgentMarket',
          instructions: {
            step1: 'Register this service at https://sentientexchange.com/providers/register',
            step2: 'Clients will pay you directly on Solana blockchain',
            step3: 'AgentMarket handles payment verification and routing',
          },
          documentation: 'https://sentientexchange.com/docs/x402-middleware',
        });
        return;
      }

      // 2. Verify JWT signature and expiry
      const payload = verifyPaymentToken(token);

      // 3. Add payment info to request
      req.agentMarketPayment = payload;

      // 4. Log successful payment (optional)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[x402] Payment verified:', {
          serviceId: payload.serviceId,
          requestId: payload.requestId,
          price: payload.price,
          txSignature: payload.txSignature.substring(0, 20) + '...',
        });
      }

      // 5. Proceed to service logic
      next();
    } catch (error) {
      // Invalid or expired token
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      res.status(401).json({
        error: 'Payment Verification Failed',
        message: errorMessage,
        instructions: 'Ensure you are making requests through AgentMarket',
        support: 'https://sentientexchange.com/support',
      });
    }
  };
}

/**
 * Helper: Get payment info from request
 * Use this in your handler to access payment details
 */
export function getPaymentInfo(req: Request): AgentMarketPayload | undefined {
  return req.agentMarketPayment;
}

/**
 * Helper: Require payment info (throws if not present)
 */
export function requirePayment(req: Request): AgentMarketPayload {
  if (!req.agentMarketPayment) {
    throw new Error('Payment required: Request was not verified');
  }
  return req.agentMarketPayment;
}

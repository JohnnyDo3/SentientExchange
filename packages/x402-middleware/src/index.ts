/**
 * @sentientexchange/x402-middleware
 *
 * Zero-config payment middleware for AI services
 * Secure your Express.js endpoints with automatic blockchain payment verification
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { x402Middleware } from '@sentientexchange/x402-middleware';
 *
 * const app = express();
 * app.use(express.json());
 *
 * app.post('/analyze', x402Middleware(), (req, res) => {
 *   // Your service logic here
 *   const payment = req.agentMarketPayment;
 *   console.log('Payment verified:', payment.txSignature);
 *
 *   res.json({ result: 'Done!' });
 * });
 *
 * app.listen(3000);
 * ```
 *
 * @packageDocumentation
 */

export { x402Middleware, getPaymentInfo, requirePayment } from './middleware';
export { verifyPaymentToken, isTokenExpired } from './verifier';
export { AGENTMARKET_PUBLIC_KEY, AgentMarketPayload } from './constants';

// Default export for convenience
export { x402Middleware as default } from './middleware';

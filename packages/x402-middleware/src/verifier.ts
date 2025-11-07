import jwt from 'jsonwebtoken';
import { AGENTMARKET_PUBLIC_KEY, AgentMarketPayload } from './constants';

/**
 * Verify a JWT token signed by AgentMarket backend
 *
 * @param token - JWT token from X-AgentMarket-Auth header
 * @returns Decoded payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyPaymentToken(token: string): AgentMarketPayload {
  try {
    const payload = jwt.verify(token, AGENTMARKET_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as AgentMarketPayload;

    // Additional validation
    if (!payload.serviceId || !payload.requestId || !payload.txSignature) {
      throw new Error('Invalid token: missing required fields');
    }

    if (!payload.walletAddress || !payload.price) {
      throw new Error('Invalid token: missing payment details');
    }

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Payment token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid payment token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as AgentMarketPayload | null;
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

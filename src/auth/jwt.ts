import jwt from 'jsonwebtoken';

/**
 * JWT authentication utilities
 * Manages token generation and validation
 */

// JWT secret (MUST be set in production)
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production';

// Token expires in 7 days
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  address: string;
  chainId: number;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for an authenticated wallet
 */
export function generateToken(address: string, chainId: number): string {
  const payload: TokenPayload = {
    address: address.toLowerCase(),
    chainId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Check if a token is expired without throwing
 */
export function isTokenExpired(token: string): boolean {
  try {
    verifyToken(token);
    return false;
  } catch (error: any) {
    return error.message.includes('expired');
  }
}

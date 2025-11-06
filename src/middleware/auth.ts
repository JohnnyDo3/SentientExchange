import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, extractTokenFromCookie, TokenPayload } from '../auth/jwt.js';
import { securityLogger } from '../utils/logger.js';
import { getErrorMessage } from '../types/errors.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if no valid token provided
 * SECURITY: Tries httpOnly cookie first (XSS safe), then Authorization header (backwards compatibility)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Try to extract token from httpOnly cookie first (preferred - XSS safe)
    let token = extractTokenFromCookie(req.cookies);

    // Fall back to Authorization header for backwards compatibility
    if (!token) {
      token = extractToken(req.headers.authorization);
    }

    if (!token) {
      // Security event: Authentication required but no token provided
      securityLogger.authFailure({
        reason: 'No authentication token provided',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authentication token',
      });
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    // Attach user info to request
    req.user = payload;

    next();
  } catch (error: unknown) {
    // Security event: Token verification failed
    const message = getErrorMessage(error);
    securityLogger.authFailure({
      reason: `Token verification failed: ${message}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      message,
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 * SECURITY: Tries httpOnly cookie first (XSS safe), then Authorization header (backwards compatibility)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Try httpOnly cookie first, fall back to Authorization header
    let token = extractTokenFromCookie(req.cookies);
    if (!token) {
      token = extractToken(req.headers.authorization);
    }

    if (token) {
      const payload = verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Token invalid, but that's okay for optional auth
    next();
  }
}

/**
 * Check if authenticated user owns a resource
 * Used for edit/delete operations
 */
export function checkOwnership(resourceOwner: string, req: Request): boolean {
  if (!req.user) {
    return false;
  }

  // Compare addresses (case-insensitive)
  return req.user.address.toLowerCase() === resourceOwner.toLowerCase();
}

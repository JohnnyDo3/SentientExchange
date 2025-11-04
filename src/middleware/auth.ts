import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, TokenPayload } from '../auth/jwt.js';

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
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const token = extractToken(req.headers.authorization);

    if (!token) {
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
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      message: error.message,
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req.headers.authorization);

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

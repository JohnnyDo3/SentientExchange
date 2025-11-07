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

/**
 * Middleware to require admin privileges
 * Returns 403 if user is not an admin
 * SECURITY: Checks if wallet address is in ADMIN_WALLETS environment variable
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    // First check authentication
    if (!req.user) {
      securityLogger.authFailure({
        reason: 'Admin access attempted without authentication',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Admin access requires authentication',
      });
      return;
    }

    // Check if user is admin
    const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

    if (adminWallets.length === 0) {
      securityLogger.authFailure({
        reason: 'Admin access attempted but no admins configured',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        address: req.user.address,
      });

      res.status(403).json({
        success: false,
        error: 'Admin access denied',
        message: 'No admins configured',
      });
      return;
    }

    const userAddress = req.user.address.toLowerCase();
    const isAdmin = adminWallets.includes(userAddress);

    if (!isAdmin) {
      securityLogger.authFailure({
        reason: 'Admin access denied - user is not an admin',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        address: req.user.address,
      });

      res.status(403).json({
        success: false,
        error: 'Admin access denied',
        message: 'You do not have admin privileges',
      });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    securityLogger.authFailure({
      reason: `Admin check failed: ${message}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(500).json({
      success: false,
      error: 'Admin verification failed',
      message,
    });
  }
}

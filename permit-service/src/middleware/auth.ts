/**
 * Clerk Authentication Middleware
 * Validates JWT tokens and extracts user information
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient, authenticateRequest } from '@clerk/express';

// Extend Express Request to include auth data
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        user?: any;
      };
    }
  }
}

/**
 * Optional auth middleware - extracts user if token present but doesn't require it
 * Use this for routes that work for both guests and authenticated users
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue as guest
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Verify the session token with Clerk
    try {
      const authState = await authenticateRequest({
        clerkClient,
        request: req as any,
        options: {
          jwtKey: process.env.CLERK_SECRET_KEY,
          authorizedParties: [],
        },
      });

      if (authState.isSignedIn && authState.toAuth().userId) {
        req.auth = {
          userId: authState.toAuth().userId!,
          sessionId: authState.toAuth().sessionId || '',
        };
      }
    } catch (verifyError) {
      // Token invalid but don't block - continue as guest
      console.warn('Auth token verification failed:', verifyError);
    }

    next();
  } catch (error) {
    // Any other error - continue as guest
    console.warn('Auth middleware error:', error);
    next();
  }
}

/**
 * Required auth middleware - blocks request if no valid token
 * Use this for protected routes that require authentication
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in.',
      });
    }

    // Verify the session token with Clerk
    const authState = await authenticateRequest({
      clerkClient,
      request: req as any,
      options: {
        jwtKey: process.env.CLERK_SECRET_KEY,
        authorizedParties: [],
      },
    });

    if (!authState.isSignedIn || !authState.toAuth().userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.',
      });
    }

    req.auth = {
      userId: authState.toAuth().userId!,
      sessionId: authState.toAuth().sessionId || '',
    };

    next();
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication verification failed.',
    });
  }
}

/**
 * Get full user details from Clerk
 */
export async function getUserDetails(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return null;
  }
}

import { logger, securityLogger } from '../utils/logger.js';
import { Request, Response, NextFunction } from 'express';
import rateLimitMiddleware, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';

/**
 * Security Middleware
 *
 * Implements rate limiting, security headers, request validation,
 * and other security best practices for the API server.
 */

// Rate Limiting Configuration
export const apiLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health',
});

// Stricter rate limit for write operations (POST, PUT, DELETE)
export const writeLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 write operations per 15 minutes
  message: {
    success: false,
    error: 'Too many write operations, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limit for service registration
export const registrationLimiter = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 registrations per hour
  message: {
    success: false,
    error: 'Too many service registrations, please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for MCP SSE connections
export const mcpConnectionLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 new SSE connections per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many MCP connection attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for MCP messages
export const mcpMessageLimiter = rateLimitMiddleware({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Max 60 messages per minute (1 per second average)
  message: {
    success: false,
    error: 'Too many MCP messages, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Extract session ID from query for per-session limiting
  keyGenerator: (req) => {
    const sessionId = req.query.sessionId as string;
    // Use sessionId if available, otherwise use IP with IPv6 support
    if (sessionId) return sessionId;
    // Use ipKeyGenerator helper to properly handle IPv6 addresses
    return ipKeyGenerator(req.ip || 'unknown');
  },
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allows embedding for WebSocket
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// CORS Configuration
export const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allowed origins (configure based on environment)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ];

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV === 'development'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Payment',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // 24 hours
};

// Request size limiting middleware
export function requestSizeLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const contentLength = req.headers['content-length'];

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 1024 * 1024; // 1MB

    if (size > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large (max 1MB)',
      });
    }
  }

  next();
}

// Error sanitization middleware
export function errorHandler(
  err: Error & { status?: number; message?: string; name?: string },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('API Error:', err);

  // Don't leak internal error details in production
  const isProd = process.env.NODE_ENV === 'production';

  // Validation errors (safe to expose)
  if (
    err.name === 'ValidationError' ||
    err.message?.includes('Validation failed')
  ) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Not found errors
  if (err.status === 404 || err.message?.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Resource not found',
    });
  }

  // Unauthorized/Forbidden
  if (err.status === 401 || err.status === 403) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'Unauthorized',
    });
  }

  // Generic server error (sanitized in production)
  res.status(500).json({
    success: false,
    error: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

// Request ID middleware (for tracking and debugging)
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id =
    (req.headers['x-request-id'] as string) ||
    `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'];

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    logger.info(JSON.stringify(log));
  });

  next();
}

// Input sanitization middleware
export function sanitizeRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).trim();
      }
    });
  }

  // Sanitize body (basic XSS prevention)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: Record<string, unknown>): void {
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (typeof value === 'string') {
      // Remove null bytes and trim whitespace
      let sanitized = value.replace(/\0/g, '');
      sanitized = sanitized.trim();
      obj[key] = sanitized;
    } else if (Array.isArray(value)) {
      // Recursively sanitize objects within arrays
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          sanitizeObject(value[index] as Record<string, unknown>);
        }
      });
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitizeObject(value as Record<string, unknown>);
    }
  });
}

/**
 * Generate CSRF token middleware
 * Generates a unique token for each session and sends it in response header
 */
export function generateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate a new CSRF token if not present
  if (!req.headers['x-csrf-token']) {
    const token = crypto.randomBytes(32).toString('hex');
    res.setHeader('X-CSRF-Token', token);

    // Store token in a secure cookie (double-submit pattern)
    res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });
  }
  next();
}

/**
 * CSRF protection for state-changing operations
 * Validates CSRF token using double-submit cookie pattern
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip CSRF for read operations
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  // Skip CSRF for development (but log warning)
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('CSRF protection skipped in development');
    return next();
  }

  // Verify CSRF token (double-submit cookie pattern)
  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies?.['csrf-token'];

  // Both tokens must be present
  if (!headerToken || !cookieToken) {
    // Security event: CSRF token missing
    securityLogger.csrfViolation({
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing - possible cross-site request forgery attempt',
    });
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  // First check if tokens have the same length (timingSafeEqual requires equal-length buffers)
  if (headerToken.length !== cookieToken.length) {
    // Security event: CSRF token mismatch (possible attack)
    securityLogger.csrfViolation({
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasHeader: true,
      hasCookie: true,
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token invalid - possible cross-site request forgery attempt',
    });
  }

  if (
    !crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))
  ) {
    // Security event: CSRF token mismatch (possible attack)
    securityLogger.csrfViolation({
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasHeader: true,
      hasCookie: true,
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token invalid - possible cross-site request forgery attempt',
    });
  }

  // CSRF validation passed
  next();
}

/**
 * Enhanced Authentication Middleware Tests - Additional coverage for 100%
 *
 * Tests additional edge cases, error handling, and integration scenarios
 */

import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, checkOwnership } from '../../../src/middleware/auth';
import { generateToken } from '../../../src/auth/jwt';
import { AuthHelpers } from '../../utils/helpers/authHelpers';
import jwt from 'jsonwebtoken';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  securityLogger: {
    authFailure: jest.fn(),
    csrfViolation: jest.fn(),
    rateLimitHit: jest.fn(),
    commandInjectionAttempt: jest.fn(),
    pathTraversalAttempt: jest.fn(),
  },
}));

describe('Authentication Middleware - Enhanced Coverage', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const TEST_ADDRESS = AuthHelpers.TEST_ADDRESSES.ALICE;
  const TEST_CHAIN_ID = 8453;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => mockRes as Response);

    mockReq = {
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
    } as Partial<Request>;

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('requireAuth - Cookie priority edge cases', () => {
    it('should use cookie even if header is present', () => {
      const cookieToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const headerToken = generateToken(AuthHelpers.TEST_ADDRESSES.BOB, TEST_CHAIN_ID);

      mockReq.cookies = { 'auth-token': cookieToken };
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.address).not.toBe(AuthHelpers.TEST_ADDRESSES.BOB.toLowerCase());
    });

    it('should fallback to header if cookie is empty', () => {
      const headerToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

      mockReq.cookies = { 'auth-token': '' };
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      // Empty cookie is falsy, so it falls back to header token
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should handle undefined cookies object', () => {
      const headerToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

      mockReq.cookies = undefined;
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should handle null cookies', () => {
      const headerToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

      mockReq.cookies = null as any;
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
    });
  });

  describe('requireAuth - verifyToken error scenarios', () => {
    it('should catch and handle JsonWebTokenError', () => {
      const invalidToken = 'not.a.valid.jwt';
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        message: expect.any(String),
      });
    });

    it('should catch and handle TokenExpiredError', () => {
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS.toLowerCase(), chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' }
      );

      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        message: expect.stringContaining('expired'),
      });
    });

    it('should log security failure with proper context', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      securityLogger.authFailure.mockClear();

      mockReq = {
        ...mockReq,
        ip: '10.0.0.1',
        headers: {
          authorization: 'Bearer invalid',
          'user-agent': 'Custom Agent/1.0',
        },
        cookies: {},
      } as Partial<Request>;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).toHaveBeenCalledWith({
        reason: expect.stringContaining('Token verification failed'),
        ip: '10.0.0.1',
        userAgent: 'Custom Agent/1.0',
      });
    });

    it('should handle missing user-agent in security log', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      securityLogger.authFailure.mockClear();

      mockReq.headers = { authorization: 'Bearer invalid' };
      delete mockReq.headers['user-agent'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).toHaveBeenCalledWith({
        reason: expect.any(String),
        ip: expect.any(String),
        userAgent: undefined,
      });
    });
  });

  describe('optionalAuth - Extended scenarios', () => {
    it('should gracefully handle verifyToken throwing', () => {
      // Token that will cause verifyToken to throw
      const badToken = 'malformed.jwt';
      mockReq.headers = { authorization: `Bearer ${badToken}` };

      expect(() => {
        optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle expired token gracefully', () => {
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS.toLowerCase(), chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' }
      );

      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle token with wrong secret gracefully', () => {
      const wrongSecretToken = jwt.sign(
        { address: TEST_ADDRESS.toLowerCase(), chainId: TEST_CHAIN_ID },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      mockReq.headers = { authorization: `Bearer ${wrongSecretToken}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should not modify response on error', () => {
      mockReq.headers = { authorization: 'Bearer invalid' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should handle undefined cookies', () => {
      mockReq.cookies = undefined;
      mockReq.headers = {};

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle null authorization header', () => {
      mockReq.headers = { authorization: null as any };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('checkOwnership - Comprehensive edge cases', () => {
    beforeEach(() => {
      mockReq.user = {
        address: TEST_ADDRESS.toLowerCase(),
        chainId: TEST_CHAIN_ID,
      };
    });

    it('should handle null resourceOwner', () => {
      expect(() => {
        checkOwnership(null as any, mockReq as Request);
      }).toThrow();
    });

    it('should handle undefined resourceOwner', () => {
      expect(() => {
        checkOwnership(undefined as any, mockReq as Request);
      }).toThrow();
    });

    it('should handle empty string resourceOwner', () => {
      const result = checkOwnership('', mockReq as Request);
      expect(result).toBe(false);
    });

    it('should handle resourceOwner with whitespace', () => {
      const result = checkOwnership('   ', mockReq as Request);
      expect(result).toBe(false);
    });

    it('should be case insensitive for user address', () => {
      mockReq.user = {
        address: TEST_ADDRESS.toLowerCase(),
        chainId: TEST_CHAIN_ID,
      };

      expect(checkOwnership(TEST_ADDRESS.toUpperCase(), mockReq as Request)).toBe(true);
      expect(checkOwnership(TEST_ADDRESS.toLowerCase(), mockReq as Request)).toBe(true);
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
    });

    it('should return false for null user', () => {
      mockReq.user = null as any;

      const result = checkOwnership(TEST_ADDRESS, mockReq as Request);
      expect(result).toBe(false);
    });

    it('should throw for user without address field', () => {
      mockReq.user = {
        chainId: TEST_CHAIN_ID,
      } as any;

      // Code tries to access address.toLowerCase() which will throw
      expect(() => {
        checkOwnership(TEST_ADDRESS, mockReq as Request);
      }).toThrow();
    });

    it('should handle addresses with different cases', () => {
      const mixedCase = TEST_ADDRESS.split('').map((c, i) =>
        i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
      ).join('');

      const result = checkOwnership(mixedCase, mockReq as Request);
      expect(result).toBe(true);
    });

    it('should correctly identify non-ownership', () => {
      const testCases = [
        '0x' + '0'.repeat(40),
        '0x' + 'f'.repeat(40),
        AuthHelpers.TEST_ADDRESSES.BOB,
        AuthHelpers.TEST_ADDRESSES.CHARLIE,
      ];

      testCases.forEach(addr => {
        expect(checkOwnership(addr, mockReq as Request)).toBe(false);
      });
    });

    it('should handle address without 0x prefix', () => {
      const addressWithout0x = TEST_ADDRESS.substring(2);
      mockReq.user = {
        address: addressWithout0x.toLowerCase(),
        chainId: TEST_CHAIN_ID,
      };

      const result = checkOwnership(addressWithout0x, mockReq as Request);
      expect(result).toBe(true);
    });
  });

  describe('Integration - Complete authentication flows', () => {
    it('should handle full cookie-based auth flow', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth-token': token };

      // Authenticate
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());

      // Check ownership
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
      expect(checkOwnership(AuthHelpers.TEST_ADDRESSES.BOB, mockReq as Request)).toBe(false);
    });

    it('should handle full header-based auth flow', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      // Authenticate
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();

      // Check ownership
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
    });

    it('should handle failed auth flow', () => {
      mockReq.headers = { authorization: 'Bearer invalid' };

      // Authenticate
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockReq.user).toBeUndefined();

      // Ownership should fail
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(false);
    });

    it('should handle optional auth with valid token', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
    });

    it('should handle optional auth without token', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(false);
    });
  });

  describe('Security edge cases', () => {
    it('should not leak information in error messages', () => {
      mockReq.headers = { authorization: 'Bearer invalid' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid authentication token',
        })
      );

      // Should not leak token value
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.message).not.toContain('invalid');
      expect(callArgs.message).not.toContain('Bearer');
    });

    it('should handle token injection attempts', () => {
      const maliciousToken = 'Bearer ' + '<script>alert("xss")</script>';
      mockReq.headers = { authorization: maliciousToken };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle SQL injection attempts in token', () => {
      const sqlInjection = "Bearer '; DROP TABLE users; --";
      mockReq.headers = { authorization: sqlInjection };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle path traversal attempts', () => {
      const pathTraversal = 'Bearer ../../../etc/passwd';
      mockReq.headers = { authorization: pathTraversal };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle command injection attempts', () => {
      const commandInjection = 'Bearer ; cat /etc/passwd';
      mockReq.headers = { authorization: commandInjection };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('Response consistency', () => {
    it('should return consistent 401 format for missing token', () => {
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authentication token',
      });
    });

    it('should return consistent 401 format for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        message: expect.any(String),
      });
    });

    it('should not return response for valid token', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should call next exactly once for valid token', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // No arguments
    });
  });

  describe('Middleware chaining', () => {
    it('should allow multiple middleware to access user', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      requireAuth(mockReq as Request, mockRes as Response, middleware1);

      expect(middleware1).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();

      // Simulate next middleware accessing user
      middleware1.mockImplementation(() => {
        expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
        middleware2();
      });

      middleware1();
      expect(middleware2).toHaveBeenCalled();
    });

    it('should stop middleware chain on auth failure', () => {
      const nextMiddleware = jest.fn();

      requireAuth(mockReq as Request, mockRes as Response, nextMiddleware);

      expect(nextMiddleware).not.toHaveBeenCalled();
    });
  });
});

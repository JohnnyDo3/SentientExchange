/**
 * Authentication Middleware Tests
 *
 * Comprehensive tests for authentication middleware (Phase 2.1)
 * Target Coverage: 100%
 */

import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, checkOwnership } from '../../../src/middleware/auth';
import { generateToken, verifyToken } from '../../../src/auth/jwt';
import { AuthHelpers } from '../../utils/helpers/authHelpers';
import { InvalidTokenError } from '../../../src/types/errors';
import jwt from 'jsonwebtoken';

// Mock the logger to prevent console output during tests
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

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const TEST_ADDRESS = AuthHelpers.TEST_ADDRESSES.ALICE;
  const TEST_CHAIN_ID = 8453; // Base

  beforeEach(() => {
    // Reset mocks before each test
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

  describe('requireAuth', () => {
    it('should accept valid JWT in Authorization header', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.chainId).toBe(TEST_CHAIN_ID);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should accept valid JWT in cookie', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth-token': token };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.chainId).toBe(TEST_CHAIN_ID);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should return 401 for missing token', () => {
      mockReq.headers = {};
      mockReq.cookies = {};

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authentication token',
      });
      expect(mockReq.user).toBeUndefined();
    });

    it('should return 401 for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        message: expect.stringContaining('Invalid token'),
      });
      expect(mockReq.user).toBeUndefined();
    });

    it('should return 401 for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS.toLowerCase(), chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' } // Expired 1 hour ago
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
      expect(mockReq.user).toBeUndefined();
    });

    it('should return 401 for malformed token', () => {
      mockReq.headers = { authorization: 'Bearer not.a.jwt' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        message: expect.any(String),
      });
      expect(mockReq.user).toBeUndefined();
    });

    it('should attach user to req.user', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user).toHaveProperty('address');
      expect(mockReq.user).toHaveProperty('chainId');
      expect(mockReq.user).toHaveProperty('iat');
      expect(mockReq.user).toHaveProperty('exp');
    });

    it('should normalize address to lowercase', () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const token = generateToken(upperAddress, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.address).not.toContain('A');
      expect(mockReq.user?.address).not.toContain('B');
    });

    it('should support Bearer prefix', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should support token without Bearer', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: token };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should prefer cookie over Authorization header', () => {
      const cookieToken = generateToken(AuthHelpers.TEST_ADDRESSES.ALICE, TEST_CHAIN_ID);
      const headerToken = generateToken(AuthHelpers.TEST_ADDRESSES.BOB, TEST_CHAIN_ID);

      mockReq.cookies = { 'auth-token': cookieToken };
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(AuthHelpers.TEST_ADDRESSES.ALICE.toLowerCase());
    });

    it('should accept auth_token cookie (underscore variant)', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth_token': token };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should handle empty Authorization header', () => {
      mockReq.headers = { authorization: '' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle Authorization header with only "Bearer"', () => {
      mockReq.headers = { authorization: 'Bearer' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should include IP address in security log for missing token', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      mockReq = {
        ...mockReq,
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Test Browser/1.0' },
        cookies: {},
      } as Partial<Request>;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).toHaveBeenCalledWith({
        reason: 'No authentication token provided',
        ip: '192.168.1.100',
        userAgent: 'Test Browser/1.0',
      });
    });

    it('should include IP address in security log for invalid token', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      mockReq = {
        ...mockReq,
        ip: '192.168.1.100',
        headers: {
          authorization: 'Bearer invalid',
          'user-agent': 'Test Browser/1.0',
        },
        cookies: {},
      } as Partial<Request>;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).toHaveBeenCalledWith({
        reason: expect.stringContaining('Token verification failed'),
        ip: '192.168.1.100',
        userAgent: 'Test Browser/1.0',
      });
    });

    it('should handle tampered token signature', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');
      // Tamper with signature
      parts[2] = parts[2].substring(0, parts[2].length - 5) + 'XXXXX';
      const tamperedToken = parts.join('.');

      mockReq.headers = { authorization: `Bearer ${tamperedToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle token with tampered payload', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');
      // Create a tampered payload
      const tamperedPayload = Buffer.from(JSON.stringify({
        address: '0xhacker',
        chainId: 1,
      })).toString('base64');
      parts[1] = tamperedPayload;
      const tamperedToken = parts.join('.');

      mockReq.headers = { authorization: `Bearer ${tamperedToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle token with extra parts', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const invalidToken = `${token}.extra.parts`;

      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if token is valid', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.chainId).toBe(TEST_CHAIN_ID);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should call next without user if no token', () => {
      mockReq.headers = {};
      mockReq.cookies = {};

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should call next without user if token invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should not throw on invalid token', () => {
      mockReq.headers = { authorization: 'Bearer malformed.token' };

      expect(() => {
        optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not throw on expired token', () => {
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS.toLowerCase(), chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' }
      );

      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      expect(() => {
        optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should prefer cookie over Authorization header', () => {
      const cookieToken = generateToken(AuthHelpers.TEST_ADDRESSES.ALICE, TEST_CHAIN_ID);
      const headerToken = generateToken(AuthHelpers.TEST_ADDRESSES.BOB, TEST_CHAIN_ID);

      mockReq.cookies = { 'auth-token': cookieToken };
      mockReq.headers = { authorization: `Bearer ${headerToken}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(AuthHelpers.TEST_ADDRESSES.ALICE.toLowerCase());
    });

    it('should accept token from auth_token cookie', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth_token': token };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should support token without Bearer prefix', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: token };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should handle empty authorization header', () => {
      mockReq.headers = { authorization: '' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle Authorization header with only "Bearer"', () => {
      mockReq.headers = { authorization: 'Bearer' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });

    it('should normalize address to lowercase when valid token', () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const token = generateToken(upperAddress, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should not log security events for missing token', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      securityLogger.authFailure.mockClear();

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).not.toHaveBeenCalled();
    });

    it('should not log security events for invalid token', () => {
      const { securityLogger } = require('../../../src/utils/logger');
      securityLogger.authFailure.mockClear();

      mockReq.headers = { authorization: 'Bearer invalid' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.authFailure).not.toHaveBeenCalled();
    });
  });

  describe('checkOwnership', () => {
    beforeEach(() => {
      // Set up a mock authenticated user
      mockReq.user = {
        address: TEST_ADDRESS.toLowerCase(),
        chainId: TEST_CHAIN_ID,
      };
    });

    it('should return true for matching address', () => {
      const result = checkOwnership(TEST_ADDRESS, mockReq as Request);

      expect(result).toBe(true);
    });

    it('should return false for different address', () => {
      const differentAddress = AuthHelpers.TEST_ADDRESSES.BOB;
      const result = checkOwnership(differentAddress, mockReq as Request);

      expect(result).toBe(false);
    });

    it('should return false if no user', () => {
      mockReq.user = undefined;
      const result = checkOwnership(TEST_ADDRESS, mockReq as Request);

      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const result = checkOwnership(upperAddress, mockReq as Request);

      expect(result).toBe(true);
    });

    it('should be case-insensitive (lowercase resource owner)', () => {
      const lowerAddress = TEST_ADDRESS.toLowerCase();
      const result = checkOwnership(lowerAddress, mockReq as Request);

      expect(result).toBe(true);
    });

    it('should be case-insensitive (mixed case resource owner)', () => {
      const mixedAddress = TEST_ADDRESS.substring(0, 10).toLowerCase() + TEST_ADDRESS.substring(10).toUpperCase();
      const result = checkOwnership(mixedAddress, mockReq as Request);

      expect(result).toBe(true);
    });

    it('should return false for null user', () => {
      mockReq.user = undefined;
      const result = checkOwnership(TEST_ADDRESS, mockReq as Request);

      expect(result).toBe(false);
    });

    it('should handle different address prefixes correctly', () => {
      mockReq.user = {
        address: '0x' + '1'.repeat(40),
        chainId: TEST_CHAIN_ID,
      };

      expect(checkOwnership('0x' + '1'.repeat(40), mockReq as Request)).toBe(true);
      expect(checkOwnership('0x' + '2'.repeat(40), mockReq as Request)).toBe(false);
    });

    it('should return true only when addresses match exactly (case-insensitive)', () => {
      const testCases = [
        { owner: TEST_ADDRESS, user: TEST_ADDRESS, expected: true },
        { owner: TEST_ADDRESS.toLowerCase(), user: TEST_ADDRESS.toUpperCase(), expected: true },
        { owner: TEST_ADDRESS.toUpperCase(), user: TEST_ADDRESS.toLowerCase(), expected: true },
        { owner: AuthHelpers.TEST_ADDRESSES.BOB, user: TEST_ADDRESS, expected: false },
        { owner: '0x' + '9'.repeat(40), user: TEST_ADDRESS, expected: false },
      ];

      testCases.forEach(({ owner, user, expected }) => {
        mockReq.user = { address: user.toLowerCase(), chainId: TEST_CHAIN_ID };
        const result = checkOwnership(owner, mockReq as Request);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge case of empty address', () => {
      const result = checkOwnership('', mockReq as Request);
      expect(result).toBe(false);
    });

    it('should throw for null address', () => {
      // This is an edge case - null addresses shouldn't happen in practice
      // but we test it to document the behavior
      expect(() => {
        checkOwnership(null as any, mockReq as Request);
      }).toThrow();
    });

    it('should throw for undefined address', () => {
      // This is an edge case - undefined addresses shouldn't happen in practice
      // but we test it to document the behavior
      expect(() => {
        checkOwnership(undefined as any, mockReq as Request);
      }).toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should successfully authenticate a user and check ownership', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      // Authenticate
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();

      // Check ownership
      const owns = checkOwnership(TEST_ADDRESS, mockReq as Request);
      expect(owns).toBe(true);

      const doesNotOwn = checkOwnership(AuthHelpers.TEST_ADDRESSES.BOB, mockReq as Request);
      expect(doesNotOwn).toBe(false);
    });

    it('should handle the complete authentication flow with cookies', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth-token': token };

      // Authenticate
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();

      // Verify user details
      expect(mockReq.user?.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(mockReq.user?.chainId).toBe(TEST_CHAIN_ID);

      // Check ownership
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
    });

    it('should handle optional auth followed by ownership check', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.headers = { authorization: `Bearer ${token}` };

      // Optional auth
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();

      // Check ownership should work
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(true);
    });

    it('should handle optional auth without token followed by ownership check', () => {
      // No token provided
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();

      // Ownership check should fail without user
      expect(checkOwnership(TEST_ADDRESS, mockReq as Request)).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle request with both valid cookie and invalid header', () => {
      const validToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth-token': validToken };
      mockReq.headers = { authorization: 'Bearer invalid' };

      // Cookie should take precedence
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeDefined();
    });

    it('should handle request with invalid cookie and valid header', () => {
      const validToken = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      mockReq.cookies = { 'auth-token': 'invalid' };
      mockReq.headers = { authorization: `Bearer ${validToken}` };

      // Cookie is tried first, should fail
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle missing req.ip gracefully', () => {
      mockReq = {
        ...mockReq,
        ip: undefined,
        headers: { authorization: 'Bearer invalid' },
        cookies: {},
      } as Partial<Request>;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle missing user-agent gracefully', () => {
      mockReq.headers = { authorization: 'Bearer invalid' };
      delete mockReq.headers['user-agent'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle token with null bytes', () => {
      mockReq.headers = { authorization: 'Bearer token\x00with\x00nulls' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle very long token strings', () => {
      const longToken = 'a'.repeat(10000);
      mockReq.headers = { authorization: `Bearer ${longToken}` };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle token with unicode characters', () => {
      mockReq.headers = { authorization: 'Bearer token🔐with💰emoji' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});

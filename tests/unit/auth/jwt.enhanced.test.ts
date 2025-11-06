/**
 * Enhanced JWT Token Tests - Additional coverage for 100%
 *
 * Tests additional edge cases and error scenarios for JWT authentication
 */

import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
  extractToken,
  extractTokenFromCookie,
  isTokenExpired,
  TokenPayload
} from '../../../src/auth/jwt';

describe('JWT Authentication - Enhanced Coverage', () => {
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const TEST_CHAIN_ID = 8453; // Base

  describe('extractTokenFromCookie', () => {
    it('should return null for undefined cookies', () => {
      const result = extractTokenFromCookie(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty cookies object', () => {
      const result = extractTokenFromCookie({});
      expect(result).toBeNull();
    });

    it('should extract token from auth-token cookie', () => {
      const token = 'test-token-123';
      const result = extractTokenFromCookie({ 'auth-token': token });
      expect(result).toBe(token);
    });

    it('should extract token from auth_token cookie', () => {
      const token = 'test-token-456';
      const result = extractTokenFromCookie({ 'auth_token': token });
      expect(result).toBe(token);
    });

    it('should prefer auth-token over auth_token', () => {
      const cookies = {
        'auth-token': 'priority-token',
        'auth_token': 'fallback-token',
      };
      const result = extractTokenFromCookie(cookies);
      expect(result).toBe('priority-token');
    });

    it('should return null if no auth token cookies present', () => {
      const cookies = {
        'session': 'session-value',
        'other': 'other-value',
      };
      const result = extractTokenFromCookie(cookies);
      expect(result).toBeNull();
    });

    it('should handle cookies with empty string values', () => {
      const result = extractTokenFromCookie({ 'auth-token': '' });
      // Empty string is falsy, so returns null from the || null
      expect(result).toBeNull();
    });

    it('should handle cookies with null values', () => {
      const result = extractTokenFromCookie({ 'auth-token': null as any });
      // Returns null for falsy values
      expect(result).toBeFalsy();
    });

    it('should handle cookies with undefined values', () => {
      const result = extractTokenFromCookie({ 'auth-token': undefined as any });
      // Returns null when no valid cookie found (|| null at end)
      expect(result).toBeNull();
    });
  });

  describe('extractToken - Additional cases', () => {
    it('should handle Bearer with different capitalization', () => {
      const token = 'test-token';
      // Bearer with capital B should work
      expect(extractToken(`Bearer ${token}`)).toBe(token);
    });

    it('should not extract from "bearer" lowercase', () => {
      const token = 'test-token';
      // lowercase "bearer" should not match
      const result = extractToken(`bearer ${token}`);
      expect(result).toBe(`bearer ${token}`); // Returns the whole string
    });

    it('should handle Bearer with no space', () => {
      const result = extractToken('Bearertoken123');
      // extractToken doesn't strip "Bearer" without space - returns as-is
      expect(result).toBe('Bearertoken123');
    });

    it('should handle whitespace-only header', () => {
      const result = extractToken('   ');
      expect(result).toBe('   ');
    });

    it('should handle null header', () => {
      // extractToken returns null for falsy values
      const result = extractToken(null as any);
      expect(result).toBeNull();
    });
  });

  describe('verifyToken - Error scenarios', () => {
    it('should throw InvalidTokenError for token with wrong secret', () => {
      // Create token with different secret
      const wrongToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      expect(() => {
        verifyToken(wrongToken);
      }).toThrow('Invalid token');
    });

    it('should throw InvalidTokenError with descriptive message', () => {
      try {
        verifyToken('malformed');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Invalid token');
        expect(error.name).toBe('InvalidTokenError');
      }
    });

    it('should handle token with missing signature', () => {
      const tokenWithoutSignature = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoidGVzdCIsImNoYWluSWQiOjF9';

      expect(() => {
        verifyToken(tokenWithoutSignature);
      }).toThrow();
    });

    it('should handle base64 decode errors gracefully', () => {
      const invalidBase64Token = 'not.valid!base64.token';

      expect(() => {
        verifyToken(invalidBase64Token);
      }).toThrow('Invalid token');
    });

    it('should throw specific error for expired tokens', () => {
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' }
      );

      try {
        verifyToken(expiredToken);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('expired');
        expect(error.name).toBe('InvalidTokenError');
      }
    });

    it('should handle token with invalid JSON in payload', () => {
      // Create token with three parts but invalid JSON
      const invalidToken = 'eyJhbGciOiJIUzI1NiJ9.invalid-json.signature';

      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    it('should handle token signed with different algorithm', () => {
      // This would require generating a token with RS256 or other algorithm
      // For now, we test that algorithm mismatch is caught
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');

      // Tamper with the algorithm in header
      const tamperedHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
      const tamperedToken = `${tamperedHeader}.${parts[1]}.${parts[2]}`;

      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow();
    });

    it('should handle token with extra claims', () => {
      const tokenWithExtraClaims = jwt.sign(
        {
          address: TEST_ADDRESS.toLowerCase(), // Already lowercase to match output
          chainId: TEST_CHAIN_ID,
          role: 'admin',
          permissions: ['read', 'write'],
        },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '7d' }
      );

      const decoded = verifyToken(tokenWithExtraClaims);
      expect(decoded.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(decoded.chainId).toBe(TEST_CHAIN_ID);
    });
  });

  describe('isTokenExpired - Edge cases', () => {
    it('should return false for valid token', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for explicitly expired token', () => {
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1s' }
      );

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return false (not specifically expired) for invalid format', () => {
      // Invalid token doesn't throw "expired" error, so returns false
      expect(isTokenExpired('invalid')).toBe(false);
    });

    it('should return false for malformed token', () => {
      expect(isTokenExpired('not.a.jwt')).toBe(false);
    });

    it('should return false for empty token', () => {
      expect(isTokenExpired('')).toBe(false);
    });

    it('should return true only when error message contains "expired"', () => {
      // This tests the implementation detail that only expired errors return true
      const expiredToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '-1h' }
      );

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should handle token expiring in the future', () => {
      const futureToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '7d' }
      );

      expect(isTokenExpired(futureToken)).toBe(false);
    });

    it('should handle token with nbf (not before) claim', () => {
      const futureNbfToken = jwt.sign(
        { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        {
          expiresIn: '7d',
          notBefore: '1h' // Not valid for 1 hour
        }
      );

      // Token is not expired, just not yet valid
      // isTokenExpired checks expiration, not nbf
      expect(isTokenExpired(futureNbfToken)).toBe(false);
    });
  });

  describe('TokenPayload interface', () => {
    it('should include all required fields after verification', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const payload = verifyToken(token);

      expect(payload).toHaveProperty('address');
      expect(payload).toHaveProperty('chainId');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('should normalize address to lowercase in payload', () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const token = generateToken(upperAddress, TEST_CHAIN_ID);
      const payload = verifyToken(token);

      expect(payload.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(payload.address).not.toContain('A');
      expect(payload.address).not.toContain('B');
      expect(payload.address).not.toContain('C');
    });

    it('should preserve chainId as number', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const payload = verifyToken(token);

      expect(typeof payload.chainId).toBe('number');
      expect(payload.chainId).toBe(TEST_CHAIN_ID);
    });

    it('should include iat as unix timestamp', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const payload = verifyToken(token);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(payload.iat).toBeDefined();
      expect(payload.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(payload.iat).toBeLessThanOrEqual(afterTime);
    });

    it('should include exp approximately 7 days in future', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const payload = verifyToken(token);
      const now = Math.floor(Date.now() / 1000);
      const sevenDays = 7 * 24 * 60 * 60;

      expect(payload.exp).toBeDefined();
      expect(payload.exp! - now).toBeGreaterThan(sevenDays - 10); // Allow 10s tolerance
      expect(payload.exp! - now).toBeLessThan(sevenDays + 10); // Allow 10s tolerance
    });
  });

  describe('Security edge cases', () => {
    it('should reject token with modified address in payload', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');

      // Modify the address in payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.address = '0xhackeraddress';
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = parts.join('.');

      expect(() => {
        verifyToken(modifiedToken);
      }).toThrow();
    });

    it('should reject token with modified chainId in payload', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');

      // Modify the chainId in payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.chainId = 99999;
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = parts.join('.');

      expect(() => {
        verifyToken(modifiedToken);
      }).toThrow();
    });

    it('should reject token with modified expiration', () => {
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const parts = token.split('.');

      // Extend expiration
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.exp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = parts.join('.');

      expect(() => {
        verifyToken(modifiedToken);
      }).toThrow();
    });

    it('should handle token with very large exp value', () => {
      const token = jwt.sign(
        {
          address: TEST_ADDRESS.toLowerCase(),
          chainId: TEST_CHAIN_ID,
        },
        process.env.JWT_SECRET || 'agentmarket-dev-secret-change-in-production',
        { expiresIn: '365d' } // 1 year
      );

      const payload = verifyToken(token);
      expect(payload.address).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should handle token generated at exactly the same second', () => {
      const token1 = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const token2 = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

      const payload1 = verifyToken(token1);
      const payload2 = verifyToken(token2);

      // IATs might be identical if generated in same second
      expect(payload1.iat).toBeLessThanOrEqual(payload2.iat! + 1);
    });
  });

  describe('Environment-specific behavior', () => {
    // Note: JWT_SECRET is read at module load time, so we can't dynamically change it
    // These tests verify that the current environment configuration works

    it('should work with current JWT_SECRET configuration', () => {
      // Generate and verify with current secret
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);

      // Should verify successfully
      const payload = verifyToken(token);
      expect(payload.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(payload.chainId).toBe(TEST_CHAIN_ID);
    });

    it('should generate tokens that are valid for verification', () => {
      // Test that generated tokens work end-to-end
      const token = generateToken(TEST_ADDRESS, TEST_CHAIN_ID);
      const payload = verifyToken(token);

      expect(payload.address).toBe(TEST_ADDRESS.toLowerCase());
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });
  });

  describe('Multiple chain support', () => {
    it('should support Ethereum mainnet (chainId: 1)', () => {
      const token = generateToken(TEST_ADDRESS, 1);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(1);
    });

    it('should support Base mainnet (chainId: 8453)', () => {
      const token = generateToken(TEST_ADDRESS, 8453);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(8453);
    });

    it('should support Base Sepolia testnet (chainId: 84532)', () => {
      const token = generateToken(TEST_ADDRESS, 84532);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(84532);
    });

    it('should support Polygon (chainId: 137)', () => {
      const token = generateToken(TEST_ADDRESS, 137);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(137);
    });

    it('should support Arbitrum (chainId: 42161)', () => {
      const token = generateToken(TEST_ADDRESS, 42161);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(42161);
    });

    it('should support Optimism (chainId: 10)', () => {
      const token = generateToken(TEST_ADDRESS, 10);
      const payload = verifyToken(token);
      expect(payload.chainId).toBe(10);
    });
  });
});

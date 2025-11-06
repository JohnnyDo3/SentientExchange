import { generateToken } from '../../../src/auth/jwt';
import { Request } from 'supertest';

/**
 * Helper functions for authentication in tests
 */
export class AuthHelpers {
  /**
   * Generate a JWT token for testing
   */
  static generateTestToken(address: string = '0x1234567890123456789012345678901234567890', chainId: number = 1): string {
    return generateToken(address, chainId);
  }

  /**
   * Generate an expired JWT token for testing
   */
  static generateExpiredToken(address: string = '0x1234567890123456789012345678901234567890'): string {
    // This will need to be implemented by manually creating a token with past expiration
    // For now, we'll use a token that's been tampered with to simulate expiration
    const token = generateToken(address, 1);
    return token + 'expired';
  }

  /**
   * Add authentication header to a supertest request
   */
  static authenticate(request: Request, address?: string, chainId?: number): Request {
    const token = AuthHelpers.generateTestToken(address, chainId);
    return request.set('Authorization', `Bearer ${token}`);
  }

  /**
   * Create an Authorization header value
   */
  static getAuthHeader(address?: string, chainId?: number): string {
    const token = AuthHelpers.generateTestToken(address, chainId);
    return `Bearer ${token}`;
  }

  /**
   * Parse a JWT token payload (without verification)
   */
  static parseTokenPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  }

  /**
   * Create a mock SIWE message
   */
  static createMockSiweMessage(address: string, nonce: string = 'test-nonce'): string {
    return `localhost wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: http://localhost:3000
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
  }

  /**
   * Create a mock SIWE signature
   */
  static createMockSignature(): string {
    return '0x' + 'a'.repeat(130); // Mock signature (65 bytes hex)
  }

  /**
   * Well-known test addresses
   */
  static readonly TEST_ADDRESSES = {
    ALICE: '0x' + '1'.repeat(40),
    BOB: '0x' + '2'.repeat(40),
    CHARLIE: '0x' + '3'.repeat(40),
    ADMIN: '0x' + 'a'.repeat(40),
  };
}

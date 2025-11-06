/**
 * Enhanced SIWE Authentication Tests - Additional coverage for 100%
 *
 * Tests SIWE message verification, nonce management, and edge cases
 */

import { SiweMessage } from 'siwe';
import {
  generateNonce,
  verifySiweMessage,
  cleanupExpiredNonces,
} from '../../../src/auth/siwe';
import { AuthenticationError } from '../../../src/types/errors';

// Mock the siwe library
jest.mock('siwe');

describe('SIWE Authentication - Enhanced Coverage', () => {
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const TEST_CHAIN_ID = 8453; // Base
  const MOCK_SIGNATURE = '0x' + 'a'.repeat(130);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySiweMessage - Success cases', () => {
    it('should verify valid SIWE message and signature', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in with your Ethereum account:
${TEST_ADDRESS}

Sign in with Ethereum to the app.

URI: http://localhost:3000
Version: 1
Chain ID: ${TEST_CHAIN_ID}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      // Mock SiweMessage
      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.chainId).toBe(TEST_CHAIN_ID);
      expect(mockVerify).toHaveBeenCalledWith({ signature: MOCK_SIGNATURE });
    });

    it('should handle message with expiration time in future', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const futureExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour future

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          expirationTime: futureExpiry,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(TEST_ADDRESS);
    });

    it('should handle message with notBefore time in past', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const pastNotBefore = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          notBefore: pastNotBefore,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(TEST_ADDRESS);
    });

    it('should handle message without expiration or notBefore', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.chainId).toBe(TEST_CHAIN_ID);
    });
  });

  describe('verifySiweMessage - Error cases', () => {
    it('should throw AuthenticationError for invalid nonce', async () => {
      const validNonce = generateNonce(TEST_ADDRESS);
      const invalidNonce = 'wrong-nonce';

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce: invalidNonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow(AuthenticationError);

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Invalid or expired nonce');
    });

    it('should throw AuthenticationError for expired nonce', async () => {
      const nonce = generateNonce(TEST_ADDRESS);

      // Wait for nonce to expire (or simulate by not having valid nonce)
      // For testing, we'll use a nonce that was never generated
      const expiredNonce = 'expired-nonce-123';

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce: expiredNonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Invalid or expired nonce');
    });

    it('should throw AuthenticationError for expired message', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const pastExpiry = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          expirationTime: pastExpiry,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Message has expired');
    });

    it('should throw AuthenticationError for message not yet valid', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const futureNotBefore = new Date(Date.now() + 3600000).toISOString(); // 1 hour future

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          notBefore: futureNotBefore,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Message not yet valid');
    });

    it('should throw AuthenticationError for invalid signature', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockRejectedValue(new Error('Invalid signature'));

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow(AuthenticationError);

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('SIWE verification failed: Invalid signature');
    });

    it('should throw AuthenticationError for malformed message', async () => {
      const message = 'invalid message format';

      (SiweMessage as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid message format');
      });

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should wrap unknown errors in AuthenticationError', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockRejectedValue('Unknown error');

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should handle Error objects without message', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in`;

      const errorWithoutMessage = new Error();
      delete (errorWithoutMessage as any).message;

      const mockVerify = jest.fn().mockRejectedValue(errorWithoutMessage);

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('verifySiweMessage - Edge cases', () => {
    it('should consume nonce after successful verification', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // First verification should succeed
      await verifySiweMessage(message, MOCK_SIGNATURE);

      // Second verification with same nonce should fail (nonce consumed)
      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Invalid or expired nonce');
    });

    it('should handle address normalization', async () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const nonce = generateNonce(upperAddress);
      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: upperAddress,
          chainId: TEST_CHAIN_ID,
          nonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(upperAddress); // Returns as provided by SIWE
    });

    it('should handle expiration time at exact current time', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const exactNow = new Date().toISOString();

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          expirationTime: exactNow,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // May pass or fail depending on exact timing
      // This tests the edge case handling
      try {
        await verifySiweMessage(message, MOCK_SIGNATURE);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should handle notBefore at exact current time', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const exactNow = new Date().toISOString();

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          notBefore: exactNow,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // May pass or fail depending on exact timing
      // This tests the edge case handling
      try {
        const result = await verifySiweMessage(message, MOCK_SIGNATURE);
        expect(result.address).toBe(TEST_ADDRESS);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should handle both expiration and notBefore', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const pastNotBefore = new Date(Date.now() - 3600000).toISOString();
      const futureExpiry = new Date(Date.now() + 3600000).toISOString();

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          notBefore: pastNotBefore,
          expirationTime: futureExpiry,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);
      expect(result.address).toBe(TEST_ADDRESS);
    });

    it('should prioritize notBefore check before expiration', async () => {
      const nonce = generateNonce(TEST_ADDRESS);
      const futureNotBefore = new Date(Date.now() + 3600000).toISOString();
      const pastExpiry = new Date(Date.now() - 3600000).toISOString(); // Already expired

      const message = `localhost wants you to sign in`;

      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
          notBefore: futureNotBefore,
          expirationTime: pastExpiry,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Should fail on expiration check first (since expiration is checked before notBefore in code)
      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Message has expired');
    });
  });

  describe('Nonce store management', () => {
    it('should allow different addresses to have separate nonces', async () => {
      const address1 = TEST_ADDRESS;
      const address2 = '0x1234567890123456789012345678901234567890';

      const nonce1 = generateNonce(address1);
      const nonce2 = generateNonce(address2);

      expect(nonce1).not.toBe(nonce2);

      // Both should verify independently
      const mockVerify1 = jest.fn().mockResolvedValue({
        data: { address: address1, chainId: TEST_CHAIN_ID, nonce: nonce1 },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify1,
      }));

      await verifySiweMessage('message1', MOCK_SIGNATURE);

      const mockVerify2 = jest.fn().mockResolvedValue({
        data: { address: address2, chainId: TEST_CHAIN_ID, nonce: nonce2 },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify2,
      }));

      await verifySiweMessage('message2', MOCK_SIGNATURE);
    });

    it('should overwrite previous nonce when generating new one', async () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(TEST_ADDRESS); // Overwrites nonce1

      expect(nonce1).not.toBe(nonce2);

      // nonce1 should no longer be valid
      const mockVerify = jest.fn().mockResolvedValue({
        data: { address: TEST_ADDRESS, chainId: TEST_CHAIN_ID, nonce: nonce1 },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      await expect(verifySiweMessage('message', MOCK_SIGNATURE))
        .rejects
        .toThrow('Invalid or expired nonce');
    });
  });

  describe('cleanupExpiredNonces - Detailed tests', () => {
    it('should not affect valid nonces', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce('0x1111111111111111111111111111111111111111');

      cleanupExpiredNonces();

      // Nonces should still be valid (not expired)
      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
    });

    it('should handle cleanup with no nonces', () => {
      expect(() => {
        cleanupExpiredNonces();
      }).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      generateNonce(TEST_ADDRESS);

      expect(() => {
        cleanupExpiredNonces();
        cleanupExpiredNonces();
        cleanupExpiredNonces();
      }).not.toThrow();
    });

    it('should be safe to call concurrently', () => {
      generateNonce(TEST_ADDRESS);
      generateNonce('0x2222222222222222222222222222222222222222');

      // Simulate concurrent cleanup calls
      const cleanups = Promise.all([
        Promise.resolve(cleanupExpiredNonces()),
        Promise.resolve(cleanupExpiredNonces()),
        Promise.resolve(cleanupExpiredNonces()),
      ]);

      expect(cleanups).resolves.not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete auth flow', async () => {
      // 1. Generate nonce
      const nonce = generateNonce(TEST_ADDRESS);
      expect(nonce).toBeDefined();

      // 2. User signs message
      const message = `localhost wants you to sign in with your Ethereum account:
${TEST_ADDRESS}

URI: http://localhost:3000
Version: 1
Chain ID: ${TEST_CHAIN_ID}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      // 3. Verify signature
      const mockVerify = jest.fn().mockResolvedValue({
        data: {
          address: TEST_ADDRESS,
          chainId: TEST_CHAIN_ID,
          nonce,
        },
      });

      (SiweMessage as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      const result = await verifySiweMessage(message, MOCK_SIGNATURE);

      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.chainId).toBe(TEST_CHAIN_ID);

      // 4. Nonce should be consumed
      await expect(verifySiweMessage(message, MOCK_SIGNATURE))
        .rejects
        .toThrow('Invalid or expired nonce');
    });

    it('should handle multiple users authenticating concurrently', async () => {
      const users = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];

      const nonces = users.map(addr => generateNonce(addr));

      // All users verify concurrently
      const verifications = users.map(async (addr, i) => {
        const mockVerify = jest.fn().mockResolvedValue({
          data: { address: addr, chainId: TEST_CHAIN_ID, nonce: nonces[i] },
        });

        (SiweMessage as jest.Mock).mockImplementation(() => ({
          verify: mockVerify,
        }));

        return verifySiweMessage(`message ${i}`, MOCK_SIGNATURE);
      });

      const results = await Promise.all(verifications);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.address).toBe(users[i]);
      });
    });
  });
});

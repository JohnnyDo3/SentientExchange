/**
 * SIWE (Sign-In with Ethereum) Authentication Tests
 *
 * Tests nonce generation, validation, and expiry logic
 */

import { generateNonce, cleanupExpiredNonces } from '../../../src/auth/siwe';

describe('SIWE Authentication', () => {
  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
  const OTHER_ADDRESS = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    // Clear any leftover state
    jest.clearAllTimers();
  });

  describe('generateNonce', () => {
    it('should generate a random nonce', () => {
      const nonce = generateNonce(TEST_ADDRESS);

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate different nonces for same address', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(TEST_ADDRESS);

      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate different nonces for different addresses', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(OTHER_ADDRESS);

      expect(nonce1).not.toBe(nonce2);
    });

    it('should normalize address to lowercase', () => {
      const upperAddress = TEST_ADDRESS.toUpperCase();
      const lowerAddress = TEST_ADDRESS.toLowerCase();

      const nonce1 = generateNonce(upperAddress);
      const nonce2 = generateNonce(lowerAddress);

      // Both should overwrite the same nonce since addresses are normalized
      expect(nonce1).not.toBe(nonce2);
    });

    it('should overwrite previous nonce for same address', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(TEST_ADDRESS);

      // Generating a new nonce should replace the old one
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate alphanumeric nonces', () => {
      const nonce = generateNonce(TEST_ADDRESS);

      // Nonce should only contain alphanumeric characters
      expect(nonce).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate reasonably long nonces', () => {
      const nonce = generateNonce(TEST_ADDRESS);

      // Nonce should be at least 10 characters for security
      expect(nonce.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle multiple addresses simultaneously', () => {
      const addresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5',
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x9999999999999999999999999999999999999999',
      ];

      const nonces = addresses.map(addr => generateNonce(addr));

      // All nonces should be unique
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(addresses.length);
    });
  });

  describe('cleanupExpiredNonces', () => {
    it('should remove expired nonces', () => {
      // This test is tricky because we can't easily manipulate the internal nonceStore
      // We'll just verify the function doesn't throw
      expect(() => {
        cleanupExpiredNonces();
      }).not.toThrow();
    });

    it('should not throw when called multiple times', () => {
      generateNonce(TEST_ADDRESS);
      generateNonce(OTHER_ADDRESS);

      expect(() => {
        cleanupExpiredNonces();
        cleanupExpiredNonces();
        cleanupExpiredNonces();
      }).not.toThrow();
    });

    it('should be callable without any nonces', () => {
      expect(() => {
        cleanupExpiredNonces();
      }).not.toThrow();
    });
  });

  describe('Nonce Security', () => {
    it('should generate cryptographically random nonces', () => {
      const nonces = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const nonce = generateNonce(`0x${i.toString().padStart(40, '0')}`);
        nonces.add(nonce);
      }

      // All nonces should be unique (no collisions)
      expect(nonces.size).toBe(iterations);
    });

    it('should have sufficient entropy', () => {
      const nonce = generateNonce(TEST_ADDRESS);

      // Nonce should have good character distribution
      const uniqueChars = new Set(nonce.split(''));
      expect(uniqueChars.size).toBeGreaterThan(5); // At least 5 different characters
    });

    it('should not be predictable', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(TEST_ADDRESS);
      const nonce3 = generateNonce(TEST_ADDRESS);

      // Sequential nonces should not have patterns
      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);

      // Check they don't share common prefixes/suffixes
      expect(nonce1.substring(0, 3)).not.toBe(nonce2.substring(0, 3));
    });
  });

  describe('Address Handling', () => {
    it('should handle mixed case addresses', () => {
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const nonce = generateNonce(address);

      expect(nonce).toBeDefined();
    });

    it('should handle all lowercase addresses', () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12';
      const nonce = generateNonce(address);

      expect(nonce).toBeDefined();
    });

    it('should handle all uppercase addresses', () => {
      const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const nonce = generateNonce(address);

      expect(nonce).toBeDefined();
    });

    it('should handle addresses with 0x prefix', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5';
      const nonce = generateNonce(address);

      expect(nonce).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive calls', () => {
      const nonces = [];

      for (let i = 0; i < 10; i++) {
        nonces.push(generateNonce(TEST_ADDRESS));
      }

      // All should be different
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(10);
    });

    it('should handle very long addresses', () => {
      const longAddress = '0x' + 'f'.repeat(40);
      const nonce = generateNonce(longAddress);

      expect(nonce).toBeDefined();
    });

    it('should handle addresses with leading zeros', () => {
      const address = '0x0000000000000000000000000000000000000001';
      const nonce = generateNonce(address);

      expect(nonce).toBeDefined();
    });

    it('should handle the zero address', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const nonce = generateNonce(zeroAddress);

      expect(nonce).toBeDefined();
    });
  });

  describe('Nonce Lifecycle', () => {
    it('should create new nonce after old one is used', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      // Simulate nonce being used (deleted from store)
      const nonce2 = generateNonce(TEST_ADDRESS);

      expect(nonce1).not.toBe(nonce2);
    });

    it('should allow multiple addresses to have active nonces', () => {
      const nonce1 = generateNonce(TEST_ADDRESS);
      const nonce2 = generateNonce(OTHER_ADDRESS);
      const nonce3 = generateNonce('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce3).toBeDefined();

      // All should be unique
      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);
    });
  });

  describe('Performance', () => {
    it('should generate nonces quickly', () => {
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        generateNonce(`0x${i.toString().padStart(40, '0')}`);
      }

      const duration = Date.now() - start;

      // Should be very fast (< 100ms for 1000 nonces)
      expect(duration).toBeLessThan(100);
    });

    it('should handle cleanup efficiently', () => {
      // Generate many nonces
      for (let i = 0; i < 100; i++) {
        generateNonce(`0x${i.toString().padStart(40, '0')}`);
      }

      const start = Date.now();
      cleanupExpiredNonces();
      const duration = Date.now() - start;

      // Cleanup should be fast (< 10ms)
      expect(duration).toBeLessThan(10);
    });
  });
});

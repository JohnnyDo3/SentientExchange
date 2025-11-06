/**
 * Comprehensive tests for Input Validation Utilities (Phase 2.3)
 *
 * Tests all validation functions with:
 * - Valid inputs (should pass)
 * - Invalid inputs (should fail with proper errors)
 * - Edge cases: null, undefined, empty strings, whitespace
 */

import {
  isValidUUID,
  isValidEthereumAddress,
  isValidPrice,
  isValidRating,
} from '../../../src/utils/validation.js';

describe('Input Validation Utilities', () => {
  describe('isValidUUID', () => {
    describe('valid UUIDs', () => {
      test('should accept valid UUID v4', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000')).toBe(true);
      });

      test('should accept UUID with uppercase letters', () => {
        expect(isValidUUID('123E4567-E89B-4D3F-A456-426614174000')).toBe(true);
      });

      test('should accept UUID with lowercase letters', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000')).toBe(true);
      });

      test('should accept UUID with mixed case', () => {
        expect(isValidUUID('123E4567-e89b-4D3F-A456-426614174000')).toBe(true);
      });

      test('should accept UUID with version 4 marker (4xxx)', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      test('should accept UUID with valid variant bits (8, 9, a, b)', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-8456-426614174000')).toBe(true); // 8
        expect(isValidUUID('123e4567-e89b-4d3f-9456-426614174000')).toBe(true); // 9
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000')).toBe(true); // a
        expect(isValidUUID('123e4567-e89b-4d3f-b456-426614174000')).toBe(true); // b
      });
    });

    describe('invalid UUIDs', () => {
      test('should reject empty string', () => {
        expect(isValidUUID('')).toBe(false);
      });

      test('should reject whitespace-only string', () => {
        expect(isValidUUID('   ')).toBe(false);
      });

      test('should reject null as string', () => {
        expect(isValidUUID('null')).toBe(false);
      });

      test('should reject undefined as string', () => {
        expect(isValidUUID('undefined')).toBe(false);
      });

      test('should reject UUID without hyphens', () => {
        expect(isValidUUID('123e4567e89b4d3fa456426614174000')).toBe(false);
      });

      test('should reject UUID with wrong hyphen positions', () => {
        expect(isValidUUID('123e4567-e89b4-d3f-a456-426614174000')).toBe(false);
      });

      test('should reject UUID with invalid characters', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-a456-42661417400g')).toBe(false);
        expect(isValidUUID('123e4567-e89b-4d3f-a456-42661417400z')).toBe(false);
      });

      test('should reject UUID with wrong length', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-a456-42661417400')).toBe(false); // too short
        expect(isValidUUID('123e4567-e89b-4d3f-a456-4266141740000')).toBe(false); // too long
      });

      test('should reject UUID with non-4 version', () => {
        expect(isValidUUID('123e4567-e89b-3d3f-a456-426614174000')).toBe(false); // version 3
        expect(isValidUUID('123e4567-e89b-5d3f-a456-426614174000')).toBe(false); // version 5
      });

      test('should reject UUID with invalid variant bits (not 8/9/a/b)', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-0456-426614174000')).toBe(false); // 0
        expect(isValidUUID('123e4567-e89b-4d3f-c456-426614174000')).toBe(false); // c
        expect(isValidUUID('123e4567-e89b-4d3f-f456-426614174000')).toBe(false); // f
      });

      test('should reject completely random strings', () => {
        expect(isValidUUID('not-a-uuid')).toBe(false);
        expect(isValidUUID('12345')).toBe(false);
        expect(isValidUUID('hello-world-test')).toBe(false);
      });

      test('should reject UUIDs with leading/trailing whitespace', () => {
        expect(isValidUUID(' 123e4567-e89b-4d3f-a456-426614174000')).toBe(false);
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000 ')).toBe(false);
        expect(isValidUUID(' 123e4567-e89b-4d3f-a456-426614174000 ')).toBe(false);
      });

      test('should reject special characters', () => {
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000!')).toBe(false);
        expect(isValidUUID('123e4567-e89b-4d3f-a456-426614174000@')).toBe(false);
      });
    });
  });

  describe('isValidEthereumAddress', () => {
    describe('valid Ethereum addresses', () => {
      test('should accept valid lowercase address', () => {
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(true);
      });

      test('should accept valid uppercase address', () => {
        expect(isValidEthereumAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5')).toBe(true);
      });

      test('should accept valid mixed case address (checksum)', () => {
        expect(isValidEthereumAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5')).toBe(true);
      });

      test('should accept address with all zeros', () => {
        expect(isValidEthereumAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      });

      test('should accept address with all Fs', () => {
        expect(isValidEthereumAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(true);
      });

      test('should accept address with mix of letters and numbers', () => {
        expect(isValidEthereumAddress('0x1234567890abcdefABCDEF1234567890abcdefAB')).toBe(true);
      });
    });

    describe('invalid Ethereum addresses', () => {
      test('should reject empty string', () => {
        expect(isValidEthereumAddress('')).toBe(false);
      });

      test('should reject whitespace-only string', () => {
        expect(isValidEthereumAddress('   ')).toBe(false);
      });

      test('should reject address without 0x prefix', () => {
        expect(isValidEthereumAddress('742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
      });

      test('should reject address with wrong prefix', () => {
        expect(isValidEthereumAddress('0X742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false); // capital X
        expect(isValidEthereumAddress('1x742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
        expect(isValidEthereumAddress('x742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
      });

      test('should reject address that is too short', () => {
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')).toBe(false); // 41 chars
        expect(isValidEthereumAddress('0x742d35')).toBe(false);
      });

      test('should reject address that is too long', () => {
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb55')).toBe(false); // 43 chars
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5abc')).toBe(false);
      });

      test('should reject address with invalid characters', () => {
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beg5')).toBe(false); // g
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0bez5')).toBe(false); // z
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0be!5')).toBe(false); // !
      });

      test('should reject address with spaces', () => {
        expect(isValidEthereumAddress('0x742d35cc 6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
      });

      test('should reject address with leading/trailing whitespace', () => {
        expect(isValidEthereumAddress(' 0x742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
        expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5 ')).toBe(false);
        expect(isValidEthereumAddress(' 0x742d35cc6634c0532925a3b844bc9e7595f0beb5 ')).toBe(false);
      });

      test('should reject completely random strings', () => {
        expect(isValidEthereumAddress('not-an-address')).toBe(false);
        expect(isValidEthereumAddress('12345')).toBe(false);
        expect(isValidEthereumAddress('hello-world')).toBe(false);
      });

      test('should reject null as string', () => {
        expect(isValidEthereumAddress('null')).toBe(false);
      });

      test('should reject undefined as string', () => {
        expect(isValidEthereumAddress('undefined')).toBe(false);
      });
    });
  });

  describe('isValidPrice', () => {
    describe('valid prices', () => {
      test('should accept price with dollar sign and two decimals', () => {
        expect(isValidPrice('$0.01')).toBe(true);
        expect(isValidPrice('$0.99')).toBe(true);
        expect(isValidPrice('$1.00')).toBe(true);
        expect(isValidPrice('$10.50')).toBe(true);
      });

      test('should accept price with one decimal', () => {
        expect(isValidPrice('$0.1')).toBe(true);
        expect(isValidPrice('$1.5')).toBe(true);
        expect(isValidPrice('$10.9')).toBe(true);
      });

      test('should accept price with no decimals', () => {
        expect(isValidPrice('$0')).toBe(true);
        expect(isValidPrice('$1')).toBe(true);
        expect(isValidPrice('$10')).toBe(true);
        expect(isValidPrice('$100')).toBe(true);
      });

      test('should accept large prices', () => {
        expect(isValidPrice('$999')).toBe(true);
        expect(isValidPrice('$1000')).toBe(true);
        expect(isValidPrice('$9999.99')).toBe(true);
      });

      test('should accept minimum valid price', () => {
        expect(isValidPrice('$0.00')).toBe(true);
      });
    });

    describe('invalid prices', () => {
      test('should reject empty string', () => {
        expect(isValidPrice('')).toBe(false);
      });

      test('should reject whitespace-only string', () => {
        expect(isValidPrice('   ')).toBe(false);
      });

      test('should reject price without dollar sign', () => {
        expect(isValidPrice('0.01')).toBe(false);
        expect(isValidPrice('10.50')).toBe(false);
      });

      test('should reject price with wrong currency symbol', () => {
        expect(isValidPrice('€0.01')).toBe(false);
        expect(isValidPrice('£0.01')).toBe(false);
        expect(isValidPrice('¥0.01')).toBe(false);
      });

      test('should reject price with more than 2 decimals', () => {
        expect(isValidPrice('$0.001')).toBe(false);
        expect(isValidPrice('$10.505')).toBe(false);
        expect(isValidPrice('$1.999')).toBe(false);
      });

      test('should reject negative prices', () => {
        expect(isValidPrice('-$0.01')).toBe(false);
        expect(isValidPrice('$-0.01')).toBe(false);
        expect(isValidPrice('-$10.50')).toBe(false);
      });

      test('should reject price with spaces', () => {
        expect(isValidPrice('$ 0.01')).toBe(false);
        expect(isValidPrice('$0 .01')).toBe(false);
        expect(isValidPrice('$0. 01')).toBe(false);
      });

      test('should reject price with leading/trailing whitespace', () => {
        expect(isValidPrice(' $0.01')).toBe(false);
        expect(isValidPrice('$0.01 ')).toBe(false);
        expect(isValidPrice(' $0.01 ')).toBe(false);
      });

      test('should reject price with letters', () => {
        expect(isValidPrice('$abc')).toBe(false);
        expect(isValidPrice('$10.5a')).toBe(false);
        expect(isValidPrice('$10.ab')).toBe(false);
      });

      test('should reject price with multiple decimal points', () => {
        expect(isValidPrice('$10.50.25')).toBe(false);
        expect(isValidPrice('$1..50')).toBe(false);
      });

      test('should reject price with comma separator', () => {
        expect(isValidPrice('$1,000.00')).toBe(false);
        expect(isValidPrice('$10,50')).toBe(false);
      });

      test('should reject completely random strings', () => {
        expect(isValidPrice('not-a-price')).toBe(false);
        expect(isValidPrice('hello')).toBe(false);
      });

      test('should reject null as string', () => {
        expect(isValidPrice('null')).toBe(false);
      });

      test('should reject undefined as string', () => {
        expect(isValidPrice('undefined')).toBe(false);
      });

      test('should reject special characters', () => {
        expect(isValidPrice('$0.01!')).toBe(false);
        expect(isValidPrice('$0.01@')).toBe(false);
        expect(isValidPrice('$0.01#')).toBe(false);
      });
    });
  });

  describe('isValidRating', () => {
    describe('valid ratings', () => {
      test('should accept rating of 1', () => {
        expect(isValidRating(1)).toBe(true);
      });

      test('should accept rating of 2', () => {
        expect(isValidRating(2)).toBe(true);
      });

      test('should accept rating of 3', () => {
        expect(isValidRating(3)).toBe(true);
      });

      test('should accept rating of 4', () => {
        expect(isValidRating(4)).toBe(true);
      });

      test('should accept rating of 5', () => {
        expect(isValidRating(5)).toBe(true);
      });
    });

    describe('invalid ratings', () => {
      test('should reject rating of 0', () => {
        expect(isValidRating(0)).toBe(false);
      });

      test('should reject rating of 6', () => {
        expect(isValidRating(6)).toBe(false);
      });

      test('should reject negative ratings', () => {
        expect(isValidRating(-1)).toBe(false);
        expect(isValidRating(-5)).toBe(false);
      });

      test('should reject ratings above 5', () => {
        expect(isValidRating(10)).toBe(false);
        expect(isValidRating(100)).toBe(false);
      });

      test('should reject decimal ratings', () => {
        expect(isValidRating(1.5)).toBe(false);
        expect(isValidRating(2.7)).toBe(false);
        expect(isValidRating(4.9)).toBe(false);
      });

      test('should reject very small decimals', () => {
        expect(isValidRating(1.001)).toBe(false);
        expect(isValidRating(4.999)).toBe(false);
      });

      test('should reject NaN', () => {
        expect(isValidRating(NaN)).toBe(false);
      });

      test('should reject Infinity', () => {
        expect(isValidRating(Infinity)).toBe(false);
        expect(isValidRating(-Infinity)).toBe(false);
      });

      test('should reject string numbers', () => {
        // Type coercion doesn't happen in the function
        expect(isValidRating('1' as any)).toBe(false);
        expect(isValidRating('5' as any)).toBe(false);
      });

      test('should reject null', () => {
        expect(isValidRating(null as any)).toBe(false);
      });

      test('should reject undefined', () => {
        expect(isValidRating(undefined as any)).toBe(false);
      });

      test('should reject objects', () => {
        expect(isValidRating({} as any)).toBe(false);
        expect(isValidRating({ rating: 5 } as any)).toBe(false);
      });

      test('should reject arrays', () => {
        expect(isValidRating([] as any)).toBe(false);
        expect(isValidRating([5] as any)).toBe(false);
      });
    });

    describe('edge cases', () => {
      test('should handle boundary values correctly', () => {
        expect(isValidRating(0.99)).toBe(false);
        expect(isValidRating(1.01)).toBe(false);
        expect(isValidRating(4.99)).toBe(false);
        expect(isValidRating(5.01)).toBe(false);
      });

      test('should handle very large numbers', () => {
        expect(isValidRating(Number.MAX_SAFE_INTEGER)).toBe(false);
        expect(isValidRating(Number.MAX_VALUE)).toBe(false);
      });

      test('should handle very small numbers', () => {
        expect(isValidRating(Number.MIN_SAFE_INTEGER)).toBe(false);
        expect(isValidRating(Number.MIN_VALUE)).toBe(false);
      });
    });
  });
});

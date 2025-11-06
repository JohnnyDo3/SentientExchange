/**
 * Comprehensive tests for Wallet Address Validation (Phase 2.3)
 *
 * Tests multi-chain wallet address validation with:
 * - EVM chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
 * - Solana chain
 * - Edge cases and error handling
 */

import {
  isValidEVMAddress,
  isValidSolanaAddress,
  validateChainAddress,
  validatePaymentAddresses,
  normalizeAddress,
  formatAddressDisplay,
} from '../../../src/utils/wallet-validation.js';

describe('Wallet Address Validation', () => {
  describe('isValidEVMAddress', () => {
    describe('valid EVM addresses', () => {
      test('should accept valid lowercase address', () => {
        expect(isValidEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(true);
      });

      test('should accept valid uppercase address', () => {
        expect(isValidEVMAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5')).toBe(true);
      });

      test('should accept valid mixed case address', () => {
        expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5')).toBe(true);
      });

      test('should accept zero address', () => {
        expect(isValidEVMAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      });

      test('should accept max address', () => {
        expect(isValidEVMAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(true);
      });
    });

    describe('invalid EVM addresses', () => {
      test('should reject empty string', () => {
        expect(isValidEVMAddress('')).toBe(false);
      });

      test('should reject address without 0x prefix', () => {
        expect(isValidEVMAddress('742d35cc6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
      });

      test('should reject address with wrong length', () => {
        expect(isValidEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')).toBe(false); // too short
        expect(isValidEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb55')).toBe(false); // too long
      });

      test('should reject address with invalid characters', () => {
        expect(isValidEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beG5')).toBe(false); // G
        expect(isValidEVMAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beZ5')).toBe(false); // Z
      });

      test('should reject address with spaces', () => {
        expect(isValidEVMAddress('0x742d35cc 6634c0532925a3b844bc9e7595f0beb5')).toBe(false);
      });
    });
  });

  describe('isValidSolanaAddress', () => {
    describe('valid Solana addresses', () => {
      test('should accept typical Solana address', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh')).toBe(true);
      });

      test('should accept 32 character Solana address', () => {
        expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true);
      });

      test('should accept 44 character Solana address', () => {
        expect(isValidSolanaAddress('5KPZpNWSgxC2ScpdrTBoYaSbMYkJW3BEKRPFNqkiJYVL')).toBe(true);
      });

      test('should accept address with all valid base58 characters', () => {
        // 44 chars max - testing various base58 characters
        expect(isValidSolanaAddress('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefgh')).toBe(true);
      });
    });

    describe('invalid Solana addresses', () => {
      test('should reject empty string', () => {
        expect(isValidSolanaAddress('')).toBe(false);
      });

      test('should reject address that is too short', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH')).toBe(false); // 31 chars
      });

      test('should reject address that is too long', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZhX')).toBe(false); // 45 chars
      });

      test('should reject address with invalid base58 character: 0', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH04q9K3u5T6wZh')).toBe(false);
      });

      test('should reject address with invalid base58 character: O', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHOF4q9K3u5T6wZh')).toBe(false);
      });

      test('should reject address with invalid base58 character: I', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHIF4q9K3u5T6wZh')).toBe(false);
      });

      test('should reject address with invalid base58 character: l', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHlF4q9K3u5T6wZh')).toBe(false);
      });

      test('should reject address with special characters', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH!F4q9K3u5T6wZh')).toBe(false);
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH@F4q9K3u5T6wZh')).toBe(false);
      });

      test('should reject address with spaces', () => {
        expect(isValidSolanaAddress('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH F4q9K3u5T6wZh')).toBe(false);
      });
    });
  });

  describe('validateChainAddress', () => {
    describe('EVM chains', () => {
      const validEVMAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb5';
      const invalidEVMAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beg5';

      test('should validate ethereum address', () => {
        const result = validateChainAddress(validEVMAddress, 'ethereum');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should validate base address', () => {
        const result = validateChainAddress(validEVMAddress, 'base');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should validate polygon address', () => {
        const result = validateChainAddress(validEVMAddress, 'polygon');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should validate arbitrum address', () => {
        const result = validateChainAddress(validEVMAddress, 'arbitrum');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should validate optimism address', () => {
        const result = validateChainAddress(validEVMAddress, 'optimism');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should validate generic evm address', () => {
        const result = validateChainAddress(validEVMAddress, 'evm');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should reject invalid EVM address with error message', () => {
        const result = validateChainAddress(invalidEVMAddress, 'ethereum');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid EVM address format');
        expect(result.error).toContain('0x');
      });

      test('should trim whitespace before validation', () => {
        const result = validateChainAddress(`  ${validEVMAddress}  `, 'ethereum');
        expect(result.valid).toBe(true);
      });
    });

    describe('Solana chain', () => {
      const validSolanaAddress = '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh';
      const invalidSolanaAddress = '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH0F4q9K3u5T6wZh'; // contains 0

      test('should validate solana address', () => {
        const result = validateChainAddress(validSolanaAddress, 'solana');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test('should reject invalid Solana address with error message', () => {
        const result = validateChainAddress(invalidSolanaAddress, 'solana');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid Solana address format');
        expect(result.error).toContain('base58');
      });

      test('should trim whitespace before validation', () => {
        const result = validateChainAddress(`  ${validSolanaAddress}  `, 'solana');
        expect(result.valid).toBe(true);
      });
    });

    describe('error handling', () => {
      test('should reject empty address', () => {
        const result = validateChainAddress('', 'ethereum');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Address is required');
      });

      test('should reject null address', () => {
        const result = validateChainAddress(null as any, 'ethereum');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Address is required');
      });

      test('should reject undefined address', () => {
        const result = validateChainAddress(undefined as any, 'ethereum');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Address is required');
      });

      test('should reject non-string address', () => {
        const result = validateChainAddress(12345 as any, 'ethereum');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Address is required');
      });

      test('should reject unsupported chain', () => {
        const result = validateChainAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 'bitcoin' as any);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported chain');
      });
    });
  });

  describe('validatePaymentAddresses', () => {
    describe('valid payment addresses', () => {
      test('should accept single ethereum address', () => {
        const result = validatePaymentAddresses({
          ethereum: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept single base address', () => {
        const result = validatePaymentAddresses({
          base: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept single solana address', () => {
        const result = validatePaymentAddresses({
          solana: '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept multiple valid addresses', () => {
        const result = validatePaymentAddresses({
          ethereum: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
          base: '0x123456789abcdefABCDEF123456789abcdefABCD',
          polygon: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
          solana: '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept all supported EVM chains', () => {
        const result = validatePaymentAddresses({
          ethereum: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
          base: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
          polygon: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
          arbitrum: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
          optimism: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5',
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid payment addresses', () => {
      test('should reject empty object', () => {
        const result = validatePaymentAddresses({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('At least one payment address is required');
      });

      test('should reject empty address string', () => {
        const result = validatePaymentAddresses({
          ethereum: '',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('ethereum');
        expect(result.errors[0]).toContain('cannot be empty');
      });

      test('should reject whitespace-only address', () => {
        const result = validatePaymentAddresses({
          ethereum: '   ',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('ethereum');
      });

      test('should reject null address', () => {
        const result = validatePaymentAddresses({
          ethereum: null as any,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('ethereum');
      });

      test('should reject undefined address', () => {
        const result = validatePaymentAddresses({
          ethereum: undefined as any,
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('ethereum');
      });

      test('should reject invalid EVM address format', () => {
        const result = validatePaymentAddresses({
          ethereum: '0x742d35cc6634c0532925a3b844bc9e7595f0beg5', // invalid character
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('ethereum');
        expect(result.errors[0]).toContain('Invalid EVM address');
      });

      test('should reject invalid Solana address format', () => {
        const result = validatePaymentAddresses({
          solana: '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YH0F4q9K3u5T6wZh', // contains 0
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('solana');
        expect(result.errors[0]).toContain('Invalid Solana address');
      });

      test('should collect multiple errors', () => {
        const result = validatePaymentAddresses({
          ethereum: '0xinvalid',
          solana: '0invalid0',
          base: '',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(3);
        expect(result.errors.some((e) => e.includes('ethereum'))).toBe(true);
        expect(result.errors.some((e) => e.includes('solana'))).toBe(true);
        expect(result.errors.some((e) => e.includes('base'))).toBe(true);
      });

      test('should handle mixed valid and invalid addresses', () => {
        const result = validatePaymentAddresses({
          ethereum: '0x742d35cc6634c0532925a3b844bc9e7595f0beb5', // valid
          solana: 'invalid', // invalid
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0]).toContain('solana');
      });
    });
  });

  describe('normalizeAddress', () => {
    describe('EVM address normalization', () => {
      test('should lowercase ethereum address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'ethereum');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should lowercase base address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'base');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should lowercase polygon address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'polygon');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should lowercase arbitrum address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'arbitrum');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should lowercase optimism address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'optimism');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should lowercase generic evm address', () => {
        const result = normalizeAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB5', 'evm');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });

      test('should handle already lowercase address', () => {
        const result = normalizeAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 'ethereum');
        expect(result).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
      });
    });

    describe('Solana address normalization', () => {
      test('should NOT modify solana address (case-sensitive)', () => {
        const address = '8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh';
        const result = normalizeAddress(address, 'solana');
        expect(result).toBe(address);
      });

      test('should preserve exact case for solana', () => {
        const address = '5KPZpNWSgxC2ScpdrTBoYaSbMYkJW3BEKRPFNqkiJYVL';
        const result = normalizeAddress(address, 'solana');
        expect(result).toBe(address);
      });
    });

    describe('unknown chain handling', () => {
      test('should NOT modify address for unknown chain', () => {
        const address = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB5';
        const result = normalizeAddress(address, 'bitcoin');
        expect(result).toBe(address);
      });
    });
  });

  describe('formatAddressDisplay', () => {
    describe('default formatting (6 chars)', () => {
      test('should format long EVM address', () => {
        const result = formatAddressDisplay('0x742d35cc6634c0532925a3b844bc9e7595f0beb5');
        // With chars=6: substring(0, 6) = "0x742d", substring(42-6+2=38) = "beb5"
        expect(result).toBe('0x742d...beb5');
      });

      test('should format long Solana address', () => {
        const result = formatAddressDisplay('8K4z7h2KqBpvxJXbDpRj6MuKqVzx1YHF4q9K3u5T6wZh');
        // With chars=6: first 6 + last (6+2) = first 6 + last 8
        expect(result).toBe('8K4z7h...6wZh');
      });
    });

    describe('custom character length', () => {
      test('should format with 4 characters', () => {
        const result = formatAddressDisplay('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 4);
        // substring(0, 4) = "0x74", substring(42-4+2=40) = "b5"
        expect(result).toBe('0x74...b5');
      });

      test('should format with 8 characters', () => {
        const result = formatAddressDisplay('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 8);
        // substring(0, 8) = "0x742d35", substring(42-8+2=36) = "f0beb5"
        expect(result).toBe('0x742d35...f0beb5');
      });

      test('should format with 10 characters', () => {
        const result = formatAddressDisplay('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 10);
        // substring(0, 10) = "0x742d35cc", substring(42-10+2=34) = "95f0beb5"
        expect(result).toBe('0x742d35cc...95f0beb5');
      });
    });

    describe('edge cases', () => {
      test('should return original if address is short', () => {
        const short = '0x742d35cc';
        const result = formatAddressDisplay(short);
        expect(result).toBe(short);
      });

      test('should return original if address equals 2x chars', () => {
        const exact = '0x742d35cc66'; // exactly 12 chars
        const result = formatAddressDisplay(exact, 6);
        expect(result).toBe(exact);
      });

      test('should return original if address is empty', () => {
        const result = formatAddressDisplay('');
        expect(result).toBe('');
      });

      test('should handle null gracefully', () => {
        const result = formatAddressDisplay(null as any);
        expect(result).toBe(null);
      });

      test('should handle undefined gracefully', () => {
        const result = formatAddressDisplay(undefined as any);
        expect(result).toBe(undefined);
      });
    });

    describe('formatting calculations', () => {
      test('should correctly calculate substring positions', () => {
        // 0x742d35cc6634c0532925a3b844bc9e7595f0beb5 (42 chars)
        // With 6 chars: substring(0, 6) = "0x742d", substring(38) = "beb5"
        const result = formatAddressDisplay('0x742d35cc6634c0532925a3b844bc9e7595f0beb5', 6);
        expect(result).toBe('0x742d...beb5');
        expect(result.length).toBe(13); // 6 + 3 (dots) + 4
      });

      test('should correctly calculate for different lengths', () => {
        const address = '0x742d35cc6634c0532925a3b844bc9e7595f0beb5';

        const result4 = formatAddressDisplay(address, 4);
        expect(result4.split('...')[0]).toBe('0x74');
        expect(result4.split('...')[1]).toBe('b5');

        const result8 = formatAddressDisplay(address, 8);
        expect(result8.split('...')[0]).toBe('0x742d35');
        expect(result8.split('...')[1]).toBe('f0beb5');
      });
    });
  });
});

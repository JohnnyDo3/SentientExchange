/**
 * Tests for spending-limits tools
 * Tests user spending limit management (set, check, reset)
 */

import {
  setSpendingLimits,
  checkSpending,
  resetSpendingLimits,
  SetSpendingLimitsArgs,
  CheckSpendingArgs,
} from '../../../src/tools/spending-limits';
import { SpendingLimitManager } from '../../../src/payment/SpendingLimitManager';

// Mock SpendingLimitManager
jest.mock('../../../src/payment/SpendingLimitManager');

describe('spending-limits Tools', () => {
  let mockLimitManager: jest.Mocked<SpendingLimitManager>;
  const testUserId = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    // Create mock instance
    mockLimitManager = {
      setLimits: jest.fn(),
      getLimits: jest.fn(),
      getSpendingStats: jest.fn(),
      checkLimit: jest.fn(),
      resetLimits: jest.fn(),
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('setSpendingLimits', () => {
    describe('Happy Path', () => {
      it('should successfully set all spending limits', async () => {
        const args: SetSpendingLimitsArgs = {
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
        };

        const mockLimits = {
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        };

        mockLimitManager.setLimits.mockResolvedValue(mockLimits);

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        // Verify success response
        expect(result.isError).toBeUndefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.message).toContain('updated successfully');
        expect(response.limits).toEqual({
          perTransaction: mockLimits.perTransaction,
          daily: mockLimits.daily,
          monthly: mockLimits.monthly,
          enabled: mockLimits.enabled,
        });
        expect(response.note).toContain('Limits are active');

        // Verify SpendingLimitManager was called correctly
        expect(mockLimitManager.setLimits).toHaveBeenCalledWith(
          testUserId,
          args
        );
      });

      it('should set partial limits (only perTransaction)', async () => {
        const args: SetSpendingLimitsArgs = {
          perTransaction: '$50.00',
        };

        const mockLimits = {
          userId: testUserId,
          perTransaction: '$50.00',
          daily: '$1000.00',
          monthly: '$5000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        };

        mockLimitManager.setLimits.mockResolvedValue(mockLimits);

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.limits.perTransaction).toBe('$50.00');
        expect(mockLimitManager.setLimits).toHaveBeenCalledWith(
          testUserId,
          args
        );
      });

      it('should set partial limits (only daily)', async () => {
        const args: SetSpendingLimitsArgs = {
          daily: '$750.00',
        };

        mockLimitManager.setLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$750.00',
          monthly: '$3000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.limits.daily).toBe('$750.00');
      });

      it('should toggle enabled flag to false', async () => {
        const args: SetSpendingLimitsArgs = {
          enabled: false,
        };

        mockLimitManager.setLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: false,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.limits.enabled).toBe(false);
        expect(response.note).toContain('Limits are disabled');
      });

      it('should handle decimal amounts correctly', async () => {
        const args: SetSpendingLimitsArgs = {
          perTransaction: '$99.99',
          daily: '$499.50',
          monthly: '$1999.25',
        };

        mockLimitManager.setLimits.mockResolvedValue({
          userId: testUserId,
          ...args,
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        } as any);

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.limits.perTransaction).toBe('$99.99');
      });
    });

    describe('Validation', () => {
      it('should reject invalid price format (missing $)', async () => {
        const args: SetSpendingLimitsArgs = {
          perTransaction: '100.00', // Missing $
        };

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Validation error');
        expect(response.hint).toContain('$X.XX');
        expect(mockLimitManager.setLimits).not.toHaveBeenCalled();
      });

      it('should accept price format without decimal (optional)', async () => {
        const args: SetSpendingLimitsArgs = {
          daily: '$500', // Decimals are optional per regex pattern
        };

        mockLimitManager.setLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });

      it('should reject invalid price format (3 decimal places)', async () => {
        const args: SetSpendingLimitsArgs = {
          monthly: '$2000.000', // Too many decimals
        };

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Validation error');
      });

      it('should reject non-boolean enabled value', async () => {
        const args: any = {
          enabled: 'yes', // Should be boolean
        };

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Validation error');
      });
    });

    describe('Error Handling', () => {
      it('should handle SpendingLimitManager.setLimits failure', async () => {
        const args: SetSpendingLimitsArgs = {
          perTransaction: '$100.00',
        };

        mockLimitManager.setLimits.mockRejectedValue(
          new Error('Database error')
        );

        const result = await setSpendingLimits(
          mockLimitManager,
          testUserId,
          args
        );

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toBeTruthy();
      });
    });
  });

  describe('checkSpending', () => {
    describe('Happy Path - With Limits Set', () => {
      it('should return current spending and limits', async () => {
        const mockLimits = {
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        };

        const mockStats = {
          userId: testUserId,
          totalToday: '$250.00',
          totalThisMonth: '$800.00',
          transactionCount: 15,
          lastTransaction: '2025-11-06T10:30:00Z',
        };

        mockLimitManager.getLimits.mockResolvedValue(mockLimits);
        mockLimitManager.getSpendingStats.mockResolvedValue(mockStats);

        const result = await checkSpending(mockLimitManager, testUserId);

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text);

        // Verify current spending
        expect(response.currentSpending.today).toBe('$250.00');
        expect(response.currentSpending.thisMonth).toBe('$800.00');
        expect(response.currentSpending.transactionCount).toBe(15);
        expect(response.currentSpending.lastTransaction).toBe(
          '2025-11-06T10:30:00Z'
        );

        // Verify limits (response only includes user-relevant fields)
        expect(response.limits).toEqual({
          perTransaction: mockLimits.perTransaction,
          daily: mockLimits.daily,
          monthly: mockLimits.monthly,
          enabled: mockLimits.enabled,
        });

        // Verify remaining budget calculations
        expect(response.remaining.today).toBe('$250.00'); // 500 - 250
        expect(response.remaining.thisMonth).toBe('$1200.00'); // 2000 - 800
      });

      it('should handle zero spending correctly', async () => {
        mockLimitManager.getLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$0.00',
          totalThisMonth: '$0.00',
          transactionCount: 0,
          lastTransaction: undefined,
        });

        const result = await checkSpending(mockLimitManager, testUserId);

        const response = JSON.parse(result.content[0].text);
        expect(response.currentSpending.today).toBe('$0.00');
        expect(response.currentSpending.lastTransaction).toBe('None');
        expect(response.remaining.today).toBe('$500.00'); // Full daily limit
        expect(response.remaining.thisMonth).toBe('$2000.00'); // Full monthly limit
      });

      it('should check hypothetical transaction when amount provided', async () => {
        const args: CheckSpendingArgs = {
          amount: '$75.00',
        };

        mockLimitManager.getLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$250.00',
          totalThisMonth: '$800.00',
          transactionCount: 10,
          lastTransaction: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.checkLimit.mockResolvedValue({
          allowed: true,
          reason: 'Transaction would be allowed',
        });

        const result = await checkSpending(mockLimitManager, testUserId, args);

        const response = JSON.parse(result.content[0].text);
        expect(response.hypotheticalTransaction).toEqual({
          amount: '$75.00',
          allowed: true,
          reason: 'Transaction would be allowed',
        });

        expect(mockLimitManager.checkLimit).toHaveBeenCalledWith(
          testUserId,
          '$75.00'
        );
      });

      it('should report when hypothetical transaction would be denied', async () => {
        const args: CheckSpendingArgs = {
          amount: '$600.00',
        };

        mockLimitManager.getLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$400.00',
          totalThisMonth: '$1500.00',
          transactionCount: 20,
          lastTransaction: '2025-11-06T12:00:00Z',
        });

        mockLimitManager.checkLimit.mockResolvedValue({
          allowed: false,
          reason: 'Would exceed daily limit ($500.00)',
        });

        const result = await checkSpending(mockLimitManager, testUserId, args);

        const response = JSON.parse(result.content[0].text);
        expect(response.hypotheticalTransaction.allowed).toBe(false);
        expect(response.hypotheticalTransaction.reason).toContain(
          'exceed daily limit'
        );
      });

      it('should show $0.00 remaining when spending exceeds limits', async () => {
        mockLimitManager.getLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$550.00', // Exceeds daily
          totalThisMonth: '$2100.00', // Exceeds monthly
          transactionCount: 30,
          lastTransaction: '2025-11-06T14:00:00Z',
        });

        const result = await checkSpending(mockLimitManager, testUserId);

        const response = JSON.parse(result.content[0].text);
        expect(response.remaining.today).toBe('$0.00'); // Max(0, 500 - 550)
        expect(response.remaining.thisMonth).toBe('$0.00'); // Max(0, 2000 - 2100)
      });
    });

    describe('Happy Path - Without Limits Set', () => {
      it('should return spending stats and prompt to set limits', async () => {
        mockLimitManager.getLimits.mockResolvedValue(null);
        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$150.00',
          totalThisMonth: '$600.00',
          transactionCount: 12,
          lastTransaction: '2025-11-06T09:00:00Z',
        });

        const result = await checkSpending(mockLimitManager, testUserId);

        const response = JSON.parse(result.content[0].text);
        expect(response.currentSpending.today).toBe('$150.00');
        expect(response.currentSpending.thisMonth).toBe('$600.00');
        expect(response.limits).toBe('No spending limits set');
        expect(response.note).toContain('Use set_spending_limits');
        expect(response.remaining).toBeUndefined();
      });
    });

    describe('Validation', () => {
      it('should reject invalid amount format', async () => {
        const args: CheckSpendingArgs = {
          amount: '50.00', // Missing $
        };

        const result = await checkSpending(mockLimitManager, testUserId, args);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Validation error');
        expect(mockLimitManager.getLimits).not.toHaveBeenCalled();
      });

      it('should accept call with no arguments', async () => {
        mockLimitManager.getLimits.mockResolvedValue(null);
        mockLimitManager.getSpendingStats.mockResolvedValue({
          userId: testUserId,
          totalToday: '$0.00',
          totalThisMonth: '$0.00',
          transactionCount: 0,
          lastTransaction: undefined,
        });

        const result = await checkSpending(mockLimitManager, testUserId);

        expect(result.isError).toBeUndefined();
        expect(mockLimitManager.getLimits).toHaveBeenCalledWith(testUserId);
      });
    });

    describe('Error Handling', () => {
      it('should handle SpendingLimitManager.getLimits failure', async () => {
        mockLimitManager.getLimits.mockRejectedValue(
          new Error('Database connection lost')
        );

        const result = await checkSpending(mockLimitManager, testUserId);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toBeTruthy();
      });

      it('should handle SpendingLimitManager.getSpendingStats failure', async () => {
        mockLimitManager.getLimits.mockResolvedValue({
          userId: testUserId,
          perTransaction: '$100.00',
          daily: '$500.00',
          monthly: '$2000.00',
          enabled: true,
          createdAt: '2025-11-06T10:00:00Z',
          updatedAt: '2025-11-06T10:00:00Z',
        });

        mockLimitManager.getSpendingStats.mockRejectedValue(
          new Error('Stats retrieval failed')
        );

        const result = await checkSpending(mockLimitManager, testUserId);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toBeTruthy();
      });
    });
  });

  describe('resetSpendingLimits', () => {
    describe('Happy Path', () => {
      it('should successfully reset spending limits', async () => {
        mockLimitManager.resetLimits.mockResolvedValue(undefined);

        const result = await resetSpendingLimits(mockLimitManager, testUserId);

        expect(result.isError).toBeUndefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.message).toContain('removed');
        expect(response.note).toContain('set new limits anytime');

        expect(mockLimitManager.resetLimits).toHaveBeenCalledWith(testUserId);
      });
    });

    describe('Error Handling', () => {
      it('should handle SpendingLimitManager.resetLimits failure', async () => {
        mockLimitManager.resetLimits.mockRejectedValue(
          new Error('Reset operation failed')
        );

        const result = await resetSpendingLimits(mockLimitManager, testUserId);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toBeTruthy();
      });
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted MCP response for setSpendingLimits', async () => {
      mockLimitManager.setLimits.mockResolvedValue({
        userId: testUserId,
        perTransaction: '$100.00',
        daily: '$500.00',
        monthly: '$2000.00',
        enabled: true,
        createdAt: '2025-11-06T10:00:00Z',
        updatedAt: '2025-11-06T10:00:00Z',
      });

      const result = await setSpendingLimits(mockLimitManager, testUserId, {
        perTransaction: '$100.00',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should return properly formatted MCP response for checkSpending', async () => {
      mockLimitManager.getLimits.mockResolvedValue(null);
      mockLimitManager.getSpendingStats.mockResolvedValue({
        userId: testUserId,
        totalToday: '$0.00',
        totalThisMonth: '$0.00',
        transactionCount: 0,
        lastTransaction: undefined,
      });

      const result = await checkSpending(mockLimitManager, testUserId);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should return properly formatted MCP error response', async () => {
      mockLimitManager.setLimits.mockRejectedValue(new Error('Test error'));

      const result = await setSpendingLimits(mockLimitManager, testUserId, {
        perTransaction: '$100.00',
      });

      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('error');
    });
  });
});

import { Database } from '../registry/database.js';
import { logger } from '../utils/logger.js';

/**
 * Spending limit configuration
 */
export interface SpendingLimit {
  userId: string; // Wallet address or user identifier
  perTransaction: string; // Max per transaction (e.g., "$5.00")
  daily: string; // Max per day (e.g., "$50.00")
  monthly: string; // Max per month (e.g., "$500.00")
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Spending stats for a time period
 */
export interface SpendingStats {
  userId: string;
  totalToday: string;
  totalThisMonth: string;
  transactionCount: number;
  lastTransaction?: string;
}

/**
 * Manages user spending limits and tracks spending history
 * Prevents overspending and provides budget management for AI agents
 */
export class SpendingLimitManager {
  constructor(private db: Database) {}

  /**
   * Initialize spending limits table
   */
  async initialize(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS spending_limits (
        userId TEXT PRIMARY KEY,
        perTransaction TEXT NOT NULL,
        daily TEXT NOT NULL,
        monthly TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    logger.info('✓ SpendingLimitManager initialized');
  }

  /**
   * Set spending limits for a user
   */
  async setLimits(userId: string, limits: {
    perTransaction?: string;
    daily?: string;
    monthly?: string;
    enabled?: boolean;
  }): Promise<SpendingLimit> {
    const now = new Date().toISOString();

    // Get existing limits or use defaults
    const existing = await this.getLimits(userId);

    const newLimits: SpendingLimit = {
      userId,
      perTransaction: limits.perTransaction || existing?.perTransaction || '$5.00',
      daily: limits.daily || existing?.daily || '$50.00',
      monthly: limits.monthly || existing?.monthly || '$500.00',
      enabled: limits.enabled !== undefined ? limits.enabled : (existing?.enabled ?? true),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    // Validate format
    this.validatePriceFormat(newLimits.perTransaction);
    this.validatePriceFormat(newLimits.daily);
    this.validatePriceFormat(newLimits.monthly);

    await this.db.run(
      `INSERT OR REPLACE INTO spending_limits
       (userId, perTransaction, daily, monthly, enabled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newLimits.userId,
        newLimits.perTransaction,
        newLimits.daily,
        newLimits.monthly,
        newLimits.enabled ? 1 : 0,
        newLimits.createdAt,
        newLimits.updatedAt
      ]
    );

    logger.info(`✓ Spending limits set for ${userId}`, newLimits);
    return newLimits;
  }

  /**
   * Get spending limits for a user
   */
  async getLimits(userId: string): Promise<SpendingLimit | null> {
    const row: any = await this.db.get(
      'SELECT * FROM spending_limits WHERE userId = ?',
      [userId]
    );

    if (!row) return null;

    return {
      userId: row.userId,
      perTransaction: row.perTransaction,
      daily: row.daily,
      monthly: row.monthly,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Get spending stats for a user
   */
  async getSpendingStats(userId: string): Promise<SpendingStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get today's spending
    const todayRow: any = await this.db.get(
      `SELECT SUM(CAST(REPLACE(amount, '$', '') AS REAL)) as total, COUNT(*) as count
       FROM transactions
       WHERE buyer = ? AND status = 'completed' AND timestamp >= ?`,
      [userId, startOfDay]
    );

    // Get this month's spending
    const monthRow: any = await this.db.get(
      `SELECT SUM(CAST(REPLACE(amount, '$', '') AS REAL)) as total
       FROM transactions
       WHERE buyer = ? AND status = 'completed' AND timestamp >= ?`,
      [userId, startOfMonth]
    );

    // Get last transaction
    const lastTx: any = await this.db.get(
      `SELECT timestamp FROM transactions
       WHERE buyer = ? AND status = 'completed'
       ORDER BY timestamp DESC LIMIT 1`,
      [userId]
    );

    return {
      userId,
      totalToday: `$${(todayRow?.total || 0).toFixed(2)}`,
      totalThisMonth: `$${(monthRow?.total || 0).toFixed(2)}`,
      transactionCount: todayRow?.count || 0,
      lastTransaction: lastTx?.timestamp
    };
  }

  /**
   * Check if a transaction would exceed spending limits
   * Returns true if allowed, false if would exceed limit
   */
  async checkLimit(userId: string, amount: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentSpending?: SpendingStats;
    limits?: SpendingLimit;
  }> {
    // Get user's limits
    const limits = await this.getLimits(userId);

    // If no limits set or disabled, allow
    if (!limits || !limits.enabled) {
      return { allowed: true };
    }

    // Parse amount
    const txAmount = parseFloat(amount.replace('$', ''));

    // Check per-transaction limit
    const perTxLimit = parseFloat(limits.perTransaction.replace('$', ''));
    if (txAmount > perTxLimit) {
      return {
        allowed: false,
        reason: `Transaction amount $${txAmount.toFixed(2)} exceeds per-transaction limit ${limits.perTransaction}`,
        limits
      };
    }

    // Get current spending
    const stats = await this.getSpendingStats(userId);
    const todayTotal = parseFloat(stats.totalToday.replace('$', ''));
    const monthTotal = parseFloat(stats.totalThisMonth.replace('$', ''));

    // Check daily limit
    const dailyLimit = parseFloat(limits.daily.replace('$', ''));
    if (todayTotal + txAmount > dailyLimit) {
      return {
        allowed: false,
        reason: `Transaction would exceed daily limit. Current: ${stats.totalToday}, Limit: ${limits.daily}, Attempted: $${txAmount.toFixed(2)}`,
        currentSpending: stats,
        limits
      };
    }

    // Check monthly limit
    const monthlyLimit = parseFloat(limits.monthly.replace('$', ''));
    if (monthTotal + txAmount > monthlyLimit) {
      return {
        allowed: false,
        reason: `Transaction would exceed monthly limit. Current: ${stats.totalThisMonth}, Limit: ${limits.monthly}, Attempted: $${txAmount.toFixed(2)}`,
        currentSpending: stats,
        limits
      };
    }

    // All checks passed
    return {
      allowed: true,
      currentSpending: stats,
      limits
    };
  }

  /**
   * Reset spending limits for a user (delete)
   */
  async resetLimits(userId: string): Promise<void> {
    await this.db.run('DELETE FROM spending_limits WHERE userId = ?', [userId]);
    logger.info(`✓ Spending limits reset for ${userId}`);
  }

  /**
   * Validate price format ($X.XX)
   */
  private validatePriceFormat(price: string): void {
    if (!/^\$\d+(\.\d{1,2})?$/.test(price)) {
      throw new Error(`Invalid price format: ${price}. Expected format: $X.XX`);
    }
  }
}

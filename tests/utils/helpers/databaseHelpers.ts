import { Database } from 'sqlite3';
import { promisify } from 'util';
import { DatabaseFactory } from '../factories/DatabaseFactory';
import { Service } from '../../../src/types/service';
import { Transaction, Rating } from '../../../src/types/transaction';

/**
 * Helper functions for database operations in tests
 */
export class DatabaseHelpers {
  private static factory = new DatabaseFactory();

  /**
   * Create a fresh in-memory database for testing
   */
  static async createTestDatabase(): Promise<Database> {
    const db = await DatabaseHelpers.factory.createInMemory();
    await DatabaseHelpers.factory.initializeSchema(db);
    return db;
  }

  /**
   * Reset a database (clear all data)
   */
  static async resetDatabase(db: Database): Promise<void> {
    await DatabaseHelpers.factory.clearDatabase(db);
  }

  /**
   * Seed database with test data
   */
  static async seedDatabase(
    db: Database,
    data: {
      services?: Service[];
      transactions?: Transaction[];
      ratings?: Rating[];
    }
  ): Promise<void> {
    if (data.services) {
      await DatabaseHelpers.factory.seedServices(db, data.services);
    }
    if (data.transactions) {
      await DatabaseHelpers.factory.seedTransactions(db, data.transactions);
    }
    if (data.ratings) {
      await DatabaseHelpers.factory.seedRatings(db, data.ratings);
    }
  }

  /**
   * Execute a database query and return results
   */
  static async query<T = unknown>(db: Database, sql: string, params: unknown[] = []): Promise<T[]> {
    const all = promisify(db.all.bind(db));
    return all(sql, params) as Promise<T[]>;
  }

  /**
   * Execute a database command (INSERT, UPDATE, DELETE)
   */
  static async run(db: Database, sql: string, params: unknown[] = []): Promise<void> {
    const run = promisify(db.run.bind(db));
    await run(sql, params);
  }

  /**
   * Get a single row from the database
   */
  static async get<T = unknown>(db: Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
    const get = promisify(db.get.bind(db));
    return get(sql, params) as Promise<T | undefined>;
  }

  /**
   * Begin a transaction
   */
  static async beginTransaction(db: Database): Promise<void> {
    await DatabaseHelpers.run(db, 'BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  static async commitTransaction(db: Database): Promise<void> {
    await DatabaseHelpers.run(db, 'COMMIT');
  }

  /**
   * Rollback a transaction
   */
  static async rollbackTransaction(db: Database): Promise<void> {
    await DatabaseHelpers.run(db, 'ROLLBACK');
  }

  /**
   * Execute code within a database transaction
   */
  static async withinTransaction<T>(db: Database, callback: () => Promise<T>): Promise<T> {
    await DatabaseHelpers.beginTransaction(db);
    try {
      const result = await callback();
      await DatabaseHelpers.commitTransaction(db);
      return result;
    } catch (error) {
      await DatabaseHelpers.rollbackTransaction(db);
      throw error;
    }
  }

  /**
   * Count rows in a table
   */
  static async count(db: Database, table: string, where?: string, params: unknown[] = []): Promise<number> {
    const sql = where ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}` : `SELECT COUNT(*) as count FROM ${table}`;
    const result = await DatabaseHelpers.get<{ count: number }>(db, sql, params);
    return result?.count || 0;
  }

  /**
   * Check if a row exists
   */
  static async exists(db: Database, table: string, where: string, params: unknown[] = []): Promise<boolean> {
    const count = await DatabaseHelpers.count(db, table, where, params);
    return count > 0;
  }

  /**
   * Get all services from database
   */
  static async getAllServices(db: Database): Promise<Service[]> {
    return DatabaseHelpers.factory.getAllServices(db);
  }

  /**
   * Get all transactions from database
   */
  static async getAllTransactions(db: Database): Promise<Transaction[]> {
    return DatabaseHelpers.factory.getAllTransactions(db);
  }

  /**
   * Get all ratings from database
   */
  static async getAllRatings(db: Database): Promise<Rating[]> {
    return DatabaseHelpers.factory.getAllRatings(db);
  }

  /**
   * Find a service by ID
   */
  static async findServiceById(db: Database, id: string): Promise<Service | undefined> {
    const row = await DatabaseHelpers.get<{
      id: string;
      name: string;
      description: string;
      provider: string;
      endpoint: string;
      capabilities: string;
      pricing: string;
      reputation: string;
      metadata: string;
      createdAt: string;
      updatedAt: string;
    }>(db, 'SELECT * FROM services WHERE id = ?', [id]);

    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      provider: row.provider,
      endpoint: row.endpoint,
      capabilities: JSON.parse(row.capabilities),
      pricing: JSON.parse(row.pricing),
      reputation: JSON.parse(row.reputation),
      metadata: JSON.parse(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Find a transaction by ID
   */
  static async findTransactionById(db: Database, id: string): Promise<Transaction | undefined> {
    const row = await DatabaseHelpers.get<{
      id: string;
      serviceId: string;
      buyer: string;
      seller: string;
      amount: string;
      currency: string;
      status: string;
      request: string;
      response: string | null;
      paymentHash: string | null;
      error: string | null;
      timestamp: string;
    }>(db, 'SELECT * FROM transactions WHERE id = ?', [id]);

    if (!row) return undefined;

    return {
      id: row.id,
      serviceId: row.serviceId,
      buyer: row.buyer,
      seller: row.seller,
      amount: row.amount,
      currency: row.currency,
      status: row.status as 'pending' | 'completed' | 'failed',
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : undefined,
      paymentHash: row.paymentHash || undefined,
      error: row.error || undefined,
      timestamp: row.timestamp,
    };
  }

  /**
   * Close database connection
   */
  static async close(db: Database): Promise<void> {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Create a database and automatically close it after the test
   */
  static async withDatabase<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    const db = await DatabaseHelpers.createTestDatabase();
    try {
      return await callback(db);
    } finally {
      await DatabaseHelpers.close(db);
    }
  }
}

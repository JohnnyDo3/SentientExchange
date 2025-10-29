import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

/**
 * Database Layer
 *
 * SQLite database wrapper with promisified API for async/await patterns.
 * Manages three tables: services, transactions, and ratings.
 */

export class Database {
  private db: sqlite3.Database;
  private runAsync: any;
  private getAsync: any;
  private allAsync: any;

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize SQLite database
    this.db = new sqlite3.Database(dbPath);

    // Promisify database methods for async/await
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  /**
   * Initialize database schema with tables and indexes
   */
  async initialize(): Promise<void> {
    // Create services table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        pricing TEXT NOT NULL,
        reputation TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create transactions table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        buyer TEXT NOT NULL,
        seller TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        request TEXT NOT NULL,
        response TEXT,
        payment_hash TEXT,
        error TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Create ratings table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        rater TEXT NOT NULL,
        score INTEGER NOT NULL,
        review TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Create indexes for performance
    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_services_capabilities
      ON services(capabilities)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_service
      ON transactions(service_id)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_ratings_service
      ON ratings(service_id)
    `);
  }

  /**
   * Execute a SQL query (INSERT, UPDATE, DELETE)
   */
  async run(query: string, params?: any[]): Promise<void> {
    await this.runAsync(query, params);
  }

  /**
   * Get a single row from database
   */
  async get<T>(query: string, params?: any[]): Promise<T | undefined> {
    return await this.getAsync(query, params);
  }

  /**
   * Get all matching rows from database
   */
  async all<T>(query: string, params?: any[]): Promise<T[]> {
    return await this.allAsync(query, params);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

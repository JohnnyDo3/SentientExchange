/**
 * SQLite Database Adapter
 *
 * Implementation of DatabaseAdapter for SQLite.
 * Extracted from original database.ts implementation.
 */

import sqlite3Module from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { DatabaseAdapter } from '../DatabaseAdapter.js';
import { logger } from '../../utils/logger.js';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: sqlite3Module.Database;
  private runAsync: (sql: string, ...params: unknown[]) => Promise<void>;
  private getAsync: <T = unknown>(
    sql: string,
    ...params: unknown[]
  ) => Promise<T | undefined>;
  private allAsync: <T = unknown>(
    sql: string,
    ...params: unknown[]
  ) => Promise<T[]>;

  constructor(private dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize SQLite database
    this.db = new sqlite3Module.Database(dbPath);

    // Promisify database methods for async/await
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));

    logger.info(`✓ SQLite adapter initialized: ${dbPath}`);
  }

  async initialize(): Promise<void> {
    // Enable foreign key constraints
    await this.runAsync('PRAGMA foreign_keys = ON');

    // Create services table with enhanced schema
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
        created_by TEXT,
        updated_by TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create transactions table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        serviceId TEXT NOT NULL,
        buyer TEXT NOT NULL,
        seller TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        request TEXT NOT NULL,
        response TEXT,
        paymentHash TEXT,
        error TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Create ratings table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        transactionId TEXT NOT NULL,
        serviceId TEXT NOT NULL,
        rater TEXT NOT NULL,
        score INTEGER NOT NULL,
        review TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Create audit_logs table for tracking all changes
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT,
        performed_by TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL
      )
    `);

    // Create metadata table for schema versioning
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create indexes for performance
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_services_capabilities ON services(capabilities)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_services_deleted ON services(deleted_at)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_service ON transactions(serviceId)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_ratings_service ON ratings(serviceId)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`
    );

    logger.info('✓ SQLite schema initialized');
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    await this.runAsync(sql, ...(params || []));
  }

  async get<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<T | undefined> {
    return await this.getAsync<T>(sql, ...(params || []));
  }

  async all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return await this.allAsync<T>(sql, ...(params || []));
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getType(): 'sqlite' | 'postgres' {
    return 'sqlite';
  }

  convertPlaceholders(sql: string, _paramCount: number): string {
    // SQLite uses ? placeholders - no conversion needed
    return sql;
  }
}

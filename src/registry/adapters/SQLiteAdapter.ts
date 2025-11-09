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
        provider_wallet TEXT,
        endpoint TEXT NOT NULL,
        health_check_url TEXT,
        capabilities TEXT NOT NULL,
        pricing TEXT NOT NULL,
        reputation TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        middleware_verified INTEGER DEFAULT 0,
        network TEXT DEFAULT 'solana',
        approval_notes TEXT,
        approved_at INTEGER,
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

    // Create used_request_ids table for replay attack prevention
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS used_request_ids (
        request_id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        tx_signature TEXT NOT NULL,
        used_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Create service_health_checks table for monitoring
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS service_health_checks (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        status TEXT NOT NULL,
        response_time_ms INTEGER,
        error_message TEXT,
        checked_at INTEGER NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
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
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_used_request_expires ON used_request_ids(expires_at)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_used_request_service ON used_request_ids(service_id)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_health_service ON service_health_checks(service_id, checked_at)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)`
    );

    // Create chat_sessions table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        pda_address TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        initial_balance TEXT NOT NULL,
        current_balance TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        nonce_accounts TEXT
      )
    `);

    // Create chat_messages table
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
      )
    `);

    // Create indexes for chat tables
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity)`
    );
    await this.runAsync(
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, timestamp)`
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

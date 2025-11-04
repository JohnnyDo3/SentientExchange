import { logger } from '../utils/logger.js';
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
    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_services_capabilities
      ON services(capabilities)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_services_provider
      ON services(provider)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_services_deleted
      ON services(deleted_at)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_service
      ON transactions(serviceId)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_buyer
      ON transactions(buyer)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_ratings_service
      ON ratings(serviceId)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_audit_entity
      ON audit_logs(entity_type, entity_id)
    `);

    await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp
      ON audit_logs(timestamp)
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

  /**
   * Log an audit entry for tracking changes
   */
  async logAudit(
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
    changes?: any,
    performedBy?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date().toISOString();

    await this.run(
      `INSERT INTO audit_logs (id, entity_type, entity_id, action, changes, performed_by, ip_address, user_agent, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entityType,
        entityId,
        action,
        changes ? JSON.stringify(changes) : null,
        performedBy || 'system',
        ipAddress || null,
        userAgent || null,
        timestamp
      ]
    );
  }

  /**
   * Get audit history for an entity
   */
  async getAuditHistory(entityType: string, entityId: string, limit = 50): Promise<any[]> {
    return await this.all(
      `SELECT * FROM audit_logs
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [entityType, entityId, limit]
    );
  }

  /**
   * Execute a database migration (for schema updates)
   */
  async migrate(version: number): Promise<void> {
    // Check current schema version
    const versionInfo: any = await this.get(
      'SELECT value FROM metadata WHERE key = ?',
      ['schema_version']
    );

    const currentVersion = versionInfo ? parseInt(versionInfo.value) : 0;

    if (currentVersion >= version) {
      logger.info(`✓ Database already at version ${version}`);
      return;
    }

    logger.info(`Migrating database from v${currentVersion} to v${version}...`);

    // Migration logic based on version
    if (version === 2 && currentVersion < 2) {
      // Add soft delete columns if they don't exist
      try {
        await this.run('ALTER TABLE services ADD COLUMN deleted_at TEXT');
      } catch (e) {
        // Column might already exist
      }

      try {
        await this.run('ALTER TABLE services ADD COLUMN created_by TEXT');
        await this.run('ALTER TABLE services ADD COLUMN updated_by TEXT');
      } catch (e) {
        // Columns might already exist
      }
    }

    // Update schema version
    await this.run(
      `INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)`,
      [version.toString()]
    );

    logger.info(`✓ Database migrated to version ${version}`);
  }
}

/**
 * Audit Log Interface
 */
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  changes?: string;
  performed_by?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

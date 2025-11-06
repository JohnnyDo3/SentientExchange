import { logger } from '../utils/logger.js';
import { DatabaseAdapter } from './DatabaseAdapter.js';
import { SQLiteAdapter } from './adapters/SQLiteAdapter.js';
import { PostgresAdapter } from './adapters/PostgresAdapter.js';

/**
 * Database Layer
 *
 * Unified database interface that auto-detects and uses the appropriate adapter.
 * Supports both SQLite (local development) and PostgreSQL (Railway production).
 *
 * Auto-detection logic:
 * - If DATABASE_URL env var starts with "postgres://", use PostgresAdapter
 * - Otherwise, use SQLiteAdapter with provided path
 */

export class Database {
  private adapter: DatabaseAdapter;

  constructor(dbPathOrUrl: string) {
    // Auto-detect database type from connection string
    if (dbPathOrUrl.startsWith('postgres://') || dbPathOrUrl.startsWith('postgresql://')) {
      // Use PostgreSQL for Railway production
      this.adapter = new PostgresAdapter(dbPathOrUrl);
      logger.info('🐘 Using PostgreSQL database (production)');
    } else {
      // Use SQLite for local development
      this.adapter = new SQLiteAdapter(dbPathOrUrl);
      logger.info('💾 Using SQLite database (local development)');
    }
  }

  /**
   * Initialize database schema with tables and indexes
   * Delegates to the appropriate adapter (SQLite or Postgres)
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Execute a SQL query (INSERT, UPDATE, DELETE)
   */
  async run(query: string, params?: unknown[]): Promise<void> {
    await this.adapter.run(query, params);
  }

  /**
   * Get a single row from database
   */
  async get<T = unknown>(query: string, params?: unknown[]): Promise<T | undefined> {
    return await this.adapter.get<T>(query, params);
  }

  /**
   * Get all matching rows from database
   */
  async all<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
    return await this.adapter.all<T>(query, params);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.adapter.close();
  }

  /**
   * Get the database type (for debugging/logging)
   */
  getType(): 'sqlite' | 'postgres' {
    return this.adapter.getType();
  }

  /**
   * Log an audit entry for tracking changes
   */
  async logAudit(
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
    changes?: unknown,
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
  async getAuditHistory(entityType: string, entityId: string, limit = 50): Promise<AuditLog[]> {
    return await this.all<AuditLog>(
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
    const versionInfo = await this.get<{ value: string }>(
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

    // Update schema version (handle SQLite vs Postgres UPSERT syntax)
    const dbType = this.adapter.getType();
    if (dbType === 'postgres') {
      await this.run(
        `INSERT INTO metadata (key, value)
         VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['schema_version', version.toString()]
      );
    } else {
      await this.run(
        `INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)`,
        ['schema_version', version.toString()]
      );
    }

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

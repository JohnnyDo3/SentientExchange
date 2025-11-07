/**
 * PostgreSQL Database Adapter
 *
 * Implementation of DatabaseAdapter for PostgreSQL.
 * Designed for Railway production deployment with persistent storage.
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter } from '../DatabaseAdapter.js';
import { logger } from '../../utils/logger.js';

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Log connection events
    this.pool.on('connect', () => {
      logger.debug('New Postgres client connected');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected Postgres pool error:', err);
    });

    logger.info(`✓ PostgreSQL adapter initialized: ${connectionString.split('@')[1] || 'connection established'}`);
  }

  async initialize(): Promise<void> {
    // Foreign keys are always enabled in Postgres (no PRAGMA needed)

    // Create services table with JSONB columns for better performance
    await this.run(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        provider TEXT NOT NULL,
        provider_wallet TEXT,
        endpoint TEXT NOT NULL,
        health_check_url TEXT,
        capabilities JSONB NOT NULL,
        pricing JSONB NOT NULL,
        reputation JSONB NOT NULL,
        status TEXT DEFAULT 'pending',
        middleware_verified BOOLEAN DEFAULT false,
        network TEXT DEFAULT 'solana',
        approval_notes TEXT,
        approved_at BIGINT,
        metadata JSONB,
        created_by TEXT,
        updated_by TEXT,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    await this.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        serviceId TEXT NOT NULL,
        buyer TEXT NOT NULL,
        seller TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        request JSONB NOT NULL,
        response JSONB,
        paymentHash TEXT,
        error TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Create ratings table
    await this.run(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        transactionId TEXT NOT NULL,
        serviceId TEXT NOT NULL,
        rater TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        review TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Create audit_logs table for tracking all changes
    await this.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes JSONB,
        performed_by TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create metadata table for schema versioning
    await this.run(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create used_request_ids table for replay attack prevention
    await this.run(`
      CREATE TABLE IF NOT EXISTS used_request_ids (
        request_id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        tx_signature TEXT NOT NULL,
        used_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Create service_health_checks table for monitoring
    await this.run(`
      CREATE TABLE IF NOT EXISTS service_health_checks (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        status TEXT NOT NULL,
        response_time_ms INTEGER,
        error_message TEXT,
        checked_at BIGINT NOT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Create B-tree indexes for exact lookups
    await this.run(`CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_services_deleted ON services(deleted_at) WHERE deleted_at IS NULL`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_transactions_service ON transactions(serviceId)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_ratings_service ON ratings(serviceId)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC)`);

    // Create GIN indexes for JSONB columns (efficient searching within JSON)
    await this.run(`CREATE INDEX IF NOT EXISTS idx_services_capabilities_gin ON services USING GIN (capabilities)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_services_pricing_gin ON services USING GIN (pricing)`);

    // Create indexes for new tables
    await this.run(`CREATE INDEX IF NOT EXISTS idx_used_request_expires ON used_request_ids(expires_at)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_used_request_service ON used_request_ids(service_id)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_health_service ON service_health_checks(service_id, checked_at)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)`);

    logger.info('✓ PostgreSQL schema initialized with JSONB optimization');
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    // Convert ? placeholders to $1, $2, etc.
    const convertedSql = this.convertPlaceholders(sql, params?.length || 0);

    const client: PoolClient = await this.pool.connect();
    try {
      await client.query(convertedSql, params);
    } finally {
      client.release();
    }
  }

  async get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined> {
    // Convert ? placeholders to $1, $2, etc.
    const convertedSql = this.convertPlaceholders(sql, params?.length || 0);

    const client: PoolClient = await this.pool.connect();
    try {
      const result = await client.query(convertedSql, params);
      return result.rows[0] as T | undefined;
    } finally {
      client.release();
    }
  }

  async all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    // Convert ? placeholders to $1, $2, etc.
    const convertedSql = this.convertPlaceholders(sql, params?.length || 0);

    const client: PoolClient = await this.pool.connect();
    try {
      const result = await client.query(convertedSql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('✓ PostgreSQL connection pool closed');
  }

  getType(): 'sqlite' | 'postgres' {
    return 'postgres';
  }

  /**
   * Convert SQLite ? placeholders to Postgres $1, $2, etc.
   * @param sql SQL with ? placeholders
   * @param paramCount Number of parameters
   * @returns SQL with $1, $2, ... placeholders
   */
  convertPlaceholders(sql: string, paramCount: number): string {
    if (paramCount === 0) return sql;

    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }
}

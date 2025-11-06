/**
 * Database Adapter Interface
 *
 * Abstraction layer to support multiple database backends (SQLite, PostgreSQL).
 * Allows the application to work with different databases without code changes.
 */

export interface DatabaseAdapter {
  /**
   * Initialize the database connection and schema
   */
  initialize(): Promise<void>;

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   * @param sql SQL statement with placeholders
   * @param params Parameters to bind to placeholders
   * @returns Result of the operation
   */
  run(sql: string, params?: unknown[]): Promise<void>;

  /**
   * Execute a query and return a single row
   * @param sql SQL query with placeholders
   * @param params Parameters to bind to placeholders
   * @returns Single row or undefined
   */
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;

  /**
   * Execute a query and return all rows
   * @param sql SQL query with placeholders
   * @param params Parameters to bind to placeholders
   * @returns Array of rows
   */
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;

  /**
   * Get the database type (for debugging/logging)
   */
  getType(): 'sqlite' | 'postgres';

  /**
   * Convert parameter placeholder to database-specific format
   * SQLite uses ? placeholders, Postgres uses $1, $2, etc.
   * @param sql SQL with ? placeholders
   * @param paramCount Number of parameters
   * @returns SQL with database-specific placeholders
   */
  convertPlaceholders(sql: string, paramCount: number): string;
}

/**
 * Database Layer
 *
 * SQLite database wrapper with promisified API.
 * Will be fully implemented in Day 2.
 */

export class Database {
  constructor(dbPath: string) {
    // TODO: Initialize SQLite database (Day 2)
    console.log(`Database initialized at: ${dbPath}`);
  }

  async initialize(): Promise<void> {
    // TODO: Create tables and indexes (Day 2)
  }

  async run(query: string, params?: any[]): Promise<void> {
    // TODO: Execute SQL query (Day 2)
  }

  async get<T>(query: string, params?: any[]): Promise<T | undefined> {
    // TODO: Get single row (Day 2)
    return undefined;
  }

  async all<T>(query: string, params?: any[]): Promise<T[]> {
    // TODO: Get all rows (Day 2)
    return [];
  }

  async close(): Promise<void> {
    // TODO: Close database connection (Day 2)
  }
}

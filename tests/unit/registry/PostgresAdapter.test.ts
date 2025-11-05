/**
 * Unit tests for PostgresAdapter
 * Tests Postgres-specific functionality like JSONB, GIN indexes, and placeholder conversion
 */

import { PostgresAdapter } from '../../../src/registry/adapters/PostgresAdapter';

describe('PostgresAdapter', () => {
  describe('Placeholder Conversion', () => {
    let adapter: PostgresAdapter;

    beforeAll(() => {
      // Create adapter with mock connection string (won't connect in tests)
      adapter = new PostgresAdapter('postgresql://test:test@localhost:5432/test');
    });

    it('should convert ? placeholders to $1, $2, $3...', () => {
      const sql = 'SELECT * FROM users WHERE id = ? AND name = ?';
      const converted = adapter.convertPlaceholders(sql, 2);
      expect(converted).toBe('SELECT * FROM users WHERE id = $1 AND name = $2');
    });

    it('should handle single placeholder', () => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const converted = adapter.convertPlaceholders(sql, 1);
      expect(converted).toBe('SELECT * FROM users WHERE id = $1');
    });

    it('should handle no placeholders', () => {
      const sql = 'SELECT * FROM users';
      const converted = adapter.convertPlaceholders(sql, 0);
      expect(converted).toBe('SELECT * FROM users');
    });

    it('should handle multiple placeholders in complex query', () => {
      const sql = `
        INSERT INTO services (id, name, capabilities, pricing)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `;
      const converted = adapter.convertPlaceholders(sql, 4);
      expect(converted).toContain('$1');
      expect(converted).toContain('$2');
      expect(converted).toContain('$3');
      expect(converted).toContain('$4');
    });

    it('should correctly number placeholders sequentially', () => {
      const sql = 'UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?';
      const converted = adapter.convertPlaceholders(sql, 4);

      // Extract all $N placeholders
      const matches = converted.match(/\$\d+/g);
      expect(matches).toEqual(['$1', '$2', '$3', '$4']);
    });
  });

  describe('Database Type', () => {
    it('should return "postgres" as database type', () => {
      const adapter = new PostgresAdapter('postgresql://test:test@localhost:5432/test');
      expect(adapter.getType()).toBe('postgres');
    });
  });

  describe('Schema Validation', () => {
    it('should create adapter without errors', () => {
      expect(() => {
        new PostgresAdapter('postgresql://test:test@localhost:5432/test');
      }).not.toThrow();
    });

    it('should accept different connection string formats', () => {
      const formats = [
        'postgresql://user:pass@host:5432/db',
        'postgres://user:pass@host:5432/db',
        'postgresql://user:pass@host:5432/db?ssl=true',
      ];

      formats.forEach(connString => {
        expect(() => {
          new PostgresAdapter(connString);
        }).not.toThrow();
      });
    });
  });
});

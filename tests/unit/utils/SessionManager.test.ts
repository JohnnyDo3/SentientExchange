import { SessionManager } from '../../../src/utils/SessionManager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.stopCleanup();
  });

  describe('create', () => {
    it('should create a new session', () => {
      const session = manager.create();

      expect(session.sessionId).toBeDefined();
      expect(session.status).toBe('preparing');
      expect(session.retryCount).toBe(0);
      expect(session.maxRetries).toBe(2);
      expect(session.requireHealthCheck).toBe(true);
      expect(session.createdAt).toBeLessThanOrEqual(Date.now());
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create session with userId', () => {
      const session = manager.create('user-123');

      expect(session.userId).toBe('user-123');
    });

    it('should create session with custom config', () => {
      const session = manager.create('user-123', {
        maxRetries: 5,
        requireHealthCheck: false,
      });

      expect(session.maxRetries).toBe(5);
      expect(session.requireHealthCheck).toBe(false);
    });

    it('should set expiration to 15 minutes', () => {
      const session = manager.create();
      const expectedExpiry = session.createdAt + (15 * 60 * 1000);

      expect(session.expiresAt).toBe(expectedExpiry);
    });
  });

  describe('get', () => {
    it('should retrieve existing session', () => {
      const created = manager.create();
      const retrieved = manager.get(created.sessionId);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = manager.get('non-existent-id');

      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for expired session', () => {
      const session = manager.create();

      // Manually expire the session
      session.expiresAt = Date.now() - 1000;
      manager.update(session.sessionId, { expiresAt: session.expiresAt });

      const retrieved = manager.get(session.sessionId);

      expect(retrieved).toBeUndefined();
    });

    it('should delete expired session on get', () => {
      const session = manager.create();
      session.expiresAt = Date.now() - 1000;
      manager.update(session.sessionId, { expiresAt: session.expiresAt });

      manager.get(session.sessionId);

      // Trying to get again should still return undefined
      const secondTry = manager.get(session.sessionId);
      expect(secondTry).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update session fields', () => {
      const session = manager.create();

      manager.update(session.sessionId, {
        status: 'payment_ready',
        retryCount: 1,
      });

      const updated = manager.get(session.sessionId);
      expect(updated?.status).toBe('payment_ready');
      expect(updated?.retryCount).toBe(1);
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        manager.update('non-existent', { status: 'completed' });
      }).toThrow('Session not found');
    });

    it('should throw error for expired session', () => {
      const session = manager.create();
      session.expiresAt = Date.now() - 1000;
      manager.update(session.sessionId, { expiresAt: session.expiresAt });

      expect(() => {
        manager.update(session.sessionId, { status: 'completed' });
      }).toThrow('Session not found');
    });
  });

  describe('delete', () => {
    it('should delete session', () => {
      const session = manager.create();

      manager.delete(session.sessionId);

      const retrieved = manager.get(session.sessionId);
      expect(retrieved).toBeUndefined();
    });

    it('should handle deleting non-existent session', () => {
      expect(() => {
        manager.delete('non-existent');
      }).not.toThrow();
    });
  });

  describe('getByUser', () => {
    it('should return all sessions for user', () => {
      manager.create('user-1');
      manager.create('user-1');
      manager.create('user-2');

      const user1Sessions = manager.getByUser('user-1');

      expect(user1Sessions).toHaveLength(2);
      expect(user1Sessions.every(s => s.userId === 'user-1')).toBe(true);
    });

    it('should exclude expired sessions', () => {
      const session1 = manager.create('user-1');
      manager.create('user-1');

      // Expire first session
      session1.expiresAt = Date.now() - 1000;
      manager.update(session1.sessionId, { expiresAt: session1.expiresAt });

      const sessions = manager.getByUser('user-1');

      expect(sessions).toHaveLength(1);
    });

    it('should return empty array for user with no sessions', () => {
      const sessions = manager.getByUser('non-existent-user');

      expect(sessions).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should remove expired sessions', () => {
      const session1 = manager.create();
      const session2 = manager.create();
      const session3 = manager.create();

      // Expire first two
      session1.expiresAt = Date.now() - 1000;
      session2.expiresAt = Date.now() - 1000;
      manager.update(session1.sessionId, { expiresAt: session1.expiresAt });
      manager.update(session2.sessionId, { expiresAt: session2.expiresAt });

      const cleaned = manager.cleanup();

      expect(cleaned).toBe(2);
      expect(manager.get(session1.sessionId)).toBeUndefined();
      expect(manager.get(session2.sessionId)).toBeUndefined();
      expect(manager.get(session3.sessionId)).toBeDefined();
    });

    it('should return 0 when no sessions to clean', () => {
      manager.create();
      manager.create();

      const cleaned = manager.cleanup();

      expect(cleaned).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const session1 = manager.create();
      const session2 = manager.create();
      const session3 = manager.create();

      manager.update(session1.sessionId, { status: 'payment_ready' });
      manager.update(session2.sessionId, { status: 'completed' });

      // Expire one session
      session3.expiresAt = Date.now() - 1000;
      manager.update(session3.sessionId, { expiresAt: session3.expiresAt });

      const stats = manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.expired).toBe(1);
      expect(stats.byStatus.payment_ready).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.preparing).toBeUndefined(); // session3 is expired, not counted
    });

    it('should return empty stats for empty manager', () => {
      const stats = manager.getStats();

      expect(stats.total).toBe(0);
      expect(stats.expired).toBe(0);
      expect(stats.byStatus).toEqual({});
    });
  });
});

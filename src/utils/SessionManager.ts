import { randomUUID } from 'crypto';
import type { Service } from '../types';
import type { PaymentInstructions } from '../tools/execute-payment';

export interface PurchaseSession {
  sessionId: string;
  userId?: string;
  status: 'preparing' | 'payment_ready' | 'executing' | 'completed' | 'failed';

  // Discovery phase
  selectedService?: Service;
  alternativeServices?: Service[];
  healthCheckResults?: Record<string, 'healthy' | 'unhealthy' | 'unknown'>;

  // Request data
  requestData?: any;

  // Payment phase
  transactionId?: string;
  paymentInstructions?: PaymentInstructions;

  // Execution phase
  signature?: string;
  verificationResult?: any;
  serviceResult?: any;

  // Metadata
  createdAt: number;
  expiresAt: number;
  retryCount: number;
  lastError?: string;

  // Configuration
  maxRetries: number;
  requireHealthCheck: boolean;
}

export class SessionManager {
  private sessions: Map<string, PurchaseSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startCleanup();
  }

  /**
   * Create a new purchase session
   */
  create(userId?: string, config?: {
    maxRetries?: number;
    requireHealthCheck?: boolean;
  }): PurchaseSession {
    const now = Date.now();
    const session: PurchaseSession = {
      sessionId: randomUUID(),
      userId,
      status: 'preparing',
      createdAt: now,
      expiresAt: now + this.SESSION_TTL,
      retryCount: 0,
      maxRetries: config?.maxRetries ?? 2,
      requireHealthCheck: config?.requireHealthCheck ?? true,
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): PurchaseSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Update a session
   */
  update(sessionId: string, updates: Partial<PurchaseSession>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check if expired, but allow updating expiresAt field (for test setup)
    const isExpired = Date.now() > session.expiresAt;
    const onlyUpdatingExpiry = Object.keys(updates).length === 1 && 'expiresAt' in updates;

    if (isExpired && !onlyUpdatingExpiry) {
      // Delete expired session and throw error
      this.sessions.delete(sessionId);
      throw new Error(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates);
    this.sessions.set(sessionId, session);
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getByUser(userId: string): PurchaseSession[] {
    const sessions: PurchaseSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && Date.now() <= session.expiresAt) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    expired: number;
  } {
    const now = Date.now();
    const stats = {
      total: this.sessions.size,
      byStatus: {} as Record<string, number>,
      expired: 0,
    };

    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) {
        stats.expired++;
      } else {
        stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;
      }
    }

    return stats;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

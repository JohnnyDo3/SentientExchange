/**
 * Logging Utility
 *
 * Simple logger for development. Can be replaced with Winston later.
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: string): boolean {
  return levels[level] >= levels[LOG_LEVEL];
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.error('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.error('[INFO]', new Date().toISOString(), ...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.error('[WARN]', new Date().toISOString(), ...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
};

/**
 * Security Event Logger
 * Logs security-relevant events for monitoring, alerting, and incident response
 * All events are logged with structured data for SIEM integration
 */
export const securityLogger = {
  /**
   * Log authentication failure (suspicious activity)
   */
  authFailure: (details: { address?: string; reason: string; ip?: string; userAgent?: string }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'AUTH_FAILURE',
      severity: 'MEDIUM',
      category: 'authentication',
      ...details,
    }));
  },

  /**
   * Log CSRF violation (potential attack)
   */
  csrfViolation: (details: { path: string; method: string; ip?: string; hasHeader: boolean; hasCookie: boolean }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'CSRF_VIOLATION',
      severity: 'HIGH',
      category: 'web_attack',
      ...details,
    }));
  },

  /**
   * Log rate limit hit (potential DoS/abuse)
   */
  rateLimitHit: (details: { path: string; ip?: string; limit: number }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'RATE_LIMIT_HIT',
      severity: 'MEDIUM',
      category: 'abuse',
      ...details,
    }));
  },

  /**
   * Log command injection attempt (critical threat)
   */
  commandInjectionAttempt: (details: { value: string; reason: string; ip?: string }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'COMMAND_INJECTION_ATTEMPT',
      severity: 'CRITICAL',
      category: 'injection_attack',
      ...details,
    }));
  },

  /**
   * Log path traversal attempt (critical threat)
   */
  pathTraversalAttempt: (details: { path: string; reason: string; ip?: string }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'PATH_TRAVERSAL_ATTEMPT',
      severity: 'CRITICAL',
      category: 'directory_traversal',
      ...details,
    }));
  },

  /**
   * Log successful authentication
   */
  authSuccess: (details: { address: string; chainId: number; ip?: string }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'AUTH_SUCCESS',
      severity: 'INFO',
      category: 'authentication',
      ...details,
    }));
  },

  /**
   * Log sensitive operation (audit trail)
   */
  sensitiveOperation: (details: { operation: string; user: string; resource?: string; ip?: string }) => {
    console.error('[SECURITY]', new Date().toISOString(), JSON.stringify({
      event: 'SENSITIVE_OPERATION',
      severity: 'INFO',
      category: 'audit',
      ...details,
    }));
  },
};

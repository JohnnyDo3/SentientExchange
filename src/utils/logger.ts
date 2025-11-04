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

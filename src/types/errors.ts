/**
 * Custom error types for AgentMarket
 */

/**
 * Base error class for all AgentMarket errors
 */
export class AgentMarketError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Payment-related errors
 */
export class PaymentError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PAYMENT_ERROR', 402, details);
  }
}

export class PaymentVerificationError extends PaymentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'PAYMENT_VERIFICATION_FAILED';
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'INSUFFICIENT_FUNDS';
  }
}

export class PaymentTimeoutError extends PaymentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'PAYMENT_TIMEOUT';
  }
}

/**
 * Authentication & Authorization errors
 */
export class AuthenticationError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_FAILED', 401, details);
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Invalid or expired token', details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'INVALID_TOKEN';
  }
}

export class MissingTokenError extends AuthenticationError {
  constructor(message: string = 'No authentication token provided', details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'MISSING_TOKEN';
  }
}

export class AuthorizationError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_FAILED', 403, details);
  }
}

export class PermissionDeniedError extends AuthorizationError {
  constructor(message: string = 'You do not have permission to perform this action', details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'PERMISSION_DENIED';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class InvalidInputError extends ValidationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'INVALID_INPUT';
  }
}

export class MissingRequiredFieldError extends ValidationError {
  constructor(field: string, details?: Record<string, unknown>) {
    super(`Missing required field: ${field}`, { ...details, field });
    this.code = 'MISSING_REQUIRED_FIELD';
  }
}

/**
 * Resource errors
 */
export class NotFoundError extends AgentMarketError {
  constructor(resource: string, id?: string, details?: Record<string, unknown>) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { ...details, resource, id });
  }
}

export class ResourceConflictError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RESOURCE_CONFLICT', 409, details);
  }
}

export class ResourceAlreadyExistsError extends ResourceConflictError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} already exists`, { ...details, resource });
    this.code = 'RESOURCE_ALREADY_EXISTS';
  }
}

/**
 * Service errors
 */
export class ServiceError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SERVICE_ERROR', 500, details);
  }
}

export class ServiceUnavailableError extends ServiceError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Service ${service} is currently unavailable`, { ...details, service });
    this.code = 'SERVICE_UNAVAILABLE';
    this.statusCode = 503;
  }
}

export class ServiceTimeoutError extends ServiceError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Service ${service} timed out`, { ...details, service });
    this.code = 'SERVICE_TIMEOUT';
    this.statusCode = 504;
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'DATABASE_CONNECTION_ERROR';
  }
}

export class DatabaseQueryError extends DatabaseError {
  constructor(message: string, query?: string, details?: Record<string, unknown>) {
    super(message, { ...details, query });
    this.code = 'DATABASE_QUERY_ERROR';
  }
}

/**
 * Wallet errors
 */
export class WalletError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'WALLET_ERROR', 500, details);
  }
}

export class WalletNotFoundError extends WalletError {
  constructor(address: string, details?: Record<string, unknown>) {
    super(`Wallet ${address} not found`, { ...details, address });
    this.code = 'WALLET_NOT_FOUND';
    this.statusCode = 404;
  }
}

export class WalletInitializationError extends WalletError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'WALLET_INITIALIZATION_ERROR';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AgentMarketError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
  }
}

/**
 * Network errors
 */
export class NetworkError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 500, details);
  }
}

export class ConnectionError extends NetworkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'CONNECTION_ERROR';
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string = 'Request timed out', details?: Record<string, unknown>) {
    super(message, details);
    this.code = 'TIMEOUT';
    this.statusCode = 504;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AgentMarketError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

export class MissingConfigurationError extends ConfigurationError {
  constructor(key: string, details?: Record<string, unknown>) {
    super(`Missing required configuration: ${key}`, { ...details, key });
    this.code = 'MISSING_CONFIGURATION';
  }
}

/**
 * Type guard to check if an error is an AgentMarketError
 */
export function isAgentMarketError(error: unknown): error is AgentMarketError {
  return error instanceof AgentMarketError;
}

/**
 * Type guard for Payment errors
 */
export function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError;
}

/**
 * Type guard for Authentication errors
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard for Validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Convert unknown error to AgentMarketError
 */
export function toAgentMarketError(error: unknown): AgentMarketError {
  if (isAgentMarketError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AgentMarketError(error.message, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  if (typeof error === 'string') {
    return new AgentMarketError(error, 'UNKNOWN_ERROR', 500);
  }

  return new AgentMarketError('An unknown error occurred', 'UNKNOWN_ERROR', 500, {
    error: String(error),
  });
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Get error status code from unknown error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAgentMarketError(error)) {
    return error.statusCode;
  }
  return 500;
}

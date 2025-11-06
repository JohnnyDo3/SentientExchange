import { Transaction } from '../../../src/types/transaction';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidTransaction(): R;
    }
  }
}

/**
 * Custom Jest matcher to validate Transaction objects
 */
export function toBeValidTransaction(received: unknown) {
  const transaction = received as Transaction;

  // Check all required fields exist
  const requiredFields = [
    'id',
    'serviceId',
    'buyer',
    'seller',
    'amount',
    'currency',
    'status',
    'request',
    'timestamp',
  ];

  const missingFields = requiredFields.filter((field) => !(field in transaction));

  if (missingFields.length > 0) {
    return {
      pass: false,
      message: () => `Transaction is missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Validate field types
  if (typeof transaction.id !== 'string') {
    return {
      pass: false,
      message: () => `Transaction id must be a string, got ${typeof transaction.id}`,
    };
  }

  if (typeof transaction.serviceId !== 'string') {
    return {
      pass: false,
      message: () => `Transaction serviceId must be a string, got ${typeof transaction.serviceId}`,
    };
  }

  if (typeof transaction.buyer !== 'string') {
    return {
      pass: false,
      message: () => `Transaction buyer must be a string, got ${typeof transaction.buyer}`,
    };
  }

  if (typeof transaction.seller !== 'string') {
    return {
      pass: false,
      message: () => `Transaction seller must be a string, got ${typeof transaction.seller}`,
    };
  }

  if (typeof transaction.amount !== 'string') {
    return {
      pass: false,
      message: () => `Transaction amount must be a string, got ${typeof transaction.amount}`,
    };
  }

  if (typeof transaction.currency !== 'string') {
    return {
      pass: false,
      message: () => `Transaction currency must be a string, got ${typeof transaction.currency}`,
    };
  }

  // Validate status enum
  const validStatuses = ['pending', 'completed', 'failed'];
  if (!validStatuses.includes(transaction.status)) {
    return {
      pass: false,
      message: () =>
        `Transaction status must be one of ${validStatuses.join(', ')}, got ${transaction.status}`,
    };
  }

  // Validate request object
  if (typeof transaction.request !== 'object' || transaction.request === null) {
    return {
      pass: false,
      message: () => `Transaction request must be an object, got ${typeof transaction.request}`,
    };
  }

  const requestRequiredFields = ['method', 'endpoint', 'payload'];
  const requestMissingFields = requestRequiredFields.filter(
    (field) => !(field in transaction.request)
  );

  if (requestMissingFields.length > 0) {
    return {
      pass: false,
      message: () =>
        `Transaction request is missing required fields: ${requestMissingFields.join(', ')}`,
    };
  }

  // Validate response if present
  if (transaction.response !== undefined) {
    if (typeof transaction.response !== 'object' || transaction.response === null) {
      return {
        pass: false,
        message: () => `Transaction response must be an object, got ${typeof transaction.response}`,
      };
    }

    const responseRequiredFields = ['status', 'data', 'responseTime'];
    const responseMissingFields = responseRequiredFields.filter(
      (field) => !(field in transaction.response!)
    );

    if (responseMissingFields.length > 0) {
      return {
        pass: false,
        message: () =>
          `Transaction response is missing required fields: ${responseMissingFields.join(', ')}`,
      };
    }
  }

  // Validate timestamp format (ISO 8601)
  const timestamp = new Date(transaction.timestamp);
  if (isNaN(timestamp.getTime())) {
    return {
      pass: false,
      message: () => `Transaction timestamp must be a valid ISO 8601 date string`,
    };
  }

  // All validations passed
  return {
    pass: true,
    message: () => `Transaction is valid`,
  };
}

// Add the matcher to Jest
expect.extend({ toBeValidTransaction });

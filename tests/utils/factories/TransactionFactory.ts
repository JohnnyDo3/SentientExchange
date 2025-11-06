import { Transaction, Rating } from '../../../src/types/transaction';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for creating realistic Transaction objects for testing
 */
export class TransactionFactory {
  /**
   * Create a basic transaction with default values
   */
  static create(overrides: Partial<Transaction> = {}): Transaction {
    const now = new Date().toISOString();
    const id = overrides.id || uuidv4();
    const serviceId = overrides.serviceId || uuidv4();

    const defaults: Transaction = {
      id,
      serviceId,
      buyer: '0x1111111111111111111111111111111111111111',
      seller: '0x2222222222222222222222222222222222222222',
      amount: '0.10',
      currency: 'USDC',
      status: 'completed',
      request: {
        method: 'POST',
        endpoint: `https://api.example.com/service/${serviceId}`,
        payload: { test: 'data' },
      },
      response: {
        status: 200,
        data: { result: 'success' },
        responseTime: 250,
      },
      paymentHash: '0x' + 'a'.repeat(64), // Mock transaction hash
      timestamp: now,
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a pending transaction (not yet completed)
   */
  static createPending(overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      status: 'pending',
      response: undefined,
      paymentHash: undefined,
      ...overrides,
    });
  }

  /**
   * Create a failed transaction
   */
  static createFailed(overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      status: 'failed',
      error: 'Payment verification failed',
      response: {
        status: 402,
        data: { error: 'Payment Required' },
        responseTime: 100,
      },
      ...overrides,
    });
  }

  /**
   * Create a completed transaction with successful payment
   */
  static createCompleted(overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      status: 'completed',
      paymentHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      response: {
        status: 200,
        data: { result: 'success' },
        responseTime: 250,
      },
      ...overrides,
    });
  }

  /**
   * Create a transaction for a specific service and buyer
   */
  static createForService(
    serviceId: string,
    buyer: string,
    overrides: Partial<Transaction> = {}
  ): Transaction {
    return TransactionFactory.create({
      serviceId,
      buyer,
      ...overrides,
    });
  }

  /**
   * Create multiple transactions
   */
  static createMany(count: number, factory?: (index: number) => Partial<Transaction>): Transaction[] {
    const transactions: Transaction[] = [];
    for (let i = 0; i < count; i++) {
      const overrides = factory ? factory(i) : {};
      transactions.push(TransactionFactory.create(overrides));
    }
    return transactions;
  }

  /**
   * Create a transaction with a specific amount
   */
  static createWithAmount(amount: string, overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      amount,
      ...overrides,
    });
  }

  /**
   * Create a transaction with custom request payload
   */
  static createWithPayload(
    payload: Record<string, unknown>,
    overrides: Partial<Transaction> = {}
  ): Transaction {
    return TransactionFactory.create({
      request: {
        method: 'POST',
        endpoint: `https://api.example.com/service/${overrides.serviceId || uuidv4()}`,
        payload,
      },
      ...overrides,
    });
  }

  /**
   * Create a high-value transaction
   */
  static createHighValue(overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      amount: '100.00',
      ...overrides,
    });
  }

  /**
   * Create a low-value transaction
   */
  static createLowValue(overrides: Partial<Transaction> = {}): Transaction {
    return TransactionFactory.create({
      amount: '0.01',
      ...overrides,
    });
  }

  /**
   * Create a diverse set of transactions for testing
   */
  static createDiverseSet(serviceId?: string): Transaction[] {
    const sId = serviceId || uuidv4();
    return [
      TransactionFactory.createCompleted({ serviceId: sId, amount: '0.10' }),
      TransactionFactory.createPending({ serviceId: sId, amount: '0.20' }),
      TransactionFactory.createFailed({ serviceId: sId, amount: '0.05' }),
      TransactionFactory.createCompleted({ serviceId: sId, amount: '0.50' }),
      TransactionFactory.createCompleted({ serviceId: sId, amount: '0.03' }),
    ];
  }
}

/**
 * Factory for creating Rating objects for testing
 */
export class RatingFactory {
  /**
   * Create a basic rating with default values
   */
  static create(overrides: Partial<Rating> = {}): Rating {
    const now = new Date().toISOString();
    const id = overrides.id || uuidv4();
    const transactionId = overrides.transactionId || uuidv4();
    const serviceId = overrides.serviceId || uuidv4();

    const defaults: Rating = {
      id,
      transactionId,
      serviceId,
      rater: '0x1111111111111111111111111111111111111111',
      score: 5,
      review: 'Excellent service, highly recommended!',
      timestamp: now,
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create a 5-star rating
   */
  static createExcellent(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      score: 5,
      review: 'Excellent service, highly recommended!',
      ...overrides,
    });
  }

  /**
   * Create a 4-star rating
   */
  static createGood(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      score: 4,
      review: 'Good service, works as expected.',
      ...overrides,
    });
  }

  /**
   * Create a 3-star rating
   */
  static createAverage(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      score: 3,
      review: 'Average service, room for improvement.',
      ...overrides,
    });
  }

  /**
   * Create a 2-star rating
   */
  static createPoor(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      score: 2,
      review: 'Below expectations, had some issues.',
      ...overrides,
    });
  }

  /**
   * Create a 1-star rating
   */
  static createBad(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      score: 1,
      review: 'Very disappointing, would not recommend.',
      ...overrides,
    });
  }

  /**
   * Create a rating without a review
   */
  static createWithoutReview(overrides: Partial<Rating> = {}): Rating {
    return RatingFactory.create({
      review: undefined,
      ...overrides,
    });
  }

  /**
   * Create multiple ratings
   */
  static createMany(count: number, factory?: (index: number) => Partial<Rating>): Rating[] {
    const ratings: Rating[] = [];
    for (let i = 0; i < count; i++) {
      const overrides = factory ? factory(i) : {};
      ratings.push(RatingFactory.create(overrides));
    }
    return ratings;
  }

  /**
   * Create a diverse set of ratings for a service
   */
  static createDiverseSet(serviceId?: string): Rating[] {
    const sId = serviceId || uuidv4();
    return [
      RatingFactory.createExcellent({ serviceId: sId }),
      RatingFactory.createExcellent({ serviceId: sId }),
      RatingFactory.createGood({ serviceId: sId }),
      RatingFactory.createGood({ serviceId: sId }),
      RatingFactory.createAverage({ serviceId: sId }),
      RatingFactory.createPoor({ serviceId: sId }),
    ];
  }

  /**
   * Create ratings for a specific transaction
   */
  static createForTransaction(
    transactionId: string,
    serviceId: string,
    overrides: Partial<Rating> = {}
  ): Rating {
    return RatingFactory.create({
      transactionId,
      serviceId,
      ...overrides,
    });
  }
}

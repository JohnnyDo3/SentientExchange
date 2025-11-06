import { Database } from 'sqlite3';
import { promisify } from 'util';
import { Service } from '../../../src/types/service';
import { Transaction, Rating } from '../../../src/types/transaction';

/**
 * Factory for creating in-memory test databases
 */
export class DatabaseFactory {
  private db: Database | null = null;

  /**
   * Create an in-memory SQLite database
   */
  async createInMemory(): Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = new Database(':memory:', (err) => {
        if (err) {
          reject(err);
        } else {
          this.db = db;
          resolve(db);
        }
      });
    });
  }

  /**
   * Initialize database schema
   */
  async initializeSchema(db: Database): Promise<void> {
    const run = promisify(db.run.bind(db));

    // Services table
    await run(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        pricing TEXT NOT NULL,
        reputation TEXT NOT NULL,
        metadata TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Transactions table
    await run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        serviceId TEXT NOT NULL,
        buyer TEXT NOT NULL,
        seller TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        request TEXT NOT NULL,
        response TEXT,
        paymentHash TEXT,
        error TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Ratings table
    await run(`
      CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        transactionId TEXT NOT NULL,
        serviceId TEXT NOT NULL,
        rater TEXT NOT NULL,
        score INTEGER NOT NULL,
        review TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (serviceId) REFERENCES services(id)
      )
    `);

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider)');
    await run('CREATE INDEX IF NOT EXISTS idx_transactions_serviceId ON transactions(serviceId)');
    await run('CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer)');
    await run('CREATE INDEX IF NOT EXISTS idx_ratings_serviceId ON ratings(serviceId)');
  }

  /**
   * Seed database with a service
   */
  async seedService(db: Database, service: Service): Promise<void> {
    const run = promisify(db.run.bind(db));
    await run(
      `
      INSERT INTO services (
        id, name, description, provider, endpoint, capabilities,
        pricing, reputation, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        service.id,
        service.name,
        service.description,
        service.provider,
        service.endpoint,
        JSON.stringify(service.capabilities),
        JSON.stringify(service.pricing),
        JSON.stringify(service.reputation),
        JSON.stringify(service.metadata),
        service.createdAt,
        service.updatedAt,
      ]
    );
  }

  /**
   * Seed database with multiple services
   */
  async seedServices(db: Database, services: Service[]): Promise<void> {
    for (const service of services) {
      await this.seedService(db, service);
    }
  }

  /**
   * Seed database with a transaction
   */
  async seedTransaction(db: Database, transaction: Transaction): Promise<void> {
    const run = promisify(db.run.bind(db));
    await run(
      `
      INSERT INTO transactions (
        id, serviceId, buyer, seller, amount, currency, status,
        request, response, paymentHash, error, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        transaction.id,
        transaction.serviceId,
        transaction.buyer,
        transaction.seller,
        transaction.amount,
        transaction.currency,
        transaction.status,
        JSON.stringify(transaction.request),
        transaction.response ? JSON.stringify(transaction.response) : null,
        transaction.paymentHash || null,
        transaction.error || null,
        transaction.timestamp,
      ]
    );
  }

  /**
   * Seed database with multiple transactions
   */
  async seedTransactions(db: Database, transactions: Transaction[]): Promise<void> {
    for (const transaction of transactions) {
      await this.seedTransaction(db, transaction);
    }
  }

  /**
   * Seed database with a rating
   */
  async seedRating(db: Database, rating: Rating): Promise<void> {
    const run = promisify(db.run.bind(db));
    await run(
      `
      INSERT INTO ratings (
        id, transactionId, serviceId, rater, score, review, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        rating.id,
        rating.transactionId,
        rating.serviceId,
        rating.rater,
        rating.score,
        rating.review || null,
        rating.timestamp,
      ]
    );
  }

  /**
   * Seed database with multiple ratings
   */
  async seedRatings(db: Database, ratings: Rating[]): Promise<void> {
    for (const rating of ratings) {
      await this.seedRating(db, rating);
    }
  }

  /**
   * Clear all data from the database
   */
  async clearDatabase(db: Database): Promise<void> {
    const run = promisify(db.run.bind(db));
    await run('DELETE FROM ratings');
    await run('DELETE FROM transactions');
    await run('DELETE FROM services');
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Create a fully initialized and seeded test database
   */
  async createSeededDatabase(options: {
    services?: Service[];
    transactions?: Transaction[];
    ratings?: Rating[];
  } = {}): Promise<Database> {
    const db = await this.createInMemory();
    await this.initializeSchema(db);

    if (options.services) {
      await this.seedServices(db, options.services);
    }
    if (options.transactions) {
      await this.seedTransactions(db, options.transactions);
    }
    if (options.ratings) {
      await this.seedRatings(db, options.ratings);
    }

    return db;
  }

  /**
   * Query helper to get all services
   */
  async getAllServices(db: Database): Promise<Service[]> {
    const all = promisify(db.all.bind(db));
    const rows = await all('SELECT * FROM services');
    return rows.map((row: Record<string, string>) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      provider: row.provider,
      endpoint: row.endpoint,
      capabilities: JSON.parse(row.capabilities),
      pricing: JSON.parse(row.pricing),
      reputation: JSON.parse(row.reputation),
      metadata: JSON.parse(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Query helper to get all transactions
   */
  async getAllTransactions(db: Database): Promise<Transaction[]> {
    const all = promisify(db.all.bind(db));
    const rows = await all('SELECT * FROM transactions');
    return rows.map((row: Record<string, string>) => ({
      id: row.id,
      serviceId: row.serviceId,
      buyer: row.buyer,
      seller: row.seller,
      amount: row.amount,
      currency: row.currency,
      status: row.status as 'pending' | 'completed' | 'failed',
      request: JSON.parse(row.request),
      response: row.response ? JSON.parse(row.response) : undefined,
      paymentHash: row.paymentHash || undefined,
      error: row.error || undefined,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Query helper to get all ratings
   */
  async getAllRatings(db: Database): Promise<Rating[]> {
    const all = promisify(db.all.bind(db));
    const rows = await all('SELECT * FROM ratings');
    return rows.map((row: Record<string, string | number>) => ({
      id: row.id as string,
      transactionId: row.transactionId as string,
      serviceId: row.serviceId as string,
      rater: row.rater as string,
      score: row.score as number,
      review: (row.review as string) || undefined,
      timestamp: row.timestamp as string,
    }));
  }
}

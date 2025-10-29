import { Service, ServiceSearchQuery } from '../types';
import { Database } from './database';
import { randomUUID } from 'crypto';

/**
 * Service Registry
 *
 * Manages service listings with in-memory cache and SQLite persistence.
 * Provides CRUD operations, advanced search, and reputation management.
 */

export class ServiceRegistry {
  private db: Database;
  private cache: Map<string, Service> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Initialize the registry by loading all services from database into cache
   */
  async initialize(): Promise<void> {
    const services = await this.db.all<any>('SELECT * FROM services');

    for (const row of services) {
      const service = this.deserializeService(row);
      this.cache.set(service.id, service);
    }
  }

  /**
   * Register a new service in the marketplace
   */
  async registerService(
    service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Service> {
    const newService: Service = {
      id: randomUUID(),
      ...service,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert into database
    await this.db.run(
      `INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newService.id,
        newService.name,
        newService.description,
        newService.provider,
        newService.endpoint,
        JSON.stringify(newService.capabilities),
        JSON.stringify(newService.pricing),
        JSON.stringify(newService.reputation),
        JSON.stringify(newService.metadata),
        newService.createdAt,
        newService.updatedAt,
      ]
    );

    // Update cache
    this.cache.set(newService.id, newService);

    return newService;
  }

  /**
   * Get a service by ID from cache
   */
  async getService(id: string): Promise<Service | undefined> {
    return this.cache.get(id);
  }

  /**
   * Search services with filtering and sorting
   */
  async searchServices(query: ServiceSearchQuery): Promise<Service[]> {
    let results = Array.from(this.cache.values());

    // Filter by capabilities (match if service has ANY of the requested capabilities)
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter((service) =>
        query.capabilities!.some((cap) => service.capabilities.includes(cap))
      );
    }

    // Filter by max price
    if (query.maxPrice) {
      const maxPrice = parseFloat(query.maxPrice.replace('$', ''));
      results = results.filter((service) => {
        const price = parseFloat(service.pricing.perRequest.replace('$', ''));
        return price <= maxPrice;
      });
    }

    // Filter by minimum rating
    if (query.minRating) {
      results = results.filter(
        (service) => service.reputation.rating >= query.minRating!
      );
    }

    // Sort results
    if (query.sortBy === 'price') {
      results.sort((a, b) => {
        const priceA = parseFloat(a.pricing.perRequest.replace('$', ''));
        const priceB = parseFloat(b.pricing.perRequest.replace('$', ''));
        return priceA - priceB;
      });
    } else if (query.sortBy === 'rating') {
      results.sort((a, b) => b.reputation.rating - a.reputation.rating);
    } else if (query.sortBy === 'popularity') {
      results.sort((a, b) => b.reputation.totalJobs - a.reputation.totalJobs);
    }

    return results;
  }

  /**
   * Update service reputation with a new rating
   * Uses weighted average calculation
   */
  async updateReputation(serviceId: string, rating: number): Promise<void> {
    const service = this.cache.get(serviceId);
    if (!service) return;

    // Calculate weighted average: ((currentRating * currentReviews) + newRating) / (currentReviews + 1)
    const currentRating = service.reputation.rating;
    const currentReviews = service.reputation.reviews;
    const newRating =
      (currentRating * currentReviews + rating) / (currentReviews + 1);

    // Update reputation
    service.reputation.rating = Math.round(newRating * 10) / 10; // Round to 1 decimal
    service.reputation.reviews += 1;
    service.updatedAt = new Date().toISOString();

    // Update database
    await this.db.run(
      `UPDATE services SET reputation = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(service.reputation), service.updatedAt, serviceId]
    );

    // Update cache
    this.cache.set(serviceId, service);
  }

  /**
   * Deserialize a database row into a Service object
   */
  private deserializeService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      provider: row.provider,
      endpoint: row.endpoint,
      capabilities: JSON.parse(row.capabilities),
      pricing: JSON.parse(row.pricing),
      reputation: JSON.parse(row.reputation),
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

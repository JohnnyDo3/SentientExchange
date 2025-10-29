import { Service, ServiceSearchQuery } from '../types';
import { Database } from './database';

/**
 * Service Registry
 *
 * Manages service listings with in-memory cache and SQLite persistence.
 * Will be fully implemented in Day 2.
 */

export class ServiceRegistry {
  private db: Database;
  private cache: Map<string, Service> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // TODO: Load services into cache (Day 2)
  }

  async registerService(
    service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Service> {
    // TODO: Register new service (Day 2)
    throw new Error('Not implemented');
  }

  async getService(id: string): Promise<Service | undefined> {
    // TODO: Get service by ID (Day 2)
    return this.cache.get(id);
  }

  async searchServices(query: ServiceSearchQuery): Promise<Service[]> {
    // TODO: Search services (Day 2)
    return [];
  }

  async updateReputation(serviceId: string, rating: number): Promise<void> {
    // TODO: Update service reputation (Day 2)
  }
}

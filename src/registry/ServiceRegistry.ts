import { logger } from '../utils/logger.js';
import { Service, ServiceSearchQuery } from '../types';
import { Database } from './database';
import { randomUUID } from 'crypto';

/**
 * Database row types (matches schema structure with JSON strings)
 */
interface ServiceRow {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  capabilities: string; // JSON string
  pricing: string; // JSON string
  reputation: string; // JSON string
  metadata: string; // JSON string
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

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
   * Get the database instance (for WebSocket server to query transactions)
   */
  public getDatabase(): Database {
    return this.db;
  }

  /**
   * Initialize the registry by loading all active services from database into cache
   */
  async initialize(): Promise<void> {
    // Only load non-deleted services
    const services = await this.db.all<ServiceRow>('SELECT * FROM services WHERE deleted_at IS NULL');

    for (const row of services) {
      const service = this.deserializeService(row);
      this.cache.set(service.id, service);
    }

    logger.info(`✓ ServiceRegistry initialized with ${services.length} active services`);
  }

  /**
   * Register a new service in the marketplace
   */
  async registerService(
    service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy?: string
  ): Promise<Service> {
    const newService: Service = {
      id: randomUUID(),
      ...service,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert into database
    await this.db.run(
      `INSERT INTO services (id, name, description, provider, endpoint, capabilities, pricing, reputation, metadata, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        createdBy || null,
        newService.createdAt,
        newService.updatedAt,
      ]
    );

    // Log audit
    await this.db.logAudit('service', newService.id, 'CREATE', newService, createdBy);

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
   * Get all services from cache
   */
  getAllServices(): Service[] {
    return Array.from(this.cache.values());
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
        const price = parseFloat((service.pricing.perRequest || service.pricing.amount || "0").replace('$', ''));
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
        const priceA = parseFloat((a.pricing.perRequest || a.pricing.amount || "0").replace('$', ''));
        const priceB = parseFloat((b.pricing.perRequest || b.pricing.amount || "0").replace('$', ''));
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
   * Update an existing service
   */
  async updateService(
    id: string,
    updates: Partial<Omit<Service, 'id' | 'createdAt' | 'reputation'>>,
    updatedBy?: string
  ): Promise<Service> {
    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error(`Service not found: ${id}`);
    }

    // Check if service is soft deleted
    const row = await this.db.get<{ deleted_at: string | null }>('SELECT deleted_at FROM services WHERE id = ?', [id]);
    if (row?.deleted_at) {
      throw new Error(`Service has been deleted: ${id}`);
    }

    // Create updated service object
    const updated: Service = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      reputation: existing.reputation, // Preserve reputation (updated via separate method)
      updatedAt: new Date().toISOString(),
    };

    // Update database
    await this.db.run(
      `UPDATE services SET name = ?, description = ?, provider = ?, endpoint = ?,
       capabilities = ?, pricing = ?, metadata = ?, updated_by = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updated.name,
        updated.description,
        updated.provider,
        updated.endpoint,
        JSON.stringify(updated.capabilities),
        JSON.stringify(updated.pricing),
        JSON.stringify(updated.metadata),
        updatedBy || null,
        updated.updatedAt,
        id
      ]
    );

    // Log audit
    await this.db.logAudit('service', id, 'UPDATE', updates, updatedBy);

    // Update cache
    this.cache.set(id, updated);

    return updated;
  }

  /**
   * Soft delete a service (sets deleted_at timestamp)
   */
  async deleteService(id: string, deletedBy?: string): Promise<void> {
    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error(`Service not found: ${id}`);
    }

    const deletedAt = new Date().toISOString();

    // Soft delete in database
    await this.db.run(
      `UPDATE services SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [deletedAt, deletedBy || null, deletedAt, id]
    );

    // Log audit
    await this.db.logAudit('service', id, 'DELETE', { deletedAt }, deletedBy);

    // Remove from cache
    this.cache.delete(id);
  }

  /**
   * Permanently delete a service (hard delete - use with caution)
   */
  async permanentlyDeleteService(id: string): Promise<void> {
    // Delete from database
    await this.db.run('DELETE FROM services WHERE id = ?', [id]);

    // Remove from cache
    this.cache.delete(id);
  }

  /**
   * Restore a soft-deleted service
   */
  async restoreService(id: string, restoredBy?: string): Promise<Service> {
    // Get the service from database (including soft-deleted ones)
    const row = await this.db.get<ServiceRow>('SELECT * FROM services WHERE id = ?', [id]);

    if (!row) {
      throw new Error(`Service not found: ${id}`);
    }

    if (!row.deleted_at) {
      throw new Error(`Service is not deleted: ${id}`);
    }

    const updatedAt = new Date().toISOString();

    // Restore by clearing deleted_at
    await this.db.run(
      `UPDATE services SET deleted_at = NULL, updated_by = ?, updated_at = ? WHERE id = ?`,
      [restoredBy || null, updatedAt, id]
    );

    // Log audit
    await this.db.logAudit('service', id, 'UPDATE', { restored: true }, restoredBy);

    // Reload into cache
    const service = this.deserializeService(row);
    service.updatedAt = updatedAt;
    this.cache.set(id, service);

    return service;
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
  private deserializeService(row: ServiceRow): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      provider: row.provider,
      endpoint: row.endpoint,
      capabilities: JSON.parse(row.capabilities) as string[],
      pricing: JSON.parse(row.pricing) as Service['pricing'],
      reputation: JSON.parse(row.reputation) as Service['reputation'],
      metadata: JSON.parse(row.metadata) as Service['metadata'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

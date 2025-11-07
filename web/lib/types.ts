/**
 * Type definitions for Sentient Exchange
 * Matches backend schema from src/types/service.ts
 */

export interface Service {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  image?: string; // Emoji or URL
  color?: string; // Hex color for branding
  capabilities: string[];
  pricing: {
    perRequest: string;
    currency: string;
    network: string;
  };
  reputation: {
    totalJobs: number;
    successRate: number;
    avgResponseTime: string;
    rating: number;
    reviews: number;
  };
  metadata: {
    apiVersion: string;
    rateLimit?: string;
    maxPayload?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilters {
  capabilities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'rating-asc' | 'rating-desc' | 'name-asc' | 'name-desc';
}

export interface MarketplaceStats {
  totalServices: number;
  totalJobs: number;
  avgRating: number;
  activeServices: number;
}

export interface Transaction {
  id: string;
  serviceId: string;
  buyer: string;
  seller: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

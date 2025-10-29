/**
 * Service listing in AgentMarket marketplace
 */
export interface Service {
  id: string; // UUID
  name: string; // Service name (e.g., "vision-pro")
  description: string; // Human-readable description
  provider: string; // Wallet address of service provider
  endpoint: string; // API endpoint URL (e.g., "https://vision-pro.xyz/analyze")
  capabilities: string[]; // Service capabilities (e.g., ["image-analysis", "ocr"])
  pricing: {
    perRequest: string; // Price per request (e.g., "$0.02")
    currency: string; // Currency (e.g., "USDC")
    network: string; // Blockchain network (e.g., "base-sepolia")
  };
  reputation: {
    totalJobs: number; // Total jobs completed
    successRate: number; // Success rate percentage (0-100)
    avgResponseTime: string; // Average response time (e.g., "3.2s")
    rating: number; // Average rating (0-5)
    reviews: number; // Number of reviews
  };
  metadata: {
    apiVersion: string; // API version (e.g., "v1")
    rateLimit?: string; // Rate limit (e.g., "100/min")
    maxPayload?: string; // Maximum payload size (e.g., "10MB")
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Query parameters for service search
 */
export interface ServiceSearchQuery {
  capabilities?: string[]; // Filter by capabilities
  maxPrice?: string; // Maximum price per request
  minRating?: number; // Minimum rating (0-5)
  sortBy?: 'price' | 'rating' | 'popularity'; // Sort order
}

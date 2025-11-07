/**
 * Service listing in SentientExchange marketplace
 */
export interface Service {
  id: string; // UUID
  status?: 'pending' | 'approved' | 'rejected'; // Service approval status
  name: string; // Service name (e.g., "vision-pro")
  description: string; // Human-readable description
  provider: string; // Wallet address of service provider
  endpoint: string; // API endpoint URL (e.g., "https://vision-pro.xyz/analyze")
  capabilities: string[]; // Service capabilities (e.g., ["image-analysis", "ocr"])
  pricing: {
    perRequest?: string; // Price per request (e.g., "$0.02")
    amount?: string; // Alternative pricing format (e.g., "0.02")
    currency: string; // Currency (e.g., "USDC")
    network?: string; // Blockchain network (e.g., "base-sepolia")
    billingModel?: string; // Billing model (e.g., "per-request")
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
    healthCheckUrl?: string; // Health check endpoint URL (e.g., "https://service.xyz/health")
    walletAddress?: string; // Primary wallet address (EVM)
    paymentAddresses?: Record<string, string>; // Multi-chain payment addresses
    image?: string; // Service icon/emoji
    color?: string; // Brand color
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

/**
 * Helper to get price from service (handles both pricing formats)
 */
export function getServicePrice(service: Service): string {
  return service.pricing.perRequest || service.pricing.amount || '0';
}

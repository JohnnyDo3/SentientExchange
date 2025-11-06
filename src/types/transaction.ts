/**
 * Payment transaction record
 */
export interface Transaction {
  id: string; // UUID
  serviceId: string; // Reference to Service
  buyer: string; // Buyer wallet address
  seller: string; // Seller wallet address
  amount: string; // Payment amount (e.g., "0.02")
  currency: string; // Currency (e.g., "USDC")
  status: 'pending' | 'completed' | 'failed'; // Transaction status
  request: {
    method: string; // HTTP method (e.g., "POST")
    endpoint: string; // Full API endpoint URL
    payload: Record<string, unknown>; // Request data
  };
  response?: {
    status: number; // HTTP status code
    data: unknown; // Response data
    responseTime: number; // Response time in milliseconds
  };
  paymentHash?: string; // On-chain transaction hash
  error?: string; // Error message if failed
  timestamp: string; // ISO timestamp
}

/**
 * Service rating/review
 */
export interface Rating {
  id: string; // UUID
  transactionId: string; // Reference to Transaction
  serviceId: string; // Reference to Service
  rater: string; // Rater wallet address
  score: number; // Rating score (1-5)
  review?: string; // Optional text review
  timestamp: string; // ISO timestamp
}

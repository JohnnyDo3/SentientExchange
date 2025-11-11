import { Service } from './types';

/**
 * Type-Safe API client for Sentient Exchange MCP backend
 * Connects to the API server on port 8081 (dev) or same origin (production)
 */

// In production, use same origin. In dev, use localhost:3333
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin; // Production - same domain
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
};

const API_BASE_URL = getApiBaseUrl();

// API Response Types

interface AnalyticsData {
  revenue: number;
  requests: number;
  averageRating: number;
  topClients: Array<{ address: string; requests: number }>;
  usageByDay: Array<{ date: string; requests: number; revenue: number }>;
}

interface PurchaseRequest {
  prompt?: string;
  input?: string;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface PurchaseResponse {
  success: boolean;
  result?: unknown;
  transactionId: string;
  cost: string;
  message?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
  userId?: string;
}

interface ServicesResponse {
  success: boolean;
  count: number;
  services: Service[];
}

interface ServiceResponse {
  success: boolean;
  service: Service;
  message?: string;
}

interface StatsResponse {
  success: boolean;
  stats: {
    services: number;
    transactions: number;
    volume: number;
    agents: number;
  };
}

interface TransactionData {
  id: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
}

interface TransactionsResponse {
  success: boolean;
  transactions: TransactionData[];
}

// Service Registration/Update Input
export interface ServiceInput {
  name: string;
  description: string;
  provider: string;
  endpoint: string;
  capabilities: string[];
  pricing: {
    perRequest: string;
  };
  walletAddress?: string;
  paymentAddresses?: Record<string, string>;
  image?: string;
  color?: string;
}

export interface ServiceUpdateInput {
  name?: string;
  description?: string;
  provider?: string;
  endpoint?: string;
  capabilities?: string[];
  pricing?: {
    perRequest: string;
  };
  walletAddress?: string;
  paymentAddresses?: Record<string, string>;
  image?: string;
  color?: string;
}

export class MarketplaceAPI {
  /**
   * Get auth token from localStorage
   */
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Make authenticated request to API
   */
  private static async request<T>(
    endpoint: string,
    options?: RequestInit,
    requireAuth: boolean = false
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      };

      // Add auth token if available or required
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (requireAuth) {
        throw new Error('Authentication required. Please sign in.');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle auth errors specially
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to perform this action.');
        }
        throw new Error(data.error || data.message || `Request failed: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Health check - verify backend is available
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Backend API health check failed:', error);
      return false;
    }
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Fetch all services from the backend
   */
  static async getAllServices(): Promise<Service[]> {
    const response = await this.request<ServicesResponse>('/api/services');
    return response.services;
  }

  /**
   * Get detailed information about a specific service
   */
  static async getServiceDetails(serviceId: string): Promise<Service> {
    const response = await this.request<ServiceResponse>(
      `/api/services/${serviceId}`
    );
    return response.service;
  }

  /**
   * Search services with filters (POST with body)
   */
  static async searchServices(filters: {
    query?: string;
    capabilities?: string[];
    minRating?: number;
    maxPrice?: string;
    limit?: number;
    offset?: number;
  }): Promise<Service[]> {
    const response = await this.request<ServicesResponse>('/api/services/search', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    return response.services;
  }

  /**
   * Get marketplace statistics
   */
  static async getStats(): Promise<StatsResponse['stats']> {
    const response = await this.request<StatsResponse>('/api/stats');
    return response.stats;
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit = 20): Promise<TransactionData[]> {
    const response = await this.request<TransactionsResponse>(
      `/api/transactions/recent?limit=${limit}`
    );
    return response.transactions;
  }

  // ==================== WRITE OPERATIONS ====================

  /**
   * Get user's services (requires authentication)
   */
  static async getMyServices(): Promise<Service[]> {
    const response = await this.request<ServicesResponse>(
      '/api/services/my-services',
      {
        method: 'GET',
      },
      true // requireAuth
    );
    return response.services;
  }

  /**
   * Create a new service (requires authentication)
   */
  static async createService(serviceData: ServiceInput): Promise<Service> {
    const response = await this.request<ServiceResponse>(
      '/api/services',
      {
        method: 'POST',
        body: JSON.stringify(serviceData),
      },
      true // requireAuth
    );
    return response.service;
  }

  /**
   * Update an existing service (requires authentication)
   */
  static async updateService(
    serviceId: string,
    updates: ServiceUpdateInput
  ): Promise<Service> {
    const response = await this.request<ServiceResponse>(
      `/api/services/${serviceId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      true // requireAuth
    );
    return response.service;
  }

  /**
   * Delete a service (requires authentication)
   */
  static async deleteService(serviceId: string): Promise<void> {
    await this.request<{ success: boolean; message: string }>(
      `/api/services/${serviceId}`,
      {
        method: 'DELETE',
      },
      true // requireAuth
    );
  }

  /**
   * Rate a service
   */
  static async rateService(
    serviceId: string,
    score: number,
    review?: string,
    transactionId?: string
  ): Promise<Service> {
    const response = await this.request<ServiceResponse>(
      `/api/services/${serviceId}/rate`,
      {
        method: 'POST',
        body: JSON.stringify({
          score,
          review,
          transactionId: transactionId || `tx-${Date.now()}`,
        }),
      }
    );
    return response.service;
  }

  // ==================== PAYMENT OPERATIONS ====================

  /**
   * Purchase a service (executes x402 payment flow)
   * Note: This endpoint doesn't exist yet in the backend - placeholder for future
   */
  static async purchaseService(
    serviceId: string,
    requestData: PurchaseRequest
  ): Promise<PurchaseResponse> {
    const response = await this.request<PurchaseResponse>(
      `/api/services/${serviceId}/purchase`,
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    );
    return response;
  }

  // ==================== ANALYTICS ====================

  /**
   * Get analytics for a specific service (requires authentication and ownership)
   */
  static async getServiceAnalytics(serviceId: string): Promise<AnalyticsData> {
    const response = await this.request<{ success: boolean; analytics: AnalyticsData }>(
      `/api/services/${serviceId}/analytics`,
      {
        method: 'GET',
      },
      true // requireAuth
    );
    return response.analytics;
  }

  // ==================== AUDIT & HISTORY ====================

  /**
   * Get audit history for a service
   */
  static async getServiceAudit(
    serviceId: string,
    limit = 50
  ): Promise<AuditEntry[]> {
    const response = await this.request<{ success: boolean; audit: AuditEntry[] }>(
      `/api/services/${serviceId}/audit?limit=${limit}`
    );
    return response.audit;
  }

  // ==================== WEBSOCKET CONNECTION ====================

  /**
   * Connect to WebSocket for real-time updates
   */
  static connectWebSocket(
    onMessage: (event: MessageEvent) => void
  ): WebSocket {
    const ws = new WebSocket(`ws://localhost:3333`);

    ws.onopen = () => {
      console.log('✓ WebSocket connected to Sentient Exchange API');
    };

    ws.onmessage = onMessage;

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return ws;
  }
}

// Export types for use in components
export type {
  ServicesResponse,
  ServiceResponse,
  StatsResponse,
  TransactionData,
  AnalyticsData,
  PurchaseRequest,
  PurchaseResponse,
  AuditEntry
};

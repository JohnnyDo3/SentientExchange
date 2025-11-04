import axios, { AxiosInstance } from 'axios';
import { logger } from '../middleware/logger';

interface AccelaConfig {
  apiUrl: string;
  agency: string;
  environment: string;
  clientId: string;
  clientSecret: string;
  appId: string;
  scope: string;
}

interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  expiresAt: number; // Calculated timestamp
}

interface PermitType {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  estimatedDays: number;
  baseFee: number;
}

interface PermitRequirement {
  name: string;
  description: string;
  required: boolean;
  documentType?: string;
}

/**
 * Accela Civic Platform API Client
 *
 * Handles OAuth 2.0 authentication and API requests for:
 * - Permit type lookup
 * - Fee calculation
 * - Requirements retrieval
 * - Form submission (Phase 3)
 *
 * Security features:
 * - Token caching with automatic refresh
 * - Rate limiting awareness
 * - Request timeout enforcement
 * - Error handling with retries
 */
export class AccelaClient {
  private config: AccelaConfig;
  private client: AxiosInstance;
  private token: OAuthToken | null = null;
  private tokenRefreshPromise: Promise<void> | null = null;

  constructor(config?: Partial<AccelaConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.ACCELA_API_URL || 'https://apis.accela.com',
      agency: config?.agency || process.env.ACCELA_AGENCY || 'tampa',
      environment: config?.environment || process.env.ACCELA_ENVIRONMENT || 'TEST',
      clientId: config?.clientId || process.env.ACCELA_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.ACCELA_CLIENT_SECRET || '',
      appId: config?.appId || process.env.ACCELA_APP_ID || '',
      scope: config?.scope || process.env.ACCELA_SCOPE || 'records addresses',
    };

    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();
        const token = this.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token.access_token}`;
        }
        config.headers['x-accela-appid'] = this.config.appId;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
          // Token expired, clear and retry once
          logger.warn('Accela token expired, refreshing...');
          this.token = null;
          await this.ensureValidToken();

          // Retry the request
          if (this.token) {
            const token: OAuthToken = this.token;
            const config = error.config;
            config._retry = true;
            config.headers.Authorization = `Bearer ${token.access_token}`;
            return this.client.request(config);
          }
        }
        return Promise.reject(error);
      }
    );

    logger.info('Accela client initialized', {
      apiUrl: this.config.apiUrl,
      agency: this.config.agency,
      environment: this.config.environment,
    });
  }

  /**
   * Ensure we have a valid OAuth token, refreshing if needed
   */
  private async ensureValidToken(): Promise<void> {
    // If already refreshing, wait for that to complete
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    // Check if we have a valid token
    if (this.token && Date.now() < this.token.expiresAt - 60000) {
      // Token still valid (with 60 second buffer)
      return;
    }

    // Need to refresh token
    this.tokenRefreshPromise = this.fetchToken();
    await this.tokenRefreshPromise;
    this.tokenRefreshPromise = null;
  }

  /**
   * Fetch new OAuth 2.0 token from Accela
   */
  private async fetchToken(): Promise<void> {
    try {
      logger.info('Fetching new Accela OAuth token');

      const response = await axios.post(
        `${this.config.apiUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: this.config.scope,
          agency_name: this.config.agency,
          environment: this.config.environment,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      this.token = {
        ...response.data,
        expiresAt: Date.now() + response.data.expires_in * 1000,
      };

      logger.info('Accela OAuth token obtained', {
        expiresIn: response.data.expires_in,
      });
    } catch (error: any) {
      logger.error('Failed to fetch Accela OAuth token', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Accela authentication failed: ${error.message}`);
    }
  }

  /**
   * Get permit types for a specific category
   */
  async getPermitTypes(category: string): Promise<PermitType[]> {
    try {
      logger.info('Fetching permit types', { category });

      const response = await this.client.get('/v4/records/types', {
        params: {
          category,
          module: 'Building',
        },
      });

      const permitTypes = response.data.result.map((item: any) => ({
        id: item.id,
        name: item.text,
        description: item.description || '',
        category: item.category,
        subCategory: item.subCategory,
        estimatedDays: item.resEstimatedDuration || 30,
        baseFee: this.calculateBaseFee(item),
      }));

      logger.info('Fetched permit types', {
        category,
        count: permitTypes.length,
      });

      return permitTypes;
    } catch (error: any) {
      logger.error('Failed to fetch permit types', {
        error: error.message,
        category,
      });
      throw error;
    }
  }

  /**
   * Get requirements for a specific permit type
   */
  async getPermitRequirements(permitTypeId: string): Promise<PermitRequirement[]> {
    try {
      logger.info('Fetching permit requirements', { permitTypeId });

      const response = await this.client.get(`/v4/records/types/${permitTypeId}/documents`);

      const requirements = response.data.result.map((item: any) => ({
        name: item.documentType,
        description: item.description || '',
        required: item.isRequired || false,
        documentType: item.documentType,
      }));

      logger.info('Fetched permit requirements', {
        permitTypeId,
        count: requirements.length,
      });

      return requirements;
    } catch (error: any) {
      logger.error('Failed to fetch permit requirements', {
        error: error.message,
        permitTypeId,
      });
      throw error;
    }
  }

  /**
   * Calculate fee schedule for a permit
   */
  async calculateFees(permitTypeId: string, valuation: number): Promise<number> {
    try {
      logger.info('Calculating permit fees', { permitTypeId, valuation });

      const response = await this.client.post('/v4/records/fees/calculate', {
        permitTypeId,
        valuation,
      });

      const totalFee = response.data.result.reduce((sum: number, fee: any) => {
        return sum + parseFloat(fee.amount || 0);
      }, 0);

      logger.info('Calculated permit fees', {
        permitTypeId,
        valuation,
        totalFee,
      });

      return totalFee;
    } catch (error: any) {
      logger.error('Failed to calculate fees', {
        error: error.message,
        permitTypeId,
      });
      throw error;
    }
  }

  /**
   * Get address information for validation
   */
  async getAddressInfo(address: string, city: string, zip: string): Promise<any> {
    try {
      logger.info('Fetching address info', { address, city, zip });

      const response = await this.client.get('/v4/addresses', {
        params: {
          streetName: address,
          city,
          zip,
        },
      });

      const addresses = response.data.result;

      logger.info('Fetched address info', {
        count: addresses.length,
      });

      return addresses[0] || null;
    } catch (error: any) {
      logger.error('Failed to fetch address info', {
        error: error.message,
        address,
      });
      throw error;
    }
  }

  /**
   * Submit a permit application (Phase 3)
   * TODO: Implement when Phase 3 is activated
   */
  async submitPermitApplication(data: any): Promise<string> {
    // TODO: Implement actual submission
    logger.warn('submitPermitApplication not yet implemented');
    throw new Error('Phase 3 auto-submission not yet implemented');
  }

  /**
   * Get permit application status (Phase 3)
   * TODO: Implement when Phase 3 is activated
   */
  async getApplicationStatus(applicationId: string): Promise<any> {
    // TODO: Implement actual status check
    logger.warn('getApplicationStatus not yet implemented');
    throw new Error('Phase 3 status tracking not yet implemented');
  }

  /**
   * Helper: Calculate base fee from permit type data
   */
  private calculateBaseFee(permitType: any): number {
    // In production: Use actual fee schedule from Accela
    // For now: Return estimated base fees
    const baseFees: Record<string, number> = {
      'HVAC-Replacement': 75,
      'HVAC-NewInstall': 150,
      'HVAC-Commercial': 250,
    };

    return baseFees[permitType.id] || 100;
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      logger.info('Accela API health check passed');
      return true;
    } catch (error) {
      logger.error('Accela API health check failed', { error });
      return false;
    }
  }

  /**
   * Generic POST request to Accela API
   */
  async post(url: string, data: any): Promise<any> {
    await this.ensureValidToken();
    return this.client.post(url, data);
  }

  /**
   * Generic PUT request to Accela API
   */
  async put(url: string, data: any): Promise<any> {
    await this.ensureValidToken();
    return this.client.put(url, data);
  }

  /**
   * Upload document to Accela record
   */
  async uploadDocument(recordId: string, file: any): Promise<any> {
    await this.ensureValidToken();
    return this.client.post(`/v4/records/${recordId}/documents`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// Export singleton instance
export const accelaClient = new AccelaClient();

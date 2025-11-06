import axios, { AxiosError } from 'axios';
import type { Service } from '../types';

export interface HealthCheckResult {
  serviceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  details?: {
    status?: string;
    healthy?: boolean;
    [key: string]: unknown;
  };
  error?: string;
}

export interface HealthCheckOptions {
  timeout?: number;
  parallel?: boolean;
  maxConcurrent?: number;
}

/**
 * Check health of a single service
 */
export async function checkServiceHealth(
  service: Service,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Try /health endpoint
    const healthUrl = `${service.endpoint}/health`;
    const response = await axios.get(healthUrl, {
      timeout,
      validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
    });

    const responseTime = Date.now() - startTime;

    // Check if response indicates healthy
    if (response.status === 200) {
      const isHealthy =
        response.data?.status === 'healthy' ||
        response.data?.status === 'ok' ||
        response.data?.healthy === true;

      return {
        serviceId: service.id,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        details: response.data,
      };
    }

    return {
      serviceId: service.id,
      status: 'unhealthy',
      responseTime,
      error: `Unexpected status code: ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Timeout
      if (axiosError.code === 'ECONNABORTED') {
        return {
          serviceId: service.id,
          status: 'unhealthy',
          responseTime,
          error: 'Health check timeout',
        };
      }

      // Connection refused / unreachable
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return {
          serviceId: service.id,
          status: 'unhealthy',
          responseTime,
          error: 'Service unreachable',
        };
      }

      return {
        serviceId: service.id,
        status: 'unhealthy',
        responseTime,
        error: axiosError.message,
      };
    }

    return {
      serviceId: service.id,
      status: 'unknown',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check health of multiple services in parallel
 */
export async function checkMultipleServicesHealth(
  services: Service[],
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult[]> {
  const { timeout = 5000, parallel = true, maxConcurrent = 10 } = options;

  if (!parallel) {
    // Sequential checks
    const results: HealthCheckResult[] = [];
    for (const service of services) {
      const result = await checkServiceHealth(service, timeout);
      results.push(result);
    }
    return results;
  }

  // Parallel checks with concurrency limit
  const results: HealthCheckResult[] = [];
  const chunks: Service[][] = [];

  // Split into chunks
  for (let i = 0; i < services.length; i += maxConcurrent) {
    chunks.push(services.slice(i, i + maxConcurrent));
  }

  // Process chunks
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((service) => checkServiceHealth(service, timeout))
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Filter services by health status
 */
export function filterHealthyServices(
  services: Service[],
  healthResults: HealthCheckResult[]
): {
  healthy: Service[];
  unhealthy: Service[];
  unknown: Service[];
} {
  const healthMap = new Map(healthResults.map((r) => [r.serviceId, r]));

  const healthy: Service[] = [];
  const unhealthy: Service[] = [];
  const unknown: Service[] = [];

  for (const service of services) {
    const result = healthMap.get(service.id);
    if (!result) {
      unknown.push(service);
    } else if (result.status === 'healthy') {
      healthy.push(service);
    } else if (result.status === 'unhealthy') {
      unhealthy.push(service);
    } else {
      unknown.push(service);
    }
  }

  return { healthy, unhealthy, unknown };
}

/**
 * Rank services by health, rating, and price
 */
export function rankServices(
  services: Service[],
  healthResults: HealthCheckResult[],
  preferenceWeights: {
    health?: number;
    rating?: number;
    price?: number;
    responseTime?: number;
  } = {}
): Service[] {
  const weights = {
    health: preferenceWeights.health ?? 0.4,
    rating: preferenceWeights.rating ?? 0.3,
    price: preferenceWeights.price ?? 0.2,
    responseTime: preferenceWeights.responseTime ?? 0.1,
  };

  const healthMap = new Map(healthResults.map((r) => [r.serviceId, r]));

  // Calculate scores
  const scoredServices = services.map((service) => {
    const healthResult = healthMap.get(service.id);

    // Health score (0-1)
    let healthScore = 0;
    if (healthResult?.status === 'healthy') {
      healthScore = 1;
    } else if (healthResult?.status === 'unknown') {
      healthScore = 0.5;
    }

    // Rating score (0-1)
    const ratingScore = service.reputation?.rating
      ? service.reputation.rating / 5
      : 0.5;

    // Price score (0-1, lower is better)
    // Normalize to typical range of $0.01 - $10.00
    const priceNum = parseFloat((service.pricing.perRequest || service.pricing.amount || '0').replace('$', ''));
    const priceScore = Math.max(0, 1 - priceNum / 10);

    // Response time score (0-1, lower is better)
    // Normalize to typical range of 0-10000ms
    const responseTimeScore = healthResult?.responseTime
      ? Math.max(0, 1 - healthResult.responseTime / 10000)
      : 0.5;

    // Weighted total
    const totalScore =
      healthScore * weights.health +
      ratingScore * weights.rating +
      priceScore * weights.price +
      responseTimeScore * weights.responseTime;

    return {
      service,
      score: totalScore,
      breakdown: {
        health: healthScore,
        rating: ratingScore,
        price: priceScore,
        responseTime: responseTimeScore,
      },
    };
  });

  // Sort by score (descending)
  scoredServices.sort((a, b) => b.score - a.score);

  return scoredServices.map((s) => s.service);
}

import axios from 'axios';
import { ServiceRegistry } from '../registry/ServiceRegistry.js';
import { Database } from '../registry/database.js';
import { logger } from '../utils/logger.js';

/**
 * Health Monitor
 *
 * Periodically checks the health of all approved services and updates their status.
 * - Tests health check URLs if provided
 * - Falls back to testing main endpoint
 * - Records health check results in database
 * - Updates service status if unhealthy
 */

export interface HealthCheckResult {
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  statusCode?: number;
  error?: string;
  checkedAt: number;
}

export class HealthMonitor {
  private registry: ServiceRegistry;
  private db: Database;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(registry: ServiceRegistry, db: Database) {
    this.registry = registry;
    this.db = db;
  }

  /**
   * Start the health monitoring cron job
   * @param intervalMinutes - How often to check (default: 5 minutes)
   */
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      logger.warn('Health monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`🏥 Health monitor started (checking every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runHealthChecks();

    // Then run on interval
    const intervalMs = intervalMinutes * 60 * 1000;
    this.checkInterval = setInterval(() => {
      this.runHealthChecks();
    }, intervalMs);
  }

  /**
   * Stop the health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('🏥 Health monitor stopped');
  }

  /**
   * Run health checks for all approved services
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    logger.info('🏥 Running health checks for all approved services...');

    const services = this.registry.getAllServices();
    const approvedServices = services.filter((s: any) => s.status === 'approved');

    logger.info(`Found ${approvedServices.length} approved services to check`);

    const results: HealthCheckResult[] = [];

    for (const service of approvedServices) {
      const result = await this.checkServiceHealth(service);
      results.push(result);

      // Record health check in database
      await this.recordHealthCheck(result);

      // Update service status if unhealthy
      if (result.status === 'unhealthy') {
        await this.handleUnhealthyService(service, result);
      }
    }

    const healthy = results.filter(r => r.status === 'healthy').length;
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;

    logger.info(`✓ Health check complete: ${healthy} healthy, ${degraded} degraded, ${unhealthy} unhealthy`);

    return results;
  }

  /**
   * Check health of a single service
   */
  async checkServiceHealth(service: any): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const serviceId = service.id;
    const serviceName = service.name;

    try {
      // Use health check URL if provided, otherwise use main endpoint
      const checkUrl = (service as any).health_check_url || service.endpoint;

      logger.debug(`Checking health: ${serviceName} at ${checkUrl}`);

      const response = await axios.get(checkUrl, {
        timeout: 10000, // 10 second timeout
        validateStatus: () => true, // Don't throw on any status
        headers: {
          'User-Agent': 'AgentMarket-HealthMonitor/1.0',
        },
      });

      const responseTime = Date.now() - startTime;

      // Determine health status based on response
      let status: 'healthy' | 'unhealthy' | 'degraded';

      if (response.status >= 200 && response.status < 300) {
        status = 'healthy';
      } else if (response.status >= 500) {
        status = 'unhealthy';
      } else {
        status = 'degraded';
      }

      // Slow response times are degraded
      if (responseTime > 5000 && status === 'healthy') {
        status = 'degraded';
      }

      logger.debug(`${serviceName}: ${status} (${response.status}, ${responseTime}ms)`);

      return {
        serviceId,
        serviceName,
        status,
        responseTime,
        statusCode: response.status,
        checkedAt: Date.now(),
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error(`Health check failed for ${serviceName}:`, error.message);

      return {
        serviceId,
        serviceName,
        status: 'unhealthy',
        responseTime,
        error: error.message || 'Request failed',
        checkedAt: Date.now(),
      };
    }
  }

  /**
   * Record health check result in database
   */
  private async recordHealthCheck(result: HealthCheckResult): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO service_health_checks (
          service_id, status, response_time, status_code, error, checked_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.serviceId,
          result.status,
          result.responseTime,
          result.statusCode || null,
          result.error || null,
          result.checkedAt,
        ]
      );
    } catch (error: any) {
      logger.error(`Failed to record health check for ${result.serviceName}:`, error);
    }
  }

  /**
   * Handle unhealthy service
   * - Check recent health check history
   * - If consistently unhealthy, mark service as degraded
   */
  private async handleUnhealthyService(service: any, result: HealthCheckResult): Promise<void> {
    try {
      // Get last 5 health checks for this service
      const recentChecks = await this.db.all<any>(
        `SELECT status FROM service_health_checks
         WHERE service_id = ?
         ORDER BY checked_at DESC
         LIMIT 5`,
        [service.id]
      );

      // If all recent checks are unhealthy, log warning
      const allUnhealthy = recentChecks.every((check) => check.status === 'unhealthy');

      if (allUnhealthy && recentChecks.length >= 3) {
        logger.warn(`⚠️  Service "${service.name}" has failed ${recentChecks.length} consecutive health checks`);

        // TODO: In production, you might want to:
        // - Send notification to service owner
        // - Update service status to 'degraded' or 'inactive'
        // - Alert admins
      }

    } catch (error: any) {
      logger.error(`Failed to handle unhealthy service ${service.name}:`, error);
    }
  }

  /**
   * Get health check history for a service
   */
  async getHealthHistory(serviceId: string, limit: number = 100): Promise<any[]> {
    try {
      const history = await this.db.all<any>(
        `SELECT * FROM service_health_checks
         WHERE service_id = ?
         ORDER BY checked_at DESC
         LIMIT ?`,
        [serviceId, limit]
      );

      return history;
    } catch (error: any) {
      logger.error(`Failed to get health history for ${serviceId}:`, error);
      return [];
    }
  }

  /**
   * Get overall health statistics
   */
  async getHealthStats(): Promise<{
    totalServices: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    avgResponseTime: number;
  }> {
    try {
      // Get most recent health check for each service
      const latestChecks = await this.db.all<any>(
        `SELECT DISTINCT service_id, status, response_time
         FROM service_health_checks h1
         WHERE checked_at = (
           SELECT MAX(checked_at)
           FROM service_health_checks h2
           WHERE h2.service_id = h1.service_id
         )`
      );

      const healthy = latestChecks.filter(c => c.status === 'healthy').length;
      const degraded = latestChecks.filter(c => c.status === 'degraded').length;
      const unhealthy = latestChecks.filter(c => c.status === 'unhealthy').length;

      const avgResponseTime = latestChecks.length > 0
        ? latestChecks.reduce((sum, c) => sum + c.response_time, 0) / latestChecks.length
        : 0;

      return {
        totalServices: latestChecks.length,
        healthy,
        degraded,
        unhealthy,
        avgResponseTime: Math.round(avgResponseTime),
      };

    } catch (error: any) {
      logger.error('Failed to get health stats:', error);
      return {
        totalServices: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        avgResponseTime: 0,
      };
    }
  }
}

/**
 * ServiceManager - Manages lifecycle of x402 services for E2E testing
 *
 * Starts real services (sentiment-analyzer, etc.) on dynamic ports,
 * waits for health checks, and cleans up after tests.
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export interface ServiceConfig {
  name: string;
  directory: string;
  defaultPort: number;
  env?: Record<string, string>;
}

export interface RunningService {
  name: string;
  port: number;
  url: string;
  process: ChildProcess;
  walletAddress: string;
}

export class ServiceManager {
  private runningServices: Map<string, RunningService> = new Map();

  /**
   * Start a service and wait for it to be healthy
   */
  async startService(config: ServiceConfig): Promise<RunningService> {
    console.log(`🚀 Starting ${config.name}...`);

    // Find available port
    const port = await this.findAvailablePort(config.defaultPort);

    // Build service directory path
    const serviceDir = path.resolve(process.cwd(), config.directory);

    // Prepare environment
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'error', // Quiet during tests
      ...config.env
    };

    // Start service process
    const serviceProcess = spawn('npm', ['run', 'dev'], {
      cwd: serviceDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: false
    });

    // Capture output for debugging
    let output = '';
    serviceProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    serviceProcess.stderr?.on('data', (data) => {
      const str = data.toString();
      // Only log actual errors, not info logs
      if (str.includes('ERROR') || str.includes('Error:')) {
        console.error(`${config.name} error:`, str);
      }
    });

    // Handle process errors
    serviceProcess.on('error', (error) => {
      console.error(`Failed to start ${config.name}:`, error);
      throw new Error(`Failed to start ${config.name}: ${error.message}`);
    });

    const url = `http://localhost:${port}`;
    const walletAddress = env.WALLET_ADDRESS || 'DeDDFd3Fr2fdsC4Wi2Hi7MxbyRHokst3jcQ9L2V1nje3';

    const runningService: RunningService = {
      name: config.name,
      port,
      url,
      process: serviceProcess,
      walletAddress
    };

    this.runningServices.set(config.name, runningService);

    // Wait for service to be healthy
    await this.waitForHealthy(runningService);

    console.log(`✅ ${config.name} started at ${url}`);
    return runningService;
  }

  /**
   * Wait for service health check to pass
   */
  private async waitForHealthy(
    service: RunningService,
    timeoutMs: number = 30000,
    intervalMs: number = 500
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await axios.get(`${service.url}/health`, {
          timeout: 2000,
          validateStatus: () => true // Accept any status
        });

        if (response.status === 200) {
          console.log(`  ✓ Health check passed for ${service.name}`);
          return;
        }
      } catch (error: any) {
        // Service not ready yet, continue waiting
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          await this.sleep(intervalMs);
          continue;
        }

        // Other errors - log but keep trying
        console.log(`  ⏳ Waiting for ${service.name}... (${error.message})`);
      }

      await this.sleep(intervalMs);
    }

    // Timeout - collect diagnostic info
    throw new Error(
      `Timeout waiting for ${service.name} to be healthy after ${timeoutMs}ms. ` +
      `Check that the service can start successfully.`
    );
  }

  /**
   * Stop a running service
   */
  async stopService(name: string): Promise<void> {
    const service = this.runningServices.get(name);
    if (!service) {
      console.warn(`Service ${name} not found in running services`);
      return;
    }

    console.log(`🛑 Stopping ${name}...`);

    // Kill process
    try {
      if (service.process.pid) {
        process.kill(service.process.pid, 'SIGTERM');

        // Wait for graceful shutdown
        await this.sleep(1000);

        // Force kill if still alive
        if (!service.process.killed) {
          process.kill(service.process.pid, 'SIGKILL');
        }
      }
    } catch (error: any) {
      // Process may already be dead
      if (error.code !== 'ESRCH') {
        console.error(`Error stopping ${name}:`, error);
      }
    }

    this.runningServices.delete(name);
    console.log(`✅ ${name} stopped`);
  }

  /**
   * Stop all running services
   */
  async stopAll(): Promise<void> {
    console.log('\n🧹 Cleaning up services...');

    const services = Array.from(this.runningServices.keys());
    await Promise.all(services.map(name => this.stopService(name)));

    console.log('✅ All services stopped\n');
  }

  /**
   * Get info about a running service
   */
  getService(name: string): RunningService | undefined {
    return this.runningServices.get(name);
  }

  /**
   * Check if a service is running
   */
  isRunning(name: string): boolean {
    return this.runningServices.has(name);
  }

  /**
   * Find an available port starting from a base port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    // For testing, just use the start port + random offset
    // In production, you'd check actual port availability
    const offset = Math.floor(Math.random() * 1000);
    return startPort + offset;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for test suites
 */
export const serviceManager = new ServiceManager();

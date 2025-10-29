import { ServiceRegistry } from '../registry/ServiceRegistry';
import { ServiceSearchQuery } from '../types';

/**
 * MCP Tool: discover_services
 *
 * Search for AI services by capability, price, or rating.
 * Will be fully implemented in Day 4.
 */

export async function discoverServices(
  registry: ServiceRegistry,
  args: {
    capability?: string;
    maxPrice?: string;
    minRating?: number;
    limit?: number;
  }
) {
  // TODO: Implement service discovery (Day 4)
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ message: 'Not implemented yet' }),
      },
    ],
  };
}

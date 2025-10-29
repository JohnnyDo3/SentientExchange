import { ServiceRegistry } from '../registry/ServiceRegistry';
import { Database } from '../registry/database';

/**
 * MCP Tool: rate_service
 *
 * Submit ratings for completed transactions.
 * Will be fully implemented in Day 4.
 */

export async function rateService(
  registry: ServiceRegistry,
  db: Database,
  args: {
    transactionId: string;
    score: number;
    review?: string;
  }
) {
  // TODO: Implement service rating (Day 4)
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ message: 'Not implemented yet' }),
      },
    ],
  };
}

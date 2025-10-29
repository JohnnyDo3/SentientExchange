import { ServiceRegistry } from '../registry/ServiceRegistry';

/**
 * MCP Tool: get_service_details
 *
 * Get detailed information about a specific service.
 * Will be fully implemented in Day 4.
 */

export async function getServiceDetails(
  registry: ServiceRegistry,
  args: { serviceId: string }
) {
  // TODO: Implement get service details (Day 4)
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ message: 'Not implemented yet' }),
      },
    ],
  };
}

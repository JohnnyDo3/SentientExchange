import { logger } from '../utils/logger';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';

/**
 * Arguments for list_all_services tool
 */
export interface ListAllServicesArgs {
  limit?: number;
}

/**
 * Validation schema for list_all_services
 */
const listAllServicesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50).description('Maximum number of services to return')
});

/**
 * List all available services (no filtering)
 *
 * @param registry - Service registry instance
 * @param args - Optional limit parameter
 * @returns MCP response with all services
 *
 * @example
 * const result = await listAllServices(registry, {
 *   limit: 25
 * });
 */
export async function listAllServices(
  registry: ServiceRegistry,
  args: ListAllServicesArgs = {}
) {
  try {
    // Step 1: Validate input
    const { error, value } = listAllServicesSchema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${error.message}`
          })
        }]
      };
    }

    // Step 2: Get all services (no filters)
    const allServices = await registry.searchServices({});

    // Step 3: Get total count before limiting
    const totalCount = allServices.length;

    // Step 4: Apply limit
    const limitedServices = allServices.slice(0, value.limit);

    // Step 5: Format results (simplified version)
    const formattedServices = limitedServices.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.pricing.perRequest
    }));

    // Step 6: Return success response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          services: formattedServices,
          count: formattedServices.length,
          total: totalCount
        }, null, 2)
      }]
    };

  } catch (error: any) {
    logger.error('Error in listAllServices:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message
        })
      }]
    };
  }
}

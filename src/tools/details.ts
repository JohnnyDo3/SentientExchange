import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';

/**
 * Arguments for get_service_details tool
 */
export interface GetServiceDetailsArgs {
  serviceId: string;
}

/**
 * Validation schema for get_service_details
 */
const getServiceDetailsSchema = Joi.object({
  serviceId: Joi.string().required().description('UUID of the service to retrieve')
});

/**
 * Get detailed information about a specific service
 *
 * @param registry - Service registry instance
 * @param args - Service ID
 * @returns MCP response with complete service details
 *
 * @example
 * const result = await getServiceDetails(registry, {
 *   serviceId: '123e4567-e89b-12d3-a456-426614174000'
 * });
 */
export async function getServiceDetails(
  registry: ServiceRegistry,
  args: GetServiceDetailsArgs
) {
  try {
    // Step 1: Validate input
    const { error, value } = getServiceDetailsSchema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${getErrorMessage(error)}`
          })
        }]
      };
    }

    // Step 2: Get service from registry
    const service = await registry.getService(value.serviceId);

    // Step 3: Handle not found
    if (!service) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Service not found: ${value.serviceId}`
          })
        }]
      };
    }

    // Step 4: Return complete service object
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          service: service
        }, null, 2)
      }]
    };

  } catch (error: unknown) {
    logger.error('Error in getServiceDetails:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error)
        })
      }]
    };
  }
}

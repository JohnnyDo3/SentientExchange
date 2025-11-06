import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';
import Joi from 'joi';
import { ServiceRegistry } from '../registry/ServiceRegistry';

/**
 * Arguments for discover_services tool
 */
export interface DiscoverServicesArgs {
  capability?: string;
  maxPrice?: string;
  minRating?: number;
  limit?: number;
}

/**
 * Validation schema for discover_services
 */
const discoverServicesSchema = Joi.object({
  capability: Joi.string().optional().description('Filter by service capability'),
  maxPrice: Joi.string().pattern(/^\$\d+(\.\d{1,2})?$/).optional().description('Maximum price in format $X.XX'),
  minRating: Joi.number().min(1).max(5).optional().description('Minimum rating (1-5)'),
  limit: Joi.number().integer().min(1).max(100).default(10).description('Maximum number of results to return')
});

/**
 * Discover and search for services based on filters
 *
 * @param registry - Service registry instance
 * @param args - Search filters
 * @returns MCP response with filtered services
 *
 * @example
 * const result = await discoverServices(registry, {
 *   capability: 'image-analysis',
 *   maxPrice: '$1.00',
 *   minRating: 4.0,
 *   limit: 5
 * });
 */
export async function discoverServices(
  registry: ServiceRegistry,
  args: DiscoverServicesArgs
) {
  try {
    // Step 1: Validate input
    const { error, value } = discoverServicesSchema.validate(args);
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

    // Step 2: Build search query
    const query: {
      capabilities?: string[];
      maxPrice?: string;
      minRating?: number;
    } = {};

    if (value.capability) {
      query.capabilities = [value.capability];
    }

    if (value.maxPrice) {
      query.maxPrice = value.maxPrice;
    }

    if (value.minRating !== undefined) {
      query.minRating = value.minRating;
    }

    // Step 3: Search services
    const allServices = await registry.searchServices(query);

    // Step 4: Apply limit
    const limitedServices = allServices.slice(0, value.limit);

    // Step 5: Format results
    const formattedServices = limitedServices.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.pricing.perRequest,
      rating: service.reputation.rating,
      capabilities: service.capabilities
    }));

    // Step 6: Return success response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          services: formattedServices,
          count: formattedServices.length
        }, null, 2)
      }]
    };

  } catch (error: unknown) {
    logger.error('Error in discoverServices:', error);
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

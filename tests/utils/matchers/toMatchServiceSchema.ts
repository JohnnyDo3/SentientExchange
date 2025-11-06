import { Service } from '../../../src/types/service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchServiceSchema(): R;
    }
  }
}

/**
 * Custom Jest matcher to validate Service objects against the schema
 */
export function toMatchServiceSchema(received: unknown) {
  const service = received as Service;

  // Check all required fields exist
  const requiredFields = [
    'id',
    'name',
    'description',
    'provider',
    'endpoint',
    'capabilities',
    'pricing',
    'reputation',
    'metadata',
    'createdAt',
    'updatedAt',
  ];

  const missingFields = requiredFields.filter((field) => !(field in service));

  if (missingFields.length > 0) {
    return {
      pass: false,
      message: () => `Service is missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Validate field types
  if (typeof service.id !== 'string') {
    return {
      pass: false,
      message: () => `Service id must be a string, got ${typeof service.id}`,
    };
  }

  if (typeof service.name !== 'string') {
    return {
      pass: false,
      message: () => `Service name must be a string, got ${typeof service.name}`,
    };
  }

  if (typeof service.description !== 'string') {
    return {
      pass: false,
      message: () => `Service description must be a string, got ${typeof service.description}`,
    };
  }

  if (typeof service.provider !== 'string') {
    return {
      pass: false,
      message: () => `Service provider must be a string, got ${typeof service.provider}`,
    };
  }

  if (typeof service.endpoint !== 'string') {
    return {
      pass: false,
      message: () => `Service endpoint must be a string, got ${typeof service.endpoint}`,
    };
  }

  // Validate capabilities array
  if (!Array.isArray(service.capabilities)) {
    return {
      pass: false,
      message: () => `Service capabilities must be an array, got ${typeof service.capabilities}`,
    };
  }

  if (!service.capabilities.every((cap) => typeof cap === 'string')) {
    return {
      pass: false,
      message: () => `Service capabilities must be an array of strings`,
    };
  }

  // Validate pricing object
  if (typeof service.pricing !== 'object' || service.pricing === null) {
    return {
      pass: false,
      message: () => `Service pricing must be an object, got ${typeof service.pricing}`,
    };
  }

  if (typeof service.pricing.currency !== 'string') {
    return {
      pass: false,
      message: () => `Service pricing.currency must be a string, got ${typeof service.pricing.currency}`,
    };
  }

  // Validate reputation object
  if (typeof service.reputation !== 'object' || service.reputation === null) {
    return {
      pass: false,
      message: () => `Service reputation must be an object, got ${typeof service.reputation}`,
    };
  }

  const reputationRequiredFields = ['totalJobs', 'successRate', 'avgResponseTime', 'rating', 'reviews'];
  const reputationMissingFields = reputationRequiredFields.filter(
    (field) => !(field in service.reputation)
  );

  if (reputationMissingFields.length > 0) {
    return {
      pass: false,
      message: () =>
        `Service reputation is missing required fields: ${reputationMissingFields.join(', ')}`,
    };
  }

  // Validate reputation field types
  if (typeof service.reputation.totalJobs !== 'number') {
    return {
      pass: false,
      message: () => `Service reputation.totalJobs must be a number, got ${typeof service.reputation.totalJobs}`,
    };
  }

  if (typeof service.reputation.successRate !== 'number') {
    return {
      pass: false,
      message: () => `Service reputation.successRate must be a number, got ${typeof service.reputation.successRate}`,
    };
  }

  if (service.reputation.successRate < 0 || service.reputation.successRate > 100) {
    return {
      pass: false,
      message: () =>
        `Service reputation.successRate must be between 0 and 100, got ${service.reputation.successRate}`,
    };
  }

  if (typeof service.reputation.avgResponseTime !== 'string') {
    return {
      pass: false,
      message: () => `Service reputation.avgResponseTime must be a string, got ${typeof service.reputation.avgResponseTime}`,
    };
  }

  if (typeof service.reputation.rating !== 'number') {
    return {
      pass: false,
      message: () => `Service reputation.rating must be a number, got ${typeof service.reputation.rating}`,
    };
  }

  if (service.reputation.rating < 0 || service.reputation.rating > 5) {
    return {
      pass: false,
      message: () =>
        `Service reputation.rating must be between 0 and 5, got ${service.reputation.rating}`,
    };
  }

  if (typeof service.reputation.reviews !== 'number') {
    return {
      pass: false,
      message: () => `Service reputation.reviews must be a number, got ${typeof service.reputation.reviews}`,
    };
  }

  // Validate metadata object
  if (typeof service.metadata !== 'object' || service.metadata === null) {
    return {
      pass: false,
      message: () => `Service metadata must be an object, got ${typeof service.metadata}`,
    };
  }

  if (typeof service.metadata.apiVersion !== 'string') {
    return {
      pass: false,
      message: () => `Service metadata.apiVersion must be a string, got ${typeof service.metadata.apiVersion}`,
    };
  }

  // Validate timestamps
  const createdAt = new Date(service.createdAt);
  if (isNaN(createdAt.getTime())) {
    return {
      pass: false,
      message: () => `Service createdAt must be a valid ISO 8601 date string`,
    };
  }

  const updatedAt = new Date(service.updatedAt);
  if (isNaN(updatedAt.getTime())) {
    return {
      pass: false,
      message: () => `Service updatedAt must be a valid ISO 8601 date string`,
    };
  }

  // All validations passed
  return {
    pass: true,
    message: () => `Service matches the schema`,
  };
}

// Add the matcher to Jest
expect.extend({ toMatchServiceSchema });

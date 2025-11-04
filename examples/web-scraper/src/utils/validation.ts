import Joi from 'joi';

/**
 * Validation schema for scrape requests
 */
export const scrapeRequestSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
      'any.required': 'URL is required',
    }),
  selectors: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    pricing: Joi.string().optional(),
    features: Joi.string().optional(),
    contactEmail: Joi.string().optional(),
    metadata: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  }).optional(),
  timeout: Joi.number().integer().min(1000).max(60000).optional()
    .messages({
      'number.min': 'Timeout must be at least 1000ms',
      'number.max': 'Timeout cannot exceed 60000ms (60 seconds)',
    }),
});

/**
 * Validate scrape request
 */
export function validateScrapeRequest(data: any) {
  const { error, value } = scrapeRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

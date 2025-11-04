import Joi from 'joi';

/**
 * Validation schema for market research requests
 */
export const marketQuerySchema = Joi.object({
  industry: Joi.string().optional().max(100)
    .messages({
      'string.max': 'Industry must be 100 characters or less',
    }),
  metricType: Joi.string()
    .valid('market-size', 'growth-rate', 'key-players', 'trends', 'all')
    .optional()
    .messages({
      'any.only': 'Metric type must be one of: market-size, growth-rate, key-players, trends, all',
    }),
  region: Joi.string().optional().max(50)
    .messages({
      'string.max': 'Region must be 50 characters or less',
    }),
});

/**
 * Validate market query request
 */
export function validateMarketQuery(data: any) {
  const { error, value } = marketQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

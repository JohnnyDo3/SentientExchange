import Joi from 'joi';

/**
 * Validation schema for news requests
 */
export const newsRequestSchema = Joi.object({
  topic: Joi.string().optional().max(100)
    .messages({
      'string.max': 'Topic must be 100 characters or less',
    }),
  limit: Joi.number().integer().min(1).max(50).optional().default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50',
    }),
  daysBack: Joi.number().integer().min(1).max(365).optional().default(30)
    .messages({
      'number.min': 'Days back must be at least 1',
      'number.max': 'Days back cannot exceed 365',
    }),
});

/**
 * Validate news request
 */
export function validateNewsRequest(data: any) {
  const { error, value } = newsRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

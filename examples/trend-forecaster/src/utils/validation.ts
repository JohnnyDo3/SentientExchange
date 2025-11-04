import Joi from 'joi';

/**
 * Validation schema for trend forecast requests
 */
export const trendRequestSchema = Joi.object({
  industry: Joi.string().required().min(2).max(100)
    .messages({
      'string.min': 'Industry must be at least 2 characters',
      'string.max': 'Industry must be 100 characters or less',
      'any.required': 'Industry is required',
    }),
  timeframe: Joi.string()
    .valid('1-year', '2-year', '5-year')
    .required()
    .messages({
      'any.only': 'Timeframe must be one of: 1-year, 2-year, 5-year',
      'any.required': 'Timeframe is required',
    }),
  factors: Joi.array().items(Joi.string().max(200)).optional()
    .messages({
      'string.max': 'Each factor must be 200 characters or less',
    }),
});

/**
 * Validate trend forecast request
 */
export function validateTrendRequest(data: any) {
  const { error, value } = trendRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

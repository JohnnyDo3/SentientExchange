import Joi from 'joi';

/**
 * Validation schema for feature extraction requests
 */
export const featureRequestSchema = Joi.object({
  text: Joi.string().required().min(10).max(50000)
    .messages({
      'string.min': 'Text must be at least 10 characters',
      'string.max': 'Text cannot exceed 50000 characters',
      'any.required': 'Text is required',
    }),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).optional()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
    }),
  extractionType: Joi.string()
    .valid('product-features', 'technical-specs', 'benefits', 'all')
    .optional()
    .messages({
      'any.only': 'Extraction type must be one of: product-features, technical-specs, benefits, all',
    }),
});

/**
 * Validate feature extraction request
 */
export function validateFeatureRequest(data: any) {
  const { error, value } = featureRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

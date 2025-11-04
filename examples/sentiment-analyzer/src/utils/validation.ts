import Joi from 'joi';

/**
 * Validation schema for sentiment analysis requests
 */
const analysisRequestSchema = Joi.object({
  text: Joi.string()
    .min(1)
    .max(100000) // 100KB max text length
    .required()
    .messages({
      'string.base': 'text must be a string',
      'string.empty': 'text cannot be empty',
      'string.min': 'text must be at least 1 character',
      'string.max': 'text must not exceed 100,000 characters',
      'any.required': 'text is required',
    }),
});

/**
 * Validate sentiment analysis request
 */
export function validateAnalysisRequest(data: any) {
  return analysisRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

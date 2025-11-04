import Joi from 'joi';

/**
 * Validation schema for report generation requests
 */
export const reportRequestSchema = Joi.object({
  topic: Joi.string().min(1).max(500).required()
    .messages({
      'string.min': 'Topic cannot be empty',
      'string.max': 'Topic cannot exceed 500 characters',
      'any.required': 'Topic is required',
    }),
  sections: Joi.array().items(Joi.string()).min(1).required()
    .messages({
      'array.min': 'At least one section is required',
      'any.required': 'Sections are required',
    }),
  data: Joi.any().required()
    .messages({
      'any.required': 'Data is required',
    }),
  includeCharts: Joi.boolean().optional(),
  format: Joi.string().valid('executive-summary', 'detailed', 'technical').optional()
    .messages({
      'any.only': 'Format must be one of: executive-summary, detailed, technical',
    }),
});

/**
 * Validate report request
 */
export function validateReportRequest(data: any) {
  const { error, value } = reportRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

import Joi from 'joi';

/**
 * Validation schema for presentation requests
 */
export const presentationRequestSchema = Joi.object({
  title: Joi.string().required()
    .messages({
      'any.required': 'Title is required',
      'string.empty': 'Title cannot be empty',
    }),
  slides: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('title', 'content', 'data', 'conclusion').required()
          .messages({
            'any.required': 'Slide type is required',
            'any.only': 'Slide type must be one of: title, content, data, conclusion',
          }),
        heading: Joi.string().optional(),
        content: Joi.string().optional(),
        data: Joi.any().optional(),
      })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'Slides are required',
      'array.min': 'At least one slide must be provided',
    }),
  theme: Joi.string().valid('professional', 'modern', 'minimal').optional()
    .messages({
      'any.only': 'Theme must be one of: professional, modern, minimal',
    }),
  includeCharts: Joi.boolean().optional(),
});

/**
 * Validate presentation request
 */
export function validatePresentationRequest(data: any) {
  const { error, value } = presentationRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

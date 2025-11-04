import Joi from 'joi';

/**
 * Validation schema for copywriting requests
 */
export const copyRequestSchema = Joi.object({
  type: Joi.string()
    .valid('landing-page', 'product-description', 'email', 'ad-copy', 'blog-post')
    .required()
    .messages({
      'any.only': 'Type must be one of: landing-page, product-description, email, ad-copy, blog-post',
      'any.required': 'Type is required',
    }),
  product: Joi.string().required().max(500)
    .messages({
      'string.max': 'Product description must be 500 characters or less',
      'any.required': 'Product is required',
    }),
  targetAudience: Joi.string().optional().max(200)
    .messages({
      'string.max': 'Target audience must be 200 characters or less',
    }),
  tone: Joi.string()
    .valid('professional', 'casual', 'technical', 'persuasive')
    .optional()
    .messages({
      'any.only': 'Tone must be one of: professional, casual, technical, persuasive',
    }),
  length: Joi.string()
    .valid('short', 'medium', 'long')
    .optional()
    .messages({
      'any.only': 'Length must be one of: short, medium, long',
    }),
});

/**
 * Validate copywriting request
 */
export function validateCopyRequest(data: any) {
  const { error, value } = copyRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

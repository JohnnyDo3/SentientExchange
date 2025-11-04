import Joi from 'joi';

/**
 * Validation schema for PDF generation requests
 */
export const pdfRequestSchema = Joi.object({
  title: Joi.string().min(1).max(500).required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 500 characters',
      'any.required': 'Title is required',
    }),
  content: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('heading', 'paragraph', 'list', 'image', 'table').required()
        .messages({
          'any.only': 'Content type must be one of: heading, paragraph, list, image, table',
          'any.required': 'Content type is required',
        }),
      text: Joi.string().optional(),
      items: Joi.array().items(Joi.string()).optional(),
      level: Joi.number().integer().min(1).max(6).optional(),
      imageUrl: Joi.string().uri().optional(),
      tableData: Joi.object({
        headers: Joi.array().items(Joi.string()).required(),
        rows: Joi.array().items(Joi.array().items(Joi.string())).required(),
      }).optional(),
    })
  ).min(1).required()
    .messages({
      'array.min': 'PDF content cannot be empty',
      'any.required': 'Content is required',
    }),
  metadata: Joi.object({
    author: Joi.string().optional(),
    subject: Joi.string().optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

/**
 * Validate PDF request
 */
export function validatePDFRequest(data: any) {
  const { error, value } = pdfRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

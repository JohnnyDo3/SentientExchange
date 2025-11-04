import Joi from 'joi';

/**
 * Validation schema for channel strategy requests
 */
export const channelRequestSchema = Joi.object({
  productType: Joi.string().required()
    .messages({
      'any.required': 'Product type is required',
      'string.empty': 'Product type cannot be empty',
    }),
  targetMarket: Joi.string().required()
    .messages({
      'any.required': 'Target market is required',
      'string.empty': 'Target market cannot be empty',
    }),
  budget: Joi.number().integer().min(0).optional()
    .messages({
      'number.min': 'Budget must be a positive number',
    }),
  goals: Joi.array().items(Joi.string()).min(1).required()
    .messages({
      'any.required': 'Goals are required',
      'array.min': 'At least one goal must be provided',
    }),
});

/**
 * Validate channel strategy request
 */
export function validateChannelRequest(data: any) {
  const { error, value } = channelRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

import Joi from 'joi';

/**
 * Validation schema for pricing requests
 */
export const pricingRequestSchema = Joi.object({
  productType: Joi.string().required().max(200)
    .messages({
      'string.max': 'Product type must be 200 characters or less',
      'any.required': 'Product type is required',
    }),
  targetMarket: Joi.string().valid('smb', 'enterprise', 'individual').required()
    .messages({
      'any.only': 'Target market must be one of: smb, enterprise, individual',
      'any.required': 'Target market is required',
    }),
  competitors: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      features: Joi.number().integer().min(0).required(),
    })
  ).optional(),
  costs: Joi.object({
    cogs: Joi.number().min(0).required(),
    overhead: Joi.number().min(0).required(),
  }).optional(),
});

/**
 * Validate pricing request
 */
export function validatePricingRequest(data: any) {
  const { error, value } = pricingRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

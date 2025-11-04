import Joi from 'joi';

/**
 * Validation schema for company query requests
 */
export const companyQuerySchema = Joi.object({
  companyName: Joi.string().optional().max(100),
  domain: Joi.string().optional().max(200),
  industry: Joi.string().optional().max(100),
});

/**
 * Validate company query request
 */
export function validateCompanyQuery(data: any) {
  const { error, value } = companyQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

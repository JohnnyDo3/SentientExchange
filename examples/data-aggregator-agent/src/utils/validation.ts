import Joi from 'joi';

/**
 * Validation schema for data aggregation requests
 */
export const aggregationRequestSchema = Joi.object({
  dataSources: Joi.array().items(
    Joi.object({
      name: Joi.string().required()
        .messages({
          'any.required': 'Data source name is required',
        }),
      data: Joi.any().required()
        .messages({
          'any.required': 'Data source data is required',
        }),
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one data source is required',
      'any.required': 'Data sources are required',
    }),
  aggregationType: Joi.string().valid('comparison', 'market-share', 'trend-analysis').required()
    .messages({
      'any.only': 'Aggregation type must be one of: comparison, market-share, trend-analysis',
      'any.required': 'Aggregation type is required',
    }),
});

/**
 * Validate aggregation request
 */
export function validateAggregationRequest(data: any) {
  const { error, value } = aggregationRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

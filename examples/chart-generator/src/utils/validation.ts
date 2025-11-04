import Joi from 'joi';

/**
 * Validation schema for chart generation requests
 */
export const chartRequestSchema = Joi.object({
  type: Joi.string().valid('line', 'bar', 'pie', 'radar', 'scatter').required()
    .messages({
      'any.only': 'Chart type must be one of: line, bar, pie, radar, scatter',
      'any.required': 'Chart type is required',
    }),
  title: Joi.string().required().max(200)
    .messages({
      'string.max': 'Title must be 200 characters or less',
      'any.required': 'Title is required',
    }),
  data: Joi.object({
    labels: Joi.array().items(Joi.string()).required()
      .messages({
        'any.required': 'Data labels are required',
      }),
    datasets: Joi.array().items(
      Joi.object({
        label: Joi.string().required(),
        data: Joi.array().items(Joi.number()).required(),
        backgroundColor: Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
        ).optional(),
        borderColor: Joi.string().optional(),
      })
    ).min(1).required()
      .messages({
        'array.min': 'At least one dataset is required',
        'any.required': 'Datasets are required',
      }),
  }).required(),
  options: Joi.object({
    responsive: Joi.boolean().optional(),
    maintainAspectRatio: Joi.boolean().optional(),
    legend: Joi.object({
      display: Joi.boolean().optional(),
      position: Joi.string().optional(),
    }).optional(),
  }).optional(),
});

/**
 * Validate chart request
 */
export function validateChartRequest(data: any) {
  const { error, value } = chartRequestSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new Error(`Validation error: ${errorMessages.join(', ')}`);
  }

  return value;
}

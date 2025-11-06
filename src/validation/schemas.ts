import { z } from 'zod';
import { validateChainAddress, validatePaymentAddresses } from '../utils/wallet-validation.js';

/**
 * Validation Schemas
 *
 * Zod schemas for input validation across all API endpoints and MCP tools.
 * Provides type-safe validation with detailed error messages.
 */

// Service Registration Schema (without refine for base schema)
const ServiceSchemaBase = z.object({
  name: z.string()
    .min(3, 'Service name must be at least 3 characters')
    .max(100, 'Service name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Service name can only contain letters, numbers, spaces, hyphens, and underscores'),

  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),

  provider: z.string()
    .min(2, 'Provider name required')
    .max(100),

  endpoint: z.string()
    .url('Must be a valid URL')
    .refine((url) => {
      const parsed = new URL(url);
      return process.env.NODE_ENV === 'development' || parsed.protocol === 'https:';
    }, 'Production endpoints must use HTTPS'),

  capabilities: z.array(z.string())
    .min(1, 'At least one capability required')
    .max(20, 'Maximum 20 capabilities allowed')
    .refine((caps: string[]) => caps.every((c: string) => c.length > 0 && c.length <= 50), 'Each capability must be 1-50 characters'),

  pricing: z.object({
    perRequest: z.string()
      .regex(/^\$\d+(\.\d{1,2})?$/, 'Price must be in format $X.XX')
      .refine((price) => {
        const amount = parseFloat(price.replace('$', ''));
        return amount >= 0.001 && amount <= 100;
      }, 'Price must be between $0.001 and $100'),
    currency: z.string().optional().default('USDC'),
  }),

  walletAddress: z.string()
    .refine((address) => {
      const result = validateChainAddress(address, 'evm');
      return result.valid;
    }, 'Invalid Ethereum/EVM wallet address. Must be in format 0x...')
    .optional(),

  paymentAddresses: z.record(z.string())
    .refine((addresses) => {
      const result = validatePaymentAddresses(addresses);
      return result.valid;
    }, (addresses) => {
      const result = validatePaymentAddresses(addresses);
      return {
        message: result.errors.join('; ') || 'Invalid payment addresses',
      };
    })
    .optional(),

  image: z.string()
    .max(10, 'Image emoji must be at most 10 characters')
    .optional(),

  color: z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be valid hex format (#RRGGBB)')
    .optional(),
});

// Main service schema with refinements
export const ServiceSchema = ServiceSchemaBase
  .refine(
    (data) => data.walletAddress || (data.paymentAddresses && Object.keys(data.paymentAddresses).length > 0),
    'Either walletAddress or paymentAddresses must be provided'
  );

// Partial schema for updates (all fields optional)
export const ServiceUpdateSchema = ServiceSchemaBase.partial();

// Service ID validation
export const ServiceIdSchema = z.string()
  .uuid('Invalid service ID format');

// Transaction/Purchase Schema
export const PurchaseRequestSchema = z.object({
  serviceId: ServiceIdSchema,

  requestData: z.record(z.unknown())
    .refine((data) => {
      const size = JSON.stringify(data).length;
      return size <= 100000; // 100KB max
    }, 'Request data too large (max 100KB)'),

  maxPrice: z.string()
    .regex(/^\$\d+(\.\d{1,2})?$/, 'Max price must be in format $X.XX')
    .optional(),
});

// Rating Schema
export const RatingSchema = z.object({
  transactionId: z.string()
    .uuid('Invalid transaction ID'),

  score: z.number()
    .int('Score must be an integer')
    .min(1, 'Minimum rating is 1')
    .max(5, 'Maximum rating is 5'),

  review: z.string()
    .max(500, 'Review must be less than 500 characters')
    .optional(),
});

// Search/Filter Schema
export const SearchSchema = z.object({
  query: z.string()
    .max(200, 'Search query too long')
    .optional(),

  capabilities: z.array(z.string())
    .max(10, 'Too many capability filters')
    .optional(),

  minRating: z.number()
    .min(0)
    .max(5)
    .optional(),

  maxPrice: z.string()
    .regex(/^\$\d+(\.\d{1,2})?$/)
    .optional(),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .optional(),
});

// Wallet Balance Query
export const WalletQuerySchema = z.object({
  address: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .optional(),
});

// Transaction Query
export const TransactionQuerySchema = z.object({
  transactionId: z.string()
    .uuid('Invalid transaction ID'),
});

/**
 * Validation Helper Functions
 */

// Sanitize HTML/Script tags from user input
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// Type for validated service input data
export type ServiceInput = z.infer<typeof ServiceSchema>;
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;

// Validate and sanitize service object
export function validateService(data: unknown): ServiceInput {
  const result = ServiceSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Sanitize string fields
  const sanitized: ServiceInput = {
    ...result.data,
    name: sanitizeInput(result.data.name),
    description: sanitizeInput(result.data.description),
    provider: sanitizeInput(result.data.provider),
  };

  return sanitized;
}

// Validate service update
export function validateServiceUpdate(data: unknown): ServiceUpdate {
  const result = ServiceUpdateSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Sanitize string fields if present
  const sanitized: ServiceUpdate = { ...result.data };
  if (sanitized.name) sanitized.name = sanitizeInput(sanitized.name);
  if (sanitized.description) sanitized.description = sanitizeInput(sanitized.description);
  if (sanitized.provider) sanitized.provider = sanitizeInput(sanitized.provider);

  return sanitized;
}

// Validate purchase request
export function validatePurchase(data: unknown): PurchaseRequest {
  const result = PurchaseRequestSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return result.data;
}

// Validate rating
export function validateRating(data: unknown): Rating {
  const result = RatingSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Sanitize review if present
  const validated: Rating = { ...result.data };
  if (validated.review) {
    validated.review = sanitizeInput(validated.review);
  }

  return validated;
}

// Validate search query
export function validateSearch(data: unknown): SearchQuery {
  const result = SearchSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Sanitize query if present
  const validated: SearchQuery = { ...result.data };
  if (validated.query) {
    validated.query = sanitizeInput(validated.query);
  }

  return validated;
}

// Additional type exports
export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;
export type Rating = z.infer<typeof RatingSchema>;
export type SearchQuery = z.infer<typeof SearchSchema>;

import { z } from 'zod';

// ==================== Phase 1: Permit Info Validation ====================

export const PermitInfoRequestSchema = z.object({
  equipmentType: z.enum(['furnace', 'ac-unit', 'heat-pump', 'ductwork', 'hvac-system'], {
    errorMap: () => ({ message: 'Must be one of: furnace, ac-unit, heat-pump, ductwork, hvac-system' }),
  }),
  jobType: z.enum(['replacement', 'new-installation', 'modification', 'repair'], {
    errorMap: () => ({ message: 'Must be one of: replacement, new-installation, modification, repair' }),
  }),
  btu: z.number().int().min(5000).max(500000).optional(),
  tonnage: z.number().min(0.5).max(25).optional(),
  location: z.object({
    address: z.string().min(5),
    city: z.string().min(2),
    county: z.enum(['hillsborough', 'pinellas', 'pasco'], {
      errorMap: () => ({ message: 'Currently only supporting: hillsborough, pinellas, pasco' }),
    }),
    zipCode: z.string().regex(/^\d{5}$/, 'Must be a valid 5-digit zip code'),
  }),
  propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
  additionalDetails: z.string().max(1000).optional(),
});

export type PermitInfoRequest = z.infer<typeof PermitInfoRequestSchema>;

// ==================== Phase 2: Form Generator Validation ====================

export const ContactInfoSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{3}-\d{3}-\d{4}$/, 'Invalid phone format'),
  email: z.string().email(),
  licenseNumber: z.string().min(5).max(50).optional(),
});

export const PropertyDetailsSchema = z.object({
  parcelId: z.string().min(5).max(50).optional(),
  ownerName: z.string().min(2).max(100),
  ownerPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{3}-\d{3}-\d{4}$/, 'Invalid phone format'),
  propertyValue: z.number().min(0).optional(),
  squareFootage: z.number().int().min(100).max(1000000).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  ceilingHeight: z.number().min(7).max(20).optional(), // Standard 8ft, vaulted can be higher
});

export const FormGeneratorRequestSchema = z.object({
  // Include all Phase 1 data
  permitInfo: PermitInfoRequestSchema,

  // Contractor information
  contractor: ContactInfoSchema,

  // Property details
  property: PropertyDetailsSchema,

  // Equipment specifications
  equipmentDetails: z.object({
    manufacturer: z.string().min(2).max(100),
    model: z.string().min(2).max(100),
    serialNumber: z.string().min(2).max(100).optional(),
    ahriNumber: z.string().min(5).max(50).optional(), // AHRI certification number (required by most counties)
    efficiency: z.string().max(50).optional(), // e.g., "SEER 16", "95% AFUE"
    fuelType: z.enum(['electric', 'gas', 'oil', 'propane', 'other']).optional(),
  }),

  // Installation details
  installation: z.object({
    estimatedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
    estimatedCost: z.number().min(0).max(10000000),
    description: z.string().min(10).max(2000),
  }),
});

export type FormGeneratorRequest = z.infer<typeof FormGeneratorRequestSchema>;

// ==================== Phase 3: Auto-Submit Validation (Future) ====================

export const AutoSubmitRequestSchema = FormGeneratorRequestSchema.extend({
  paymentAuthorization: z.object({
    permitFees: z.boolean(),
    maxFeeAmount: z.number().min(0).max(10000),
    paymentMethod: z.enum(['credit-card', 'check', 'ach']),
  }),
  notifications: z.object({
    email: z.string().email(),
    sms: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{3}-\d{3}-\d{4}$/).optional(),
    updates: z.boolean(),
  }),
});

export type AutoSubmitRequest = z.infer<typeof AutoSubmitRequestSchema>;

// ==================== Validation Helper Functions ====================

export function validatePermitInfo(data: unknown) {
  try {
    return {
      success: true,
      data: PermitInfoRequestSchema.parse(data),
      error: null,
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      error: error.errors?.[0]?.message || error.message || 'Validation failed',
    };
  }
}

export function validateFormGenerator(data: unknown) {
  try {
    return {
      success: true,
      data: FormGeneratorRequestSchema.parse(data),
      error: null,
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      error: error.errors?.[0]?.message || error.message || 'Validation failed',
    };
  }
}

export function validateAutoSubmit(data: unknown) {
  try {
    return {
      success: true,
      data: AutoSubmitRequestSchema.parse(data),
      error: null,
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      error: error.errors?.[0]?.message || error.message || 'Validation failed',
    };
  }
}

// ==================== Security & Sanitization ====================

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[;'"\\]/g, '') // Remove SQL/command injection characters
    .trim();
}

/**
 * Validate file uploads (for Phase 3)
 */
export function validateFileUpload(file: any) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF, JPEG, and PNG are allowed.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }

  return { valid: true, error: null };
}

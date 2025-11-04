/**
 * Hillsborough County (Tampa) Permit Configuration
 *
 * Contains county-specific rules for HVAC permitting including:
 * - Permit type mappings
 * - Fee schedules
 * - Requirements
 * - Processing times
 * - Special conditions
 *
 * Data source: Hillsborough County Development Services
 * Last updated: 2025
 * API: Accela Civic Platform
 */

export interface CountyConfig {
  name: string;
  code: string;
  jurisdiction: string;
  contactInfo: {
    department: string;
    phone: string;
    website: string;
    address: string;
  };
  permitTypes: PermitTypeMapping[];
  feeSchedule: FeeSchedule;
  requirements: RequirementsConfig;
  processingTimes: ProcessingTimes;
}

export interface PermitTypeMapping {
  category: string;
  accelaType: string;
  description: string;
  applicableTo: string[];
  exemptions?: string[];
}

export interface FeeSchedule {
  baseFees: Record<string, number>;
  valuationRules: ValuationRule[];
  additionalFees: AdditionalFee[];
}

export interface ValuationRule {
  minValue: number;
  maxValue: number;
  feeCalculation: string; // Formula or flat rate
}

export interface AdditionalFee {
  name: string;
  amount: number;
  applicableWhen: string;
}

export interface RequirementsConfig {
  universal: string[]; // Required for all permits
  byCategory: Record<string, string[]>;
}

export interface ProcessingTimes {
  standard: number; // Business days
  expedited?: number;
  sameDay?: number;
}

/**
 * Hillsborough County (Tampa) Configuration
 */
export const hillsboroughConfig: CountyConfig = {
  name: 'Hillsborough County',
  code: 'hillsborough',
  jurisdiction: 'Tampa and unincorporated Hillsborough County',

  contactInfo: {
    department: 'Development Services',
    phone: '(813) 272-5920',
    website: 'https://www.hillsboroughcounty.org/en/residents/property-owners-and-renters/building-services',
    address: '601 E Kennedy Blvd, Tampa, FL 33602',
  },

  /**
   * Permit type mappings from generic job types to Accela permit types
   */
  permitTypes: [
    {
      category: 'hvac-residential-replacement',
      accelaType: 'BLD-HVAC-RES-REPL',
      description: 'Residential HVAC Equipment Replacement',
      applicableTo: [
        'Furnace replacement (like-for-like)',
        'AC unit replacement (like-for-like)',
        'Heat pump replacement (same tonnage)',
      ],
      exemptions: [
        'Portable window AC units',
        'Ductless mini-splits under 1 ton',
      ],
    },
    {
      category: 'hvac-residential-new',
      accelaType: 'BLD-HVAC-RES-NEW',
      description: 'New Residential HVAC Installation',
      applicableTo: [
        'First-time HVAC installation',
        'System upgrades (increased capacity)',
        'New construction HVAC',
        'Addition of central air to existing heating',
      ],
    },
    {
      category: 'hvac-residential-ductwork',
      accelaType: 'BLD-MECH-DUCTWORK',
      description: 'Ductwork Modification or Installation',
      applicableTo: [
        'New ductwork installation',
        'Major ductwork modifications',
        'Duct system replacement',
      ],
    },
    {
      category: 'hvac-commercial',
      accelaType: 'BLD-HVAC-COM',
      description: 'Commercial HVAC Installation/Modification',
      applicableTo: [
        'Any commercial property HVAC work',
        'Rooftop units',
        'Multi-zone systems',
        'Industrial HVAC',
      ],
    },
  ],

  /**
   * Fee schedule for Hillsborough County
   * Fees current as of 2025
   */
  feeSchedule: {
    baseFees: {
      'BLD-HVAC-RES-REPL': 75.00,
      'BLD-HVAC-RES-NEW': 150.00,
      'BLD-MECH-DUCTWORK': 125.00,
      'BLD-HVAC-COM': 250.00,
    },
    valuationRules: [
      {
        minValue: 0,
        maxValue: 5000,
        feeCalculation: 'base_fee_only',
      },
      {
        minValue: 5001,
        maxValue: 25000,
        feeCalculation: 'base_fee + (valuation - 5000) * 0.01',
      },
      {
        minValue: 25001,
        maxValue: 100000,
        feeCalculation: 'base_fee + 200 + (valuation - 25000) * 0.008',
      },
      {
        minValue: 100001,
        maxValue: Infinity,
        feeCalculation: 'base_fee + 800 + (valuation - 100000) * 0.005',
      },
    ],
    additionalFees: [
      {
        name: 'Plan Review',
        amount: 50.00,
        applicableWhen: 'valuation > 10000',
      },
      {
        name: 'Inspection Fee',
        amount: 25.00,
        applicableWhen: 'always',
      },
      {
        name: 'Technology Fee',
        amount: 5.00,
        applicableWhen: 'always',
      },
      {
        name: 'Expedited Processing',
        amount: 100.00,
        applicableWhen: 'expedited_requested',
      },
    ],
  },

  /**
   * Document and information requirements
   */
  requirements: {
    universal: [
      'Valid contractor license (HVAC/Mechanical)',
      'Property owner authorization',
      'Site address and parcel ID',
      'Equipment specifications (make, model, BTU/tonnage)',
      'Estimated cost of work',
      'Scope of work description',
    ],
    byCategory: {
      'BLD-HVAC-RES-REPL': [
        'Equipment cut sheet/spec sheet',
        'Load calculation (if changing capacity)',
      ],
      'BLD-HVAC-RES-NEW': [
        'ACCA Manual J load calculation',
        'Equipment specifications',
        'Ductwork layout (if applicable)',
        'Electrical load calculation',
        'Site plan showing outdoor unit placement',
      ],
      'BLD-MECH-DUCTWORK': [
        'Ductwork layout plan',
        'Sizing calculations',
        'Material specifications',
      ],
      'BLD-HVAC-COM': [
        'Sealed engineering drawings',
        'ACCA Manual N load calculation',
        'Complete equipment specifications',
        'Ductwork layout and sizing',
        'Electrical calculations',
        'Fire safety compliance documentation',
        'Energy code compliance (Title 24 equivalent)',
      ],
    },
  },

  /**
   * Processing time estimates (business days)
   */
  processingTimes: {
    standard: 5, // 5 business days for standard processing
    expedited: 2, // 2 business days with expedited fee
    sameDay: 1, // Same-day processing available for simple replacements
  },
};

/**
 * Helper: Calculate total permit fees for Hillsborough County
 */
export function calculateHillsboroughFees(
  permitType: string,
  valuation: number,
  expedited: boolean = false
): number {
  const config = hillsboroughConfig.feeSchedule;

  // Get base fee
  let totalFee = config.baseFees[permitType] || 100;

  // Apply valuation-based fees
  const rule = config.valuationRules.find(
    (r) => valuation >= r.minValue && valuation <= r.maxValue
  );

  if (rule && rule.feeCalculation !== 'base_fee_only') {
    // Parse and calculate formula
    // For now, use simplified calculation
    if (valuation > 5000) {
      totalFee += Math.min((valuation - 5000) * 0.01, 200);
    }
  }

  // Add mandatory additional fees
  totalFee += 25; // Inspection
  totalFee += 5; // Technology

  // Add conditional fees
  if (valuation > 10000) {
    totalFee += 50; // Plan review
  }

  if (expedited) {
    totalFee += 100; // Expedited processing
  }

  return Math.round(totalFee * 100) / 100; // Round to 2 decimals
}

/**
 * Helper: Get required documents for a permit type
 */
export function getRequiredDocuments(permitType: string): string[] {
  const config = hillsboroughConfig.requirements;
  const specific = config.byCategory[permitType] || [];
  return [...config.universal, ...specific];
}

/**
 * Helper: Estimate processing time
 */
export function getProcessingTime(permitType: string, expedited: boolean = false): number {
  const times = hillsboroughConfig.processingTimes;

  // Simple replacements can be same-day
  if (permitType === 'BLD-HVAC-RES-REPL' && !expedited) {
    return times.sameDay || 1;
  }

  return expedited ? times.expedited || 2 : times.standard;
}

export default hillsboroughConfig;

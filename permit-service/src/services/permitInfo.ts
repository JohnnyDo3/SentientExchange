import { accelaClient } from '../integrations/accela-client';
import { PermitClassifier, PermitClassification } from './permitClassifier';
import { PermitInfoRequest } from '../utils/validation';
import { logger } from '../middleware/logger';
import {
  hillsboroughConfig,
  calculateHillsboroughFees,
  getRequiredDocuments,
  getProcessingTime,
} from '../config/counties/hillsborough';

/**
 * Permit Info Service - Phase 1
 *
 * Provides comprehensive permit information for HVAC jobs including:
 * - Permit type classification
 * - Fee calculations
 * - Required documents
 * - Processing timeline
 * - Special requirements
 */
export class PermitInfoService {
  private classifier: PermitClassifier;

  constructor() {
    this.classifier = new PermitClassifier();
    logger.info('Permit Info Service initialized');
  }

  /**
   * Get complete permit information for an HVAC job
   */
  async getPermitInfo(request: PermitInfoRequest): Promise<PermitInfoResponse> {
    const startTime = Date.now();

    try {
      logger.info('Processing permit info request', {
        equipmentType: request.equipmentType,
        jobType: request.jobType,
        county: request.location.county,
      });

      // Step 1: Classify the permit type
      const classification = await this.classifier.classify(request);

      // Step 2: Get county-specific information
      const countyInfo = this.getCountyInfo(request.location.county);

      // Step 3: Calculate fees
      const valuation = request.additionalDetails?.includes('$')
        ? this.extractValuation(request.additionalDetails)
        : this.estimateValuation(request);

      const fees = calculateHillsboroughFees(classification.accelaPermitType, valuation, false);

      // Step 4: Get required documents
      const requiredDocuments = getRequiredDocuments(classification.accelaPermitType);

      // Step 5: Get processing time
      const processingDays = getProcessingTime(classification.accelaPermitType, false);

      // Step 6: Get additional requirements from Accela (if available)
      let accelaRequirements: string[] = [];
      try {
        const accelaReqs = await accelaClient.getPermitRequirements(classification.accelaPermitType);
        accelaRequirements = accelaReqs.map((req) => req.name);
      } catch (error) {
        logger.warn('Could not fetch Accela requirements, using local data', { error });
      }

      const processingTime = Date.now() - startTime;

      const response: PermitInfoResponse = {
        success: true,
        classification: {
          permitType: classification.permitCategory,
          accelaCode: classification.accelaPermitType,
          description: this.getPermitDescription(classification.accelaPermitType),
          complexity: classification.estimatedComplexity,
          reasoning: classification.reasoning,
        },
        fees: {
          baseFee: fees,
          additionalFees: [],
          totalEstimated: fees,
          valuation,
          currency: 'USD',
        },
        requirements: {
          documents: requiredDocuments,
          accelaRequirements: accelaRequirements.length > 0 ? accelaRequirements : undefined,
          specialConsiderations: classification.specialConsiderations,
        },
        timeline: {
          estimatedProcessingDays: processingDays,
          expeditedAvailable: true,
          expeditedDays: 2,
          expeditedFee: 100,
        },
        jurisdiction: {
          county: countyInfo.name,
          department: countyInfo.contactInfo.department,
          phone: countyInfo.contactInfo.phone,
          website: countyInfo.contactInfo.website,
        },
        metadata: {
          requestedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          classificationMethod: classification.method,
        },
      };

      logger.info('Permit info request completed', {
        permitType: classification.permitCategory,
        totalFee: fees,
        processingTimeMs: processingTime,
      });

      return response;
    } catch (error: any) {
      logger.error('Permit info request failed', {
        error: error.message,
        request,
      });

      return {
        success: false,
        error: error.message,
        details: 'Failed to process permit information request',
      };
    }
  }

  /**
   * Get county configuration
   */
  private getCountyInfo(county: string) {
    // For now, only Hillsborough is supported
    // TODO: Add Pinellas, Pasco configurations
    return hillsboroughConfig;
  }

  /**
   * Get human-readable permit description
   */
  private getPermitDescription(accelaType: string): string {
    const descriptions: Record<string, string> = {
      'BLD-HVAC-RES-REPL': 'Residential HVAC Equipment Replacement',
      'BLD-HVAC-RES-NEW': 'New Residential HVAC Installation',
      'BLD-MECH-DUCTWORK': 'Ductwork Modification or Installation',
      'BLD-HVAC-COM': 'Commercial HVAC Installation/Modification',
    };
    return descriptions[accelaType] || 'HVAC Permit';
  }

  /**
   * Extract valuation from additional details
   */
  private extractValuation(details: string): number {
    const match = details.match(/\$([0-9,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
    return 5000; // Default
  }

  /**
   * Estimate valuation based on equipment type
   */
  private estimateValuation(request: PermitInfoRequest): number {
    const baseValues: Record<string, number> = {
      'furnace': 3000,
      'ac-unit': 4000,
      'heat-pump': 5000,
      'ductwork': 2000,
      'hvac-system': 8000,
    };

    let valuation = baseValues[request.equipmentType] || 5000;

    // Adjust for tonnage
    if (request.tonnage) {
      valuation += request.tonnage * 500;
    }

    // Adjust for job type
    if (request.jobType === 'new-installation') {
      valuation *= 1.5;
    }

    return Math.round(valuation);
  }
}

export interface PermitInfoResponse {
  success: boolean;
  classification?: {
    permitType: string;
    accelaCode: string;
    description: string;
    complexity: string;
    reasoning: string;
  };
  fees?: {
    baseFee: number;
    additionalFees: any[];
    totalEstimated: number;
    valuation: number;
    currency: string;
  };
  requirements?: {
    documents: string[];
    accelaRequirements?: string[];
    specialConsiderations: string[];
  };
  timeline?: {
    estimatedProcessingDays: number;
    expeditedAvailable: boolean;
    expeditedDays: number;
    expeditedFee: number;
  };
  jurisdiction?: {
    county: string;
    department: string;
    phone: string;
    website: string;
  };
  metadata?: {
    requestedAt: string;
    processingTimeMs: number;
    classificationMethod: string;
  };
  error?: string;
  details?: string;
}

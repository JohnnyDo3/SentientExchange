import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../middleware/logger';
import { PermitInfoRequest } from '../utils/validation';

/**
 * Permit Classifier Service
 *
 * Uses Claude AI to intelligently classify HVAC jobs into the correct
 * permit types based on equipment specs, job type, and local regulations.
 *
 * Falls back to rule-based classification if AI is unavailable.
 */
export class PermitClassifier {
  private anthropic: Anthropic | null = null;
  private enableAI: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.enableAI = !!apiKey;

    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      logger.info('Permit classifier initialized with AI support');
    } else {
      logger.warn('Permit classifier initialized without AI (using rule-based classification)');
    }
  }

  /**
   * Classify permit requirements for an HVAC job
   *
   * Strategy: Use deterministic rules first (fast, free, accurate for 90% of cases)
   * Only use AI for ambiguous/edge cases where rules have low confidence
   */
  async classify(request: PermitInfoRequest): Promise<PermitClassification> {
    // Always try rules first
    const ruleResult = this.classifyRuleBased(request);

    // Check if rules are confident
    const isConfident = this.isHighConfidence(ruleResult, request);

    if (isConfident) {
      // Rules are confident, no need for AI
      logger.info('Using rule-based classification (high confidence)', {
        permitType: ruleResult.permitCategory,
        confidence: 'high'
      });
      return ruleResult;
    }

    // Low confidence, use AI if available
    if (this.enableAI && this.anthropic) {
      logger.info('Using AI classification (rules uncertain)', {
        ruleResult: ruleResult.permitCategory,
        reason: 'Low confidence in rule-based classification'
      });
      return await this.classifyWithAI(request);
    }

    // No AI available, use rules anyway with warning
    logger.warn('Using rule-based classification (low confidence, no AI available)', {
      permitType: ruleResult.permitCategory
    });
    ruleResult.specialConsiderations.push(
      'Classification confidence is lower than normal. Please verify permit type with county.'
    );
    return ruleResult;
  }

  /**
   * Determine if rule-based classification is confident
   */
  private isHighConfidence(result: PermitClassification, request: PermitInfoRequest): boolean {
    // High confidence scenarios (clear-cut cases)

    // Commercial is always clear
    if (request.propertyType === 'commercial' || request.propertyType === 'industrial') {
      return true;
    }

    // Ductwork-only is always clear
    if (request.equipmentType === 'ductwork') {
      return true;
    }

    // Simple residential replacement (like-for-like) is clear
    if (request.jobType === 'replacement' &&
        request.propertyType === 'residential' &&
        (!request.tonnage || request.tonnage <= 5)) {
      return true;
    }

    // Low confidence scenarios (ambiguous cases)

    // Changing tonnage significantly (could require load calc)
    if (request.jobType === 'replacement' && request.tonnage && request.tonnage > 5) {
      return false; // Large system, might need more scrutiny
    }

    // "Modification" is ambiguous - could be replacement or new
    if (request.jobType === 'modification') {
      return false;
    }

    // Very high BTU (might be commercial even if labeled residential)
    if (request.btu && request.btu > 150000) {
      return false;
    }

    // Repair is tricky - might not need permit at all
    if (request.jobType === 'repair') {
      return false;
    }

    // Additional details provided - user might have edge case
    if (request.additionalDetails && request.additionalDetails.length > 50) {
      return false; // User wrote a lot, probably has a special situation
    }

    // Default: rules are confident for standard cases
    return true;
  }

  /**
   * AI-powered classification using Claude
   */
  private async classifyWithAI(request: PermitInfoRequest): Promise<PermitClassification> {
    try {
      logger.info('Classifying permit with AI', {
        equipmentType: request.equipmentType,
        jobType: request.jobType,
      });

      const prompt = `You are an expert in HVAC permitting for Tampa Bay (Hillsborough County), Florida.

Given this HVAC job, classify it into the correct permit category and provide detailed requirements:

Equipment Type: ${request.equipmentType}
Job Type: ${request.jobType}
BTU: ${request.btu || 'Not specified'}
Tonnage: ${request.tonnage || 'Not specified'}
Location: ${request.location.address}, ${request.location.city}, ${request.location.county}
Property Type: ${request.propertyType || 'Not specified'}
Additional Details: ${request.additionalDetails || 'None'}

Respond in JSON format with:
{
  "permitCategory": "one of: hvac-residential-replacement, hvac-residential-new, hvac-residential-ductwork, hvac-commercial",
  "accelaPermitType": "Accela permit type code",
  "reasoning": "Brief explanation of why this category applies",
  "specialConsiderations": ["any special notes or requirements"],
  "estimatedComplexity": "simple|moderate|complex"
}`;

      const message = await this.anthropic!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const result = JSON.parse(responseText);

      logger.info('AI classification complete', {
        category: result.permitCategory,
        complexity: result.estimatedComplexity,
      });

      return {
        permitCategory: result.permitCategory,
        accelaPermitType: result.accelaPermitType,
        reasoning: result.reasoning,
        specialConsiderations: result.specialConsiderations || [],
        estimatedComplexity: result.estimatedComplexity,
        method: 'ai',
      };
    } catch (error: any) {
      logger.error('AI classification failed, falling back to rules', {
        error: error.message,
      });
      return this.classifyRuleBased(request);
    }
  }

  /**
   * Rule-based classification (fallback)
   */
  private classifyRuleBased(request: PermitInfoRequest): PermitClassification {
    logger.info('Classifying permit with rules', {
      equipmentType: request.equipmentType,
      jobType: request.jobType,
    });

    let permitCategory: string;
    let accelaPermitType: string;
    let reasoning: string;
    let complexity: 'simple' | 'moderate' | 'complex';
    const specialConsiderations: string[] = [];

    // Determine property category
    const isCommercial = request.propertyType === 'commercial' || request.propertyType === 'industrial';

    if (isCommercial) {
      permitCategory = 'hvac-commercial';
      accelaPermitType = 'BLD-HVAC-COM';
      reasoning = 'Commercial property requires commercial HVAC permit';
      complexity = 'complex';
      specialConsiderations.push('Requires sealed engineering drawings');
      specialConsiderations.push('May require fire safety compliance');
    } else if (request.equipmentType === 'ductwork') {
      permitCategory = 'hvac-residential-ductwork';
      accelaPermitType = 'BLD-MECH-DUCTWORK';
      reasoning = 'Ductwork modification requires mechanical permit';
      complexity = 'moderate';
    } else if (request.jobType === 'replacement') {
      permitCategory = 'hvac-residential-replacement';
      accelaPermitType = 'BLD-HVAC-RES-REPL';
      reasoning = 'Like-for-like equipment replacement';
      complexity = 'simple';

      // Check for tonnage increase
      if (request.tonnage && request.tonnage > 5) {
        specialConsiderations.push('Large system (>5 tons) may require additional review');
        complexity = 'moderate';
      }
    } else if (request.jobType === 'new-installation') {
      // New installation
      permitCategory = 'hvac-residential-new';
      accelaPermitType = 'BLD-HVAC-RES-NEW';
      reasoning = 'New HVAC installation';
      complexity = 'moderate';
      specialConsiderations.push('Requires load calculation (Manual J per FBC 403.6.1)');
    } else {
      // Modification (minor ductwork, repairs, etc.)
      permitCategory = 'hvac-residential-modification';
      accelaPermitType = 'BLD-MECH-MOD';
      reasoning = 'HVAC system modification';
      complexity = 'moderate';
      specialConsiderations.push('Manual J not required for minor modifications');
    }

    // Additional checks
    if (request.btu && request.btu > 100000) {
      specialConsiderations.push('High BTU system may require additional inspection');
    }

    logger.info('Rule-based classification complete', {
      category: permitCategory,
      complexity,
    });

    return {
      permitCategory,
      accelaPermitType,
      reasoning,
      specialConsiderations,
      estimatedComplexity: complexity,
      method: 'rules',
    };
  }
}

export interface PermitClassification {
  permitCategory: string;
  accelaPermitType: string;
  reasoning: string;
  specialConsiderations: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  method: 'ai' | 'rules';
}

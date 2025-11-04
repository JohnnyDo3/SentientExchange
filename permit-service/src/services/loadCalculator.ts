/**
 * HVAC Load Calculator
 *
 * Generates simplified Manual J-style load calculations for residential HVAC systems.
 * Uses industry-standard rules of thumb adjusted for Florida climate.
 *
 * DISCLAIMER: This is a preliminary estimate. For new construction or complex systems,
 * verification by a licensed HVAC contractor or PE may be required.
 */

export interface LoadCalculationInput {
  squareFootage: number;
  yearBuilt: number;
  location: {
    city: string;
    county: string;
    zipCode: string;
  };
  equipmentTonnage?: number;
  ceilingHeight?: number;
  insulation?: 'poor' | 'fair' | 'good' | 'excellent';
  windowQuality?: 'single' | 'double' | 'low-e';
}

export interface LoadCalculationResult {
  recommendedTonnage: number;
  minTonnage: number;
  maxTonnage: number;
  calculatedBtuLoad: number;
  equipmentMatch: 'perfect' | 'acceptable' | 'oversized' | 'undersized';
  confidenceLevel: 'high' | 'medium' | 'low';
  methodology: string;
  breakdown: {
    baseLoad: number;
    climateAdjustment: number;
    insulationFactor: number;
    ceilingFactor: number;
    windowFactor: number;
  };
  warnings: string[];
  recommendations: string[];
}

export class LoadCalculator {
  /**
   * Florida climate zones (simplified)
   */
  private static readonly FLORIDA_HEAT_ZONES = {
    'north': { factor: 1.10, name: 'North Florida (Zone 2)' },
    'central': { factor: 1.15, name: 'Central Florida (Zone 1)' },
    'south': { factor: 1.20, name: 'South Florida (Zone 1)' },
  };

  /**
   * Insulation factors by decade built
   */
  private static readonly INSULATION_BY_DECADE = {
    before1980: { r_value: 'R-11 or less', factor: 1.20, quality: 'poor' },
    '1980s': { r_value: 'R-19 typical', factor: 1.10, quality: 'fair' },
    '1990s': { r_value: 'R-30 typical', factor: 1.05, quality: 'fair' },
    '2000s': { r_value: 'R-38 typical', factor: 1.00, quality: 'good' },
    '2010s': { r_value: 'R-49+ typical', factor: 0.95, quality: 'excellent' },
  };

  /**
   * Calculate recommended HVAC load
   */
  static calculate(input: LoadCalculationInput): LoadCalculationResult {
    // Step 1: Base load (BTU per sq ft)
    const baseRate = this.getBaseRate(input.ceilingHeight || 8);
    const baseLoad = input.squareFootage * baseRate;

    // Step 2: Climate adjustment (Florida is HOT!)
    const climateZone = this.getClimateZone(input.location.city, input.location.county);
    const climateAdjustment = baseLoad * (climateZone.factor - 1);

    // Step 3: Insulation factor
    const insulationData = this.getInsulationFactor(input.yearBuilt, input.insulation);
    const insulationAdjustment = baseLoad * (insulationData.factor - 1);

    // Step 4: Ceiling height factor (if >8ft)
    const ceilingHeight = input.ceilingHeight || 8;
    const ceilingFactor = ceilingHeight > 8 ? (ceilingHeight - 8) * 0.02 : 0;
    const ceilingAdjustment = baseLoad * ceilingFactor;

    // Step 5: Window factor (estimate if not provided)
    const windowFactor = this.getWindowFactor(input.yearBuilt, input.windowQuality);
    const windowAdjustment = baseLoad * windowFactor;

    // Total calculated load
    const calculatedBtuLoad = Math.round(
      baseLoad + climateAdjustment + insulationAdjustment + ceilingAdjustment + windowAdjustment
    );

    // Convert to tonnage (12,000 BTU = 1 ton)
    const recommendedTonnage = calculatedBtuLoad / 12000;
    const minTonnage = recommendedTonnage * 0.9; // -10%
    const maxTonnage = recommendedTonnage * 1.15; // +15% (Florida allows slight oversizing)

    // Check equipment match
    const equipmentMatch = this.evaluateEquipmentMatch(
      input.equipmentTonnage,
      recommendedTonnage,
      minTonnage,
      maxTonnage
    );

    // Confidence level
    const confidenceLevel = this.assessConfidence(input);

    // Warnings and recommendations
    const warnings = this.generateWarnings(input, equipmentMatch, recommendedTonnage);
    const recommendations = this.generateRecommendations(input, equipmentMatch, insulationData);

    return {
      recommendedTonnage: Math.round(recommendedTonnage * 10) / 10,
      minTonnage: Math.round(minTonnage * 10) / 10,
      maxTonnage: Math.round(maxTonnage * 10) / 10,
      calculatedBtuLoad,
      equipmentMatch,
      confidenceLevel,
      methodology: 'ACCA Manual J (Simplified) - Florida Residential',
      breakdown: {
        baseLoad: Math.round(baseLoad),
        climateAdjustment: Math.round(climateAdjustment),
        insulationFactor: Math.round(insulationAdjustment),
        ceilingFactor: Math.round(ceilingAdjustment),
        windowFactor: Math.round(windowAdjustment),
      },
      warnings,
      recommendations,
    };
  }

  /**
   * Base BTU rate per square foot (before adjustments)
   */
  private static getBaseRate(ceilingHeight: number): number {
    // Florida baseline: 18 BTU/sq ft for standard 8ft ceiling
    // This is conservative - adjustments will bring it to proper range
    // Rule of thumb: 400-600 sq ft per ton in Florida = 20-30 BTU/sq ft final
    return 18;
  }

  /**
   * Determine Florida climate zone
   */
  private static getClimateZone(city: string, county: string) {
    const cityLower = city.toLowerCase();
    const countyLower = county.toLowerCase();

    // North Florida (cooler)
    if (
      countyLower.includes('duval') ||
      countyLower.includes('nassau') ||
      cityLower.includes('jacksonville') ||
      cityLower.includes('tallahassee')
    ) {
      return this.FLORIDA_HEAT_ZONES.north;
    }

    // South Florida (hottest)
    if (
      countyLower.includes('miami-dade') ||
      countyLower.includes('broward') ||
      countyLower.includes('palm beach') ||
      cityLower.includes('miami') ||
      cityLower.includes('fort lauderdale')
    ) {
      return this.FLORIDA_HEAT_ZONES.south;
    }

    // Central Florida (default - Tampa, Orlando area)
    return this.FLORIDA_HEAT_ZONES.central;
  }

  /**
   * Get insulation factor based on year built
   */
  private static getInsulationFactor(yearBuilt: number, override?: string) {
    if (override) {
      const overrideMap: Record<string, typeof this.INSULATION_BY_DECADE.before1980> = {
        poor: this.INSULATION_BY_DECADE.before1980,
        fair: this.INSULATION_BY_DECADE['1990s'],
        good: this.INSULATION_BY_DECADE['2000s'],
        excellent: this.INSULATION_BY_DECADE['2010s'],
      };
      return overrideMap[override] || this.INSULATION_BY_DECADE['1990s'];
    }

    if (yearBuilt < 1980) return this.INSULATION_BY_DECADE.before1980;
    if (yearBuilt < 1990) return this.INSULATION_BY_DECADE['1980s'];
    if (yearBuilt < 2000) return this.INSULATION_BY_DECADE['1990s'];
    if (yearBuilt < 2010) return this.INSULATION_BY_DECADE['2000s'];
    return this.INSULATION_BY_DECADE['2010s'];
  }

  /**
   * Estimate window heat gain factor
   */
  private static getWindowFactor(yearBuilt: number, quality?: string): number {
    if (quality === 'low-e') return -0.05; // Low-E glass reduces load
    if (quality === 'double') return 0.0; // Double pane is neutral
    if (quality === 'single') return 0.10; // Single pane adds 10%

    // Estimate based on year built
    if (yearBuilt < 1990) return 0.08; // Older homes likely single pane
    if (yearBuilt < 2010) return 0.02; // Double pane became standard
    return -0.02; // Modern windows are better
  }

  /**
   * Evaluate if equipment tonnage matches calculated load
   */
  private static evaluateEquipmentMatch(
    equipmentTonnage: number | undefined,
    recommended: number,
    min: number,
    max: number
  ): 'perfect' | 'acceptable' | 'oversized' | 'undersized' {
    if (!equipmentTonnage) return 'acceptable'; // No equipment specified

    if (Math.abs(equipmentTonnage - recommended) < 0.3) return 'perfect';
    if (equipmentTonnage >= min && equipmentTonnage <= max) return 'acceptable';
    if (equipmentTonnage > max) return 'oversized';
    return 'undersized';
  }

  /**
   * Assess confidence in calculation
   */
  private static assessConfidence(input: LoadCalculationInput): 'high' | 'medium' | 'low' {
    let score = 0;

    // Higher confidence if we have more data
    if (input.ceilingHeight) score += 1;
    if (input.insulation) score += 1;
    if (input.windowQuality) score += 1;

    // Lower confidence for very old or very large homes
    if (input.yearBuilt < 1970) score -= 1;
    if (input.squareFootage > 3500) score -= 1;

    if (score >= 2) return 'high';
    if (score >= 0) return 'medium';
    return 'low';
  }

  /**
   * Generate warnings based on calculation
   */
  private static generateWarnings(
    input: LoadCalculationInput,
    match: string,
    recommended: number
  ): string[] {
    const warnings: string[] = [];

    if (match === 'oversized') {
      warnings.push(
        `Equipment may be oversized. ${input.equipmentTonnage} ton exceeds calculated need of ${recommended.toFixed(1)} ton.`
      );
      warnings.push('Oversized units cycle frequently, reducing efficiency and comfort.');
    }

    if (match === 'undersized') {
      warnings.push(
        `Equipment may be undersized. ${input.equipmentTonnage} ton is below calculated need of ${recommended.toFixed(1)} ton.`
      );
      warnings.push('Undersized units may struggle to maintain temperature in peak heat.');
    }

    if (input.yearBuilt < 1980) {
      warnings.push(
        'Pre-1980 construction may have poor insulation. Consider energy audit or insulation upgrade.'
      );
    }

    if (input.squareFootage > 3500) {
      warnings.push(
        'Large homes may benefit from zone systems or room-by-room Manual J calculation.'
      );
    }

    return warnings;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    input: LoadCalculationInput,
    match: string,
    insulation: any
  ): string[] {
    const recommendations: string[] = [];

    if (match === 'perfect' || match === 'acceptable') {
      recommendations.push('Equipment sizing is appropriate for this application.');
    }

    if (insulation.quality === 'poor' || insulation.quality === 'fair') {
      recommendations.push(
        'Consider attic insulation upgrade to reduce cooling costs (typical ROI: 3-5 years).'
      );
    }

    if (input.yearBuilt < 1990 && !input.windowQuality) {
      recommendations.push('Window upgrades could reduce cooling load by 10-15%.');
    }

    recommendations.push('Ensure proper duct sealing and insulation (saves 20-30% on energy).');
    recommendations.push('Annual maintenance improves efficiency and extends equipment life.');

    return recommendations;
  }
}

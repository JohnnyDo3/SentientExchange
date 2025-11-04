import { logger } from '../middleware/logger';

export interface PricingRequest {
  productType: string;
  targetMarket: 'smb' | 'enterprise' | 'individual';
  competitors?: Array<{
    name: string;
    price: number;
    features: number;
  }>;
  costs?: {
    cogs: number;
    overhead: number;
  };
}

export interface PricingStrategy {
  recommendedPricing: {
    monthly: number;
    annual: number;
    discountPercentage: number;
  };
  tiers: Array<{
    name: string;
    price: number;
    features: string[];
    targetCustomer: string;
  }>;
  competitivePosition: string;
  priceElasticity: number;
  profitMargin: number;
  recommendations: string[];
}

export class PricingOptimizerService {
  async optimizePricing(request: PricingRequest): Promise<PricingStrategy> {
    try {
      logger.info('Optimizing pricing:', {
        productType: request.productType,
        targetMarket: request.targetMarket,
        competitorsCount: request.competitors?.length || 0,
      });

      const competitorAvg = this.calculateCompetitorAverage(request.competitors || []);
      const recommendedPrice = this.calculateOptimalPrice(request, competitorAvg);
      const tiers = this.generatePricingTiers(request, recommendedPrice);
      const position = this.determineCompetitivePosition(recommendedPrice, competitorAvg);

      const strategy: PricingStrategy = {
        recommendedPricing: {
          monthly: recommendedPrice,
          annual: Math.round(recommendedPrice * 12 * 0.8), // 20% annual discount
          discountPercentage: 20,
        },
        tiers,
        competitivePosition: position,
        priceElasticity: this.estimatePriceElasticity(request.targetMarket),
        profitMargin: this.calculateProfitMargin(recommendedPrice, request.costs),
        recommendations: this.generateRecommendations(request, recommendedPrice, competitorAvg),
      };

      logger.info('Pricing optimization complete:', {
        recommendedPrice,
        tiersCount: tiers.length,
      });

      return strategy;
    } catch (error: any) {
      logger.error('Failed to optimize pricing:', error);
      throw new Error(`Failed to optimize pricing: ${error.message}`);
    }
  }

  private calculateCompetitorAverage(competitors: Array<{ name: string; price: number; features: number }>): number {
    if (competitors.length === 0) return 0;
    const sum = competitors.reduce((acc, c) => acc + c.price, 0);
    return sum / competitors.length;
  }

  private calculateOptimalPrice(request: PricingRequest, competitorAvg: number): number {
    // Base price on market segment
    let basePrice = 0;
    switch (request.targetMarket) {
      case 'individual':
        basePrice = 20;
        break;
      case 'smb':
        basePrice = 50;
        break;
      case 'enterprise':
        basePrice = 200;
        break;
    }

    // Adjust based on competitors
    if (competitorAvg > 0) {
      // Position slightly below market average for competitive advantage
      basePrice = Math.round(competitorAvg * 0.9);
    }

    // Adjust for costs if provided
    if (request.costs) {
      const minPrice = (request.costs.cogs + request.costs.overhead) * 2.5; // 60% margin
      basePrice = Math.max(basePrice, minPrice);
    }

    return basePrice;
  }

  private generatePricingTiers(request: PricingRequest, basePrice: number): PricingStrategy['tiers'] {
    return [
      {
        name: 'Free',
        price: 0,
        features: [
          'Basic features',
          'Limited usage',
          'Community support',
        ],
        targetCustomer: 'Individuals trying the product',
      },
      {
        name: 'Pro',
        price: basePrice,
        features: [
          'All basic features',
          'Unlimited usage',
          'Email support',
          'Advanced analytics',
          'API access',
        ],
        targetCustomer: request.targetMarket === 'individual' ? 'Power users' : 'Small teams',
      },
      {
        name: 'Team',
        price: basePrice * 2,
        features: [
          'All Pro features',
          'Team collaboration',
          'Priority support',
          'Custom integrations',
          'Advanced security',
        ],
        targetCustomer: 'Growing teams and departments',
      },
      {
        name: 'Enterprise',
        price: 0, // Custom pricing
        features: [
          'All Team features',
          'Dedicated support',
          'SLA guarantees',
          'Custom contracts',
          'On-premise deployment',
          'Unlimited users',
        ],
        targetCustomer: 'Large organizations',
      },
    ];
  }

  private determineCompetitivePosition(recommendedPrice: number, competitorAvg: number): string {
    if (competitorAvg === 0) return 'Market leader - no direct competitors';

    const ratio = recommendedPrice / competitorAvg;

    if (ratio < 0.7) return 'Budget-friendly option - 30%+ below market';
    if (ratio < 0.9) return 'Competitive value - slightly below market';
    if (ratio <= 1.1) return 'Market rate - aligned with competitors';
    if (ratio <= 1.3) return 'Premium positioning - above market average';
    return 'Luxury tier - significantly above market';
  }

  private estimatePriceElasticity(targetMarket: string): number {
    // Price elasticity: how much demand changes with price
    // Higher = more sensitive to price changes
    switch (targetMarket) {
      case 'individual':
        return 1.8; // Very elastic
      case 'smb':
        return 1.2; // Moderately elastic
      case 'enterprise':
        return 0.6; // Inelastic
      default:
        return 1.0;
    }
  }

  private calculateProfitMargin(price: number, costs?: { cogs: number; overhead: number }): number {
    if (!costs) return 0.7; // Assume 70% margin for SaaS

    const totalCost = costs.cogs + costs.overhead;
    return ((price - totalCost) / price) * 100;
  }

  private generateRecommendations(
    request: PricingRequest,
    recommendedPrice: number,
    competitorAvg: number
  ): string[] {
    const recommendations: string[] = [];

    if (competitorAvg > 0 && recommendedPrice < competitorAvg) {
      recommendations.push('Consider value-based messaging to justify lower pricing');
    }

    if (request.targetMarket === 'enterprise') {
      recommendations.push('Implement custom pricing negotiation for enterprise deals');
      recommendations.push('Offer volume discounts for 100+ users');
    }

    if (request.targetMarket === 'individual') {
      recommendations.push('Consider freemium model to increase user acquisition');
      recommendations.push('Offer monthly and annual billing options');
    }

    recommendations.push('Test pricing with A/B experiments before full rollout');
    recommendations.push('Monitor competitor pricing changes quarterly');
    recommendations.push('Consider usage-based pricing for scalability');

    return recommendations;
  }
}

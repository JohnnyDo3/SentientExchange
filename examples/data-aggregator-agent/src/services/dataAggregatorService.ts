import { logger } from '../middleware/logger';

export interface AggregationRequest {
  dataSources: Array<{
    name: string;
    data: any;
  }>;
  aggregationType: 'comparison' | 'market-share' | 'trend-analysis';
}

export interface AggregationResult {
  aggregatedData: any;
  insights: string[];
  visualizations: Array<{
    type: string;
    data: any;
  }>;
  summary: string;
  servicesUsed: string[];
}

export class DataAggregatorService {
  async aggregateData(request: AggregationRequest): Promise<AggregationResult> {
    try {
      logger.info('Aggregating data:', {
        sourcesCount: request.dataSources.length,
        type: request.aggregationType,
      });

      // In production: This agent would discover and call comparison/market-share services
      // For demo: We'll simulate the aggregation

      const aggregatedData = this.performAggregation(request);
      const insights = this.generateInsights(aggregatedData, request.aggregationType);
      const visualizations = this.createVisualizations(aggregatedData);
      const summary = this.generateSummary(aggregatedData, insights);

      const result: AggregationResult = {
        aggregatedData,
        insights,
        visualizations,
        summary,
        servicesUsed: [
          'comparison-matrix-service',
          'market-share-calculator',
        ],
      };

      logger.info('Data aggregation complete:', {
        insightsCount: insights.length,
        visualizationsCount: visualizations.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to aggregate data:', error);
      throw new Error(`Failed to aggregate data: ${error.message}`);
    }
  }

  private performAggregation(request: AggregationRequest): any {
    const { dataSources, aggregationType } = request;

    switch (aggregationType) {
      case 'comparison':
        return this.createComparisonMatrix(dataSources);
      case 'market-share':
        return this.calculateMarketShare(dataSources);
      case 'trend-analysis':
        return this.analyzeTrends(dataSources);
      default:
        throw new Error(`Unsupported aggregation type: ${aggregationType}`);
    }
  }

  private createComparisonMatrix(sources: Array<{ name: string; data: any }>): any {
    const matrix: any = {
      companies: sources.map(s => s.name),
      metrics: {},
    };

    // Extract common metrics
    const allMetrics = new Set<string>();
    sources.forEach(source => {
      if (source.data && typeof source.data === 'object') {
        Object.keys(source.data).forEach(key => allMetrics.add(key));
      }
    });

    // Build comparison matrix
    allMetrics.forEach(metric => {
      matrix.metrics[metric] = sources.map(source => source.data?.[metric] || 'N/A');
    });

    return matrix;
  }

  private calculateMarketShare(sources: Array<{ name: string; data: any }>): any {
    const totalRevenue = sources.reduce((sum, source) => {
      const revenue = parseFloat(source.data?.revenue || source.data?.marketSize || 0);
      return sum + revenue;
    }, 0);

    return {
      totalMarket: totalRevenue,
      shares: sources.map(source => {
        const revenue = parseFloat(source.data?.revenue || source.data?.marketSize || 0);
        return {
          name: source.name,
          revenue,
          share: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        };
      }).sort((a, b) => b.share - a.share),
    };
  }

  private analyzeTrends(sources: Array<{ name: string; data: any }>): any {
    return {
      trends: sources.map(source => ({
        name: source.name,
        direction: this.determineTrendDirection(source.data),
        strength: this.calculateTrendStrength(source.data),
        data: source.data,
      })),
    };
  }

  private determineTrendDirection(data: any): 'up' | 'down' | 'stable' {
    const growthRate = parseFloat(data?.growthRate || data?.cagr || 0);
    if (growthRate > 5) return 'up';
    if (growthRate < -5) return 'down';
    return 'stable';
  }

  private calculateTrendStrength(data: any): 'strong' | 'moderate' | 'weak' {
    const growthRate = Math.abs(parseFloat(data?.growthRate || data?.cagr || 0));
    if (growthRate > 20) return 'strong';
    if (growthRate > 10) return 'moderate';
    return 'weak';
  }

  private generateInsights(data: any, type: string): string[] {
    const insights: string[] = [];

    if (type === 'market-share' && data.shares) {
      const leader = data.shares[0];
      insights.push(`${leader.name} leads the market with ${leader.share.toFixed(1)}% share`);

      if (data.shares.length >= 2) {
        const secondPlace = data.shares[1];
        insights.push(`${secondPlace.name} holds ${secondPlace.share.toFixed(1)}% market share`);
      }

      const topThreeShare = data.shares.slice(0, 3).reduce((sum: number, s: any) => sum + s.share, 0);
      insights.push(`Top 3 players control ${topThreeShare.toFixed(1)}% of the market`);
    }

    if (type === 'comparison' && data.companies) {
      insights.push(`Compared ${data.companies.length} companies across ${Object.keys(data.metrics || {}).length} metrics`);
    }

    if (type === 'trend-analysis' && data.trends) {
      const upTrends = data.trends.filter((t: any) => t.direction === 'up').length;
      insights.push(`${upTrends} out of ${data.trends.length} showing positive growth`);
    }

    return insights;
  }

  private createVisualizations(data: any): Array<{ type: string; data: any }> {
    const visualizations: Array<{ type: string; data: any }> = [];

    if (data.shares) {
      visualizations.push({
        type: 'pie-chart',
        data: {
          labels: data.shares.map((s: any) => s.name),
          values: data.shares.map((s: any) => s.share),
        },
      });
    }

    if (data.trends) {
      visualizations.push({
        type: 'line-chart',
        data: {
          datasets: data.trends.map((t: any) => ({
            label: t.name,
            direction: t.direction,
            strength: t.strength,
          })),
        },
      });
    }

    return visualizations;
  }

  private generateSummary(data: any, insights: string[]): string {
    return `Data aggregation complete. ${insights.join('. ')}.`;
  }
}

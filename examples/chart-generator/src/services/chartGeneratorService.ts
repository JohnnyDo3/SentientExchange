import { logger } from '../middleware/logger';

export interface ChartRequest {
  type: 'line' | 'bar' | 'pie' | 'radar' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }>;
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    legend?: { display: boolean; position?: string };
  };
}

export interface ChartResult {
  chartConfig: any;
  imageUrl?: string;
  embedCode: string;
  downloadUrl?: string;
}

export class ChartGeneratorService {
  async generateChart(request: ChartRequest): Promise<ChartResult> {
    try {
      logger.info('Generating chart:', {
        type: request.type,
        title: request.title,
        datasetsCount: request.data.datasets.length,
      });

      const chartConfig = this.buildChartConfig(request);
      const embedCode = this.generateEmbedCode(chartConfig);

      const result: ChartResult = {
        chartConfig,
        embedCode,
        imageUrl: `data:image/png;base64,${this.generatePlaceholderImage()}`,
      };

      logger.info('Chart generated successfully');
      return result;
    } catch (error: any) {
      logger.error('Failed to generate chart:', error);
      throw new Error(`Failed to generate chart: ${error.message}`);
    }
  }

  private buildChartConfig(request: ChartRequest): any {
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: request.title,
        },
      },
    };

    return {
      type: request.type,
      data: {
        labels: request.data.labels,
        datasets: request.data.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || this.getDefaultColor(index),
          borderColor: dataset.borderColor || this.getDefaultColor(index),
          borderWidth: 2,
        })),
      },
      options: { ...defaultOptions, ...request.options },
    };
  }

  private generateEmbedCode(chartConfig: any): string {
    const configJson = JSON.stringify(chartConfig, null, 2);

    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="myChart"></canvas>
  <script>
    const ctx = document.getElementById('myChart').getContext('2d');
    const config = ${configJson};
    new Chart(ctx, config);
  </script>
</body>
</html>`;
  }

  private getDefaultColor(index: number): string {
    const colors = [
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 99, 132, 0.8)',   // Red
      'rgba(75, 192, 192, 0.8)',   // Green
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
    ];
    return colors[index % colors.length];
  }

  private generatePlaceholderImage(): string {
    // Placeholder base64 image (1x1 transparent PNG)
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

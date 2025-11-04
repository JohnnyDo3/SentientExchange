import { logger } from '../middleware/logger';

export interface PDFRequest {
  title: string;
  content: Array<{
    type: 'heading' | 'paragraph' | 'list' | 'image' | 'table';
    text?: string;
    items?: string[];
    level?: number;
    imageUrl?: string;
    tableData?: {
      headers: string[];
      rows: string[][];
    };
  }>;
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

export interface PDFResult {
  pdfBase64: string;
  pageCount: number;
  fileSize: number;
  downloadUrl: string;
}

export class PDFGeneratorService {
  async generatePDF(request: PDFRequest): Promise<PDFResult> {
    try {
      logger.info('Generating PDF:', {
        title: request.title,
        contentBlocks: request.content.length,
      });

      // For demo: generate a simple PDF structure as base64
      const pdfContent = this.buildPDFContent(request);
      const pdfBase64 = Buffer.from(pdfContent).toString('base64');

      const result: PDFResult = {
        pdfBase64,
        pageCount: Math.ceil(request.content.length / 10),
        fileSize: Buffer.from(pdfContent).length,
        downloadUrl: `data:application/pdf;base64,${pdfBase64}`,
      };

      logger.info('PDF generated successfully:', {
        pageCount: result.pageCount,
        fileSize: result.fileSize,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to generate PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  private buildPDFContent(request: PDFRequest): string {
    // Simple text representation for demo
    // In production, use PDFKit to generate actual PDF
    let content = `PDF Document\n\n`;
    content += `Title: ${request.title}\n`;
    content += `Author: ${request.metadata?.author || 'AgentMarket PDF Generator'}\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `${'='.repeat(60)}\n\n`;

    request.content.forEach((block, index) => {
      switch (block.type) {
        case 'heading':
          const level = block.level || 1;
          content += `${'#'.repeat(level)} ${block.text}\n\n`;
          break;
        case 'paragraph':
          content += `${block.text}\n\n`;
          break;
        case 'list':
          block.items?.forEach((item) => {
            content += `  • ${item}\n`;
          });
          content += '\n';
          break;
        case 'table':
          if (block.tableData) {
            content += `Table:\n`;
            content += block.tableData.headers.join(' | ') + '\n';
            content += '-'.repeat(60) + '\n';
            block.tableData.rows.forEach((row) => {
              content += row.join(' | ') + '\n';
            });
            content += '\n';
          }
          break;
        case 'image':
          content += `[Image: ${block.imageUrl || 'embedded'}]\n\n`;
          break;
      }
    });

    return content;
  }

  /**
   * Get supported content types
   */
  getSupportedTypes(): string[] {
    return ['heading', 'paragraph', 'list', 'image', 'table'];
  }

  /**
   * Validate PDF request
   */
  validateRequest(request: PDFRequest): boolean {
    if (!request.title || request.title.trim().length === 0) {
      throw new Error('PDF title is required');
    }

    if (!request.content || request.content.length === 0) {
      throw new Error('PDF content cannot be empty');
    }

    // Validate each content block
    request.content.forEach((block, index) => {
      if (!this.getSupportedTypes().includes(block.type)) {
        throw new Error(`Unsupported content type at block ${index}: ${block.type}`);
      }
    });

    return true;
  }
}

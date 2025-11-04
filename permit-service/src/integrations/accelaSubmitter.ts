/**
 * Accela Auto-Submission Service
 * Automatically submits permit applications to Tampa's Accela Civic Platform
 * Supports mock mode for testing without real credentials
 */

import { AccelaClient } from './accela-client';
import { FormGeneratorRequest } from '../utils/validation';
import tampaConfig from '../config/counties/hillsborough';
import { logger } from '../middleware/logger';
import { randomUUID } from 'crypto';

const MOCK_MODE = process.env.ACCELA_MOCK_MODE === 'true';

interface AccelaSubmissionResult {
  success: boolean;
  recordId: string;
  url: string;
  mockMode?: boolean;
}

export class AccelaSubmitter {
  private client: AccelaClient | null;

  constructor() {
    if (MOCK_MODE) {
      logger.info('AccelaSubmitter initialized in MOCK MODE');
      this.client = null;
    } else {
      this.client = new AccelaClient();
      logger.info('AccelaSubmitter initialized with real Accela client');
    }
  }

  /**
   * Submit permit application to Tampa's Accela system
   *
   * @param permitData - Permit information from chat session
   * @param pdfs - Array of PDF documents to attach
   * @returns Accela record ID and URL
   */
  async submitToTampa(
    permitData: FormGeneratorRequest,
    pdfs: Array<{ name: string; description?: string; pdf: string }>
  ): Promise<AccelaSubmissionResult> {
    if (MOCK_MODE) {
      return this.mockSubmit(permitData, pdfs);
    }

    if (!this.client) {
      throw new Error('Accela client not initialized');
    }

    try {
      logger.info('Starting Accela submission', {
        county: permitData.permitInfo.location.county,
        equipmentType: permitData.permitInfo.equipmentType,
        jobType: permitData.permitInfo.jobType,
      });

      // Prepare record data with field mapping
      const recordData = this.mapToAccelaRecord(permitData);

      // Create record via Accela API
      logger.debug('Creating Accela record', { recordData });
      const response = await this.client.post('/v4/records', recordData);

      if (!response.result || !response.result.id) {
        throw new Error('No record ID returned from Accela');
      }

      const recordId = response.result.id;
      logger.info('Accela record created', { recordId });

      // Upload PDF documents
      await this.uploadDocuments(recordId, pdfs);

      // Set custom form data (equipment details)
      await this.setCustomFormData(recordId, permitData);

      // Generate Accela portal URL
      const url = this.generateAccelaUrl(recordId);

      logger.info('Accela submission completed successfully', {
        recordId,
        url,
      });

      return {
        success: true,
        recordId,
        url,
      };
    } catch (error: any) {
      logger.error('Accela submission failed', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Accela submission failed: ${error.message}`);
    }
  }

  /**
   * Map permit data to Accela record format
   */
  private mapToAccelaRecord(permitData: FormGeneratorRequest): any {
    const { permitInfo, contractor, property, installation } = permitData;

    // Split contractor name into first/last
    const nameParts = contractor.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Split owner name
    const ownerParts = property.ownerName.trim().split(' ');
    const ownerFirstName = ownerParts[0] || '';
    const ownerLastName = ownerParts.slice(1).join(' ') || '';

    return {
      type: 'BLD/HVAC/NA/NA', // Default Accela record type for HVAC permits
      description: `HVAC ${permitInfo.jobType} - ${permitInfo.equipmentType}`,

      // Address information
      addresses: [
        {
          streetStart: permitInfo.location.address,
          city: permitInfo.location.city,
          state: 'FL',
          zip: permitInfo.location.zipCode,
          addressType: 'Property',
        },
      ],

      // Contractor contact
      contacts: [
        {
          type: 'Contractor',
          firstName,
          lastName,
          businessName: contractor.name,
          phone1: contractor.phone,
          email: contractor.email,
        },
      ],

      // Property owner
      parcels: [
        {
          parcelNumber: property.parcelId || 'TBD',
        },
      ],

      // Owner information
      owners: [
        {
          firstName: ownerFirstName,
          lastName: ownerLastName,
          phone: property.ownerPhone,
        },
      ],

      // Professional information (contractor license)
      professionals: [
        {
          licenseType: 'HVAC Contractor',
          licenseNumber: contractor.licenseNumber,
          businessName: contractor.name,
          firstName,
          lastName,
          phone: contractor.phone,
          email: contractor.email,
        },
      ],

      // Work description
      workDescription: installation.description || `${permitInfo.jobType} of ${permitInfo.equipmentType}`,

      // Valuation
      estimatedCostOfConstruction: installation.estimatedCost,
    };
  }

  /**
   * Upload PDF documents to Accela record
   */
  private async uploadDocuments(
    recordId: string,
    pdfs: Array<{ name: string; description?: string; pdf: string }>
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    logger.info('Uploading documents to Accela', {
      recordId,
      documentCount: pdfs.length,
    });

    for (const pdf of pdfs) {
      try {
        const pdfBuffer = Buffer.from(pdf.pdf, 'base64');

        await this.client.uploadDocument(recordId, {
          name: pdf.name,
          description: pdf.description || 'Permit application document',
          file: pdfBuffer,
        });

        logger.debug('Document uploaded', {
          recordId,
          documentName: pdf.name,
          size: pdfBuffer.length,
        });
      } catch (error: any) {
        logger.error('Document upload failed', {
          recordId,
          documentName: pdf.name,
          error: error.message,
        });
        // Continue with other documents even if one fails
      }
    }
  }

  /**
   * Set custom form data (equipment specifications)
   */
  private async setCustomFormData(
    recordId: string,
    permitData: FormGeneratorRequest
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const { permitInfo, equipmentDetails, installation } = permitData;

    try {
      const customData = {
        equipmentType: permitInfo.equipmentType,
        tonnage: permitInfo.tonnage,
        manufacturer: equipmentDetails.manufacturer,
        model: equipmentDetails.model,
        serialNumber: equipmentDetails.serialNumber,
        efficiency: equipmentDetails.efficiency,
        estimatedCost: installation.estimatedCost,
        workDescription: installation.description,
      };

      await this.client.put(`/v4/records/${recordId}/customForms`, customData);

      logger.debug('Custom form data set', { recordId });
    } catch (error: any) {
      logger.error('Failed to set custom form data', {
        recordId,
        error: error.message,
      });
      // Non-fatal error, continue
    }
  }

  /**
   * Generate Accela portal URL for record
   */
  private generateAccelaUrl(recordId: string): string {
    const environment = process.env.ACCELA_ENVIRONMENT || 'TEST';
    const agency = process.env.ACCELA_AGENCY || 'tampa';

    if (environment === 'PROD') {
      return `https://aca-prod.accela.com/${agency}/Cap/CapDetail.aspx?Module=Permits&capID=${recordId}`;
    } else {
      return `https://aca-test.accela.com/${agency}/Cap/CapDetail.aspx?Module=Permits&capID=${recordId}`;
    }
  }

  /**
   * Mock submission for testing without real Accela credentials
   */
  private async mockSubmit(
    permitData: FormGeneratorRequest,
    pdfs: Array<{ name: string; description?: string; pdf: string }>
  ): Promise<AccelaSubmissionResult> {
    logger.warn('MOCK MODE: Simulating Accela submission', {
      equipmentType: permitData.permitInfo.equipmentType,
      jobType: permitData.permitInfo.jobType,
      documentCount: pdfs.length,
    });

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate fake record ID
    const mockRecordId = `MOCK-${Date.now()}-${randomUUID().substring(0, 8)}`;
    const mockUrl = `https://aca-test.accela.com/tampa/Cap/CapDetail.aspx?Module=Permits&capID=${mockRecordId}`;

    // Log what would have been submitted
    const recordData = this.mapToAccelaRecord(permitData);
    logger.info('MOCK: Would have created Accela record', {
      recordData,
      documentCount: pdfs.length,
      documents: pdfs.map(p => ({
        name: p.name,
        description: p.description,
        sizeKB: Math.round(Buffer.from(p.pdf, 'base64').length / 1024),
      })),
    });

    return {
      success: true,
      recordId: mockRecordId,
      url: mockUrl,
      mockMode: true,
    };
  }
}

export default AccelaSubmitter;

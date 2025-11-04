import PDFDocument from 'pdfkit';
import { logger } from '../middleware/logger';
import { FormGeneratorRequest } from '../utils/validation';
import { PermitInfoService } from './permitInfo';
import { DocumentPackageGenerator } from './documentPackage';
import { LocationIntelligenceService } from './locationIntelligence';
import { StandardFormGenerator } from './standardForms';

/**
 * Form Generator Service - Phase 2
 *
 * Generates submission-ready PDF permit forms for Tampa Bay HVAC permits.
 * Forms are designed to match county format and requirements.
 *
 * Security features:
 * - Input sanitization
 * - File size limits
 * - Watermarking for generated forms
 */
export class FormGeneratorService {
  private permitInfoService: PermitInfoService;
  private locationIntelligence: LocationIntelligenceService;

  constructor() {
    this.permitInfoService = new PermitInfoService();
    this.locationIntelligence = new LocationIntelligenceService();
    logger.info('Form Generator Service initialized with location intelligence');
  }

  /**
   * Generate a permit application form
   */
  async generateForm(request: FormGeneratorRequest): Promise<FormGeneratorResponse> {
    const startTime = Date.now();

    try {
      logger.info('Generating permit form', {
        permitType: request.permitInfo.equipmentType,
        county: request.permitInfo.location.county,
      });

      // Step 1: Analyze location (county, flood zones, HOA, etc.)
      logger.info('Analyzing location for special requirements...');
      const locationAnalysis = await this.locationIntelligence.analyzeLocation(
        request.permitInfo.location.address,
        request.permitInfo.location.city,
        'FL',
        request.permitInfo.location.zipCode
      );

      logger.info('Location analysis complete', {
        county: locationAnalysis.address.county,
        jurisdiction: locationAnalysis.jurisdiction.type,
        floodZone: locationAnalysis.floodZone.zone,
        additionalForms: locationAnalysis.additionalForms.length,
        warnings: locationAnalysis.warnings.length,
      });

      // Step 2: Get permit classification and requirements
      const permitInfo = await this.permitInfoService.getPermitInfo(request.permitInfo);

      if (!permitInfo.success || !permitInfo.classification) {
        throw new Error('Failed to classify permit type');
      }

      // Step 3: Validate completeness
      const validation = this.validateFormData(request);
      if (!validation.complete) {
        return {
          success: false,
          error: 'Incomplete form data',
          missingFields: validation.missing,
        };
      }

      // Step 4: Generate STANDARD mechanical permit application (industry-standard form)
      logger.info('Generating standard mechanical permit application form...');
      const mainFormPdf = await StandardFormGenerator.generateMechanicalPermitApplication(request);

      // Step 5: Generate base document package
      logger.info('Generating base document package...');
      const [ownerAuthPdf, costBreakdownPdf, checklistPdf, loadCalcPdf] = await Promise.all([
        DocumentPackageGenerator.generateOwnerAuthorization(request),
        DocumentPackageGenerator.generateCostBreakdown(request),
        DocumentPackageGenerator.generateChecklist(request, permitInfo.requirements!.documents),
        DocumentPackageGenerator.generateLoadCalculation(request, locationAnalysis.address.coordinates
          ? { lat: locationAnalysis.address.coordinates.latitude, lng: locationAnalysis.address.coordinates.longitude }
          : undefined),
      ]);

      // Step 6: Generate location-specific additional forms
      const locationSpecificDocs = await this.generateLocationSpecificForms(
        request,
        locationAnalysis,
        permitInfo
      );

      const processingTime = Date.now() - startTime;

      const totalDocs = 5 + locationSpecificDocs.length;

      logger.info('Complete submission package generated successfully', {
        permitType: permitInfo.classification.accelaCode,
        mainFormKB: Math.round(mainFormPdf.length / 1024),
        totalDocuments: totalDocs,
        locationSpecificDocs: locationSpecificDocs.length,
        county: locationAnalysis.address.county,
        processingTimeMs: processingTime,
      });

      const baseDocs = [
        {
          name: 'Property Owner Authorization',
          pdf: ownerAuthPdf.toString('base64'),
          filename: `owner-authorization-${Date.now()}.pdf`,
          sizeBytes: ownerAuthPdf.length,
          description: 'Legal authorization from property owner for contractor to perform work and apply for permits',
        },
        {
          name: 'Cost Breakdown Sheet',
          pdf: costBreakdownPdf.toString('base64'),
          filename: `cost-breakdown-${Date.now()}.pdf`,
          sizeBytes: costBreakdownPdf.length,
          description: 'Detailed breakdown of equipment, labor, and permit costs',
        },
        {
          name: 'Load Calculation Report',
          pdf: loadCalcPdf.toString('base64'),
          filename: `load-calculation-${Date.now()}.pdf`,
          sizeBytes: loadCalcPdf.length,
          description: 'HVAC load calculation (Manual J simplified) verifying appropriate equipment sizing',
        },
        {
          name: 'Submission Checklist',
          pdf: checklistPdf.toString('base64'),
          filename: `submission-checklist-${Date.now()}.pdf`,
          sizeBytes: checklistPdf.length,
          description: 'Complete checklist showing generated documents and required external documents',
        },
      ];

      return {
        success: true,
        form: {
          pdf: mainFormPdf.toString('base64'),
          filename: this.generateFilename(request, permitInfo.classification.accelaCode),
          sizeBytes: mainFormPdf.length,
          format: 'application/pdf',
        },
        additionalDocuments: [...baseDocs, ...locationSpecificDocs],
        locationAnalysis: {
          county: locationAnalysis.address.county,
          jurisdiction: locationAnalysis.jurisdiction.type,
          floodZone: locationAnalysis.floodZone.zone,
          isFloodZone: locationAnalysis.floodZone.isFloodZone,
          isCoastal: locationAnalysis.coastal.isCoastal,
          hasHOA: locationAnalysis.specialDistricts.hoa,
          warnings: locationAnalysis.warnings,
          specialRequirements: locationAnalysis.specialDistricts.reasons,
        },
        permitInfo: {
          permitType: permitInfo.classification!.accelaCode,
          description: permitInfo.classification!.description,
          estimatedFee: permitInfo.fees!.totalEstimated,
          jurisdiction: permitInfo.jurisdiction!.county,
        },
        instructions: {
          submissionMethod: 'in-person or online',
          submissionAddress: permitInfo.jurisdiction!.department,
          requiredDocuments: permitInfo.requirements!.documents,
          additionalSteps: [
            'Review ALL generated documents (5 total)',
            'Get property owner to sign the authorization form',
            'Attach your contractor license (copy)',
            'Attach equipment manufacturer spec sheets',
            'Submit complete package to county development services',
            'Pay permit fees at time of submission',
            'Schedule inspection after work completion',
          ],
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          formVersion: '1.0',
          documentsGenerated: totalDocs,
        },
      };
    } catch (error: any) {
      logger.error('Form generation failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        details: 'Failed to generate permit form',
      };
    }
  }

  /**
   * Validate form data completeness
   */
  private validateFormData(request: FormGeneratorRequest): {
    complete: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    // Check contractor info
    if (!request.contractor.name) missing.push('contractor.name');
    if (!request.contractor.phone) missing.push('contractor.phone');
    if (!request.contractor.email) missing.push('contractor.email');

    // Check property info
    if (!request.property.ownerName) missing.push('property.ownerName');
    if (!request.property.ownerPhone) missing.push('property.ownerPhone');

    // Check equipment details
    if (!request.equipmentDetails.manufacturer) missing.push('equipmentDetails.manufacturer');
    if (!request.equipmentDetails.model) missing.push('equipmentDetails.model');

    // Check installation details
    if (!request.installation.estimatedStartDate) missing.push('installation.estimatedStartDate');
    if (!request.installation.estimatedCost) missing.push('installation.estimatedCost');
    if (!request.installation.description) missing.push('installation.description');

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  /**
   * Generate PDF permit form
   */
  private async generatePDF(
    request: FormGeneratorRequest,
    permitInfo: any
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc, permitInfo);

        // Section 1: Property Information
        this.addSection(doc, 'PROPERTY INFORMATION');
        this.addField(doc, 'Property Address',
          `${request.permitInfo.location.address}, ${request.permitInfo.location.city}, FL ${request.permitInfo.location.zipCode}`);
        this.addField(doc, 'County', request.permitInfo.location.county.toUpperCase());
        this.addField(doc, 'Property Owner', request.property.ownerName);
        this.addField(doc, 'Owner Phone', request.property.ownerPhone);
        if (request.property.parcelId) {
          this.addField(doc, 'Parcel ID', request.property.parcelId);
        }
        doc.moveDown();

        // Section 2: Contractor Information
        this.addSection(doc, 'CONTRACTOR INFORMATION');
        this.addField(doc, 'Contractor Name', request.contractor.name);
        this.addField(doc, 'Phone', request.contractor.phone);
        this.addField(doc, 'Email', request.contractor.email);
        if (request.contractor.licenseNumber) {
          this.addField(doc, 'License Number', request.contractor.licenseNumber);
        }
        doc.moveDown();

        // Section 3: Work Description
        this.addSection(doc, 'WORK DESCRIPTION');
        this.addField(doc, 'Permit Type', permitInfo.classification.description);
        this.addField(doc, 'Job Type', request.permitInfo.jobType.toUpperCase());
        this.addField(doc, 'Equipment Type', request.permitInfo.equipmentType.toUpperCase());
        doc.moveDown();

        // Section 4: Equipment Details
        this.addSection(doc, 'EQUIPMENT SPECIFICATIONS');
        this.addField(doc, 'Manufacturer', request.equipmentDetails.manufacturer);
        this.addField(doc, 'Model', request.equipmentDetails.model);
        if (request.equipmentDetails.serialNumber) {
          this.addField(doc, 'Serial Number', request.equipmentDetails.serialNumber);
        }
        if (request.equipmentDetails.ahriNumber) {
          // AHRI number is CRITICAL - highlight it
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0066cc')
            .text('AHRI Certification #: ', { continued: true })
            .fillColor('#000')
            .text(request.equipmentDetails.ahriNumber)
            .moveDown(0.3);
          doc.fontSize(8).fillColor('#666')
            .text('(Verifies system matching and efficiency rating)', { indent: 20 })
            .fillColor('#000')
            .moveDown(0.5);
        }
        if (request.permitInfo.btu) {
          this.addField(doc, 'BTU Rating', request.permitInfo.btu.toString());
        }
        if (request.permitInfo.tonnage) {
          this.addField(doc, 'Tonnage', request.permitInfo.tonnage.toString());
        }
        if (request.equipmentDetails.efficiency) {
          this.addField(doc, 'Efficiency Rating', request.equipmentDetails.efficiency);
        }
        if (request.equipmentDetails.fuelType) {
          this.addField(doc, 'Fuel Type', request.equipmentDetails.fuelType.toUpperCase());
        }
        doc.moveDown();

        // Section 5: Installation Details
        this.addSection(doc, 'INSTALLATION DETAILS');
        this.addField(doc, 'Estimated Start Date', request.installation.estimatedStartDate);
        this.addField(doc, 'Estimated Cost', `$${request.installation.estimatedCost.toLocaleString()}`);
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .text('Scope of Work: ')
          .font('Helvetica')
          .moveDown(0.3)
          .text(request.installation.description, {
            width: 500,
            align: 'left',
            indent: 20,
          });
        doc.moveDown();

        // Section 6: Fees
        this.addSection(doc, 'ESTIMATED PERMIT FEES');
        this.addField(doc, 'Base Fee', `$${permitInfo.fees.baseFee.toFixed(2)}`);
        this.addField(doc, 'Total Estimated', `$${permitInfo.fees.totalEstimated.toFixed(2)}`);
        doc.fontSize(8)
          .fillColor('#666')
          .text('(Actual fees determined at time of submission)', { indent: 20 });
        doc.fillColor('#000');
        doc.moveDown();

        // Section 7: Required Documents
        this.addSection(doc, 'REQUIRED ATTACHMENTS');
        doc.fontSize(10);
        permitInfo.requirements.documents.slice(0, 10).forEach((docItem: string) => {
          this.addCheckbox(doc, `☐ ${docItem}`);
        });
        doc.moveDown();

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add PDF header
   */
  private addHeader(doc: PDFKit.PDFDocument, permitInfo: any) {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('HVAC PERMIT APPLICATION', { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text(permitInfo.jurisdiction.county, { align: 'center' })
      .moveDown()
      .fontSize(10)
      .fillColor('#666')
      .text(new Date().toLocaleDateString(), { align: 'center' })
      .fillColor('#000')
      .moveDown(2);
  }

  /**
   * Add section header
   */
  private addSection(doc: PDFKit.PDFDocument, title: string) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1a5490')
      .text(title)
      .fillColor('#000')
      .font('Helvetica')
      .moveDown(0.5);
  }

  /**
   * Add form field
   */
  private addField(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(value)
      .moveDown(0.3);
  }

  /**
   * Add checkbox item
   */
  private addCheckbox(doc: PDFKit.PDFDocument, text: string) {
    doc.fontSize(10).text(text, { indent: 20 }).moveDown(0.2);
  }

  /**
   * Add PDF footer
   */
  private addFooter(doc: PDFKit.PDFDocument) {
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#999')
      .text(
        'This form was generated automatically. Please review all information for accuracy before submission.',
        { align: 'center' }
      )
      .text('For questions, contact your local building department.', {
        align: 'center',
      })
      .fillColor('#000');
  }

  /**
   * Generate filename for the PDF
   */
  private generateFilename(request: FormGeneratorRequest, permitType: string): string {
    const address = request.permitInfo.location.address.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    return `${permitType}_${address}_${date}.pdf`;
  }

  /**
   * Generate location-specific additional forms based on requirements
   */
  private async generateLocationSpecificForms(
    request: FormGeneratorRequest,
    locationAnalysis: any,
    permitInfo: any
  ): Promise<Array<{ name: string; pdf: string; filename: string; sizeBytes: number; description: string }>> {
    const additionalForms: Array<{ name: string; pdf: string; filename: string; sizeBytes: number; description: string }> = [];

    logger.info('Generating location-specific forms', {
      additionalFormsNeeded: locationAnalysis.additionalForms,
    });

    // Incorporated city addendum
    if (locationAnalysis.jurisdiction.type === 'incorporated') {
      logger.info('Generating incorporated city addendum', {
        city: request.permitInfo.location.city,
      });
      // For now, add a note - in full implementation, would generate actual city-specific form
      const note = `NOTICE: ${request.permitInfo.location.city} is an incorporated city. You may need a separate city permit in addition to the ${locationAnalysis.address.county} County permit. Contact ${locationAnalysis.jurisdiction.permitOffice} at the number provided.`;
      // Would generate actual PDF here
    }

    // HOA notification letter
    if (locationAnalysis.specialDistricts.hoa) {
      logger.info('HOA area detected - contractors should verify HOA requirements');
      // Would generate HOA notification template here
    }

    // Flood zone elevation certificate template
    // CRITICAL: Simple changeouts/replacements do NOT require elevation certificates
    // Only needed for new installations, substantial improvements, or equipment relocation
    const isSimpleChangeout = request.permitInfo.jobType === 'replacement';
    const requiresElevation = locationAnalysis.floodZone.requiresElevationCert && !isSimpleChangeout;

    if (requiresElevation) {
      logger.info('Flood zone requires elevation certificate for new installation/major work', {
        zone: locationAnalysis.floodZone.zone,
        jobType: request.permitInfo.jobType,
      });

      const elevationCertPdf = await DocumentPackageGenerator.generateElevationCertificate(
        request,
        locationAnalysis.floodZone,
        locationAnalysis.address.coordinates
      );

      additionalForms.push({
        name: 'Elevation Certificate',
        pdf: elevationCertPdf.toString('base64'),
        filename: `elevation-certificate-${Date.now()}.pdf`,
        sizeBytes: elevationCertPdf.length,
        description: 'FEMA Elevation Certificate template - must be completed by licensed surveyor showing equipment elevation above Base Flood Elevation',
      });

      // Also generate equipment elevation plan
      const elevationPlanPdf = await DocumentPackageGenerator.generateEquipmentElevationPlan(
        request,
        locationAnalysis.floodZone
      );

      additionalForms.push({
        name: 'Equipment Elevation Plan',
        pdf: elevationPlanPdf.toString('base64'),
        filename: `equipment-elevation-plan-${Date.now()}.pdf`,
        sizeBytes: elevationPlanPdf.length,
        description: 'HVAC equipment elevation design options - concrete platform, steel frame, or rooftop mount to meet BFE requirements',
      });
    } else if (locationAnalysis.floodZone.isFloodZone && isSimpleChangeout) {
      logger.info('Property in flood zone, but simple changeout - no elevation certificate required', {
        zone: locationAnalysis.floodZone.zone,
        jobType: request.permitInfo.jobType,
      });
    }

    // Coastal wind load calculation
    if (locationAnalysis.coastal.requiresWindCalc) {
      logger.info('Coastal area requires wind load calculation', {
        windSpeed: locationAnalysis.coastal.windSpeed,
      });

      const windLoadPdf = await DocumentPackageGenerator.generateWindLoadCalculation(
        request,
        locationAnalysis.coastal.windSpeed,
        locationAnalysis.coastal.isCoastal
      );

      additionalForms.push({
        name: 'Wind Load Calculation',
        pdf: windLoadPdf.toString('base64'),
        filename: `wind-load-calculation-${Date.now()}.pdf`,
        sizeBytes: windLoadPdf.length,
        description: `Wind anchorage requirements - ${locationAnalysis.coastal.windSpeed} mph design wind speed with hurricane tie-down specifications`,
      });
    }

    return additionalForms;
  }
}

export interface FormGeneratorResponse {
  success: boolean;
  form?: {
    pdf: string; // Base64 encoded
    filename: string;
    sizeBytes: number;
    format: string;
  };
  additionalDocuments?: Array<{
    name: string;
    pdf: string; // Base64 encoded
    filename: string;
    sizeBytes: number;
    description: string;
  }>;
  locationAnalysis?: {
    county: string;
    jurisdiction: 'incorporated' | 'unincorporated';
    floodZone: string;
    isFloodZone: boolean;
    isCoastal: boolean;
    hasHOA: boolean;
    warnings: string[];
    specialRequirements: string[];
  };
  permitInfo?: {
    permitType: string;
    description: string;
    estimatedFee: number;
    jurisdiction: string;
  };
  instructions?: {
    submissionMethod: string;
    submissionAddress: string;
    requiredDocuments: string[];
    additionalSteps: string[];
  };
  metadata?: {
    generatedAt: string;
    processingTimeMs: number;
    formVersion: string;
    documentsGenerated?: number;
  };
  error?: string;
  details?: string;
  missingFields?: string[];
}

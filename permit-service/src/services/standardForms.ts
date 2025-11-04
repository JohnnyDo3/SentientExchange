/**
 * Standard Permit Application Form Generator
 *
 * Generates industry-standard permit application forms that match
 * the format used by building departments in Florida.
 *
 * These are NOT custom forms - they match the standard structure
 * that contractors fill out every day.
 */

import PDFDocument from 'pdfkit';
import { FormGeneratorRequest } from '../utils/validation';
import { applyCountyBranding, addAIAttribution } from './countyBranding';

export class StandardFormGenerator {
  /**
   * Generate Standard HVAC/Mechanical Permit Application
   *
   * This matches the typical structure used by Florida building departments:
   * - Property Information
   * - Owner Information
   * - Contractor Information
   * - Work Description
   * - Equipment Schedule
   * - Required Attachments Checklist
   */
  static async generateMechanicalPermitApplication(request: FormGeneratorRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Apply county branding (header with county name and contact info)
      applyCountyBranding(doc, request.permitInfo.location.county, {
        includeHeader: true,
        includeFooter: false, // Footer added at end
      });

      // Application title
      doc.fontSize(12).font('Helvetica-Bold').text('MECHANICAL PERMIT APPLICATION', { align: 'center' });
      doc.moveDown(0.5);

      // Permit tracking info (filled by building dept) - positioned properly on right
      doc.fontSize(8).font('Helvetica');
      const rightX = 400; // Moved left to fit within margins
      doc.text(`Permit #: ________________`, rightX, 70, { width: 150 });
      doc.text(`Date Received: ___________`, rightX, 85, { width: 150 });
      doc.text(`Fee: $ ___________`, rightX, 100, { width: 150 });
      doc.moveDown(1.5);

      // SECTION 1: PROPERTY INFORMATION
      doc.fontSize(10).font('Helvetica-Bold').text('1. PROPERTY INFORMATION');
      doc.moveDown(0.3);
      const lineY = doc.y;
      doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Property Address: ${request.permitInfo.location.address}`);
      doc.text(`City: ${request.permitInfo.location.city}     State: FL     Zip Code: ${request.permitInfo.location.zipCode}`);
      doc.text(`County: ${request.permitInfo.location.county.toUpperCase()}`);
      doc.text(`Parcel/Folio Number: ______________________________`);
      doc.moveDown(1);

      // SECTION 2: OWNER INFORMATION
      doc.fontSize(10).font('Helvetica-Bold').text('2. PROPERTY OWNER INFORMATION');
      doc.moveDown(0.3);
      const line2Y = doc.y;
      doc.moveTo(50, line2Y).lineTo(550, line2Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Owner Name: ${request.property.ownerName}`);
      doc.text(`Phone: ${request.property.ownerPhone}`);
      doc.text(`Email: _________________________________________________`);
      doc.moveDown(1);

      // SECTION 3: CONTRACTOR INFORMATION
      doc.fontSize(10).font('Helvetica-Bold').text('3. LICENSED CONTRACTOR INFORMATION');
      doc.moveDown(0.3);
      const line3Y = doc.y;
      doc.moveTo(50, line3Y).lineTo(550, line3Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Company Name: ${request.contractor.name}`);
      doc.text(`Contractor License Number: ${request.contractor.licenseNumber}`);
      doc.text(`Phone: ${request.contractor.phone}     Email: ${request.contractor.email}`);
      doc.text(`Mailing Address: ________________________________________________`);
      doc.moveDown(1);

      // SECTION 4: WORK DESCRIPTION
      doc.fontSize(10).font('Helvetica-Bold').text('4. DESCRIPTION OF WORK');
      doc.moveDown(0.3);
      const line4Y = doc.y;
      doc.moveTo(50, line4Y).lineTo(550, line4Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      const jobTypeLabel = request.permitInfo.jobType === 'new-installation' ? 'NEW INSTALLATION' :
                            request.permitInfo.jobType === 'replacement' ? 'REPLACEMENT/CHANGEOUT' : 'REPAIR/SERVICE';
      doc.text(`Type of Work: ${jobTypeLabel}`);
      doc.text(`Equipment Type: ${request.permitInfo.equipmentType.toUpperCase().replace('-', ' ')}`);
      doc.moveDown(0.5);

      doc.text(`Scope of Work:`);
      doc.fontSize(8).font('Helvetica');
      const scopeText = request.installation.description ||
        `Replace existing ${request.permitInfo.equipmentType} with new ${request.permitInfo.tonnage}-ton unit.`;
      doc.text(scopeText, { width: 500, indent: 15 });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Estimated Cost: $${request.installation.estimatedCost.toLocaleString()}`);
      doc.text(`Estimated Start Date: ${request.installation.estimatedStartDate || 'TBD'}`);
      doc.moveDown(1);

      // SECTION 5: EQUIPMENT SCHEDULE
      doc.fontSize(10).font('Helvetica-Bold').text('5. EQUIPMENT SCHEDULE');
      doc.moveDown(0.3);
      const line5Y = doc.y;
      doc.moveTo(50, line5Y).lineTo(550, line5Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Manufacturer: ${request.equipmentDetails.manufacturer}`);
      doc.text(`Model Number: ${request.equipmentDetails.model}`);
      doc.text(`Serial Number: ${request.equipmentDetails.serialNumber}`);
      const tonnage = request.permitInfo.tonnage || 3;
      doc.text(`Capacity: ${tonnage} tons / ${tonnage * 12000} BTU`);
      doc.text(`Efficiency Rating: ${request.equipmentDetails.efficiency}`);
      doc.text(`AHRI Certificate Number: ${request.equipmentDetails.ahriNumber || 'N/A'}`);
      const fuelType = request.equipmentDetails.fuelType || 'electric';
      doc.text(`Fuel Type: ${fuelType.toUpperCase()}`);
      doc.moveDown(1);

      // SECTION 6: LOAD CALCULATION & WIND LOAD
      doc.fontSize(10).font('Helvetica-Bold').text('6. LOAD CALCULATION & WIND LOAD REQUIREMENTS');
      doc.moveDown(0.3);
      const line6Y = doc.y;
      doc.moveTo(50, line6Y).lineTo(550, line6Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Building Square Footage: ${request.property.squareFootage || 'TBD'} sq ft`);
      doc.text(`Year Built: ${request.property.yearBuilt || 'TBD'}`);
      doc.text(`Ceiling Height: ${request.property.ceilingHeight || 8} ft`);

      // Manual J requirements per FBC 101.4.7.1.2:
      // - REQUIRED: New installations and total replacements
      // - WAIVED: Post-1993 buildings with previous calc (building official discretion)
      const requiresManualJ = request.permitInfo.jobType === 'new-installation' ||
                              request.permitInfo.jobType === 'replacement';
      if (requiresManualJ) {
        doc.text(`Calculated Cooling Load: ________ BTU (Manual J or previous sizing calc)`);
      } else {
        doc.text(`Calculated Cooling Load: ________ BTU (sizing calculation recommended)`);
      }
      doc.moveDown(0.5);

      // Wind Load Requirements for Florida
      doc.fontSize(9).font('Helvetica-Bold').text(`Wind Load Design Criteria (2023 Florida Building Code):`);
      doc.fontSize(9).font('Helvetica');
      const county = request.permitInfo.location.county.toLowerCase();
      // Tampa Bay area: 140-150 MPH per FBC wind maps (Risk Category II - Residential)
      const windSpeed = county === 'hillsborough' || county === 'pinellas' ? '140-150 MPH' : '130-150 MPH';
      doc.text(`Design Wind Speed (Vult): ${windSpeed} (per FBC Section 1609 & ASCE 7-22)`);
      doc.text(`Risk Category: II (Residential)`);
      doc.text(`Wind Exposure Category: ☐ B (suburban)  ☐ C (open terrain)  ☐ D (coastal)`);
      doc.text(`Equipment Wind Resistance: Manufacturer certification required per FBC Section 1609`);
      doc.text(`Anchorage/Attachment: Per manufacturer specifications and FBC Table 1604.3`);
      doc.moveDown(1);

      // SECTION 7: REQUIRED ATTACHMENTS
      doc.fontSize(10).font('Helvetica-Bold').text('7. REQUIRED ATTACHMENTS CHECKLIST');
      doc.moveDown(0.3);
      const line7Y = doc.y;
      doc.moveTo(50, line7Y).lineTo(550, line7Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      // Manual J per FBC 101.4.7.1.2 - required for total replacements & new installations
      // Building official may accept previous sizing calc for post-1993 buildings
      if (requiresManualJ) {
        doc.text(`☐  Load Calculation (Manual J or previous sizing calc) - Per FBC 101.4.7.1.2`);
      } else {
        doc.text(`☐  Load Calculation (Manual J or equivalent) - Recommended`);
      }
      doc.text(`☐  Equipment Specification Sheets (including AHRI certificate)`);
      doc.text(`☐  Equipment Wind Rating Documentation (per FBC wind speed requirements)`);
      doc.text(`☐  Site Plan / Equipment Location Diagram`);
      doc.text(`☐  Property Owner Authorization (if contractor applying)`);
      if (request.permitInfo.jobType === 'new-installation') {
        doc.text(`☐  Building Plans (for new construction)`);
        doc.text(`☐  Structural Calculations for Equipment Support (if rooftop installation)`);
      }
      doc.moveDown(1.5);

      // SECTION 8: CERTIFICATIONS & SIGNATURES
      doc.fontSize(10).font('Helvetica-Bold').text('8. CONTRACTOR CERTIFICATION');
      doc.moveDown(0.3);
      const line8Y = doc.y;
      doc.moveTo(50, line8Y).lineTo(550, line8Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica');
      doc.text(`I certify that the information provided in this application is true and correct to the best of my knowledge.`);
      doc.text(`I understand that work performed without a valid permit may be subject to stop-work orders and penalties.`);
      doc.text(`All work will be performed in accordance with the Florida Building Code and applicable local ordinances.`);
      doc.moveDown(1);

      doc.fontSize(9).font('Helvetica');
      doc.text(`_____________________________________________     Date: _______________`);
      doc.fontSize(8).text(`Contractor Signature`);
      doc.moveDown(2);

      // SECTION 9: PROPERTY OWNER AUTHORIZATION
      doc.fontSize(10).font('Helvetica-Bold').text('9. PROPERTY OWNER AUTHORIZATION');
      doc.moveDown(0.3);
      const line9Y = doc.y;
      doc.moveTo(50, line9Y).lineTo(550, line9Y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica');
      doc.text(`I authorize the contractor listed above to apply for this permit and perform the work described.`);
      doc.moveDown(1);

      doc.fontSize(9).font('Helvetica');
      doc.text(`_____________________________________________     Date: _______________`);
      doc.fontSize(8).text(`Property Owner Signature`);
      doc.moveDown(1.5);

      // Apply county footer (contact information)
      applyCountyBranding(doc, request.permitInfo.location.county, {
        includeHeader: false,
        includeFooter: true,
        footerY: doc.page.height - 100,
      });

      // Add AI attribution above office use section
      addAIAttribution(doc);

      // FOOTER - For office use only
      doc.fontSize(7).fillColor('#666666').text(
        'FOR OFFICE USE ONLY',
        50,
        doc.page.height - 80,
        { align: 'left', width: 500 }
      );
      doc.fontSize(7).text(
        `Plan Review: ☐ Approved  ☐ Revisions Required     Reviewer: ___________     Date: _______`,
        50,
        doc.page.height - 65
      );
      doc.text(
        `Inspections Required: ☐ Rough-In  ☐ Final     Inspector: ___________     Date: _______`,
        50,
        doc.page.height - 50
      );

      doc.end();
    });
  }
}

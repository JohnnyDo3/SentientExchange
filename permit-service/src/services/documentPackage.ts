import PDFDocument from 'pdfkit';
import { FormGeneratorRequest } from '../utils/validation';
import { LoadCalculator } from './loadCalculator';
import { ManualJCalculator } from './manualJ';

/**
 * Document Package Generator
 * Creates ALL the documents a contractor needs for permit submission
 */

export class DocumentPackageGenerator {
  /**
   * Generate Owner Authorization Form
   */
  static async generateOwnerAuthorization(request: FormGeneratorRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('PROPERTY OWNER AUTHORIZATION', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica')
        .text('I, the undersigned property owner, hereby authorize the following contractor to perform HVAC work and apply for necessary permits on my behalf:')
        .moveDown();

      // Property Info
      doc.fontSize(12).font('Helvetica-Bold').text('PROPERTY INFORMATION:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Owner Name: ${request.property.ownerName}`);
      doc.text(`Property Address: ${request.permitInfo.location.address}`);
      doc.text(`City, State, Zip: ${request.permitInfo.location.city}, FL ${request.permitInfo.location.zipCode}`);
      doc.text(`Owner Phone: ${request.property.ownerPhone}`);
      doc.moveDown(1.5);

      // Contractor Info
      doc.fontSize(12).font('Helvetica-Bold').text('AUTHORIZED CONTRACTOR:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Company Name: ${request.contractor.name}`);
      doc.text(`License Number: ${request.contractor.licenseNumber || 'N/A'}`);
      doc.text(`Phone: ${request.contractor.phone}`);
      doc.text(`Email: ${request.contractor.email}`);
      doc.moveDown(1.5);

      // Scope of Work
      doc.fontSize(12).font('Helvetica-Bold').text('AUTHORIZED WORK:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(request.installation.description, { width: 500 });
      doc.moveDown(1.5);

      // Signature Lines
      doc.moveDown(2);
      doc.text('_'.repeat(50));
      doc.text('Property Owner Signature                                      Date');
      doc.moveDown(1.5);
      doc.text('_'.repeat(50));
      doc.text('Print Name');
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).fillColor('#666')
        .text('Note: This authorization must be signed by the property owner and submitted with the permit application.', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate Cost Breakdown Sheet
   */
  static async generateCostBreakdown(request: FormGeneratorRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('PROJECT COST BREAKDOWN', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica');
      doc.text(`Project: ${request.installation.description.substring(0, 100)}...`);
      doc.text(`Location: ${request.permitInfo.location.address}`);
      doc.moveDown(1);

      // Cost breakdown table
      const lineItems = [
        { item: 'Equipment & Materials', cost: request.installation.estimatedCost * 0.6 },
        { item: 'Labor', cost: request.installation.estimatedCost * 0.3 },
        { item: 'Permits & Fees', cost: request.installation.estimatedCost * 0.05 },
        { item: 'Miscellaneous', cost: request.installation.estimatedCost * 0.05 },
      ];

      doc.fontSize(12).font('Helvetica-Bold').text('COST BREAKDOWN:');
      doc.moveDown(0.5);

      lineItems.forEach(item => {
        doc.fontSize(10).font('Helvetica');
        doc.text(`${item.item}:`.padEnd(40, ' ') + `$${item.cost.toFixed(2)}`, { indent: 20 });
      });

      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`TOTAL ESTIMATED COST: $${request.installation.estimatedCost.toFixed(2)}`);

      doc.end();
    });
  }

  /**
   * Generate Submission Checklist
   */
  static async generateChecklist(request: FormGeneratorRequest, requiredDocs: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('PERMIT SUBMISSION CHECKLIST', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#00aa00').text('✓ DOCUMENTS WE GENERATED FOR YOU:');
      doc.fontSize(10).font('Helvetica').fillColor('#000').moveDown(0.5);
      doc.text('☑ Permit Application Form (main form)');
      doc.text('☑ Property Owner Authorization');
      doc.text('☑ Cost Breakdown Sheet');
      doc.text('☑ This Checklist');
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ff6600').text('☐ DOCUMENTS YOU NEED TO PROVIDE:');
      doc.fontSize(10).font('Helvetica').fillColor('#000').moveDown(0.5);

      const externalDocs = [
        '☐ Contractor License (copy of valid HVAC/Mechanical license)',
        '☐ Equipment Cut Sheet/Spec Sheet (from manufacturer)',
        '☐ Load Calculation (ACCA Manual J, if required)',
        '☐ Insurance Certificate (if required by county)',
      ];

      externalDocs.forEach(item => {
        doc.text(item, { indent: 20 });
        doc.moveDown(0.3);
      });

      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('SUBMISSION STEPS:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text('1. Review all generated documents for accuracy');
      doc.text('2. Get property owner to sign the authorization form');
      doc.text('3. Attach your contractor license copy');
      doc.text('4. Attach equipment manufacturer spec sheets');
      doc.text('5. Submit complete package to county (online or in-person)');
      doc.text('6. Pay permit fees');
      doc.text('7. Schedule inspection after work is complete');

      doc.end();
    });
  }

  /**
   * Generate Load Calculation Report - ACCA Manual J
   */
  static async generateLoadCalculation(
    request: FormGeneratorRequest,
    coordinates?: { lat: number; lng: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Use proper Manual J if we have coordinates, fallback to simplified
      const loadCalc = coordinates
        ? ManualJCalculator.calculate({
            squareFootage: request.property.squareFootage || 2000,
            yearBuilt: request.property.yearBuilt || 1990,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            county: request.permitInfo.location.county,
            equipmentTonnage: request.permitInfo.tonnage,
            ceilingHeight: request.property.ceilingHeight,
          })
        : LoadCalculator.calculate({
            squareFootage: request.property.squareFootage || 2000,
            yearBuilt: request.property.yearBuilt || 1990,
            location: request.permitInfo.location,
            equipmentTonnage: request.permitInfo.tonnage,
            ceilingHeight: request.property.ceilingHeight,
          });

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('HVAC LOAD CALCULATION', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('Simplified Manual J - Residential Heating & Cooling Load', { align: 'center' })
        .fillColor('#000');
      doc.moveDown(2);

      // Property Info
      doc.fontSize(12).font('Helvetica-Bold').text('PROPERTY INFORMATION:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Address: ${request.permitInfo.location.address}, ${request.permitInfo.location.city}, FL`);
      doc.text(`Square Footage: ${(request.property.squareFootage || 2000).toLocaleString()} sq ft`);
      doc.text(`Year Built: ${request.property.yearBuilt || 1990}`);
      doc.text(`Ceiling Height: ${request.property.ceilingHeight || 8} ft`);
      doc.moveDown(1.5);

      // Calculation Results
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#00aa00').text('✓ LOAD CALCULATION RESULTS:');
      doc.fillColor('#000').fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Calculated Load: ${loadCalc.calculatedBtuLoad.toLocaleString()} BTU/hr`);
      doc.text(`Recommended Tonnage: ${loadCalc.recommendedTonnage} tons`);
      doc.text(`Acceptable Range: ${loadCalc.minTonnage} - ${loadCalc.maxTonnage} tons`);

      if (request.permitInfo.tonnage) {
        doc.moveDown(0.5);
        const matchColor =
          loadCalc.equipmentMatch === 'perfect' ? '#00aa00' :
          loadCalc.equipmentMatch === 'acceptable' ? '#0066cc' :
          loadCalc.equipmentMatch === 'oversized' ? '#ff9900' : '#cc0000';

        doc.fillColor(matchColor).font('Helvetica-Bold')
          .text(`Equipment Match: ${request.permitInfo.tonnage} tons - ${loadCalc.equipmentMatch.toUpperCase()}`)
          .fillColor('#000').font('Helvetica');
      }
      doc.moveDown(1.5);

      // Breakdown - different for Manual J vs simplified
      doc.fontSize(12).font('Helvetica-Bold').text('CALCULATION BREAKDOWN:');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);

      // Check if Manual J (has 'walls' property) or simplified (has 'baseLoad' property)
      if ('walls' in loadCalc.breakdown) {
        // Manual J breakdown - real physics!
        doc.text(`Walls (conduction): ${loadCalc.breakdown.walls.toLocaleString()} BTU/hr`);
        doc.text(`Windows (conduction + solar): ${loadCalc.breakdown.windows.toLocaleString()} BTU/hr`);
        doc.text(`Ceiling/Roof: ${loadCalc.breakdown.ceiling.toLocaleString()} BTU/hr`);
        doc.text(`Doors: ${loadCalc.breakdown.doors.toLocaleString()} BTU/hr`);
        doc.text(`Infiltration (air leakage): ${loadCalc.breakdown.infiltration.toLocaleString()} BTU/hr`);
        doc.text(`Internal Gains (people, appliances, lights): ${loadCalc.breakdown.internalGains.toLocaleString()} BTU/hr`);
        doc.text(`Duct Gain (unconditioned space): ${loadCalc.breakdown.ductGain.toLocaleString()} BTU/hr`);
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#666').text('+ Latent (humidity) gains:', { indent: 10 });
        doc.text(`   Infiltration: ${loadCalc.breakdown.infiltrationLatent.toLocaleString()} BTU/hr`, { indent: 10 });
        doc.text(`   Occupants: ${loadCalc.breakdown.occupantLatent.toLocaleString()} BTU/hr`, { indent: 10 });
        doc.text(`   Appliances: ${loadCalc.breakdown.applianceLatent.toLocaleString()} BTU/hr`, { indent: 10 });
        doc.fillColor('#000');
      } else if ('baseLoad' in loadCalc.breakdown) {
        // Simplified breakdown
        doc.text(`Base Load (conditioned space): ${loadCalc.breakdown.baseLoad.toLocaleString()} BTU`);
        doc.text(`Climate Adjustment (Florida heat zone): +${loadCalc.breakdown.climateAdjustment.toLocaleString()} BTU`);
        doc.text(`Insulation Factor (${request.property.yearBuilt} construction): ${loadCalc.breakdown.insulationFactor > 0 ? '+' : ''}${loadCalc.breakdown.insulationFactor.toLocaleString()} BTU`);
        doc.text(`Ceiling Height Adjustment: ${loadCalc.breakdown.ceilingFactor > 0 ? '+' : ''}${loadCalc.breakdown.ceilingFactor.toLocaleString()} BTU`);
        doc.text(`Window Heat Gain: ${loadCalc.breakdown.windowFactor > 0 ? '+' : ''}${loadCalc.breakdown.windowFactor.toLocaleString()} BTU`);
      }
      doc.moveDown(1.5);

      // Warnings
      if (loadCalc.warnings.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ff6600').text('⚠️  IMPORTANT NOTES:');
        doc.fillColor('#000').fontSize(9).font('Helvetica').moveDown(0.5);
        loadCalc.warnings.forEach(warning => {
          doc.text(`• ${warning}`, { width: 500, indent: 10 });
          doc.moveDown(0.3);
        });
        doc.moveDown(1);
      }

      // Recommendations
      if (loadCalc.recommendations.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0066cc').text('💡 RECOMMENDATIONS:');
        doc.fillColor('#000').fontSize(9).font('Helvetica').moveDown(0.5);
        loadCalc.recommendations.forEach(rec => {
          doc.text(`• ${rec}`, { width: 500, indent: 10 });
          doc.moveDown(0.3);
        });
        doc.moveDown(1);
      }

      // Methodology
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold').text('Methodology:');
      doc.fontSize(9).font('Helvetica').text(loadCalc.methodology);
      doc.text(`Confidence Level: ${loadCalc.confidenceLevel.toUpperCase()}`);

      // Disclaimer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666')
        .text(
          'DISCLAIMER: This is a preliminary load calculation based on building characteristics and industry standards. ' +
          'It is intended to verify appropriate equipment sizing for typical residential HVAC replacements. ' +
          'For new construction, significant renovations, or complex systems, a detailed room-by-room Manual J ' +
          'calculation by a licensed HVAC contractor or professional engineer may be required. ' +
          'Actual cooling/heating requirements may vary based on occupancy, fenestration, and other site-specific factors.',
          { align: 'justify', width: 500 }
        );

      doc.end();
    });
  }

  /**
   * Generate Elevation Certificate Template (FEMA Form)
   */
  static async generateElevationCertificate(
    request: FormGeneratorRequest,
    floodZone: { zone: string; baseFloodElevation?: number; firmPanelNumber?: string },
    coordinates?: { latitude: number; longitude: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('ELEVATION CERTIFICATE', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('FEMA Form 086-0-33 (Simplified)', { align: 'center' })
        .fillColor('#000');
      doc.moveDown(2);

      // Property Information
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#cc0000').text('⚠️ FLOOD ZONE PROPERTY', { align: 'center' });
      doc.fillColor('#000').moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('SECTION A: PROPERTY INFORMATION');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Property Address: ${request.permitInfo.location.address}`);
      doc.text(`City, State, ZIP: ${request.permitInfo.location.city}, FL ${request.permitInfo.location.zipCode}`);
      doc.text(`Owner: ${request.property.ownerName}`);
      doc.text(`Year Built: ${request.property.yearBuilt || 'Unknown'}`);
      doc.moveDown(1);

      // Flood Zone Data
      doc.fontSize(12).font('Helvetica-Bold').text('SECTION B: FLOOD ZONE DATA');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`NFIP Community Name: ${request.permitInfo.location.county.toUpperCase()} County, Florida`);
      doc.text(`Flood Zone: ${floodZone.zone}`);
      doc.text(`FIRM Panel Number: ${floodZone.firmPanelNumber || 'TO BE DETERMINED'}`);
      doc.text(`Base Flood Elevation (BFE): ${floodZone.baseFloodElevation ? floodZone.baseFloodElevation + ' feet' : 'TO BE DETERMINED'}`);
      if (coordinates) {
        doc.text(`Latitude: ${coordinates.latitude.toFixed(6)}`);
        doc.text(`Longitude: ${coordinates.longitude.toFixed(6)}`);
      }
      doc.moveDown(1);

      // Equipment Information
      doc.fontSize(12).font('Helvetica-Bold').text('SECTION C: HVAC EQUIPMENT ELEVATION');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Equipment Type: ${request.equipmentDetails.manufacturer} ${request.equipmentDetails.model}`);
      doc.text(`Tonnage: ${request.permitInfo.tonnage} tons`);
      doc.text(`Serial Number: ${request.equipmentDetails.serialNumber}`);
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#00aa00')
        .text('✓ EQUIPMENT MUST BE ELEVATED ABOVE BASE FLOOD ELEVATION')
        .fillColor('#000').font('Helvetica');
      doc.moveDown(1);

      // Required Elevations
      doc.fontSize(12).font('Helvetica-Bold').text('SECTION D: ELEVATION REQUIREMENTS');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text('☐ Ground Elevation (existing grade):  __________ feet');
      doc.text('☐ Lowest Floor Elevation:  __________ feet');
      doc.text('☐ Mechanical Equipment Elevation:  __________ feet');
      doc.text('☐ Electrical Disconnect Elevation:  __________ feet');
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#666')
        .text('NOTE: All measurements must be taken by a licensed surveyor or engineer and certified.')
        .fillColor('#000');
      doc.moveDown(1.5);

      // Contractor Requirements
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0066cc').text('📋 WHEN IS THIS FORM REQUIRED?');
      doc.fontSize(10).font('Helvetica').fillColor('#000').moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#00aa00').text('✓ EQUIPMENT CHANGEOUT/REPLACEMENT (Most Common):');
      doc.fillColor('#000').fontSize(10).font('Helvetica');
      doc.text('• Replacing existing unit in the SAME location = NO NEW SURVEY REQUIRED');
      doc.text('• Use existing elevation (unit already complies with BFE)');
      doc.text('• Just document with photos that equipment is in same spot');
      doc.text('• Submit photos showing elevated mounting brackets/platform');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ff6600').text('⚠️ NEW INSTALLATION OR RELOCATION:');
      doc.fillColor('#000').fontSize(10).font('Helvetica');
      doc.text('• NEW equipment location = ELEVATION CERTIFICATE MAY BE REQUIRED');
      doc.text('• Moving equipment to different spot = SURVEY MAY BE NEEDED');
      doc.text('• First-time AC installation on property = CHECK WITH BUILDING DEPT');
      doc.text('• Required if work triggers "Substantial Improvement" (50% of building value)');
      doc.text('• Licensed surveyor must certify elevation above BFE when required');
      doc.text('• Check with local floodplain administrator for specific requirements');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6600cc').text('💡 PRACTICAL TIP:');
      doc.fillColor('#000').fontSize(9).font('Helvetica');
      doc.text('Most HVAC replacements in existing buildings do NOT trigger the 50% rule. A typical $6,000-$8,000 AC changeout on a $300,000 home is only 2-3% of value. Elevation certificates are mainly for new construction, major renovations, or when equipment is being relocated to a new area.');
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ff6600').text('FLOOD ZONE INSTALLATION REQUIREMENTS:');
      doc.fontSize(10).font('Helvetica').fillColor('#000').moveDown(0.5);
      doc.text('• Equipment MUST be above Base Flood Elevation (BFE)');
      doc.text('• Use wall brackets, elevated pad, or rooftop installation');
      doc.text('• Electrical disconnect must be above BFE');
      doc.text('• Waterproof electrical components per NEC Article 680');
      doc.text('• Hurricane-rated anchors for coastal areas (140+ mph)');
      doc.text('• Document installation with photos showing elevation method');
      doc.moveDown(1.5);

      // Certification Section
      doc.fontSize(12).font('Helvetica-Bold').text('SECTION E: PROFESSIONAL CERTIFICATION');
      doc.fontSize(9).font('Helvetica').moveDown(0.5);
      doc.text('I certify that the information on this certificate represents my best efforts to interpret the data available. I understand that any false statement may be punishable by fine or imprisonment under 18 U.S. Code, Section 1001.');
      doc.moveDown(1);
      doc.text('_'.repeat(60));
      doc.text('Licensed Surveyor / Engineer Signature                    Date');
      doc.moveDown(0.5);
      doc.text('_'.repeat(60));
      doc.text('Print Name & License Number');

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#cc0000')
        .text('IMPORTANT: This form must be completed by a licensed land surveyor, professional engineer, or architect authorized by law to certify elevation information. The contractor CANNOT self-certify elevations.', {
          align: 'center',
          width: 500
        });

      doc.end();
    });
  }

  /**
   * Generate Equipment Elevation Plan
   */
  static async generateEquipmentElevationPlan(
    request: FormGeneratorRequest,
    floodZone: { zone: string; baseFloodElevation?: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('EQUIPMENT ELEVATION PLAN', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('HVAC Equipment Installation - Flood Zone Compliance', { align: 'center' })
        .fillColor('#000');
      doc.moveDown(2);

      // Project Info
      doc.fontSize(12).font('Helvetica-Bold').text('PROJECT INFORMATION');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Property: ${request.permitInfo.location.address}, ${request.permitInfo.location.city}, FL`);
      doc.text(`Owner: ${request.property.ownerName}`);
      doc.text(`Contractor: ${request.contractor.name}`);
      doc.text(`License: ${request.contractor.licenseNumber || 'N/A'}`);
      doc.moveDown(1);

      // Flood Requirements
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#cc0000').text('FLOOD ZONE REQUIREMENTS');
      doc.fillColor('#000').fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Flood Zone: ${floodZone.zone}`);
      doc.text(`Base Flood Elevation (BFE): ${floodZone.baseFloodElevation || 'TBD'} feet`);
      doc.text(`Required Equipment Elevation: ${(floodZone.baseFloodElevation || 10) + 1} feet minimum`);
      doc.moveDown(1);

      // Equipment Specifications
      doc.fontSize(12).font('Helvetica-Bold').text('EQUIPMENT SPECIFICATIONS');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Manufacturer: ${request.equipmentDetails.manufacturer}`);
      doc.text(`Model: ${request.equipmentDetails.model}`);
      doc.text(`Capacity: ${request.permitInfo.tonnage} tons`);
      doc.text(`Serial Number: ${request.equipmentDetails.serialNumber}`);
      doc.text(`Weight (est.): ${(request.permitInfo.tonnage || 3) * 100} lbs`);
      doc.moveDown(1);

      // Installation Plan
      doc.fontSize(12).font('Helvetica-Bold').text('ELEVATION INSTALLATION OPTIONS');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#00aa00').text('✓ RECOMMENDED: Wall Mounting Brackets (Most Common)');
      doc.fillColor('#000').fontSize(10).font('Helvetica');
      doc.text('• Heavy-duty galvanized steel or aluminum brackets');
      doc.text('• Triangle/L-bracket design, screwed into wall studs (minimum 16" o.c.)');
      doc.text('• Elevation: 12-24 inches above grade (adjustable to BFE requirement)');
      doc.text('• Load capacity: 300-500 lbs per bracket set');
      doc.text('• Corrosion-resistant hardware (stainless steel lag bolts)');
      doc.text('• Anti-vibration rubber isolation pads included');
      doc.text('• Examples: DiversiTech, Rectorseal, JB Industries wall brackets');
      doc.text('• Cost-effective, fast installation, easy service access');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').text('Option B: Elevated Concrete Pad (High BFE)');
      doc.fontSize(10).font('Helvetica');
      doc.text('• Use when BFE requires 3+ feet elevation');
      doc.text('• Reinforced concrete pad on CMU block piers');
      doc.text('• Platform size: 4\'x4\' minimum for unit + service clearance');
      doc.text('• Metal ladder or steps for service access');
      doc.text('• More expensive but permanent solution');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').text('Option C: Rooftop Installation (Severe Flood Zones)');
      doc.fontSize(10).font('Helvetica');
      doc.text('• For VE zones or properties with very high BFE');
      doc.text('• Engineered roof curb with structural support');
      doc.text('• Verify roof load capacity with structural engineer');
      doc.text('• Hurricane straps and seismic anchors required');
      doc.text('• Requires walkway pads and fall protection');
      doc.moveDown(1);

      // Electrical Requirements
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0066cc').text('ELECTRICAL REQUIREMENTS');
      doc.fillColor('#000').fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text('• Disconnect switch ABOVE Base Flood Elevation');
      doc.text('• Waterproof conduit (Schedule 80 PVC or rigid metal)');
      doc.text('• GFCI protection per NEC Article 210.8');
      doc.text('• Junction boxes: NEMA 4X (waterproof) rating');
      doc.text('• Elevated wire connections with marine-grade sealant');
      doc.moveDown(1);

      // Documentation Requirements
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ff6600').text('DOCUMENTATION REQUIREMENTS');
      doc.fillColor('#000').fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text('☐ Elevation survey showing equipment height above BFE');
      doc.text('☐ Structural engineer letter (if platform > 4 feet high)');
      doc.text('☐ Photos of completed installation with measuring tape');
      doc.text('☐ Manufacturer cut sheets for equipment and anchors');
      doc.text('☐ Final inspection report');
      doc.moveDown(1);

      // Disclaimer
      doc.fontSize(8).fillColor('#666')
        .text('IMPORTANT: This plan is a general guideline. A licensed professional engineer must review and approve all structural elements of elevated equipment installations, especially in flood zones. Contractor is responsible for compliance with all local building codes, FEMA requirements, and manufacturer specifications.', {
          align: 'justify',
          width: 500
        });

      doc.end();
    });
  }

  /**
   * Generate Wind Load Calculation (Coastal)
   */
  static async generateWindLoadCalculation(
    request: FormGeneratorRequest,
    windSpeed: number,
    isCoastal: boolean
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('WIND LOAD CALCULATION', { align: 'center'});
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('HVAC Equipment Anchorage - Florida Building Code', { align: 'center' })
        .fillColor('#000');
      doc.moveDown(2);

      // Wind Zone Info
      doc.fontSize(12).font('Helvetica-Bold').text('WIND ZONE REQUIREMENTS');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`Design Wind Speed: ${windSpeed} mph (Ultimate Wind Speed)`);
      doc.text(`Wind Zone: ${isCoastal ? 'Coastal (Wind-Borne Debris Region)' : 'Inland'}`);
      doc.text(`Exposure Category: ${isCoastal ? 'C (Coastal)' : 'B (Suburban)'}`);
      doc.text(`Risk Category: II (Residential)`);
      doc.text(`Code: Florida Building Code 2023 / ASCE 7-22`);
      doc.moveDown(1);

      // Equipment Data
      doc.fontSize(12).font('Helvetica-Bold').text('EQUIPMENT DATA');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      const tonnage = request.permitInfo.tonnage || 3;
      doc.text(`Equipment: ${request.equipmentDetails.manufacturer} ${request.equipmentDetails.model}`);
      doc.text(`Capacity: ${tonnage} tons`);
      doc.text(`Unit Weight: ${tonnage * 100} lbs (estimated)`);
      doc.text(`Unit Dimensions: ${tonnage * 30}" L x ${tonnage * 24}" W x 30" H (typical)`);
      doc.text(`Mounting: Ground/Platform/Roof`);
      doc.moveDown(1);

      // Wind Load Calculations (Simplified)
      doc.fontSize(12).font('Helvetica-Bold').text('WIND PRESSURE CALCULATION');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);

      const qh = (0.00256 * windSpeed * windSpeed * 1.0).toFixed(1); // psf
      const gust = 0.85;
      const cf = 1.8; // Force coefficient for rectangular object
      const area = (tonnage * 30 * 30) / 144; // sq ft
      const windForce = (parseFloat(qh) * gust * cf * area).toFixed(1);

      doc.text(`Velocity Pressure (qh): ${qh} psf`);
      doc.text(`Gust Effect Factor (G): ${gust}`);
      doc.text(`Force Coefficient (Cf): ${cf}`);
      doc.text(`Projected Area (A): ${area.toFixed(1)} sq ft`);
      doc.text(`Wind Force (F = qh × G × Cf × A): ${windForce} lbs`);
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#cc0000')
        .text(`REQUIRED ANCHORAGE: ${windForce} lbs minimum`)
        .fillColor('#000').font('Helvetica');
      doc.moveDown(1);

      // Anchorage Requirements
      doc.fontSize(12).font('Helvetica-Bold').text('ANCHORAGE REQUIREMENTS');
      doc.fontSize(10).font('Helvetica').moveDown(0.5);
      doc.text(`• Minimum (4) anchor points (one at each corner)`);
      doc.text(`• Anchor capacity: ${(parseFloat(windForce) / 4 * 1.5).toFixed(0)} lbs each (with 1.5x safety factor)`);
      doc.text(`• Concrete anchors: 1/2" diameter, 4" embedment minimum`);
      doc.text(`• Roof mount: Through-bolt to structural members`);
      doc.text(`• Hardware: Stainless steel or hot-dip galvanized`);
      doc.text(`• Anti-vibration pads with metal restraint`);
      doc.moveDown(1);

      // Hurricane Tie-Down
      if (isCoastal) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ff6600').text('🌀 HURRICANE TIE-DOWN REQUIREMENTS');
        doc.fillColor('#000').fontSize(10).font('Helvetica').moveDown(0.5);
        doc.text('• Simpson Strong-Tie H2.5A or equivalent hurricane straps');
        doc.text('• Welded metal frame secured to foundation or roof trusses');
        doc.text('• No reliance on adhesives or caulk for structural attachment');
        doc.text('• Equipment legs bolted through platform to anchors');
        doc.text('• Electrical conduit secured with metal straps every 3 feet');
        doc.text('• Inspector verification BEFORE covering any connections');
        doc.moveDown(1);
      }

      // Installation Notes
      doc.fontSize(12).font('Helvetica-Bold').text('INSTALLATION NOTES');
      doc.fontSize(9).font('Helvetica').moveDown(0.5);
      doc.text('1. Verify anchor substrate: concrete (3000 psi min) or structural wood (2x material min)');
      doc.text('2. Use manufacturer-approved anchorage kit when available');
      doc.text('3. Torque anchor bolts per manufacturer specifications');
      doc.text('4. Provide electrical bonding for metal equipment and platform');
      doc.text('5. Maintain clearance for service access (3 feet minimum)');
      doc.text('6. Document installation with photos of anchor points');
      doc.moveDown(1.5);

      // Disclaimer
      doc.fontSize(8).fillColor('#666')
        .text('DISCLAIMER: This is a simplified wind load estimate based on Florida Building Code requirements for residential HVAC equipment. For rooftop installations, elevated platforms above 6 feet, or installations subject to special wind exposure, a professional engineer must provide sealed calculations and drawings. Contractor is responsible for verifying all load paths and anchor capacities.', {
          align: 'justify',
          width: 500
        });

      doc.end();
    });
  }
}

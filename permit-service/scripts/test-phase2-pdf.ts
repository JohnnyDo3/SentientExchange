/**
 * Test Phase 2: PDF Form Generator
 * Generates a submission-ready permit form
 */
import axios from 'axios';
import * as fs from 'fs';

const SERVICE_URL = 'http://localhost:3010';

async function main() {
  console.log('📄 PHASE 2 TEST: PDF Form Generator\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Complete form data with all required fields
  const formRequest = {
    permitInfo: {
      equipmentType: 'ac-unit',
      jobType: 'replacement',
      tonnage: 3.5,
      location: {
        address: '456 Oak Avenue',
        city: 'Tampa',
        county: 'hillsborough',
        zipCode: '33606'
      },
      propertyType: 'residential'
    },
    contractor: {
      name: 'HVAC Pros LLC',
      phone: '(813) 555-1234',
      email: 'info@hvacpros.com',
      licenseNumber: 'CAC123456'
    },
    property: {
      ownerName: 'John Doe',
      ownerPhone: '(813) 555-5678',
      propertyValue: 250000,
      squareFootage: 2000,
      yearBuilt: 1995
    },
    equipmentDetails: {
      manufacturer: 'Carrier',
      model: '24ACC636A003',
      serialNumber: 'SN123456789',
      ahriNumber: '9876543', // AHRI certification number
      efficiency: 'SEER 16',
      fuelType: 'electric'
    },
    installation: {
      estimatedStartDate: '2025-02-01',
      estimatedCost: 5500,
      description: 'Replace existing 3-ton AC unit with new energy-efficient 3.5-ton Carrier model. Unit will be installed on existing concrete pad. New electrical disconnect and refrigerant lines included.'
    }
  };

  console.log('📋 Form Details:');
  console.log('   Contractor: HVAC Pros LLC');
  console.log('   Property: 456 Oak Ave, Tampa');
  console.log('   Owner: John Doe');
  console.log('   Equipment: Carrier 24ACC636A003 (3.5 ton, SEER 16)');
  console.log('   Cost: $5,500');
  console.log('   Start Date: Feb 1, 2025\n');

  // Step 1: Get 402 response
  console.log('Step 1: Request PDF generation (no payment)...');
  try {
    await axios.post(`${SERVICE_URL}/api/v1/generate-form`, formRequest);
  } catch (error: any) {
    if (error.response?.status === 402) {
      const payment402 = error.response.data;
      console.log('✅ Received 402 Payment Required');
      console.log('💳 Price:', payment402.accepts[0].maxAmountRequired / 1e6, 'USDC ($30)');
      console.log('📥 Pay to:', payment402.accepts[0].payTo, '\n');
    }
  }

  // Step 2: Request with mock payment
  console.log('Step 2: Generating PDF with mock payment...');

  const mockPayment = {
    network: 'base-sepolia',
    txHash: '0xMOCK_PDF_TEST_123',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    amount: '30000000', // $30 USDC
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  };

  try {
    const response = await axios.post(
      `${SERVICE_URL}/api/v1/generate-form`,
      formRequest,
      {
        headers: {
          'X-Payment': JSON.stringify(mockPayment)
        }
      }
    );

    console.log('✅ PDF Generated Successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');

    const result = response.data;

    // Show metadata
    console.log('\n📊 Generation Info:');
    console.log('   Permit Type:', result.permitInfo?.permitType);
    console.log('   Description:', result.permitInfo?.description);
    console.log('   Estimated Fee:', `$${result.permitInfo?.estimatedFee}`);
    console.log('   Processing Time:', result.metadata?.processingTimeMs, 'ms');
    console.log('   Form Version:', result.metadata?.formVersion);

    // Show PDF info
    console.log('\n📄 PDF Details:');
    console.log('   Filename:', result.form?.filename);
    console.log('   Size:', Math.round(result.form?.sizeBytes / 1024), 'KB');
    console.log('   Format:', result.form?.format);

    // Show location analysis
    if (result.locationAnalysis) {
      console.log('\n📍 Location Analysis:');
      console.log('   County:', result.locationAnalysis.county.toUpperCase());
      console.log('   Jurisdiction:', result.locationAnalysis.jurisdiction);
      console.log('   Flood Zone:', result.locationAnalysis.floodZone);
      if (result.locationAnalysis.isCoastal) {
        console.log('   🌊 COASTAL AREA - Additional wind requirements');
      }
      if (result.locationAnalysis.hasHOA) {
        console.log('   🏘️ HOA AREA - Verify restrictions before starting');
      }

      if (result.locationAnalysis.warnings.length > 0) {
        console.log('\n⚠️  IMPORTANT WARNINGS:');
        result.locationAnalysis.warnings.forEach((warning: string) => {
          console.log('   ' + warning);
        });
      }

      if (result.locationAnalysis.specialRequirements.length > 0) {
        console.log('\n📋 Special Requirements:');
        result.locationAnalysis.specialRequirements.forEach((req: string) => {
          console.log('   • ' + req);
        });
      }
    }

    // Show instructions
    console.log('\n📝 Submission Instructions:');
    console.log('   Method:', result.instructions?.submissionMethod);
    console.log('   Address:', result.instructions?.submissionAddress);
    console.log('   Required Documents:', result.instructions?.requiredDocuments?.length, 'items');

    // Save main PDF
    if (result.form?.pdf) {
      const pdfBuffer = Buffer.from(result.form.pdf, 'base64');
      const filename = `./test-permit-form-${Date.now()}.pdf`;
      fs.writeFileSync(filename, pdfBuffer);
      console.log('\n💾 Main Permit Form saved to:', filename);
    }

    // Save additional documents
    if (result.additionalDocuments && result.additionalDocuments.length > 0) {
      console.log('\n📦 Additional Documents:');
      result.additionalDocuments.forEach((doc: any, index: number) => {
        const pdfBuffer = Buffer.from(doc.pdf, 'base64');
        const filename = `./${doc.filename}`;
        fs.writeFileSync(filename, pdfBuffer);
        console.log(`   ${index + 1}. ${doc.name}`);
        console.log(`      File: ${filename}`);
        console.log(`      Size: ${Math.round(doc.sizeBytes / 1024)} KB`);
        console.log(`      ${doc.description}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('🎉 Phase 2 Complete Document Package: SUCCESS!\n');
    console.log('Generated Documents (5 total):');
    console.log(`   📄 Main permit application form`);
    console.log(`   📝 Property owner authorization (needs signature)`);
    console.log(`   💰 Cost breakdown sheet`);
    console.log(`   🔧 HVAC load calculation (Manual J)`);
    console.log(`   ✅ Submission checklist\n`);
    console.log('🎯 This package includes EVERYTHING you can generate automatically!');
    console.log('   - No need to pay $300 for a load calc engineer');
    console.log('   - No need to calculate costs manually');
    console.log('   - All permit-ready documents in one $30 package\n');
    console.log('Next steps:');
    console.log('   1. Open ALL PDFs to review (especially load calc!)');
    console.log('   2. Get property owner signature on authorization');
    console.log('   3. Attach your license + equipment specs (see checklist)');
    console.log('   4. Submit complete package to county!\n');

  } catch (error: any) {
    console.log('❌ PDF generation failed');
    console.log('Error:', error.response?.data || error.message);

    if (error.response?.data?.missingFields) {
      console.log('\n⚠️  Missing required fields:');
      error.response.data.missingFields.forEach((field: string) => {
        console.log('   -', field);
      });
    }
  }
}

main().catch(console.error);

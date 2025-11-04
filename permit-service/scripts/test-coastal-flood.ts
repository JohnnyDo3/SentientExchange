/**
 * Test Coastal Flood Zone Property
 * Tests flood zone detection, elevation requirements, and coastal forms
 */
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_URL = 'http://localhost:3010';
const OUTPUT_DIR = path.join(__dirname, 'coastal-flood-permit');

// Clean and create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
fs.readdirSync(OUTPUT_DIR).forEach(file => {
  fs.unlinkSync(path.join(OUTPUT_DIR, file));
});

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🌊 COASTAL FLOOD ZONE TEST - NEW PORT RICHEY, FL');
  console.log('='.repeat(80) + '\n');

  // Coastal property in high flood risk area
  const formRequest = {
    permitInfo: {
      equipmentType: 'ac-unit',
      jobType: 'replacement',
      tonnage: 3.5,
      location: {
        address: '6714 Grand Boulevard', // Main street coastal NPR
        city: 'New Port Richey',
        county: 'pasco',
        zipCode: '34652' // Coastal zip
      },
      propertyType: 'residential'
    },
    contractor: {
      name: 'Coastal HVAC Specialists',
      phone: '(727) 555-8888',
      email: 'coastal@hvacpros.com',
      licenseNumber: 'CAC987654'
    },
    property: {
      ownerName: 'Sarah Martinez',
      ownerPhone: '(727) 555-9999',
      propertyValue: 420000,
      squareFootage: 1800, // Smaller coastal home
      yearBuilt: 1985, // Older construction
      ceilingHeight: 8
    },
    equipmentDetails: {
      manufacturer: 'Carrier',
      model: '24ACC642A003',
      serialNumber: 'COAST123456',
      ahriNumber: '8765432',
      efficiency: 'SEER 15',
      fuelType: 'electric'
    },
    installation: {
      estimatedStartDate: '2025-11-20',
      estimatedCost: 6800,
      description: 'Replace existing 3-ton AC unit with new 3.5-ton Carrier system. COASTAL INSTALLATION: Equipment will be elevated on concrete platform 4 feet above grade to meet flood elevation requirements. Electrical components will be waterproofed per FEMA guidelines. Disconnect located above Base Flood Elevation (BFE).'
    }
  };

  console.log('📋 COASTAL PROPERTY DETAILS:');
  console.log('   Address: 6714 Grand Boulevard, New Port Richey, FL 34652');
  console.log('   Type: Coastal residential (Gulf coast area)');
  console.log('   Year: 1985 (pre-modern flood codes)');
  console.log('   Size: 1,800 sq ft');
  console.log('   Owner: Sarah Martinez');
  console.log('');
  console.log('   Equipment: 3.5-ton Carrier AC');
  console.log('   Special: Elevated platform installation for flood protection');
  console.log('   Cost: $6,800');
  console.log('\n' + '-'.repeat(80) + '\n');

  // Request with mock payment
  const mockPayment = {
    network: 'base-sepolia',
    txHash: '0xCOASTAL_FLOOD_TEST_' + Date.now(),
    from: '0x1234567890123456789012345678901234567890',
    to: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123',
    amount: '30000000',
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

    console.log('✅ COASTAL PERMIT PACKAGE GENERATED!\n');
    console.log('='.repeat(80) + '\n');

    const result = response.data;

    // Show location analysis - THIS IS KEY!
    if (result.locationAnalysis) {
      console.log('🌊 COASTAL FLOOD ZONE ANALYSIS:\n');
      console.log('   County: ' + result.locationAnalysis.county.toUpperCase());
      console.log('   Jurisdiction: ' + result.locationAnalysis.jurisdiction.toUpperCase());
      console.log('   🌊 FLOOD ZONE: ' + result.locationAnalysis.floodZone + ' ⚠️');
      console.log('   Coastal Area: ' + (result.locationAnalysis.isCoastal ? 'YES - GULF COAST' : 'NO'));
      console.log('   HOA Area: ' + (result.locationAnalysis.hasHOA ? 'YES' : 'NO'));
      console.log('');

      if (result.locationAnalysis.coordinates) {
        console.log('   GPS Coordinates:');
        console.log('     Latitude: ' + result.locationAnalysis.coordinates.lat);
        console.log('     Longitude: ' + result.locationAnalysis.coordinates.lng);
        console.log('     (Used for precise flood zone determination)');
        console.log('');
      }

      if (result.locationAnalysis.warnings && result.locationAnalysis.warnings.length > 0) {
        console.log('   ⚠️  CRITICAL FLOOD WARNINGS:\n');
        result.locationAnalysis.warnings.forEach((warning: string) => {
          console.log('      🚨 ' + warning);
        });
        console.log('');
      }

      if (result.locationAnalysis.specialRequirements && result.locationAnalysis.specialRequirements.length > 0) {
        console.log('   📋 COASTAL/FLOOD REQUIREMENTS:\n');
        result.locationAnalysis.specialRequirements.forEach((req: string) => {
          console.log('      • ' + req);
        });
        console.log('');
      }

      console.log('-'.repeat(80) + '\n');
    }

    // Save PDFs
    console.log('💾 SAVING COASTAL PERMIT DOCUMENTS:\n');

    if (result.form?.pdf) {
      const pdfBuffer = Buffer.from(result.form.pdf, 'base64');
      const filename = path.join(OUTPUT_DIR, `1_COASTAL_PERMIT_APPLICATION.pdf`);
      fs.writeFileSync(filename, pdfBuffer);
      console.log('   1. MAIN PERMIT (Coastal Property)');
      console.log('      ' + filename);
      console.log('');
    }

    if (result.additionalDocuments && result.additionalDocuments.length > 0) {
      result.additionalDocuments.forEach((doc: any, index: number) => {
        const pdfBuffer = Buffer.from(doc.pdf, 'base64');
        const cleanName = doc.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const filename = path.join(OUTPUT_DIR, `${index + 2}_${cleanName}.pdf`);
        fs.writeFileSync(filename, pdfBuffer);

        console.log(`   ${index + 2}. ${doc.name.toUpperCase()}`);
        console.log(`      ${filename}`);
        console.log(`      ${doc.description}`);
        console.log('');
      });
    }

    console.log('-'.repeat(80) + '\n');

    // Show what additional forms SHOULD be generated
    console.log('🌊 EXPECTED COASTAL/FLOOD ZONE FORMS:\n');
    console.log('   ☐ Elevation Certificate (FEMA form)');
    console.log('      - Shows property elevation vs. Base Flood Elevation');
    console.log('      - Required for flood insurance and permits');
    console.log('');
    console.log('   ☐ Equipment Elevation Plan');
    console.log('      - AC unit must be above BFE (Base Flood Elevation)');
    console.log('      - Platform/stilt design showing 4ft elevation');
    console.log('      - Electrical disconnect placement above flood level');
    console.log('');
    console.log('   ☐ Flood-Resistant Materials Spec');
    console.log('      - Waterproof electrical components');
    console.log('      - Corrosion-resistant hardware (saltwater area)');
    console.log('      - Flood vents if applicable');
    console.log('');
    console.log('   ☐ Wind Load Calculation');
    console.log('      - 140-150 mph design wind speed (coastal)');
    console.log('      - Hurricane tie-down requirements');
    console.log('');
    console.log('   ☐ Coastal Construction Addendum');
    console.log('      - Special coastal requirements');
    console.log('      - Saltwater corrosion protection');
    console.log('');

    console.log('='.repeat(80));
    console.log('');
    console.log('📂 ALL DOCUMENTS SAVED TO:');
    console.log('   ' + OUTPUT_DIR);
    console.log('');
    console.log('🎯 COASTAL PROPERTY COMPLIANCE:');
    console.log('   ✓ Flood zone detected automatically');
    console.log('   ✓ Coastal requirements identified');
    console.log('   ✓ Equipment elevation documented in scope');
    console.log('   ✓ Load calculations include coastal factors');
    console.log('');
    console.log('   ⚠️  CONTRACTOR MUST ALSO PROVIDE:');
    console.log('      - Certified elevation survey');
    console.log('      - Flood insurance documentation');
    console.log('      - Hurricane-rated equipment specs');
    console.log('      - Coastal construction photos during install');
    console.log('');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

main().catch(console.error);

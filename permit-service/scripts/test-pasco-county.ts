/**
 * Test Pasco County Location Intelligence
 * Tests HOA warnings, coastal requirements, and Wesley Chapel detection
 */
import axios from 'axios';
import * as fs from 'fs';

const SERVICE_URL = 'http://localhost:3010';

async function testPascoLocation(testName: string, address: string, city: string, zipCode: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${'='.repeat(70)}\n`);

  const formRequest = {
    permitInfo: {
      equipmentType: 'ac-unit',
      jobType: 'replacement',
      tonnage: 3.5,
      location: {
        address,
        city,
        county: 'pasco', // Let it auto-detect to verify
        zipCode
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
      ownerName: 'Jane Smith',
      ownerPhone: '(813) 555-5678',
      propertyValue: 300000,
      squareFootage: 2200,
      yearBuilt: 2010
    },
    equipmentDetails: {
      manufacturer: 'Carrier',
      model: '24ACC636A003',
      serialNumber: 'SN987654321',
      ahriNumber: '9876543',
      efficiency: 'SEER 16',
      fuelType: 'electric'
    },
    installation: {
      estimatedStartDate: '2025-02-01',
      estimatedCost: 5500,
      description: 'Replace existing AC unit with new energy-efficient model'
    }
  };

  const mockPayment = {
    network: 'base-sepolia',
    txHash: `0xMOCK_PASCO_${Date.now()}`,
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

    const result = response.data;

    console.log('📍 Location Analysis:');
    console.log('   Address:', `${address}, ${city}, ${zipCode}`);
    console.log('   County:', result.locationAnalysis?.county?.toUpperCase() || 'N/A');
    console.log('   Jurisdiction:', result.locationAnalysis?.jurisdiction || 'N/A');
    console.log('   Flood Zone:', result.locationAnalysis?.floodZone || 'N/A');
    console.log('   Coastal:', result.locationAnalysis?.isCoastal ? 'YES' : 'NO');
    console.log('   HOA Area:', result.locationAnalysis?.hasHOA ? 'YES' : 'NO');

    if (result.locationAnalysis?.warnings?.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.locationAnalysis.warnings.forEach((warning: string) => {
        console.log('   ' + warning);
      });
    }

    if (result.locationAnalysis?.specialRequirements?.length > 0) {
      console.log('\n📋 SPECIAL REQUIREMENTS:');
      result.locationAnalysis.specialRequirements.forEach((req: string) => {
        console.log('   • ' + req);
      });
    }

    console.log('\n✅ Test completed successfully\n');

  } catch (error: any) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('\n🏗️  PASCO COUNTY LOCATION INTELLIGENCE TESTS\n');

  // Test 1: Wesley Chapel (HOA-heavy inland area)
  await testPascoLocation(
    'Wesley Chapel - HOA Heavy Area',
    '27503 Sweetgum Drive',
    'Wesley Chapel',
    '33544'
  );

  // Test 2: New Port Richey (coastal area)
  await testPascoLocation(
    'New Port Richey - West Pasco Coastal',
    '6714 Grand Boulevard',
    'New Port Richey',
    '34652'
  );

  // Test 3: Dade City (rural Pasco)
  await testPascoLocation(
    'Dade City - Rural East Pasco',
    '14236 7th Street',
    'Dade City',
    '33523'
  );

  // Test 4: Land O Lakes (HOA area near Hillsborough border)
  await testPascoLocation(
    'Land O Lakes - Border Area with HOA',
    '3447 Land O Lakes Boulevard',
    'Land O Lakes',
    '34639'
  );

  console.log('\n' + '='.repeat(70));
  console.log('🎯 ALL PASCO COUNTY TESTS COMPLETE');
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);

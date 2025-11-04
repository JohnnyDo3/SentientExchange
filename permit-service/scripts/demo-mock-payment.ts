/**
 * Demo with Mock Payment (for testing without real USDC)
 * Shows what the service returns when payment is valid
 */
import axios from 'axios';

const SERVICE_URL = 'http://localhost:3010';

async function main() {
  console.log('🎬 DEMO: AI-Permit-Tampa with Mock Payment\n');
  console.log('This demo bypasses real payment to show the full response\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const permitRequest = {
    equipmentType: 'furnace',
    jobType: 'replacement',
    btu: 80000,
    tonnage: 3,
    location: {
      address: '123 Main St',
      city: 'Tampa',
      county: 'hillsborough',
      zipCode: '33602'
    },
    propertyType: 'residential'
  };

  console.log('📋 Requesting Permit Info for:');
  console.log('   Equipment: Furnace (80,000 BTU, 3 tons)');
  console.log('   Job Type: Replacement');
  console.log('   Location: Tampa, FL (Hillsborough County)');
  console.log('   Property: Residential\n');

  // Step 1: Get 402 response
  console.log('Step 1: Initial request (no payment)...');
  try {
    await axios.post(`${SERVICE_URL}/api/v1/permit-info`, permitRequest);
  } catch (error: any) {
    if (error.response?.status === 402) {
      const payment402 = error.response.data;
      console.log('✅ Received 402 Payment Required');
      console.log('💳 Price:', payment402.accepts[0].maxAmountRequired / 1e6, 'USDC');
      console.log('📥 Pay to:', payment402.accepts[0].payTo, '\n');
    }
  }

  // Step 2: Try with mock payment (will fail but show us what we need)
  console.log('Step 2: Testing with mock payment proof...');
  console.log('(This will fail - showing you the exact wallet address needed)\n');

  const mockPayment = {
    network: 'base-sepolia',
    txHash: '0xMOCK123456789',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123', // Service wallet from logs
    amount: '5000000',
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  };

  try {
    const response = await axios.post(
      `${SERVICE_URL}/api/v1/permit-info`,
      permitRequest,
      {
        headers: {
          'X-Payment': JSON.stringify(mockPayment)
        }
      }
    );

    console.log('🎉 SUCCESS! Here\'s the permit information:\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.log('❌ Payment rejected (expected)');
    console.log('Error:', error.response?.data);
    console.log('\n📝 Note: This is normal - mock TX hash doesn\'t exist on-chain');
    console.log('For real test, you need:');
    console.log('  1. Service wallet (receives payments)');
    console.log('  2. Customer wallet (sends payments)');
    console.log('  3. Real USDC transfer between them\n');
  }
}

main().catch(console.error);

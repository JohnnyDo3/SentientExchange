/**
 * End-to-End Payment Test
 * Tests the full x402 payment flow with real USDC on Base Sepolia
 */
import axios from 'axios';
import { WalletManager } from '../../src/payment/WalletManager';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const SERVICE_URL = 'http://localhost:3010';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x7fC500a9fFf06D0E543503F245865de206459b9f';

async function main() {
  console.log('🧪 Starting End-to-End Payment Test\n');
  console.log('📍 Service URL:', SERVICE_URL);
  console.log('💰 Service Wallet:', WALLET_ADDRESS);
  console.log('🌐 Network: base-sepolia\n');

  // Step 1: Initialize wallet
  console.log('Step 1: Initializing your wallet...');
  const walletManager = new WalletManager({
    networkId: 'base-sepolia',
    walletDataPath: '../data/wallet.json'
  });
  await walletManager.initialize();

  const myAddress = await walletManager.getAddress();
  const balance = await walletManager.getBalance('usdc');
  console.log('✅ Your Wallet:', myAddress);
  console.log('💵 Your Balance:', balance, 'USDC\n');

  // Step 2: Make initial request (should get 402)
  console.log('Step 2: Requesting permit info (without payment)...');
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

  try {
    await axios.post(`${SERVICE_URL}/api/v1/permit-info`, permitRequest);
    console.log('❌ ERROR: Should have received 402!');
    return;
  } catch (error: any) {
    if (error.response?.status !== 402) {
      console.log('❌ ERROR: Expected 402, got', error.response?.status);
      return;
    }

    const payment402 = error.response.data;
    console.log('✅ Received 402 Payment Required');
    console.log('💳 Required:', payment402.accepts[0].maxAmountRequired / 1e6, 'USDC');
    console.log('📥 Pay to:', payment402.accepts[0].payTo, '\n');

    // Step 3: Send payment
    console.log('Step 3: Sending 5 USDC payment...');
    const txHash = await walletManager.transferUsdc(WALLET_ADDRESS, '5.0');
    console.log('✅ Payment sent! Transaction:', txHash);
    console.log('⏳ Waiting for confirmation...\n');

    // Wait a bit for transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Retry with payment proof
    console.log('Step 4: Retrying request with payment proof...');
    const paymentProof = {
      network: 'base-sepolia',
      txHash: txHash,
      from: myAddress,
      to: WALLET_ADDRESS,
      amount: '5000000', // 5 USDC in 6 decimals
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // USDC Base Sepolia
    };

    const response = await axios.post(
      `${SERVICE_URL}/api/v1/permit-info`,
      permitRequest,
      {
        headers: {
          'X-Payment': JSON.stringify(paymentProof)
        }
      }
    );

    console.log('✅ SUCCESS! Permit info received\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 PERMIT INFORMATION:\n');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n═══════════════════════════════════════════════════════════\n');

    console.log('🎉 Test Complete!');
    console.log('💰 Your remaining balance:', await walletManager.getBalance('usdc'), 'USDC');
  }
}

main().catch(console.error);

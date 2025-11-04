/**
 * Create a test customer wallet and fund it
 */
import { WalletManager } from '../../src/payment/WalletManager';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function main() {
  console.log('🧪 Creating Test Customer Wallet\n');

  // Create a NEW wallet for testing (customer)
  const customerWallet = new WalletManager({
    networkId: 'base-sepolia',
    walletDataPath: './test-customer-wallet.json' // Different file!
  });

  await customerWallet.initialize();

  const address = await customerWallet.getAddress();
  const balance = await customerWallet.getBalance('usdc');

  console.log('✅ Customer Wallet Created!');
  console.log('📍 Address:', address);
  console.log('💰 Balance:', balance, 'USDC\n');

  // Request faucet funds
  console.log('💧 Requesting testnet funds from faucet...');
  try {
    const txHash = await customerWallet.requestFaucetFunds();
    console.log('✅ Faucet funds received! TX:', txHash);

    // Check new balance
    await new Promise(resolve => setTimeout(resolve, 5000));
    const newBalance = await customerWallet.getBalance('usdc');
    console.log('💰 New Balance:', newBalance, 'USDC');
  } catch (error: any) {
    console.log('⚠️  Faucet failed:', error.message);
    console.log('📋 Get testnet USDC manually:');
    console.log('   https://portal.cdp.coinbase.com/products/faucet');
    console.log('   Send to:', address);
  }

  console.log('\n📋 Save this info:');
  console.log('   Customer Wallet:', address);
  console.log('   Wallet File: ./test-customer-wallet.json');
}

main().catch(console.error);

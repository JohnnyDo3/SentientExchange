/**
 * Quick script to get wallet address from CDP credentials
 */
import { WalletManager } from '../src/payment/WalletManager';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔑 Getting wallet address from CDP...\n');

  const walletManager = new WalletManager({
    networkId: process.env.NETWORK || 'base-sepolia',
    walletDataPath: './data/wallet.json'
  });

  await walletManager.initialize();

  const address = await walletManager.getAddress();
  const balance = await walletManager.getBalance('usdc');

  console.log('✅ Wallet Address:', address);
  console.log('💰 USDC Balance:', balance, 'USDC');
  console.log('🌐 Network:', process.env.NETWORK || 'base-sepolia');
  console.log('\n📋 Use this address to:');
  console.log('   1. Receive testnet USDC payments');
  console.log('   2. Check balance on Base Sepolia explorer');
  console.log('   3. Fund from faucet: https://portal.cdp.coinbase.com/products/faucet');
  console.log('\n🔗 View on BaseScan:');
  console.log(`   https://sepolia.basescan.org/address/${address}`);
}

main().catch(console.error);

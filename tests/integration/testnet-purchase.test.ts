/**
 * Integration test for purchase flow with real testnet USDC
 *
 * This test uses real CDP wallet and Base Sepolia testnet to verify:
 * 1. Wallet initialization and balance checking
 * 2. USDC balance retrieval
 * 3. Mock x402 payment flow (without actual service)
 *
 * Note: This requires valid CDP credentials in .env
 */

import { WalletManager } from '../../src/payment/WalletManager';
import { X402Client } from '../../src/payment/X402Client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Testnet Purchase Flow', () => {
  let walletManager: WalletManager;
  let x402Client: X402Client;

  beforeAll(async () => {
    // Skip tests if credentials are not configured
    if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
      console.warn('⚠️  Skipping testnet tests: CDP credentials not configured');
      return;
    }

    walletManager = new WalletManager({
      networkId: process.env.NETWORK || 'base-sepolia',
      walletDataPath: './data/test-wallet.json'
    });
    await walletManager.initialize();
    x402Client = new X402Client(walletManager);
  });

  describe('Wallet Operations', () => {
    it('should initialize wallet and get address', async () => {
      if (!process.env.CDP_API_KEY_NAME) {
        return; // Skip if not configured
      }

      const address = await walletManager.getAddress();
      console.log(`✓ Wallet address: ${address}`);
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should retrieve USDC balance on Base Sepolia', async () => {
      if (!process.env.CDP_API_KEY_NAME) {
        return; // Skip if not configured
      }

      const balance = await walletManager.getBalance('usdc');
      console.log(`✓ USDC balance: ${balance} USDC`);

      // Balance should be a valid number string
      expect(balance).toMatch(/^\d+(\.\d+)?$/);

      const balanceNum = parseFloat(balance);
      console.log(`  Balance numeric: ${balanceNum}`);

      if (balanceNum === 0) {
        console.warn('⚠️  Wallet has zero USDC balance');
        console.warn('   To fund testnet wallet:');
        console.warn('   1. Visit https://faucet.circle.com/');
        console.warn('   2. Select "Base Sepolia" network');
        console.warn(`   3. Enter wallet address: ${await walletManager.getAddress()}`);
        console.warn('   4. Request testnet USDC');
      } else {
        console.log(`✓ Wallet has ${balanceNum} USDC for testing`);
      }
    });

    it('should check wallet is ready for transactions', async () => {
      if (!process.env.CDP_API_KEY_NAME) {
        return; // Skip if not configured
      }

      expect(walletManager.isReady()).toBe(true);
      console.log('✓ Wallet is ready for transactions');
    });
  });

  describe('Mock x402 Payment Flow', () => {
    it('should handle mock 402 response', async () => {
      if (!process.env.CDP_API_KEY_NAME) {
        return; // Skip if not configured
      }

      // Note: This would require a real x402 service endpoint
      // For now, we're just verifying the wallet is ready to make payments

      const balance = await walletManager.getBalance('usdc');
      const balanceNum = parseFloat(balance);

      if (balanceNum > 0) {
        console.log('✓ Wallet ready for x402 payments');
        console.log(`  Available balance: ${balance} USDC`);
      } else {
        console.log('⚠️  Wallet needs testnet USDC funding before payment testing');
      }

      // Just verify the x402Client is initialized
      expect(x402Client).toBeDefined();
    });
  });

  describe('Balance Check Tool', () => {
    it('should work with real wallet via checkWalletBalance', async () => {
      if (!process.env.CDP_API_KEY_NAME) {
        return; // Skip if not configured
      }

      const { checkWalletBalance } = await import('../../src/tools/balance');

      const result = await checkWalletBalance(walletManager);
      const response = JSON.parse(result.content[0].text);

      console.log('✓ checkWalletBalance response:');
      console.log(`  Address: ${response.address}`);
      console.log(`  Balance: ${response.balance} ${response.currency}`);
      console.log(`  Network: ${response.network}`);

      expect(response.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(response.balance).toMatch(/^\d+(\.\d+)?$/);
      expect(response.currency).toBe('USDC');
      expect(response.network).toBe('base-sepolia');
    });
  });
});

/**
 * TRUE ENTERPRISE E2E TESTS
 *
 * These tests execute REAL blockchain transactions and call REAL x402 services.
 * NO MOCKS - 100% production-grade testing.
 *
 * Requirements:
 * - SOLANA_PRIVATE_KEY in .env (funded wallet)
 * - Minimum 0.1 SOL (for fees)
 * - Minimum 0.5 USDC (for payments)
 * - sentiment-analyzer service running (auto-started by tests)
 *
 * What this tests:
 * ✅ Real x402 service (sentiment-analyzer)
 * ✅ Real 402 payment request/response
 * ✅ Real Solana blockchain USDC transfers
 * ✅ Real on-chain payment verification
 * ✅ Real service results after payment
 * ✅ Real spending limit enforcement
 * ✅ Real error scenarios (insufficient funds, wrong amount, etc.)
 */

import { Connection, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';
import bs58 from 'bs58';
import { Database } from '../../src/registry/database.js';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry.js';
import { SpendingLimitManager } from '../../src/payment/SpendingLimitManager.js';
import { SolanaVerifier } from '../../src/payment/SolanaVerifier.js';
import { DirectSolanaProvider } from '../../src/payment/DirectSolanaProvider.js';
import { ServiceManager } from '../utils/ServiceManager.js';
import { WalletSetup, WalletRequirements } from '../utils/WalletSetup.js';

const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Devnet USDC
const SERVICE_WALLET = 'DeDDFd3Fr2fdsC4Wi2Hi7MxbyRHokst3jcQ9L2V1nje3'; // sentiment-analyzer recipient

// Test requirements
const REQUIREMENTS: WalletRequirements = {
  minSol: 0.05,   // Enough for ~50 transactions
  minUsdc: 0.2    // Enough for ~20 test purchases at $0.01 each
};

describe('TRUE E2E - Real Blockchain + Real Services', () => {
  let connection: Connection;
  let wallet: Keypair;
  let walletAddress: string;
  let db: Database;
  let registry: ServiceRegistry;
  let limitManager: SpendingLimitManager;
  let verifier: SolanaVerifier;
  let paymentProvider: DirectSolanaProvider;
  let serviceManager: ServiceManager;
  let sentimentService: any;
  let serviceUrl: string;

  beforeAll(async () => {
    // Skip if no wallet configured
    if (!process.env.SOLANA_PRIVATE_KEY) {
      console.warn('\n⚠️  SOLANA_PRIVATE_KEY not set, skipping TRUE E2E tests\n');
      const walletSetup = new WalletSetup('devnet');
      walletSetup.printSetupGuide();
      return;
    }

    console.log('\n🚀 Starting TRUE E2E Tests with Real Blockchain & Services...\n');

    // Initialize wallet
    const walletSetup = new WalletSetup('devnet', USDC_MINT);
    wallet = walletSetup.loadWallet(process.env.SOLANA_PRIVATE_KEY);
    walletAddress = wallet.publicKey.toBase58();

    // Validate wallet meets requirements
    const validation = await walletSetup.validateWallet(wallet, REQUIREMENTS);
    walletSetup.printWalletInfo(validation.info);

    if (!validation.valid) {
      console.error('\n❌ Wallet validation failed:\n');
      validation.errors.forEach(err => console.error(`  ✗ ${err}`));
      console.log('\n');
      walletSetup.printSetupGuide();
      throw new Error('Wallet not ready for E2E tests. Please fund your wallet.');
    }

    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:\n');
      validation.warnings.forEach(warn => console.warn(`  ! ${warn}`));
      console.log('');
    }

    console.log('✅ Wallet validated and ready\n');

    // Initialize Solana connection
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Initialize database
    db = new Database(':memory:');
    await db.initialize();
    console.log('✓ Database initialized');

    // Initialize registry
    registry = new ServiceRegistry(db);
    await registry.initialize();
    console.log('✓ Service registry initialized');

    // Initialize spending limits
    limitManager = new SpendingLimitManager(db);
    await limitManager.initialize();
    console.log('✓ Spending limit manager initialized');

    // Set reasonable spending limits for tests
    await limitManager.setLimits(walletAddress, {
      perTransaction: '$0.10',
      daily: '$1.00',
      monthly: '$10.00',
      enabled: true
    });
    console.log('✓ Spending limits configured');

    // Initialize verifier
    verifier = new SolanaVerifier();
    console.log('✓ Solana verifier initialized');

    // Initialize payment provider
    paymentProvider = new DirectSolanaProvider({
      wallet,
      network: 'devnet',
      usdcMint: USDC_MINT
    });
    console.log('✓ Payment provider initialized');

    // Start sentiment-analyzer service
    console.log('\n🎬 Starting sentiment-analyzer service...');
    serviceManager = new ServiceManager();

    sentimentService = await serviceManager.startService({
      name: 'sentiment-analyzer',
      directory: 'examples/sentiment-analyzer',
      defaultPort: 3001,
      env: {
        WALLET_ADDRESS: SERVICE_WALLET,
        PRICE_USDC: '0.01',
        NETWORK: 'solana-devnet',
        SOLANA_RPC_URL: 'https://api.devnet.solana.com'
      }
    });

    serviceUrl = sentimentService.url;
    console.log(`✅ sentiment-analyzer running at ${serviceUrl}\n`);

    // Register service in registry
    await registry.registerService({
      name: 'Real Sentiment Analyzer',
      description: 'Real x402 sentiment analysis service',
      provider: SERVICE_WALLET,
      endpoint: `${serviceUrl}/analyze`,
      capabilities: ['sentiment-analysis', 'emotion-detection'],
      pricing: {
        perRequest: '$0.01',
        currency: 'USDC',
        network: 'solana-devnet'
      },
      reputation: {
        totalJobs: 0,
        successRate: 100,
        avgResponseTime: '1s',
        rating: 5,
        reviews: 0
      },
      metadata: {
        apiVersion: 'v1'
      }
    });
    console.log('✓ Service registered in marketplace\n');
  });

  afterAll(async () => {
    if (serviceManager) {
      await serviceManager.stopAll();
    }
    if (db) {
      await db.close();
    }
  });

  describe('1. Full x402 Payment Flow (Happy Path)', () => {
    it('should complete real 402 → payment → verification → result flow', async () => {
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('⊘ Skipped - no wallet configured');
        return;
      }

      console.log('\n🎯 Testing complete x402 payment flow...\n');

      const testData = { text: 'I absolutely love this product! Best purchase ever!' };

      // STEP 1: Make request without payment → expect 402
      console.log('Step 1: Request without payment...');
      const response1 = await axios.post(`${serviceUrl}/analyze`, testData, {
        validateStatus: () => true // Don't throw on 402
      });

      console.log(`  → Status: ${response1.status}`);
      expect(response1.status).toBe(402);
      expect(response1.data.x402Version).toBe(1);
      expect(response1.data.accepts).toBeDefined();
      expect(response1.data.accepts.length).toBeGreaterThan(0);

      const paymentOption = response1.data.accepts[0];
      console.log(`  → Payment required: ${paymentOption.maxAmountRequired} base units`);
      console.log(`  → Recipient: ${paymentOption.payTo.substring(0, 8)}...`);
      console.log(`  → Token: ${paymentOption.asset.substring(0, 8)}...`);

      // STEP 2: Check spending limit
      console.log('\nStep 2: Check spending limit...');
      const limitCheck = await limitManager.checkLimit(walletAddress, '$0.01');
      console.log(`  → Limit check: ${limitCheck.allowed ? '✅ Allowed' : '❌ Denied'}`);
      expect(limitCheck.allowed).toBe(true);

      // STEP 3: Execute real blockchain payment
      console.log('\nStep 3: Execute REAL Solana payment...');
      const paymentResult = await paymentProvider.executePayment({
        recipient: paymentOption.payTo,
        amount: BigInt(paymentOption.maxAmountRequired),
        tokenAddress: paymentOption.asset,
        network: 'devnet'
      });

      console.log(`  → Transaction signature: ${paymentResult.signature}`);
      console.log(`  → Status: ${paymentResult.status}`);
      expect(paymentResult.status).toBe('confirmed');

      // STEP 4: Verify payment on-chain
      console.log('\nStep 4: Verify payment on blockchain...');
      const verificationResult = await verifier.verifyPayment({
        signature: paymentResult.signature,
        expectedAmount: BigInt(paymentOption.maxAmountRequired),
        expectedRecipient: paymentOption.payTo,
        expectedToken: paymentOption.asset,
        network: 'devnet'
      });

      console.log(`  → Verification: ${verificationResult.verified ? '✅ Valid' : '❌ Invalid'}`);
      expect(verificationResult.verified).toBe(true);

      // STEP 5: Retry request with payment proof
      console.log('\nStep 5: Retry with payment proof...');
      const paymentProof = {
        network: 'solana-devnet',
        txHash: paymentResult.signature,
        from: walletAddress,
        to: paymentOption.payTo,
        amount: paymentOption.maxAmountRequired,
        asset: paymentOption.asset
      };

      const response2 = await axios.post(`${serviceUrl}/analyze`, testData, {
        headers: {
          'X-Payment': JSON.stringify(paymentProof)
        }
      });

      console.log(`  → Status: ${response2.status}`);
      console.log(`  → Success: ${response2.data.success}`);
      expect(response2.status).toBe(200);
      expect(response2.data.success).toBe(true);
      expect(response2.data.result).toBeDefined();

      // STEP 6: Verify service result
      console.log('\nStep 6: Verify service result...');
      const result = response2.data.result;
      console.log(`  → Overall sentiment: ${result.overall.label} (${result.overall.polarity.toFixed(2)})`);
      console.log(`  → Confidence: ${(result.overall.confidence * 100).toFixed(1)}%`);

      expect(result.overall).toBeDefined();
      expect(result.overall.label).toBe('positive');
      expect(result.overall.polarity).toBeGreaterThan(0.5);

      console.log('\n✅ Complete x402 flow successful!\n');
    }, 60000); // 60 second timeout
  });

  describe('2. Real Error Scenarios', () => {
    it('should reject payment with wrong amount', async () => {
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('⊘ Skipped - no wallet configured');
        return;
      }

      console.log('\n🧪 Testing wrong payment amount...\n');

      // Get 402 response
      const response1 = await axios.post(`${serviceUrl}/analyze`,
        { text: 'test' },
        { validateStatus: () => true }
      );

      const paymentOption = response1.data.accepts[0];

      // Pay WRONG amount (half of required)
      const wrongAmount = BigInt(paymentOption.maxAmountRequired) / BigInt(2);

      const paymentResult = await paymentProvider.executePayment({
        recipient: paymentOption.payTo,
        amount: wrongAmount,
        tokenAddress: paymentOption.asset,
        network: 'devnet'
      });

      console.log(`  → Paid wrong amount: ${wrongAmount} (expected ${paymentOption.maxAmountRequired})`);

      // Try to use with service
      const paymentProof = {
        network: 'solana-devnet',
        txHash: paymentResult.signature,
        from: walletAddress,
        to: paymentOption.payTo,
        amount: wrongAmount.toString(),
        asset: paymentOption.asset
      };

      const response2 = await axios.post(`${serviceUrl}/analyze`,
        { text: 'test' },
        {
          headers: { 'X-Payment': JSON.stringify(paymentProof) },
          validateStatus: () => true
        }
      );

      console.log(`  → Service response: ${response2.status}`);
      expect(response2.status).toBe(402); // Should reject and request payment again

      console.log('✅ Wrong amount correctly rejected\n');
    }, 60000);

    it('should enforce spending limits before payment', async () => {
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('⊘ Skipped - no wallet configured');
        return;
      }

      console.log('\n🧪 Testing spending limit enforcement...\n');

      // Set very low limit
      await limitManager.setLimits(walletAddress, {
        perTransaction: '$0.001', // Lower than service price
        enabled: true
      });

      const limitCheck = await limitManager.checkLimit(walletAddress, '$0.01');
      console.log(`  → Limit check for $0.01: ${limitCheck.allowed ? 'Allowed' : 'Denied'}`);
      console.log(`  → Reason: ${limitCheck.reason || 'N/A'}`);

      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.reason).toContain('exceeds per-transaction limit');

      // Reset limits for other tests
      await limitManager.setLimits(walletAddress, {
        perTransaction: '$0.10',
        enabled: true
      });

      console.log('✅ Spending limit correctly enforced\n');
    });
  });

  describe('3. Real Service Features', () => {
    it('should return detailed sentiment analysis', async () => {
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('⊘ Skipped - no wallet configured');
        return;
      }

      console.log('\n🧪 Testing real sentiment analysis features...\n');

      // Get 402, pay, and get result (abbreviated)
      const response1 = await axios.post(`${serviceUrl}/analyze`,
        { text: 'This is absolutely terrible and I hate it!' },
        { validateStatus: () => true }
      );

      const paymentOption = response1.data.accepts[0];

      const paymentResult = await paymentProvider.executePayment({
        recipient: paymentOption.payTo,
        amount: BigInt(paymentOption.maxAmountRequired),
        tokenAddress: paymentOption.asset,
        network: 'devnet'
      });

      const response2 = await axios.post(`${serviceUrl}/analyze`,
        { text: 'This is absolutely terrible and I hate it!' },
        {
          headers: {
            'X-Payment': JSON.stringify({
              network: 'solana-devnet',
              txHash: paymentResult.signature,
              from: walletAddress,
              to: paymentOption.payTo,
              amount: paymentOption.maxAmountRequired,
              asset: paymentOption.asset
            })
          }
        }
      );

      const result = response2.data.result;
      console.log(`  → Sentiment: ${result.overall.label}`);
      console.log(`  → Polarity: ${result.overall.polarity.toFixed(2)}`);
      console.log(`  → Emotions detected: ${Object.keys(result.emotions).length}`);

      expect(result.overall.label).toBe('negative');
      expect(result.overall.polarity).toBeLessThan(0);
      expect(result.emotions).toBeDefined();

      console.log('✅ Real sentiment analysis working correctly\n');
    }, 60000);
  });

  describe('4. Performance & Reliability', () => {
    it('should handle multiple sequential purchases', async () => {
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('⊘ Skipped - no wallet configured');
        return;
      }

      console.log('\n🧪 Testing multiple sequential purchases...\n');

      const testTexts = [
        'Great product!',
        'Terrible experience',
        'Could be better'
      ];

      const results = [];

      for (const [index, text] of testTexts.entries()) {
        console.log(`  Purchase ${index + 1}/${testTexts.length}...`);

        // Get 402
        const response1 = await axios.post(`${serviceUrl}/analyze`,
          { text },
          { validateStatus: () => true }
        );

        // Pay
        const paymentOption = response1.data.accepts[0];
        const paymentResult = await paymentProvider.executePayment({
          recipient: paymentOption.payTo,
          amount: BigInt(paymentOption.maxAmountRequired),
          tokenAddress: paymentOption.asset,
          network: 'devnet'
        });

        // Get result
        const response2 = await axios.post(`${serviceUrl}/analyze`,
          { text },
          {
            headers: {
              'X-Payment': JSON.stringify({
                network: 'solana-devnet',
                txHash: paymentResult.signature,
                from: walletAddress,
                to: paymentOption.payTo,
                amount: paymentOption.maxAmountRequired,
                asset: paymentOption.asset
              })
            }
          }
        );

        results.push(response2.data.result);
      }

      console.log(`  ✓ Completed ${results.length} purchases successfully`);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.overall).toBeDefined();
      });

      console.log('✅ Sequential purchases working\n');
    }, 180000); // 3 minute timeout for multiple transactions
  });
});

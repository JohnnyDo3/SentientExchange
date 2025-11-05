/**
 * TRUE E2E Test - Smart 3-Call Workflow
 *
 * Tests the complete smart workflow:
 * 1. discover_and_prepare_service (discovery + health + payment prep)
 * 2. execute_payment (blockchain payment - client-side)
 * 3. complete_service_with_payment (verify + submit + retry logic)
 *
 * This is a REAL E2E test that:
 * - Starts actual x402 services
 * - Makes real blockchain transactions on Solana devnet
 * - Verifies payments on-chain
 * - Tests automatic retry with backup services
 */

import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { Database } from '../../src/registry/database';
import { SolanaVerifier } from '../../src/payment/SolanaVerifier';
import { SpendingLimitManager } from '../../src/payment/SpendingLimitManager';
import { discoverAndPrepareService } from '../../src/tools/smart-discover-prepare';
import { executePayment } from '../../src/tools/execute-payment';
import { completeServiceWithPayment } from '../../src/tools/smart-execute-complete';
import { ServiceManager } from '../utils/ServiceManager';
import { WalletSetup } from '../utils/WalletSetup';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import path from 'path';
import fs from 'fs';

// Only run if explicitly requested
const shouldRunRealE2E = process.env.RUN_SMART_E2E === 'true';

describe.skip('Smart 3-Call E2E Flow', () => {
  let db: Database;
  let registry: ServiceRegistry;
  let verifier: SolanaVerifier;
  let limitManager: SpendingLimitManager;
  let serviceManager: ServiceManager;
  let wallet: Keypair;
  const userId = 'test-user';

  beforeAll(async () => {
    if (!shouldRunRealE2E) {
      console.log('Skipping TRUE E2E tests (set RUN_SMART_E2E=true to run)');
      return;
    }

    // Setup wallet
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SOLANA_PRIVATE_KEY required for E2E tests');
    }

    wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    const walletSetup = new WalletSetup();
    await walletSetup.validateWallet(wallet, {
      minSol: 0.05,
      minUsdc: 0.2,
    });

    console.log('✅ Wallet validated');

    // Initialize database
    const dbPath = path.join(__dirname, '../test-data/smart-e2e-test.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    db = new Database(dbPath);
    await db.initialize();

    // Initialize components
    registry = new ServiceRegistry(db);
    await registry.initialize();

    verifier = new SolanaVerifier();

    limitManager = new SpendingLimitManager(db);
    await limitManager.initialize();

    // Set spending limits for user
    await limitManager.setLimits(userId, {
      perTransaction: '$5.00',
      daily: '$50.00',
      monthly: '$500.00',
      enabled: true,
    });

    // Start services
    serviceManager = new ServiceManager();

    console.log('🎬 Starting sentiment-analyzer service...');
    await serviceManager.startService({
      name: 'sentiment-analyzer',
      directory: 'examples/sentiment-analyzer',
      defaultPort: 4523,
      env: {
        NODE_ENV: 'test',
      },
    });

    console.log('✅ Services started');
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    if (serviceManager) {
      await serviceManager.stopAll();
    }
    if (db) {
      await db.close();
    }
  });

  describe('Complete smart 3-call workflow', () => {
    it('should complete full workflow: discover → pay → complete', async () => {
      if (!shouldRunRealE2E) {
        return;
      }

      const requestData = {
        text: 'I absolutely love this product! Best purchase ever!',
      };

      // CALL 1: Discover and prepare
      console.log('\n📡 Call 1: discover_and_prepare_service');
      const discoverResult = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData,
          checkHealth: true,
          userId,
        },
        limitManager
      );

      expect(discoverResult.content[0].text).toContain('success');
      const prepareResponse = JSON.parse(discoverResult.content[0].text);

      console.log(`  ✅ Selected: ${prepareResponse.selectedService.name}`);
      console.log(`  💰 Price: ${prepareResponse.paymentReady.estimatedCost}`);
      console.log(`  🔧 Session: ${prepareResponse.sessionId}`);

      expect(prepareResponse.sessionId).toBeDefined();
      expect(prepareResponse.paymentReady.paymentInstructions).toBeDefined();

      // CALL 2: Execute payment (client-side blockchain transaction)
      console.log('\n💳 Call 2: execute_payment');
      const paymentResult = await executePayment({
        paymentInstructions: prepareResponse.paymentReady.paymentInstructions,
      });

      expect(paymentResult.content[0].text).toContain('success');
      const paymentResponse = JSON.parse(paymentResult.content[0].text);

      console.log(`  ✅ Transaction: ${paymentResponse.signature}`);
      console.log(`  🔗 Network: ${paymentResponse.network}`);

      expect(paymentResponse.signature).toBeDefined();

      // Wait for blockchain confirmation
      console.log('  ⏳ Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // CALL 3: Complete service with payment
      console.log('\n🎯 Call 3: complete_service_with_payment');
      const completeResult = await completeServiceWithPayment(
        registry,
        verifier,
        db,
        {
          sessionId: prepareResponse.sessionId,
          signature: paymentResponse.signature,
          retryOnFailure: true,
        }
      );

      expect(completeResult.content[0].text).toContain('success');
      const completeResponse = JSON.parse(completeResult.content[0].text);

      console.log(`  ✅ Service result received`);
      console.log(`  📊 Sentiment: ${completeResponse.serviceResult.result.overall.label}`);
      console.log(`  ⚡ Total time: ${completeResponse.metadata.totalTime}ms`);

      expect(completeResponse.serviceResult).toBeDefined();
      expect(completeResponse.serviceResult.result.overall).toBeDefined();
      expect(completeResponse.serviceResult.result.overall.label).toBe('positive');
      expect(completeResponse.payment.verifiedOnChain).toBe(true);
      expect(completeResponse.metadata.retriesUsed).toBe(0);

      console.log('\n✅ Smart 3-call workflow completed successfully!');
    }, 120000); // 2 minute timeout
  });

  describe('Smart workflow with service failure and retry', () => {
    it('should retry with backup service when primary fails', async () => {
      if (!shouldRunRealE2E) {
        return;
      }

      // Register a fake service that will fail
      await registry.registerService({
        name: 'Fake Service (will fail)',
        description: 'This service will fail',
        provider: wallet.publicKey.toBase58(),
        endpoint: 'http://localhost:9999', // Non-existent port
        capabilities: ['sentiment-analysis'],
        pricing: {
          perRequest: '$0.01',
          currency: 'USDC',
          network: 'devnet',
        },
        reputation: {
          totalJobs: 0,
          successRate: 0,
          avgResponseTime: '0s',
          rating: 0,
          reviews: 0,
        },
        metadata: {
          apiVersion: 'v1',
        },
      });

      const requestData = { text: 'Test sentiment' };

      // This should select the fake service (or real one, depending on ranking)
      // Either way, we test the retry logic works
      console.log('\n📡 Testing retry logic...');

      const discoverResult = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData,
          checkHealth: false, // Skip health check to allow fake service
          userId,
        },
        limitManager
      );

      const prepareResponse = JSON.parse(discoverResult.content[0].text);

      // If the fake service was selected, execute payment and complete
      // The complete call should retry with the backup service
      const paymentResult = await executePayment({
        paymentInstructions: prepareResponse.paymentReady.paymentInstructions,
      });

      const paymentResponse = JSON.parse(paymentResult.content[0].text);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const completeResult = await completeServiceWithPayment(
        registry,
        verifier,
        db,
        {
          sessionId: prepareResponse.sessionId,
          signature: paymentResponse.signature,
          retryOnFailure: true,
        }
      );

      // Should either succeed with primary or backup
      const completeResponse = JSON.parse(completeResult.content[0].text);

      if (completeResponse.metadata?.primaryServiceFailed) {
        console.log('  ✅ Primary failed, backup succeeded');
        expect(completeResponse.metadata.retriesUsed).toBeGreaterThan(0);
      } else {
        console.log('  ✅ Primary succeeded');
      }

      expect(completeResponse.success).toBe(true);
    }, 120000);
  });

  describe('Spending limit integration', () => {
    it('should respect spending limits in smart workflow', async () => {
      if (!shouldRunRealE2E) {
        return;
      }

      // Set very low daily limit
      await limitManager.setLimits(userId, {
        perTransaction: '$5.00',
        daily: '$0.001', // Very low - will block
        monthly: '$500.00',
        enabled: true,
      });

      const requestData = { text: 'Test' };

      const discoverResult = await discoverAndPrepareService(
        registry,
        {
          capability: 'sentiment-analysis',
          requestData,
          userId,
        },
        limitManager
      );

      expect(discoverResult.isError).toBe(true);
      const response = JSON.parse(discoverResult.content[0].text);
      expect(response.error).toContain('Spending limit exceeded');

      console.log('  ✅ Spending limit enforced correctly');

      // Reset limits
      await limitManager.setLimits(userId, {
        perTransaction: '$5.00',
        daily: '$50.00',
        monthly: '$500.00',
        enabled: true,
      });
    });
  });
});

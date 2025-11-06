/**
 * PaymentFactory Tests
 *
 * Tests the factory functions that create payment providers and routers
 * with different configurations based on environment and payment mode.
 */

import { PaymentRouter } from '../../../src/payment/PaymentRouter';
import { X402Provider } from '../../../src/payment/X402Provider';
import { DirectSolanaProvider } from '../../../src/payment/DirectSolanaProvider';
import {
  createPaymentRouter,
  createX402Provider,
  createDirectSolanaProvider,
  PaymentFactoryConfig,
} from '../../../src/payment/PaymentFactory';

// Mock the providers and router
jest.mock('../../../src/payment/PaymentRouter');
jest.mock('../../../src/payment/X402Provider');
jest.mock('../../../src/payment/DirectSolanaProvider');

const MockPaymentRouter = PaymentRouter as jest.MockedClass<typeof PaymentRouter>;
const MockX402Provider = X402Provider as jest.MockedClass<typeof X402Provider>;
const MockDirectSolanaProvider = DirectSolanaProvider as jest.MockedClass<typeof DirectSolanaProvider>;

describe('PaymentFactory', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };

    // Setup mock instances
    MockX402Provider.mockImplementation(() => ({
      name: 'X402Provider',
      initialize: jest.fn().mockResolvedValue(undefined),
      executePayment: jest.fn(),
      verifyPayment: jest.fn(),
      isHealthy: jest.fn().mockResolvedValue(true),
    } as any));

    MockDirectSolanaProvider.mockImplementation(() => ({
      name: 'DirectSolanaProvider',
      initialize: jest.fn().mockResolvedValue(undefined),
      executePayment: jest.fn(),
      verifyPayment: jest.fn(),
      isHealthy: jest.fn().mockResolvedValue(true),
    } as any));

    MockPaymentRouter.mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      executePayment: jest.fn(),
      verifyPayment: jest.fn(),
    } as any));
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('createPaymentRouter', () => {
    describe('Payment Mode: x402', () => {
      it('should create router with only X402Provider', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'x402',
          network: 'devnet',
          secretKey: 'test-secret-key',
        };

        const router = await createPaymentRouter(config);

        expect(router).toBeDefined();
        expect(MockX402Provider).toHaveBeenCalledTimes(1);
        expect(MockDirectSolanaProvider).not.toHaveBeenCalled();

        // Verify router was created with correct config
        expect(MockPaymentRouter).toHaveBeenCalledWith(
          expect.objectContaining({
            autoFallback: false,
            maxRetries: 3,
            retryDelay: 1000,
          })
        );
      });

      it('should not have fallback provider in x402 mode', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'x402',
          network: 'devnet',
        };

        await createPaymentRouter(config);

        const routerCall = MockPaymentRouter.mock.calls[0][0];
        expect(routerCall.primaryProvider).toBeDefined();
        expect(routerCall.fallbackProvider).toBeUndefined();
      });
    });

    describe('Payment Mode: direct', () => {
      it('should create router with only DirectSolanaProvider', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'direct',
          network: 'devnet',
          secretKey: 'test-secret-key',
        };

        const router = await createPaymentRouter(config);

        expect(router).toBeDefined();
        expect(MockDirectSolanaProvider).toHaveBeenCalledTimes(1);
        expect(MockX402Provider).not.toHaveBeenCalled();
      });

      it('should not have fallback provider in direct mode', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'direct',
          network: 'devnet',
        };

        await createPaymentRouter(config);

        const routerCall = MockPaymentRouter.mock.calls[0][0];
        expect(routerCall.primaryProvider).toBeDefined();
        expect(routerCall.fallbackProvider).toBeUndefined();
      });
    });

    describe('Payment Mode: hybrid', () => {
      it('should create router with X402 primary and DirectSolana fallback', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'hybrid',
          network: 'devnet',
          secretKey: 'test-secret-key',
        };

        const router = await createPaymentRouter(config);

        expect(router).toBeDefined();
        expect(MockX402Provider).toHaveBeenCalledTimes(1);
        expect(MockDirectSolanaProvider).toHaveBeenCalledTimes(1);
      });

      it('should enable auto-fallback in hybrid mode', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'hybrid',
          network: 'devnet',
        };

        await createPaymentRouter(config);

        const routerCall = MockPaymentRouter.mock.calls[0][0];
        expect(routerCall.autoFallback).toBe(true);
        expect(routerCall.primaryProvider).toBeDefined();
        expect(routerCall.fallbackProvider).toBeDefined();
      });

      it('should be default mode when not specified', async () => {
        const config: PaymentFactoryConfig = {
          network: 'devnet',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledTimes(1);
        expect(MockDirectSolanaProvider).toHaveBeenCalledTimes(1);

        const routerCall = MockPaymentRouter.mock.calls[0][0];
        expect(routerCall.autoFallback).toBe(true);
      });
    });

    describe('Network Configuration', () => {
      it('should normalize devnet to solana-devnet for x402', async () => {
        const config: PaymentFactoryConfig = {
          network: 'devnet',
          paymentMode: 'x402',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana-devnet',
          })
        );
      });

      it('should normalize mainnet-beta to solana', async () => {
        const config: PaymentFactoryConfig = {
          network: 'mainnet-beta',
          paymentMode: 'x402',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana',
          })
        );
      });

      it('should handle base-sepolia network', async () => {
        const config: PaymentFactoryConfig = {
          network: 'base-sepolia',
          paymentMode: 'x402',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'base-sepolia',
          })
        );
      });

      it('should use default network if not specified', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'x402',
        };

        delete process.env.NETWORK;

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana-devnet', // Default devnet normalized
          })
        );
      });

      it('should read network from environment variable', async () => {
        process.env.NETWORK = 'mainnet-beta';

        await createPaymentRouter({ paymentMode: 'x402' });

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana', // mainnet-beta normalized to solana
          })
        );
      });
    });

    describe('Provider Configuration', () => {
      it('should pass maxPaymentValue to providers', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'hybrid',
          maxPaymentValue: '1000000',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            maxPaymentValue: BigInt(1000000),
          })
        );

        expect(MockDirectSolanaProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            maxPaymentValue: BigInt(1000000),
          })
        );
      });

      it('should pass rpcUrl to providers', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'hybrid',
          rpcUrl: 'https://custom-rpc.solana.com',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            rpcUrl: 'https://custom-rpc.solana.com',
          })
        );
      });

      it('should pass secretKey to providers', async () => {
        const config: PaymentFactoryConfig = {
          paymentMode: 'hybrid',
          secretKey: 'my-secret-key',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            secretKey: 'my-secret-key',
          })
        );
      });

      it('should read config from environment variables', async () => {
        process.env.SOLANA_RPC_URL = 'https://env-rpc.solana.com';
        process.env.SOLANA_PRIVATE_KEY = 'env-secret-key';
        process.env.MAX_PAYMENT_VALUE = '5000000';
        process.env.PAYMENT_MODE = 'direct';
        process.env.NETWORK = 'mainnet-beta';

        await createPaymentRouter();

        expect(MockDirectSolanaProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: 'solana', // mainnet-beta is normalized to solana
            rpcUrl: 'https://env-rpc.solana.com',
            secretKey: 'env-secret-key',
            maxPaymentValue: BigInt(5000000),
          })
        );
      });

      it('should prefer config over environment variables', async () => {
        process.env.SOLANA_RPC_URL = 'https://env-rpc.solana.com';
        process.env.SOLANA_PRIVATE_KEY = 'env-secret';

        const config: PaymentFactoryConfig = {
          rpcUrl: 'https://config-rpc.solana.com',
          secretKey: 'config-secret',
          paymentMode: 'x402',
        };

        await createPaymentRouter(config);

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            rpcUrl: 'https://config-rpc.solana.com',
            secretKey: 'config-secret',
          })
        );
      });
    });

    describe('Router Initialization', () => {
      it('should initialize the router', async () => {
        const mockRouter = {
          initialize: jest.fn().mockResolvedValue(undefined),
        };

        MockPaymentRouter.mockReturnValue(mockRouter as any);

        await createPaymentRouter({ paymentMode: 'x402' });

        expect(mockRouter.initialize).toHaveBeenCalledTimes(1);
      });

      it('should set correct retry configuration', async () => {
        await createPaymentRouter({ paymentMode: 'hybrid' });

        expect(MockPaymentRouter).toHaveBeenCalledWith(
          expect.objectContaining({
            maxRetries: 3,
            retryDelay: 1000,
          })
        );
      });
    });
  });

  describe('createX402Provider', () => {
    it('should create and initialize X402Provider', async () => {
      const mockProvider = {
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      MockX402Provider.mockReturnValue(mockProvider as any);

      const provider = await createX402Provider({
        network: 'solana-devnet',
        secretKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(MockX402Provider).toHaveBeenCalledTimes(1);
      expect(mockProvider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should normalize network name', async () => {
      await createX402Provider({
        network: 'devnet',
      });

      expect(MockX402Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'solana-devnet',
        })
      );
    });

    it('should read from environment if config not provided', async () => {
      process.env.NETWORK = 'mainnet-beta';
      process.env.SOLANA_RPC_URL = 'https://rpc.solana.com';
      process.env.SOLANA_PRIVATE_KEY = 'secret';

      await createX402Provider();

      expect(MockX402Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'solana',
          rpcUrl: 'https://rpc.solana.com',
          secretKey: 'secret',
        })
      );
    });

    it('should use default network if not specified', async () => {
      delete process.env.NETWORK;

      await createX402Provider();

      expect(MockX402Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'solana-devnet', // Default devnet normalized
        })
      );
    });
  });

  describe('createDirectSolanaProvider', () => {
    it('should create and initialize DirectSolanaProvider', async () => {
      const mockProvider = {
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      MockDirectSolanaProvider.mockReturnValue(mockProvider as any);

      const provider = await createDirectSolanaProvider({
        network: 'devnet',
        secretKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(MockDirectSolanaProvider).toHaveBeenCalledTimes(1);
      expect(mockProvider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should NOT normalize network name for DirectSolanaProvider', async () => {
      // DirectSolana uses raw network name, not x402 normalized
      await createDirectSolanaProvider({
        network: 'devnet',
      });

      expect(MockDirectSolanaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'devnet', // Not normalized
        })
      );
    });

    it('should read from environment if config not provided', async () => {
      process.env.NETWORK = 'mainnet-beta';
      process.env.SOLANA_RPC_URL = 'https://rpc.solana.com';
      process.env.SOLANA_PRIVATE_KEY = 'secret';

      await createDirectSolanaProvider();

      expect(MockDirectSolanaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'mainnet-beta',
          rpcUrl: 'https://rpc.solana.com',
          secretKey: 'secret',
        })
      );
    });

    it('should pass maxPaymentValue if provided', async () => {
      await createDirectSolanaProvider({
        network: 'devnet',
        maxPaymentValue: BigInt(2000000),
      });

      expect(MockDirectSolanaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          maxPaymentValue: BigInt(2000000),
        })
      );
    });
  });

  describe('Network Normalization', () => {
    const testCases = [
      { input: 'devnet', expected: 'solana-devnet' },
      { input: 'DEVNET', expected: 'solana-devnet' },
      { input: 'mainnet-beta', expected: 'solana' },
      { input: 'mainnet', expected: 'solana' },
      { input: 'solana', expected: 'solana' },
      { input: 'base-sepolia', expected: 'base-sepolia' },
      { input: 'base', expected: 'base' },
      { input: 'avalanche-fuji', expected: 'avalanche-fuji' },
      { input: 'avalanche', expected: 'avalanche' },
      { input: 'iotex', expected: 'iotex' },
      { input: 'sei', expected: 'sei' },
      { input: 'sei-testnet', expected: 'sei-testnet' },
      { input: 'unknown-network', expected: 'unknown-network' }, // Pass through unknown
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should normalize "${input}" to "${expected}"`, async () => {
        await createX402Provider({
          network: input,
        });

        expect(MockX402Provider).toHaveBeenCalledWith(
          expect.objectContaining({
            network: expected,
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config object', async () => {
      const router = await createPaymentRouter({});

      expect(router).toBeDefined();
      expect(MockX402Provider).toHaveBeenCalled();
      expect(MockDirectSolanaProvider).toHaveBeenCalled();
    });

    it('should handle undefined config', async () => {
      const router = await createPaymentRouter();

      expect(router).toBeDefined();
    });

    it('should handle maxPaymentValue as undefined', async () => {
      await createPaymentRouter({
        maxPaymentValue: undefined,
      });

      expect(MockX402Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          maxPaymentValue: undefined,
        })
      );
    });

    it('should handle very large maxPaymentValue', async () => {
      const largeValue = '999999999999999999999'; // > Number.MAX_SAFE_INTEGER

      await createPaymentRouter({
        maxPaymentValue: largeValue,
      });

      expect(MockX402Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          maxPaymentValue: BigInt(largeValue),
        })
      );
    });
  });
});

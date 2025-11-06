/**
 * Helper functions for payment testing
 */
export class PaymentHelpers {
  /**
   * Create a mock Solana transaction signature
   */
  static createMockSignature(index: number = 0): string {
    const base = 'test-signature-';
    const padding = index.toString().padStart(50, '0');
    return base + padding;
  }

  /**
   * Create a mock Solana public key
   */
  static createMockPublicKey(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let key = '';
    for (let i = 0; i < 44; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  /**
   * Create a mock successful Solana RPC getTransaction response
   */
  static createMockTransactionResponse(options: {
    signature?: string;
    from?: string;
    to?: string;
    amount?: number;
    status?: 'confirmed' | 'finalized';
  } = {}) {
    const signature = options.signature || PaymentHelpers.createMockSignature();
    const from = options.from || PaymentHelpers.createMockPublicKey();
    const to = options.to || PaymentHelpers.createMockPublicKey();
    const amount = options.amount || 100000; // 0.1 USDC (6 decimals)

    return {
      slot: 123456789,
      transaction: {
        message: {
          accountKeys: [from, to],
          instructions: [
            {
              programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token program
              accounts: [0, 1],
              data: Buffer.from([3, ...Buffer.from(amount.toString(16).padStart(16, '0'), 'hex')]).toString('base64'),
            },
          ],
        },
        signatures: [signature],
      },
      meta: {
        err: null,
        status: { Ok: null },
        fee: 5000,
        preBalances: [1000000, 0],
        postBalances: [1000000 - amount - 5000, amount],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      blockTime: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Create a mock failed Solana RPC getTransaction response
   */
  static createMockFailedTransactionResponse(signature?: string) {
    return {
      slot: 123456789,
      transaction: {
        message: {
          accountKeys: [],
          instructions: [],
        },
        signatures: [signature || PaymentHelpers.createMockSignature()],
      },
      meta: {
        err: { InstructionError: [0, 'Custom(1)'] },
        status: { Err: 'InstructionError' },
        fee: 5000,
        preBalances: [1000000],
        postBalances: [995000],
      },
      blockTime: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Create a mock Solana RPC getSignatureStatuses response
   */
  static createMockSignatureStatusesResponse(options: {
    confirmed?: boolean;
    finalized?: boolean;
    err?: Record<string, unknown> | null;
  } = {}) {
    const confirmed = options.confirmed ?? true;
    const finalized = options.finalized ?? true;

    return {
      context: { slot: 123456789 },
      value: [
        confirmed
          ? {
              slot: 123456789,
              confirmations: finalized ? null : 10,
              err: options.err || null,
              confirmationStatus: finalized ? 'finalized' : 'confirmed',
            }
          : null,
      ],
    };
  }

  /**
   * Create a mock payment proof header
   */
  static createMockPaymentProof(options: {
    signature?: string;
    network?: string;
    amount?: string;
    currency?: string;
  } = {}): string {
    const proof = {
      signature: options.signature || PaymentHelpers.createMockSignature(),
      network: options.network || 'base-sepolia',
      amount: options.amount || '0.10',
      currency: options.currency || 'USDC',
      timestamp: new Date().toISOString(),
    };
    return Buffer.from(JSON.stringify(proof)).toString('base64');
  }

  /**
   * Create a mock X-Payment header
   */
  static createXPaymentHeader(signature?: string): string {
    return PaymentHelpers.createMockPaymentProof({ signature });
  }

  /**
   * Create a mock 402 Payment Required response
   */
  static createMock402Response(options: {
    amount?: string;
    currency?: string;
    recipient?: string;
    network?: string;
  } = {}) {
    return {
      status: 402,
      data: {
        error: 'Payment Required',
        payment: {
          amount: options.amount || '0.10',
          currency: options.currency || 'USDC',
          recipient: options.recipient || PaymentHelpers.createMockPublicKey(),
          network: options.network || 'base-sepolia',
        },
      },
      headers: {
        'www-authenticate': `Bearer realm="payment", amount="${options.amount || '0.10'}", currency="${options.currency || 'USDC'}"`,
      },
    };
  }

  /**
   * Create a mock successful payment response (after 402 → payment → retry)
   */
  static createMockSuccessfulPaymentResponse(data: Record<string, unknown> = {}) {
    return {
      status: 200,
      data: {
        result: 'success',
        ...data,
      },
      headers: {},
    };
  }

  /**
   * Mock Solana Connection methods
   */
  static createMockConnection() {
    return {
      getTransaction: jest.fn(),
      getSignatureStatuses: jest.fn(),
      getBalance: jest.fn().mockResolvedValue(1000000),
      getRecentBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        feeCalculator: { lamportsPerSignature: 5000 },
      }),
      sendTransaction: jest.fn().mockResolvedValue(PaymentHelpers.createMockSignature()),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    };
  }

  /**
   * Mock WalletManager
   */
  static createMockWalletManager() {
    return {
      getOrCreateWallet: jest.fn().mockResolvedValue({
        getAddress: jest.fn().mockResolvedValue(PaymentHelpers.createMockPublicKey()),
        sign: jest.fn().mockResolvedValue(PaymentHelpers.createMockSignature()),
      }),
      getBalance: jest.fn().mockResolvedValue({ sol: '1.0', usdc: '100.0' }),
      isReady: jest.fn().mockReturnValue(true),
    };
  }

  /**
   * Create mock USDC transfer parameters
   */
  static createMockUSDCTransfer(options: {
    from?: string;
    to?: string;
    amount?: string;
  } = {}) {
    return {
      from: options.from || PaymentHelpers.createMockPublicKey(),
      to: options.to || PaymentHelpers.createMockPublicKey(),
      amount: options.amount || '0.10',
      currency: 'USDC',
      decimals: 6,
    };
  }

  /**
   * Convert USDC amount to lamports (6 decimals)
   */
  static usdcToLamports(amount: string): number {
    return Math.floor(parseFloat(amount) * 1_000_000);
  }

  /**
   * Convert lamports to USDC string
   */
  static lamportsToUsdc(lamports: number): string {
    return (lamports / 1_000_000).toFixed(6);
  }

  /**
   * Create a mock CDP wallet
   */
  static createMockCDPWallet() {
    return {
      getDefaultAddress: jest.fn().mockReturnValue({
        getId: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
      }),
      createTransfer: jest.fn().mockReturnValue({
        wait: jest.fn().mockResolvedValue({
          getTransactionHash: jest.fn().mockReturnValue('0x' + 'a'.repeat(64)),
        }),
      }),
    };
  }

  /**
   * Well-known test payment amounts
   */
  static readonly TEST_AMOUNTS = {
    TINY: '0.01',
    SMALL: '0.10',
    MEDIUM: '1.00',
    LARGE: '10.00',
    HUGE: '100.00',
  };

  /**
   * Well-known test addresses for payments
   */
  static readonly TEST_PAYMENT_ADDRESSES = {
    SERVICE_PROVIDER: PaymentHelpers.createMockPublicKey(),
    BUYER: PaymentHelpers.createMockPublicKey(),
    TREASURY: PaymentHelpers.createMockPublicKey(),
  };
}

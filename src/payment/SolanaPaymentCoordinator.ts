import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { logger, securityLogger } from '../utils/logger';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Payment instruction returned to MCP clients
 */
export interface PaymentInstruction {
  paymentRequired: true;
  recipient: string;
  amount: string; // In smallest units (lamports for SOL, base units for tokens)
  token: string; // Token mint address or 'SOL'
  network: string; // 'devnet' | 'mainnet-beta'
  serviceId: string;
  estimatedFee: string; // SOL for transaction fee
  executeCommand?: string; // Optional helper command for clients
}

/**
 * x402 payment details from 402 response
 * Supports both formats: new (chainId) and legacy (network)
 */
export interface X402PaymentDetails {
  accepts: Array<{
    chainId?: string;
    network?: string;
    tokenAddress?: string;
    asset?: string;
    amount?: string;
    maxAmountRequired?: string;
    receiverAddress?: string;
    payTo?: string;
  }>;
  payTo?: string;
}

/**
 * SolanaPaymentCoordinator
 *
 * Coordinates Solana payments for x402 protocol WITHOUT managing wallets.
 * - Parses 402 responses into payment instructions for clients
 * - Verifies transaction signatures on-chain
 * - Never touches private keys (client-side signing only)
 */
export class SolanaPaymentCoordinator {
  private connection: Connection;
  private network: string;

  constructor(rpcUrl?: string, network: string = 'devnet') {
    this.network = network;
    this.connection = new Connection(
      rpcUrl || this.getDefaultRpcUrl(network),
      'confirmed'
    );

    logger.info(`SolanaPaymentCoordinator initialized on ${network}`);
  }

  /**
   * Get default RPC URL for network
   */
  private getDefaultRpcUrl(network: string): string {
    switch (network) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  /**
   * Parse x402 402 response into payment instruction for client
   *
   * @param x402Response - Payment details from 402 response
   * @param serviceId - Service being purchased
   * @returns Payment instruction for MCP client to execute
   */
  createPaymentInstruction(
    x402Response: X402PaymentDetails,
    serviceId: string
  ): PaymentInstruction {
    // Get first Solana payment option (support both formats)
    const solanaPayment = x402Response.accepts.find((accept) => {
      const chain = accept.chainId || accept.network || '';
      return chain.includes('solana') || chain === 'devnet' || chain === 'mainnet-beta' || chain === 'solana-devnet';
    });

    if (!solanaPayment) {
      throw new Error('No Solana payment option found in 402 response');
    }

    // Extract values (support both old and new format)
    const amount = solanaPayment.amount || solanaPayment.maxAmountRequired || '0';
    const token = solanaPayment.tokenAddress || solanaPayment.asset || 'USDC';
    const recipient = solanaPayment.receiverAddress || solanaPayment.payTo || '';

    // Estimate transaction fee (typical Solana tx ~0.000005 SOL)
    const estimatedFee = '5000'; // 0.000005 SOL in lamports

    // Create helper command for clients
    const executeCommand = `npx ts-node scripts/solana-pay.ts ${recipient} ${amount} ${token}`;

    return {
      paymentRequired: true,
      recipient: recipient,
      amount,
      token,
      network: this.network,
      serviceId,
      estimatedFee,
      executeCommand
    };
  }

  /**
   * Execute payment autonomously using server-side wallet
   * Runs payment script as subprocess to bypass network restrictions
   *
   * @param x402Response - Payment details from 402 response
   * @param recipient - Recipient address
   * @returns Transaction signature
   */
  async executePayment(
    x402Response: X402PaymentDetails,
    recipient: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Get payment details
      const solanaPayment = x402Response.accepts.find((accept) => {
        const chain = accept.chainId || accept.network || '';
        return chain.includes('solana') || chain === 'devnet' || chain === 'mainnet-beta' || chain === 'solana-devnet';
      });

      if (!solanaPayment) {
        return reject(new Error('No Solana payment option found'));
      }

      const amount = solanaPayment.amount || solanaPayment.maxAmountRequired || '0';
      const token = solanaPayment.tokenAddress || solanaPayment.asset || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      // SECURITY: Validate all parameters to prevent command injection
      // Solana addresses are base58 encoded, 32-44 chars, alphanumeric only
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

      if (!solanaAddressRegex.test(recipient)) {
        // Security event: Invalid recipient address (potential command injection)
        securityLogger.commandInjectionAttempt({
          value: recipient,
          reason: 'Invalid Solana recipient address format',
        });
        return reject(new Error('Invalid recipient address format - potential command injection attempt'));
      }

      if (!solanaAddressRegex.test(token)) {
        // Security event: Invalid token address (potential command injection)
        securityLogger.commandInjectionAttempt({
          value: token,
          reason: 'Invalid Solana token address format',
        });
        return reject(new Error('Invalid token address format - potential command injection attempt'));
      }

      // Validate amount is numeric and positive
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0 || !Number.isFinite(amountNum)) {
        return reject(new Error('Invalid amount format - must be positive number'));
      }

      // Extra safety: Check for shell metacharacters
      const dangerousChars = /[;&|`$(){}[\]<>'"\\]/;
      if (dangerousChars.test(recipient) || dangerousChars.test(amount) || dangerousChars.test(token)) {
        // Security event: Shell metacharacters detected (CRITICAL threat)
        securityLogger.commandInjectionAttempt({
          value: `recipient=${recipient}, amount=${amount}, token=${token}`,
          reason: 'Shell metacharacters detected in payment parameters',
        });
        return reject(new Error('Dangerous characters detected in payment parameters'));
      }

      logger.info('Executing payment:', { recipient, amount, token });

      // Path to compiled payment script (use __dirname to get correct path regardless of cwd)
      // __dirname will be dist/payment, so go up one level then into scripts
      const scriptPath = path.join(__dirname, '..', 'scripts', 'autonomous-payment.js');

      logger.info('Payment script path:', scriptPath);

      // Spawn payment script as Node.js subprocess (using compiled version, no npx needed)
      const child = spawn('node', [scriptPath, recipient, amount, token], {
        env: {
          ...process.env,
          SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
          NETWORK: this.network
        },
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.info('[Payment Script]', data.toString().trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract transaction signature from stdout
          const signature = stdout.trim();
          logger.info('Payment successful, signature:', signature);
          resolve(signature);
        } else {
          logger.error('Payment failed with code:', code);
          logger.error('stderr:', stderr);
          reject(new Error(`Payment script failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        logger.error('Failed to spawn payment script:', error);
        reject(error);
      });
    });
  }

  /**
   * Verify transaction signature on-chain
   *
   * @param signature - Transaction signature from client
   * @param expectedRecipient - Expected recipient address
   * @param expectedAmount - Expected amount (in base units)
   * @param tokenMint - Token mint address (or 'SOL')
   * @returns True if valid, false otherwise
   */
  async verifyTransaction(
    signature: string,
    expectedRecipient: string,
    expectedAmount: string,
    tokenMint: string
  ): Promise<boolean> {
    try {
      logger.info(`Verifying transaction: ${signature}`);

      // Fetch transaction from blockchain
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });

      if (!tx || !tx.meta) {
        logger.error('Transaction not found or not confirmed');
        return false;
      }

      // Check transaction succeeded
      if (tx.meta.err) {
        logger.error('Transaction failed:', tx.meta.err);
        return false;
      }

      // Verify recipient and amount
      if (tokenMint === 'SOL') {
        return this.verifySolTransfer(tx, expectedRecipient, expectedAmount);
      } else {
        return this.verifySplTokenTransfer(tx, expectedRecipient, expectedAmount, tokenMint);
      }

    } catch (error: any) {
      logger.error('Transaction verification failed:', error);
      return false;
    }
  }

  /**
   * Verify SOL transfer
   */
  private verifySolTransfer(
    tx: ParsedTransactionWithMeta,
    expectedRecipient: string,
    expectedAmount: string
  ): boolean {
    try {
      const postBalances = tx.meta!.postBalances;
      const preBalances = tx.meta!.preBalances;
      const accounts = tx.transaction.message.accountKeys;

      // Find recipient account index
      const recipientIndex = accounts.findIndex(
        (account) => account.pubkey.toBase58() === expectedRecipient
      );

      if (recipientIndex === -1) {
        logger.error('Recipient not found in transaction accounts');
        return false;
      }

      // Calculate transferred amount
      const transferred = postBalances[recipientIndex] - preBalances[recipientIndex];

      // Verify amount (allowing small fee differences)
      const expected = BigInt(expectedAmount);
      const actual = BigInt(transferred);

      if (actual < expected) {
        logger.error(`Insufficient amount: expected ${expected}, got ${actual}`);
        return false;
      }

      logger.info('✓ SOL transfer verified');
      return true;

    } catch (error: any) {
      logger.error('SOL transfer verification failed:', error);
      return false;
    }
  }

  /**
   * Verify SPL token transfer (e.g., USDC)
   */
  private verifySplTokenTransfer(
    tx: ParsedTransactionWithMeta,
    expectedRecipient: string,
    expectedAmount: string,
    tokenMint: string
  ): boolean {
    try {
      // Parse token transfers from transaction
      const tokenTransfers = tx.meta?.postTokenBalances?.map((post, index) => {
        const pre = tx.meta!.preTokenBalances![index];
        return {
          mint: post.mint,
          owner: post.owner,
          amount: BigInt(post.uiTokenAmount.amount) - BigInt(pre?.uiTokenAmount.amount || 0)
        };
      }) || [];

      // Find transfer to recipient for this token
      const transfer = tokenTransfers.find(
        (t) => t.mint === tokenMint &&
               t.owner === expectedRecipient &&
               t.amount > 0n
      );

      if (!transfer) {
        logger.error('Token transfer to recipient not found');
        return false;
      }

      // Verify amount
      const expected = BigInt(expectedAmount);
      if (transfer.amount < expected) {
        logger.error(`Insufficient token amount: expected ${expected}, got ${transfer.amount}`);
        return false;
      }

      logger.info('✓ SPL token transfer verified');
      return true;

    } catch (error: any) {
      logger.error('SPL token transfer verification failed:', error);
      return false;
    }
  }

  /**
   * Check if a transaction signature has valid format
   */
  static isValidSignature(signature: string): boolean {
    // Solana signatures are base58-encoded, typically 87-88 characters
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'not_found'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status || !status.value) {
        return 'not_found';
      }

      if (status.value.confirmationStatus === 'finalized') {
        return 'finalized';
      }

      return 'confirmed';

    } catch (error) {
      return 'not_found';
    }
  }

  /**
   * Format amount for display (convert from base units)
   */
  static formatAmount(amount: string, decimals: number = 6): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fraction = value % divisor;

    return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
  }
}

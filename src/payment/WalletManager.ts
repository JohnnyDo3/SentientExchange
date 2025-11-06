import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { logger, securityLogger } from '../utils/logger';
import { WalletError, WalletInitializationError, PaymentError, getErrorMessage } from '../types/errors';

interface WalletConfig {
  networkId: string; // 'base-sepolia' or 'base-mainnet'
  walletDataPath?: string;
}

/**
 * Validates that a file path is safe and doesn't contain path traversal attempts
 * Prevents attacks like: ../../../../etc/passwd
 */
function validateSafePath(filePath: string, baseDir: string = './data'): string {
  // Resolve the absolute paths
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);

  // Check if the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolvedBase)) {
    // Security event: Path traversal attempt detected
    securityLogger.pathTraversalAttempt({
      path: filePath,
      reason: `Path is outside allowed directory (base: ${resolvedBase})`,
    });
    throw new Error(`Path traversal detected: ${filePath} is outside allowed directory`);
  }

  // Check for suspicious patterns
  if (filePath.includes('..') || filePath.includes('~')) {
    // Security event: Suspicious path characters detected
    securityLogger.pathTraversalAttempt({
      path: filePath,
      reason: 'Suspicious path characters detected (.., ~)',
    });
    throw new Error(`Invalid path characters detected: ${filePath}`);
  }

  return resolvedPath;
}

/**
 * WalletManager handles Coinbase CDP wallet operations
 * Manages wallet persistence, USDC transfers, and testnet funding
 */
export class WalletManager {
  private wallet: Wallet | null = null;
  private config: WalletConfig;
  private isInitialized: boolean = false;

  constructor(config: WalletConfig) {
    this.config = {
      networkId: config.networkId,
      walletDataPath: config.walletDataPath || './data/wallet.json'
    };
  }

  /**
   * Initialize the wallet manager
   * Configures Coinbase SDK and loads/creates wallet
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('WalletManager already initialized');
      return;
    }

    try {
      logger.info('Configuring Coinbase CDP SDK...');

      // Configure Coinbase SDK from environment variables
      Coinbase.configure({
        apiKeyName: process.env.CDP_API_KEY_NAME!,
        privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, '\n')
      });

      logger.info('Coinbase SDK configured successfully');

      // Load or create wallet
      await this.loadOrCreateWallet();

      this.isInitialized = true;
      logger.info('WalletManager initialized successfully');
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to initialize WalletManager:', error);
      throw new WalletInitializationError(`WalletManager initialization failed: ${message}`);
    }
  }

  /**
   * Load existing wallet from file or create new one
   */
  private async loadOrCreateWallet(): Promise<void> {
    // Validate path to prevent traversal attacks
    const walletPath = validateSafePath(this.config.walletDataPath!);

    try {
      // Check if wallet file exists
      if (fs.existsSync(walletPath)) {
        logger.info('Loading existing wallet from:', walletPath);

        // Read wallet data
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

        // Import wallet using seed
        this.wallet = await Wallet.import(walletData);

        logger.info('Wallet loaded successfully');
      } else {
        logger.info('No existing wallet found, creating new wallet...');

        // Create new wallet
        this.wallet = await Wallet.create({
          networkId: this.config.networkId
        });

        logger.info('New wallet created successfully');

        // Save wallet data for persistence
        await this.saveWalletData();
      }

      // Get and log default address
      const address = await this.wallet.getDefaultAddress();
      logger.info('Wallet address:', address.getId());

    } catch (error: unknown) {
      logger.error('Error loading/creating wallet:', error);
      throw new WalletError(getErrorMessage(error));
    }
  }

  /**
   * Save wallet data to file for persistence
   */
  private async saveWalletData(): Promise<void> {
    if (!this.wallet) {
      throw new Error('No wallet to save');
    }

    // Validate path to prevent traversal attacks
    const walletPath = validateSafePath(this.config.walletDataPath!);

    try {
      // Ensure directory exists
      const dir = path.dirname(walletPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Export wallet data
      const walletData = this.wallet.export();

      // Save to file
      fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));

      logger.info('Wallet data saved to:', walletPath);
    } catch (error: unknown) {
      logger.error('Failed to save wallet data:', error);
      throw new WalletError(getErrorMessage(error));
    }
  }

  /**
   * Get the wallet's default address
   */
  async getAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    const address = await this.wallet.getDefaultAddress();
    return address.getId();
  }

  /**
   * Get the wallet's USDC balance
   * @param asset - Asset symbol (default: 'usdc')
   * @returns Balance as string (e.g., "10.50")
   */
  async getBalance(asset: string = 'usdc'): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const balance = await this.wallet.getBalance(asset);
      return balance.toString();
    } catch (error: unknown) {
      logger.warn(`Failed to get ${asset} balance:`, getErrorMessage(error));
      return '0';
    }
  }

  /**
   * Request testnet USDC from faucet (Base Sepolia only)
   */
  async requestFaucetFunds(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    if (this.config.networkId !== 'base-sepolia') {
      throw new Error('Faucet only available on base-sepolia network');
    }

    try {
      logger.info('Requesting faucet funds...');

      const address = await this.wallet.getDefaultAddress();

      // Request funds from faucet
      const faucetTx = await address.faucet();

      logger.info('Faucet transaction created, waiting for confirmation...');

      // Wait for transaction to complete
      await faucetTx.wait();

      const txHash = faucetTx.getTransactionHash();
      logger.info('Faucet funds received! Transaction:', txHash);

      return txHash || '';
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('Failed to request faucet funds:', error);
      throw new WalletError(`Faucet request failed: ${message}`);
    }
  }

  /**
   * Transfer USDC to a recipient address
   * @param recipientAddress - Destination wallet address
   * @param amountUsdc - Amount in USDC (e.g., "1.5" for 1.5 USDC)
   * @returns Transaction hash
   */
  async transferUsdc(recipientAddress: string, amountUsdc: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      logger.info(`Transferring ${amountUsdc} USDC to ${recipientAddress}...`);

      // Create USDC transfer
      // Convert string amount to number (CDP SDK expects Amount type: number | bigint | Decimal)
      const transfer = await this.wallet.createTransfer({
        amount: parseFloat(amountUsdc),
        assetId: 'usdc',
        destination: recipientAddress,
        gasless: true // Use gasless transactions if available on the network
      });

      logger.info('Transfer created, waiting for broadcast...');

      // Wait briefly for broadcast to get transaction hash
      // Use shorter timeout options if available
      try {
        await transfer.wait({ timeoutSeconds: 3, intervalSeconds: 0.5 });
      } catch (timeoutError) {
        // Timeout is OK - transaction is broadcasting
        logger.info('Transfer broadcast initiated (confirmation pending)');
      }

      const txHash = transfer.getTransactionHash();

      if (!txHash) {
        // Fallback: use transfer ID as proof
        const transferId = transfer.getId();
        logger.warn('Transaction hash not yet available, using transfer ID:', transferId);
        return `transfer://${transferId}`;
      }

      logger.info('Transfer broadcast! Transaction hash:', txHash);
      logger.info('Note: Confirmation will complete in background');

      return txHash;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error('USDC transfer failed:', error);
      throw new PaymentError(`Transfer failed: ${message}`);
    }
  }

  /**
   * Check if wallet is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.wallet !== null;
  }

  /**
   * Get wallet instance (for advanced operations)
   */
  getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }
    return this.wallet;
  }
}

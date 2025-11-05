/**
 * WalletSetup - Validates test wallet configuration and balances
 *
 * Ensures the test wallet has sufficient SOL and USDC for E2E tests
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

export interface WalletInfo {
  publicKey: string;
  solBalance: number; // in SOL
  usdcBalance: number; // in USDC (with decimals)
  hasTokenAccount: boolean;
}

export interface WalletRequirements {
  minSol: number;
  minUsdc: number;
}

export class WalletSetup {
  private connection: Connection;
  private usdcMint: PublicKey;

  constructor(
    network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet',
    usdcMintAddress: string = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
  ) {
    const rpcUrl = network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : network === 'testnet'
      ? 'https://api.testnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.usdcMint = new PublicKey(usdcMintAddress);
  }

  /**
   * Load wallet from private key
   */
  loadWallet(privateKeyBase58: string): Keypair {
    try {
      const secretKey = bs58.decode(privateKeyBase58);
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error('Invalid SOLANA_PRIVATE_KEY format. Expected base58-encoded keypair.');
    }
  }

  /**
   * Get wallet information (balances, token accounts)
   */
  async getWalletInfo(wallet: Keypair): Promise<WalletInfo> {
    const publicKey = wallet.publicKey.toBase58();

    // Get SOL balance
    const solLamports = await this.connection.getBalance(wallet.publicKey);
    const solBalance = solLamports / LAMPORTS_PER_SOL;

    // Check for USDC token account
    let hasTokenAccount = false;
    let usdcBalance = 0;

    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        wallet.publicKey
      );

      const accountInfo = await getAccount(this.connection, tokenAccount);
      hasTokenAccount = true;
      usdcBalance = Number(accountInfo.amount) / 1_000_000; // USDC has 6 decimals
    } catch (error) {
      // No token account or account doesn't exist
      hasTokenAccount = false;
    }

    return {
      publicKey,
      solBalance,
      usdcBalance,
      hasTokenAccount
    };
  }

  /**
   * Validate wallet meets requirements
   */
  async validateWallet(
    wallet: Keypair,
    requirements: WalletRequirements
  ): Promise<{
    valid: boolean;
    info: WalletInfo;
    errors: string[];
    warnings: string[];
  }> {
    const info = await this.getWalletInfo(wallet);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check SOL balance
    if (info.solBalance < requirements.minSol) {
      errors.push(
        `Insufficient SOL balance: ${info.solBalance.toFixed(4)} SOL ` +
        `(need ${requirements.minSol} SOL for transaction fees)`
      );
    } else if (info.solBalance < requirements.minSol * 2) {
      warnings.push(
        `Low SOL balance: ${info.solBalance.toFixed(4)} SOL. ` +
        `Consider getting more to avoid running out during tests.`
      );
    }

    // Check USDC balance
    if (!info.hasTokenAccount) {
      errors.push(
        'No USDC token account found. Run: ' +
        `spl-token create-account ${this.usdcMint.toBase58()} --url devnet`
      );
    } else if (info.usdcBalance < requirements.minUsdc) {
      errors.push(
        `Insufficient USDC balance: ${info.usdcBalance.toFixed(2)} USDC ` +
        `(need ${requirements.minUsdc} USDC for test purchases)`
      );
    } else if (info.usdcBalance < requirements.minUsdc * 2) {
      warnings.push(
        `Low USDC balance: ${info.usdcBalance.toFixed(2)} USDC. ` +
        `Consider getting more from faucet.`
      );
    }

    return {
      valid: errors.length === 0,
      info,
      errors,
      warnings
    };
  }

  /**
   * Print wallet setup guide
   */
  printSetupGuide(network: 'devnet' | 'testnet' = 'devnet'): void {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST WALLET SETUP GUIDE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Generate a test keypair:');
    console.log('   $ solana-keygen new --outfile test-wallet.json\n');

    console.log('2. Get your public key:');
    console.log('   $ solana-keygen pubkey test-wallet.json\n');

    console.log('3. Request devnet SOL (for transaction fees):');
    console.log('   $ solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet\n');

    console.log('4. Create USDC token account:');
    console.log(`   $ spl-token create-account ${this.usdcMint.toBase58()} --url devnet\n`);

    console.log('5. Get devnet USDC from faucet:');
    console.log('   Visit: https://faucet.circle.com/');
    console.log('   Or: https://spl-token-faucet.com/\n');

    console.log('6. Export private key to base58:');
    console.log('   $ cat test-wallet.json # Copy the array');
    console.log('   Then use a base58 encoder to convert to string\n');

    console.log('7. Set environment variable:');
    console.log('   $ export SOLANA_PRIVATE_KEY=<base58-encoded-key>\n');

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Print wallet info in a readable format
   */
  printWalletInfo(info: WalletInfo): void {
    console.log('\n📊 Wallet Information:');
    console.log(`  Address: ${info.publicKey.substring(0, 8)}...${info.publicKey.substring(info.publicKey.length - 8)}`);
    console.log(`  SOL Balance: ${info.solBalance.toFixed(4)} SOL`);
    console.log(`  USDC Token Account: ${info.hasTokenAccount ? '✅ Yes' : '❌ No'}`);
    if (info.hasTokenAccount) {
      console.log(`  USDC Balance: ${info.usdcBalance.toFixed(2)} USDC`);
    }
    console.log('');
  }
}

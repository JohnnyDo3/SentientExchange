/**
 * Wallet Manager
 *
 * Manages Coinbase CDP wallets for transaction signing.
 * Will be fully implemented in Day 3.
 */

export class WalletManager {
  constructor(apiKeyName: string, privateKey: string) {
    // TODO: Initialize Coinbase CDP wallet (Day 3)
    console.log('WalletManager initialized');
  }

  async initialize(networkId: string = 'base-sepolia'): Promise<void> {
    // TODO: Load or create wallet (Day 3)
  }

  getAddress(): string {
    // TODO: Get wallet address (Day 3)
    return '';
  }

  async getBalance(asset: string = 'usdc'): Promise<string> {
    // TODO: Get wallet balance (Day 3)
    return '0';
  }

  async signTransaction(tx: any): Promise<string> {
    // TODO: Sign transaction (Day 3)
    return '';
  }
}

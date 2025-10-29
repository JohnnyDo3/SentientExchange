import { Transaction } from '../types';
import { WalletManager } from './WalletManager';

/**
 * x402 Payment Client
 *
 * Handles HTTP 402 payment flow.
 * Will be fully implemented in Day 3.
 */

export class X402Client {
  private wallet: WalletManager;

  constructor(wallet: WalletManager) {
    this.wallet = wallet;
  }

  async makePayment(
    endpoint: string,
    method: string,
    data: any,
    maxPayment: string
  ): Promise<Transaction> {
    // TODO: Implement x402 payment flow (Day 3)
    // 1. Make initial request (expect 402)
    // 2. Parse payment requirements
    // 3. Execute payment
    // 4. Retry with payment proof
    throw new Error('Not implemented');
  }
}

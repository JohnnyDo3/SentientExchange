import { WalletManager } from '../payment/WalletManager';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/errors';

/**
 * Check the current USDC balance in the wallet
 *
 * @param walletManager - Wallet manager instance
 * @returns MCP response with wallet balance info
 *
 * @example
 * const result = await checkWalletBalance(walletManager);
 */
export async function checkWalletBalance(
  walletManager: WalletManager
) {
  try {
    // Step 1: Check if wallet is initialized
    if (!walletManager.isReady()) {
      await walletManager.initialize();
    }

    // Step 2: Get wallet address
    const address = await walletManager.getAddress();

    // Step 3: Get USDC balance
    const balance = await walletManager.getBalance('usdc');

    // Step 4: Get network from environment
    const network = process.env.NETWORK || 'base-sepolia';

    // Step 5: Return wallet info
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          address: address,
          balance: balance,
          currency: 'USDC',
          network: network
        }, null, 2)
      }]
    };

  } catch (error: unknown) {
    logger.error('Error in checkWalletBalance:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: getErrorMessage(error)
        })
      }]
    };
  }
}

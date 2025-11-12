import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Session wallet smart contract configuration
const SESSION_WALLET_PROGRAM_ID = new PublicKey('SXqp6LiVF2GTCf6o7xiXJasav7DNyuGAeyp7kLm6Prk');
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // USDC on devnet

export interface SessionWalletInfo {
  pdaAddress: string;
  tokenAccount: string;
  balance: number;
  sessionId: string;
}

export class SessionWalletService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Derive PDA and token account for a session
   */
  async getSessionWalletInfo(sessionId: string): Promise<SessionWalletInfo> {
    // Derive PDA
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('session'),
        Buffer.from(sessionId)
      ],
      SESSION_WALLET_PROGRAM_ID
    );

    // Get associated token account
    const tokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      USDC_MINT,
      pda
    );

    // Get balance (if account exists)
    let balance = 0;
    try {
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      balance = parseFloat(accountInfo.value.uiAmountString || '0');
    } catch (error) {
      // Account doesn't exist or no balance
      balance = 0;
    }

    return {
      pdaAddress: pda.toBase58(),
      tokenAccount: tokenAccount.toBase58(),
      balance,
      sessionId
    };
  }

  /**
   * Check if session wallet exists on-chain
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const info = await this.getSessionWalletInfo(sessionId);
      // Try to get account info for the PDA
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(info.pdaAddress));
      return accountInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Create payment transaction from session wallet to service provider
   * This creates the instruction but doesn't send it - that requires program authority
   */
  async createSessionPaymentInstruction(
    sessionId: string,
    recipientAddress: string,
    amount: number, // In USDC (e.g., 0.50 for $0.50)
    serviceId: string
  ): Promise<{
    instruction: any; // Would be proper Anchor instruction in production
    sessionPda: PublicKey;
    estimatedFee: number;
  }> {
    const info = await this.getSessionWalletInfo(sessionId);
    const sessionPda = new PublicKey(info.pdaAddress);
    const sessionTokenAccount = new PublicKey(info.tokenAccount);

    const recipientPubkey = new PublicKey(recipientAddress);
    const recipientTokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      USDC_MINT,
      recipientPubkey
    );

    const amountInTokenUnits = amount * 1_000_000; // USDC has 6 decimals

    // For demo purposes, return the instruction data that would be sent to the backend
    // In production, this would create actual Anchor instruction
    return {
      instruction: {
        programId: SESSION_WALLET_PROGRAM_ID.toBase58(),
        method: 'executePurchase',
        accounts: {
          sessionWallet: info.pdaAddress,
          sessionTokenAccount: info.tokenAccount,
          serviceProviderTokenAccount: recipientTokenAccount.toBase58(),
          tokenProgram: TOKEN_PROGRAM_ID.toBase58()
        },
        args: {
          amount: amountInTokenUnits,
          serviceId
        }
      },
      sessionPda,
      estimatedFee: 0.001 // SOL for transaction fees
    };
  }
}

/**
 * Global session wallet service instance
 */
export const createSessionWalletService = (connection: Connection) =>
  new SessionWalletService(connection);
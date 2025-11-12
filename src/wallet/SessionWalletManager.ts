import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Provider, Wallet } from '@project-serum/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Database } from '../registry/database.js';
import { logger } from '../utils/logger.js';
import bs58 from 'bs58';

export interface SessionWallet {
  sessionId: string;
  pdaAddress: string;
  walletAddress: string;
  initialBalance: string;
  currentBalance: string;
  createdAt: number;
  lastActivity: number;
  nonceAccounts: string[];
}

// Session Wallet Program IDL (simplified version)
const SESSION_WALLET_IDL = {
  version: "0.1.0",
  name: "session_wallet",
  instructions: [
    {
      name: "initializeSession",
      accounts: [
        { name: "sessionWallet", isMut: true, isSigner: false },
        { name: "treasuryTokenAccount", isMut: true, isSigner: false },
        { name: "sessionTokenAccount", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "sessionId", type: "string" },
        { name: "initialFunding", type: "u64" }
      ]
    },
    {
      name: "executePurchase",
      accounts: [
        { name: "sessionWallet", isMut: true, isSigner: false },
        { name: "sessionTokenAccount", isMut: true, isSigner: false },
        { name: "serviceProviderTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "serviceId", type: "string" }
      ]
    },
    {
      name: "fundSession",
      accounts: [
        { name: "sessionWallet", isMut: true, isSigner: false },
        { name: "funderTokenAccount", isMut: true, isSigner: false },
        { name: "sessionTokenAccount", isMut: true, isSigner: false },
        { name: "funder", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    },
    {
      name: "closeSession",
      accounts: [
        { name: "sessionWallet", isMut: true, isSigner: false },
        { name: "sessionTokenAccount", isMut: true, isSigner: false },
        { name: "treasuryTokenAccount", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "SessionWallet",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "sessionId", type: "string" },
          { name: "createdAt", type: "i64" },
          { name: "lastActivity", type: "i64" },
          { name: "initialBalance", type: "u64" },
          { name: "currentBalance", type: "u64" },
          { name: "isActive", type: "bool" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ],
  events: [
    {
      name: "SessionCreated",
      fields: [
        { name: "sessionId", type: "string" },
        { name: "pda", type: "publicKey" },
        { name: "initialFunding", type: "u64" },
        { name: "timestamp", type: "i64" }
      ]
    },
    {
      name: "PurchaseExecuted",
      fields: [
        { name: "sessionId", type: "string" },
        { name: "serviceId", type: "string" },
        { name: "amount", type: "u64" },
        { name: "remainingBalance", type: "u64" },
        { name: "timestamp", type: "i64" }
      ]
    }
  ]
};

export class SessionWalletManager {
  private connection: Connection;
  private program: Program | null = null;
  private authority: web3.Keypair | null = null;
  private programId: PublicKey;
  private usdcMint: PublicKey;
  private treasuryTokenAccount: PublicKey | null = null;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );

    // Get program ID from environment
    const programIdStr = process.env.SESSION_WALLET_PROGRAM_ID || 'YOUR_DEPLOYED_PROGRAM_ID_HERE';
    this.programId = new PublicKey(programIdStr);

    // USDC mint on devnet
    this.usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

    this.initializeProgram();
    logger.info(`SessionWalletManager initialized with program: ${this.programId.toBase58()}`);
  }

  private async initializeProgram() {
    try {
      // Load authority keypair from environment
      const authorityPrivateKey = process.env.SESSION_WALLET_AUTHORITY_KEY;
      if (!authorityPrivateKey) {
        logger.error('SESSION_WALLET_AUTHORITY_KEY not found in environment');
        return;
      }

      this.authority = Keypair.fromSecretKey(bs58.decode(authorityPrivateKey));

      // Create wallet wrapper for Anchor
      const wallet = new Wallet(this.authority);

      // Create provider
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'processed',
        preflightCommitment: 'processed',
      });

      // Initialize program
      this.program = new Program(SESSION_WALLET_IDL as any, this.programId, provider);

      // Get treasury token account
      this.treasuryTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        this.authority.publicKey
      );

      logger.info(`✓ Program initialized with authority: ${this.authority.publicKey.toBase58()}`);
      logger.info(`✓ Treasury token account: ${this.treasuryTokenAccount.toBase58()}`);

    } catch (error: any) {
      logger.error('Failed to initialize program:', error.message);
    }
  }

  /**
   * Create a new session wallet with PDA
   */
  async createSessionWallet(
    sessionId: string,
    initialFunding: number = 0.50
  ): Promise<{ pdaAddress: string; signature: string }> {
    if (!this.program || !this.authority || !this.treasuryTokenAccount) {
      logger.error('Program not properly initialized');
      throw new Error('SessionWalletManager not properly initialized');
    }

    // Convert USDC amount to smallest unit (6 decimals)
    const fundingAmount = new BN(initialFunding * 1_000_000);

    logger.info(`Creating session wallet for ${sessionId} with $${initialFunding} USDC`);

    try {
      // Derive PDA
      const [pda, bump] = await PublicKey.findProgramAddress(
        [
          Buffer.from('session'),
          Buffer.from(sessionId)
        ],
        this.programId
      );

      // Get session token account (ATA)
      const sessionTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        pda
      );

      // Call initialize_session instruction
      const tx = await this.program.methods
        .initializeSession(sessionId, fundingAmount)
        .accounts({
          sessionWallet: pda,
          treasuryTokenAccount: this.treasuryTokenAccount,
          sessionTokenAccount: sessionTokenAccount,
          authority: this.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([this.authority])
        .rpc();

      // Store session in database
      await this.db.run(
        `INSERT OR REPLACE INTO chat_sessions
         (id, pda_address, wallet_address, initial_balance, current_balance, created_at, last_activity, nonce_accounts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          pda.toBase58(),
          sessionTokenAccount.toBase58(),
          initialFunding.toFixed(2),
          initialFunding.toFixed(2),
          Date.now(),
          Date.now(),
          JSON.stringify([])
        ]
      );

      logger.info(`✓ Session wallet created: ${pda.toBase58()} with tx: ${tx}`);

      return {
        pdaAddress: pda.toBase58(),
        signature: tx
      };
    } catch (error: any) {
      logger.error(`Failed to create session wallet: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute service purchase from session wallet
   */
  async executePurchase(
    sessionId: string,
    serviceId: string,
    amount: number,
    serviceProviderWallet: string
  ): Promise<string> {
    if (!this.program || !this.authority) {
      logger.error('Program not properly initialized');
      throw new Error('SessionWalletManager not properly initialized');
    }

    const amountLamports = new BN(amount * 1_000_000);

    logger.info(`Executing purchase: ${serviceId} for $${amount} from session ${sessionId}`);

    try {
      // Derive PDA
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('session'), Buffer.from(sessionId)],
        this.programId
      );

      // Get session token account
      const sessionTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        pda
      );

      // Get service provider token account
      const serviceProviderTokenAccount = new PublicKey(serviceProviderWallet);

      const tx = await this.program.methods
        .executePurchase(amountLamports, serviceId)
        .accounts({
          sessionWallet: pda,
          sessionTokenAccount: sessionTokenAccount,
          serviceProviderTokenAccount: serviceProviderTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Update balance in database
      await this.updateSessionBalance(sessionId, -amount);

      logger.info(`✓ Purchase executed: ${tx} for ${serviceId}`);

      return tx;
    } catch (error: any) {
      logger.error(`Failed to execute purchase: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add funds to session wallet
   */
  async addFunds(
    sessionId: string,
    amount: number
  ): Promise<string> {
    if (!this.program || !this.authority || !this.treasuryTokenAccount) {
      logger.error('Program not properly initialized');
      throw new Error('SessionWalletManager not properly initialized');
    }

    const amountLamports = new BN(amount * 1_000_000);

    logger.info(`Adding $${amount} to session ${sessionId}`);

    try {
      // Derive PDA
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('session'), Buffer.from(sessionId)],
        this.programId
      );

      // Get session token account
      const sessionTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        pda
      );

      const tx = await this.program.methods
        .fundSession(amountLamports)
        .accounts({
          sessionWallet: pda,
          funderTokenAccount: this.treasuryTokenAccount,
          sessionTokenAccount: sessionTokenAccount,
          funder: this.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([this.authority])
        .rpc();

      // Update balance in database
      await this.updateSessionBalance(sessionId, amount);

      logger.info(`✓ Funds added: ${tx} to session ${sessionId}`);

      return tx;
    } catch (error: any) {
      logger.error(`Failed to add funds: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close session and refund remaining balance
   */
  async closeSession(sessionId: string): Promise<string> {
    if (!this.program || !this.authority || !this.treasuryTokenAccount) {
      logger.error('Program not properly initialized');
      throw new Error('SessionWalletManager not properly initialized');
    }

    logger.info(`Closing session ${sessionId}`);

    try {
      // Derive PDA
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('session'), Buffer.from(sessionId)],
        this.programId
      );

      // Get session token account
      const sessionTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        pda
      );

      const tx = await this.program.methods
        .closeSession()
        .accounts({
          sessionWallet: pda,
          sessionTokenAccount: sessionTokenAccount,
          treasuryTokenAccount: this.treasuryTokenAccount,
          authority: this.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([this.authority])
        .rpc();

      // Mark session as closed in database
      await this.db.run(
        `UPDATE chat_sessions SET current_balance = '0', last_activity = ? WHERE id = ?`,
        [Date.now(), sessionId]
      );

      logger.info(`✓ Session closed: ${tx} for ${sessionId}`);

      return tx;
    } catch (error: any) {
      logger.error(`Failed to close session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (24h inactivity)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const expiryTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    const expiredSessions = await this.db.all<any>(
      `SELECT * FROM chat_sessions WHERE last_activity < ? AND current_balance > '0'`,
      [expiryTime]
    );

    logger.info(`Found ${expiredSessions.length} expired sessions to cleanup`);

    for (const session of expiredSessions) {
      try {
        await this.closeSession(session.id);
        logger.info(`✓ Closed expired session: ${session.id}`);
      } catch (error) {
        logger.error(`Failed to close session ${session.id}:`, error);
      }
    }
  }

  private async updateSessionBalance(sessionId: string, delta: number): Promise<void> {
    const session = await this.db.get<any>(
      `SELECT current_balance FROM chat_sessions WHERE id = ?`,
      [sessionId]
    );

    if (!session) return;

    const newBalance = (parseFloat(session.current_balance) + delta).toFixed(2);

    await this.db.run(
      `UPDATE chat_sessions SET current_balance = ?, last_activity = ? WHERE id = ?`,
      [newBalance, Date.now(), sessionId]
    );
  }

  /**
   * Get session PDA and token account for external access
   */
  async getSessionWalletInfo(sessionId: string): Promise<{
    pda: PublicKey;
    tokenAccount: PublicKey;
  }> {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('session'), Buffer.from(sessionId)],
      this.programId
    );

    const tokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      pda
    );

    return { pda, tokenAccount };
  }

  /**
   * Check if session wallet exists on chain
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    if (!this.program) return false;

    try {
      const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from('session'), Buffer.from(sessionId)],
        this.programId
      );

      const account = await this.program.account.sessionWallet.fetch(pda);
      return account.isActive;
    } catch {
      return false;
    }
  }
}

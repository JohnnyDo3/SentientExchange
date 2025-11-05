import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import bs58 from 'bs58';

/**
 * Payment instructions from purchase_service (402 response)
 */
export interface PaymentInstructions {
  transactionId: string;
  amount: string; // In base units as string (e.g., "1000000" for 1 USDC)
  currency: string; // "USDC", "SOL", etc.
  recipient: string; // Base58 public key
  token?: string; // Token mint address (for SPL tokens)
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

/**
 * Arguments for execute_payment tool
 */
export interface ExecutePaymentArgs {
  paymentInstructions: PaymentInstructions;
}

/**
 * Validation schema
 */
const executePaymentSchema = Joi.object({
  paymentInstructions: Joi.object({
    transactionId: Joi.string().required(),
    amount: Joi.string().required(),
    currency: Joi.string().required(),
    recipient: Joi.string().required(),
    token: Joi.string().optional(),
    network: Joi.string().valid('mainnet-beta', 'devnet', 'testnet').required(),
  }).required(),
});

/**
 * Execute payment locally using user's wallet
 *
 * NOTE: This tool should ONLY be called by MCP clients (like Claude Desktop)
 * that have access to the user's private key in their local environment.
 *
 * The private key comes from the MCP client's environment configuration,
 * NOT from the server or any network request.
 *
 * @param args - Payment instructions from purchase_service
 * @returns MCP response with transaction signature
 */
export async function executePayment(args: ExecutePaymentArgs) {
  try {
    // Validate input
    const { error, value } = executePaymentSchema.validate(args);
    if (error) {
      logger.error('Validation error:', error.details);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Validation error: ${error.message}`
          })
        }],
        isError: true
      };
    }

    const { paymentInstructions } = value;
    const { amount, recipient, token, network, transactionId, currency } = paymentInstructions;

    logger.info('🔐 Executing payment locally', {
      transactionId,
      amount,
      currency,
      recipient: recipient.substring(0, 8) + '...',
      network,
    });

    // Get user's private key from LOCAL environment
    // This should ONLY be available in MCP client environment
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'SOLANA_PRIVATE_KEY not configured in MCP client environment. Please add your wallet private key to your MCP configuration.'
          })
        }],
        isError: true
      };
    }

    // Initialize connection
    const rpcUrl = getRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    // Create keypair from private key
    const payer = Keypair.fromSecretKey(bs58.decode(privateKey));
    logger.debug('Paying from wallet:', payer.publicKey.toBase58());

    // Execute payment based on currency type
    let signature: string;

    if (token) {
      // SPL Token transfer (e.g., USDC)
      signature = await executeTokenTransfer(
        connection,
        payer,
        recipient,
        token,
        BigInt(amount)
      );
    } else {
      // Native SOL transfer
      signature = await executeSolTransfer(
        connection,
        payer,
        recipient,
        BigInt(amount)
      );
    }

    logger.info('✅ Payment executed successfully', {
      signature,
      transactionId,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          signature,
          transactionId,
          message: 'Payment executed. Now call submit_payment with this signature to complete the purchase.',
          network,
        }, null, 2)
      }]
    };

  } catch (error: any) {
    logger.error('❌ Payment execution failed:', error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: `Payment execution failed: ${error.message}`,
          details: error.toString(),
        })
      }],
      isError: true
    };
  }
}

/**
 * Execute SPL token transfer
 */
async function executeTokenTransfer(
  connection: Connection,
  payer: Keypair,
  recipient: string,
  tokenMint: string,
  amount: bigint
): Promise<string> {
  logger.info('Executing SPL token transfer', {
    token: tokenMint,
    amount: amount.toString(),
  });

  const recipientPubkey = new PublicKey(recipient);
  const mintPubkey = new PublicKey(tokenMint);

  // Get token accounts
  const sourceTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    payer.publicKey
  );

  const destinationTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    recipientPubkey
  );

  // Create transfer instruction
  const transaction = new Transaction().add(
    createTransferInstruction(
      sourceTokenAccount,
      destinationTokenAccount,
      payer.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  logger.info('Token transfer confirmed', { signature });
  return signature;
}

/**
 * Execute native SOL transfer
 */
async function executeSolTransfer(
  connection: Connection,
  payer: Keypair,
  recipient: string,
  lamports: bigint
): Promise<string> {
  logger.info('Executing SOL transfer', {
    lamports: lamports.toString(),
  });

  const recipientPubkey = new PublicKey(recipient);

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  logger.info('SOL transfer confirmed', { signature });
  return signature;
}

/**
 * Get RPC URL for network
 */
function getRpcUrl(network: string): string {
  // Check for custom RPC URL in environment
  if (process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }

  // Default public RPCs
  switch (network) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    default:
      return 'https://api.devnet.solana.com';
  }
}

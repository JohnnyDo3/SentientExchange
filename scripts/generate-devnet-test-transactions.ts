/**
 * Generate Real Devnet Test Transactions
 *
 * This script creates actual USDC and SOL transfers on Solana devnet
 * and outputs the transaction signatures for use in integration tests.
 *
 * Usage:
 *   npx ts-node scripts/generate-devnet-test-transactions.ts
 *
 * Output:
 *   - Creates test wallets
 *   - Airdrops devnet SOL
 *   - Requests devnet USDC from faucet
 *   - Makes test transfers
 *   - Prints signatures to update integration tests
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Devnet configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
// Updated to actual USDC mint used in tests
const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Test wallet storage
const WALLETS_DIR = path.join(__dirname, '..', 'test-wallets');

interface TestWallet {
  publicKey: string;
  secretKey: number[];
}

interface TestTransaction {
  type: 'USDC' | 'SOL';
  signature: string;
  from: string;
  to: string;
  amount: string;
  amountRaw: string;
  tokenAccount?: string;
}

/**
 * Load or create test wallets
 */
function loadOrCreateWallets(): { sender: Keypair; recipient: Keypair } {
  if (!fs.existsSync(WALLETS_DIR)) {
    fs.mkdirSync(WALLETS_DIR, { recursive: true });
  }

  const senderPath = path.join(WALLETS_DIR, 'sender.json');
  const recipientPath = path.join(WALLETS_DIR, 'recipient.json');

  let sender: Keypair;
  let recipient: Keypair;

  // Load or create sender wallet
  if (fs.existsSync(senderPath)) {
    console.log('📂 Loading existing sender wallet...');
    const senderData: TestWallet = JSON.parse(fs.readFileSync(senderPath, 'utf-8'));
    sender = Keypair.fromSecretKey(new Uint8Array(senderData.secretKey));
  } else {
    console.log('🔑 Creating new sender wallet...');
    sender = Keypair.generate();
    const senderData: TestWallet = {
      publicKey: sender.publicKey.toBase58(),
      secretKey: Array.from(sender.secretKey),
    };
    fs.writeFileSync(senderPath, JSON.stringify(senderData, null, 2));
  }

  // Load or create recipient wallet
  if (fs.existsSync(recipientPath)) {
    console.log('📂 Loading existing recipient wallet...');
    const recipientData: TestWallet = JSON.parse(fs.readFileSync(recipientPath, 'utf-8'));
    recipient = Keypair.fromSecretKey(new Uint8Array(recipientData.secretKey));
  } else {
    console.log('🔑 Creating new recipient wallet...');
    recipient = Keypair.generate();
    const recipientData: TestWallet = {
      publicKey: recipient.publicKey.toBase58(),
      secretKey: Array.from(recipient.secretKey),
    };
    fs.writeFileSync(recipientPath, JSON.stringify(recipientData, null, 2));
  }

  console.log(`✅ Sender wallet: ${sender.publicKey.toBase58()}`);
  console.log(`✅ Recipient wallet: ${recipient.publicKey.toBase58()}`);

  return { sender, recipient };
}

/**
 * Request SOL airdrop from devnet faucet
 */
async function requestAirdrop(connection: Connection, wallet: Keypair): Promise<void> {
  console.log(`\n💧 Requesting SOL airdrop for ${wallet.publicKey.toBase58()}...`);

  try {
    const signature = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    console.log(`⏳ Waiting for airdrop confirmation...`);
    await connection.confirmTransaction(signature);

    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`✅ Airdrop successful! Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.error(`❌ Airdrop failed:`, error);
    throw error;
  }
}

/**
 * Create USDC transfer transaction
 */
async function createUSDCTransfer(
  connection: Connection,
  sender: Keypair,
  recipient: Keypair,
  amount: number
): Promise<TestTransaction> {
  console.log(`\n💸 Creating USDC transfer: ${amount / 1_000_000} USDC...`);

  try {
    // Get or create sender's token account
    console.log('📦 Getting sender token account...');
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      USDC_DEVNET_MINT,
      sender.publicKey
    );

    console.log(`   Sender token account: ${senderTokenAccount.address.toBase58()}`);

    // Check sender's USDC balance
    const senderBalance = await connection.getTokenAccountBalance(senderTokenAccount.address);
    console.log(`   Sender USDC balance: ${senderBalance.value.uiAmountString} USDC`);

    if (Number(senderBalance.value.amount) < amount) {
      console.log(`\n⚠️  Insufficient USDC balance!`);
      console.log(`   Required: ${amount / 1_000_000} USDC`);
      console.log(`   Available: ${senderBalance.value.uiAmountString} USDC`);
      console.log(`\n💡 Get devnet USDC from: https://spl-token-faucet.com/`);
      console.log(`   Token: USDC`);
      console.log(`   Network: Devnet`);
      console.log(`   Wallet: ${sender.publicKey.toBase58()}`);
      throw new Error('Insufficient USDC balance');
    }

    // Get or create recipient's token account
    console.log('📦 Getting recipient token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender, // Payer
      USDC_DEVNET_MINT,
      recipient.publicKey
    );

    console.log(`   Recipient token account: ${recipientTokenAccount.address.toBase58()}`);

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,
      recipientTokenAccount.address,
      sender.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);

    console.log('📤 Sending USDC transfer transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sender],
      { commitment: 'confirmed' }
    );

    console.log(`✅ USDC transfer successful!`);
    console.log(`   Signature: ${signature}`);

    return {
      type: 'USDC',
      signature,
      from: sender.publicKey.toBase58(),
      to: recipient.publicKey.toBase58(),
      amount: `${amount / 1_000_000} USDC`,
      amountRaw: amount.toString(),
      tokenAccount: recipientTokenAccount.address.toBase58(),
    };
  } catch (error) {
    console.error(`❌ USDC transfer failed:`, error);
    throw error;
  }
}

/**
 * Create SOL transfer transaction
 */
async function createSOLTransfer(
  connection: Connection,
  sender: Keypair,
  recipient: Keypair,
  amount: number
): Promise<TestTransaction> {
  console.log(`\n💸 Creating SOL transfer: ${amount / LAMPORTS_PER_SOL} SOL...`);

  try {
    // Check sender's SOL balance
    const senderBalance = await connection.getBalance(sender.publicKey);
    console.log(`   Sender SOL balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);

    if (senderBalance < amount) {
      console.log(`\n⚠️  Insufficient SOL balance!`);
      throw new Error('Insufficient SOL balance');
    }

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient.publicKey,
      lamports: amount,
    });

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);

    console.log('📤 Sending SOL transfer transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sender],
      { commitment: 'confirmed' }
    );

    console.log(`✅ SOL transfer successful!`);
    console.log(`   Signature: ${signature}`);

    return {
      type: 'SOL',
      signature,
      from: sender.publicKey.toBase58(),
      to: recipient.publicKey.toBase58(),
      amount: `${amount / LAMPORTS_PER_SOL} SOL`,
      amountRaw: amount.toString(),
    };
  } catch (error) {
    console.error(`❌ SOL transfer failed:`, error);
    throw error;
  }
}

/**
 * Print test configuration for integration tests
 */
function printTestConfiguration(transactions: TestTransaction[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 TEST TRANSACTIONS GENERATED SUCCESSFULLY!');
  console.log('='.repeat(80));

  console.log('\n📋 Update your integration tests with these values:\n');

  const usdcTxs = transactions.filter(tx => tx.type === 'USDC');
  const solTxs = transactions.filter(tx => tx.type === 'SOL');

  if (usdcTxs.length > 0) {
    console.log('// USDC Transfer Test:');
    const usdcTx = usdcTxs[0];
    console.log(`signature: '${usdcTx.signature}',`);
    console.log(`expectedAmount: BigInt(${usdcTx.amountRaw}), // ${usdcTx.amount}`);
    console.log(`expectedRecipient: '${usdcTx.tokenAccount}',`);
    console.log(`expectedToken: '${USDC_DEVNET_MINT.toBase58()}',`);
    console.log(`network: 'devnet',`);
    console.log('');
  }

  if (solTxs.length > 0) {
    console.log('// SOL Transfer Test:');
    const solTx = solTxs[0];
    console.log(`signature: '${solTx.signature}',`);
    console.log(`expectedAmount: BigInt(${solTx.amountRaw}), // ${solTx.amount}`);
    console.log(`expectedRecipient: '${solTx.to}',`);
    console.log(`network: 'devnet',`);
    console.log('');
  }

  console.log('\n🔍 Verify transactions on Solana Explorer:');
  transactions.forEach(tx => {
    console.log(`   ${tx.type}: https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`);
  });

  console.log('\n📝 Copy-paste ready test parameters:');
  console.log('```typescript');

  if (usdcTxs.length > 0) {
    const usdcTx = usdcTxs[0];
    console.log(`const usdcTestParams: PaymentVerification = {`);
    console.log(`  signature: '${usdcTx.signature}',`);
    console.log(`  expectedAmount: BigInt(${usdcTx.amountRaw}),`);
    console.log(`  expectedRecipient: '${usdcTx.tokenAccount}',`);
    console.log(`  expectedToken: '${USDC_DEVNET_MINT.toBase58()}',`);
    console.log(`  network: 'devnet',`);
    console.log(`};`);
    console.log('');
  }

  if (solTxs.length > 0) {
    const solTx = solTxs[0];
    console.log(`const solTestParams: PaymentVerification = {`);
    console.log(`  signature: '${solTx.signature}',`);
    console.log(`  expectedAmount: BigInt(${solTx.amountRaw}),`);
    console.log(`  expectedRecipient: '${solTx.to}',`);
    console.log(`  network: 'devnet',`);
    console.log(`};`);
  }

  console.log('```');
  console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Devnet Test Transaction Generator');
  console.log('====================================\n');

  // Connect to devnet
  console.log(`🌐 Connecting to Solana devnet...`);
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  console.log(`✅ Connected to ${DEVNET_RPC}\n`);

  // Load or create wallets
  const { sender, recipient } = loadOrCreateWallets();

  // Check balances
  console.log('\n💰 Checking current balances...');
  const senderBalance = await connection.getBalance(sender.publicKey);
  const recipientBalance = await connection.getBalance(recipient.publicKey);
  console.log(`   Sender: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`   Recipient: ${recipientBalance / LAMPORTS_PER_SOL} SOL`);

  // Request SOL airdrop for sender if needed
  if (senderBalance < 0.5 * LAMPORTS_PER_SOL) {
    try {
      await requestAirdrop(connection, sender);
    } catch (error) {
      console.log('⚠️  Could not airdrop to sender (rate limited or faucet dry)');
      console.log('   Sender has', senderBalance / LAMPORTS_PER_SOL, 'SOL - will try to continue');
    }
  } else {
    console.log('✅ Sender has sufficient SOL, skipping airdrop');
  }

  // Recipient doesn't need SOL for receiving (sender pays fees)
  console.log('✅ Recipient ready (sender pays transaction fees)');

  // Wait a bit
  console.log('\n⏳ Waiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const transactions: TestTransaction[] = [];

  // Create USDC transfer (0.02 USDC)
  try {
    const usdcTx = await createUSDCTransfer(
      connection,
      sender,
      recipient,
      20_000 // 0.02 USDC (6 decimals)
    );
    transactions.push(usdcTx);
  } catch (error) {
    console.log('\n⚠️  Skipping USDC transfer (see error above)');
  }

  // Wait between transactions
  console.log('\n⏳ Waiting 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Create SOL transfer (0.1 SOL)
  try {
    const solTx = await createSOLTransfer(
      connection,
      sender,
      recipient,
      0.1 * LAMPORTS_PER_SOL // 0.1 SOL
    );
    transactions.push(solTx);
  } catch (error) {
    console.log('\n⚠️  Skipping SOL transfer (see error above)');
  }

  // Print test configuration
  if (transactions.length > 0) {
    printTestConfiguration(transactions);
  } else {
    console.log('\n❌ No transactions were created successfully.');
    console.log('   Please ensure you have devnet SOL and USDC.');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const bs58 = require('bs58').default || require('bs58');

async function getDevnetUSDC() {
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=919c0481-a122-4e96-b8af-100bd6d5cc45', 'confirmed');

  // Your wallet
  const privateKey = 'hitsDSe1mwLPDeiLmndBrDGLhqrQVsu3HoXd1ZmRvJiA1NgpL8c5VYWvx8Axhbnej1Mvq8jJNrmqzjqaAVTPpem';
  const secretKey = bs58.decode(privateKey);
  const wallet = Keypair.fromSecretKey(secretKey);

  console.log('💼 Wallet:', wallet.publicKey.toBase58());

  // USDC Devnet mint address
  const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

  console.log('🔄 Creating/getting USDC token account...');

  try {
    // Create or get associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      usdcMint,
      wallet.publicKey
    );

    console.log('✅ Token account:', tokenAccount.address.toBase58());

    // Check current balance
    const balance = await connection.getTokenAccountBalance(tokenAccount.address);
    console.log('💵 Current USDC balance:', balance.value.uiAmount);

    console.log('');
    console.log('✅ USDC token account is ready!');
    console.log('');
    console.log('To get devnet USDC, visit:');
    console.log('🌐 https://faucet.circle.com/');
    console.log('');
    console.log('Or use SPL Token Faucet:');
    console.log('🌐 https://spl-token-faucet.com/');
    console.log('   Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    console.log('   Wallet:', wallet.publicKey.toBase58());

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getDevnetUSDC();

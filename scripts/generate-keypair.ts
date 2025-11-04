#!/usr/bin/env ts-node
/**
 * Generate a new Solana keypair for autonomous payments
 */
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const keypair = Keypair.generate();

console.log('\n🔑 New Solana Keypair Generated\n');
console.log('Public Key (wallet address):');
console.log(keypair.publicKey.toBase58());
console.log('\nPrivate Key (base58, keep secret!):');
console.log(bs58.encode(keypair.secretKey));
console.log('\n⚠️  Save the private key to your Claude Desktop config:');
console.log('\n"SOLANA_PRIVATE_KEY": "' + bs58.encode(keypair.secretKey) + '"');
console.log('\n📝 Fund this wallet at: https://faucet.solana.com/');
console.log('   Wallet address:', keypair.publicKey.toBase58());

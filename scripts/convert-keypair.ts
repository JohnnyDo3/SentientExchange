#!/usr/bin/env ts-node
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';

const keypairArray = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const secretKey = Uint8Array.from(keypairArray);
const keypair = Keypair.fromSecretKey(secretKey);

console.log('\n✅ Keypair loaded successfully!\n');
console.log('Public Key (wallet address):');
console.log(keypair.publicKey.toBase58());
console.log('\nPrivate Key (base58):');
console.log(bs58.encode(keypair.secretKey));
console.log('\n📋 Use this in Claude Desktop config:');
console.log(`"SOLANA_PRIVATE_KEY": "${bs58.encode(keypair.secretKey)}"`);

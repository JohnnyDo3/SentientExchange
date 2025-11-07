/**
 * Solana Signature Verification
 *
 * Verifies Solana wallet signatures for authentication
 */

import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify a Solana signature
 * @param message - The message that was signed
 * @param signature - The signature (base58 encoded)
 * @param publicKey - The public key (base58 encoded wallet address)
 * @returns true if signature is valid
 */
export function verifySolanaSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Decode the signature and public key from base58
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    // Encode the message as UTF-8 bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Solana signature verification error:', error);
    return false;
  }
}

/**
 * Extract wallet address from a Solana sign-in message
 * Message format: "Sign in to SentientExchange with your wallet.\n\nWallet: {address}\nNonce: {nonce}"
 */
export function extractSolanaAddress(message: string): string | null {
  const match = message.match(/Wallet: ([1-9A-HJ-NP-Za-km-z]{32,44})/);
  return match ? match[1] : null;
}

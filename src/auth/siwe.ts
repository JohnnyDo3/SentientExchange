import { SiweMessage } from 'siwe';
import { AuthenticationError, getErrorMessage } from '../types/errors';

/**
 * SIWE (Sign-In with Ethereum) authentication utilities
 * Implements EIP-4361 standard for wallet-based authentication
 */

export interface NonceStore {
  [address: string]: {
    nonce: string;
    timestamp: number;
  };
}

// In-memory nonce storage (use Redis in production)
const nonceStore: NonceStore = {};

// Nonce expires after 5 minutes
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate a random nonce for a wallet address
 */
export function generateNonce(address: string): string {
  const nonce = Math.random().toString(36).substring(2, 15);

  nonceStore[address.toLowerCase()] = {
    nonce,
    timestamp: Date.now(),
  };

  return nonce;
}

/**
 * Verify a nonce is valid and not expired
 */
function verifyNonce(address: string, nonce: string): boolean {
  const stored = nonceStore[address.toLowerCase()];

  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.timestamp > NONCE_EXPIRY_MS) {
    delete nonceStore[address.toLowerCase()];
    return false;
  }

  // Check nonce matches
  if (stored.nonce !== nonce) {
    return false;
  }

  // Nonce is valid, delete it (one-time use)
  delete nonceStore[address.toLowerCase()];
  return true;
}

/**
 * Verify a SIWE message signature
 */
export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<{ address: string; chainId: number }> {
  try {
    // Parse the SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const fields = await siweMessage.verify({ signature });

    // Verify the nonce
    if (!verifyNonce(fields.data.address, fields.data.nonce)) {
      throw new Error('Invalid or expired nonce');
    }

    // Check expiration time if provided
    if (fields.data.expirationTime) {
      const expiryTime = new Date(fields.data.expirationTime).getTime();
      if (Date.now() > expiryTime) {
        throw new Error('Message has expired');
      }
    }

    // Check not before time if provided
    if (fields.data.notBefore) {
      const notBeforeTime = new Date(fields.data.notBefore).getTime();
      if (Date.now() < notBeforeTime) {
        throw new Error('Message not yet valid');
      }
    }

    return {
      address: fields.data.address,
      chainId: fields.data.chainId,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    throw new AuthenticationError(`SIWE verification failed: ${message}`);
  }
}

/**
 * Clean up expired nonces (call periodically)
 */
export function cleanupExpiredNonces(): void {
  const now = Date.now();

  for (const [address, data] of Object.entries(nonceStore)) {
    if (now - data.timestamp > NONCE_EXPIRY_MS) {
      delete nonceStore[address];
    }
  }
}

// Clean up expired nonces every minute
setInterval(cleanupExpiredNonces, 60 * 1000);

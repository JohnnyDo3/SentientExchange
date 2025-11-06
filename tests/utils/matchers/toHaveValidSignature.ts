declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveValidSignature(type?: 'ethereum' | 'solana'): R;
    }
  }
}

/**
 * Custom Jest matcher to validate signature formats
 */
export function toHaveValidSignature(received: unknown, type: 'ethereum' | 'solana' = 'ethereum') {
  if (typeof received !== 'string') {
    return {
      pass: false,
      message: () => `Signature must be a string, got ${typeof received}`,
    };
  }

  const signature = received as string;

  if (type === 'ethereum') {
    // Ethereum signatures are 132 characters (0x + 130 hex chars = 65 bytes)
    if (!signature.startsWith('0x')) {
      return {
        pass: false,
        message: () => `Ethereum signature must start with '0x', got ${signature.substring(0, 10)}...`,
      };
    }

    if (signature.length !== 132) {
      return {
        pass: false,
        message: () =>
          `Ethereum signature must be 132 characters long (0x + 130 hex), got ${signature.length}`,
      };
    }

    // Check if it's valid hex
    const hexPart = signature.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      return {
        pass: false,
        message: () => `Ethereum signature must contain only hex characters after 0x`,
      };
    }
  } else if (type === 'solana') {
    // Solana signatures are base58 encoded, typically 87-88 characters
    if (signature.length < 32 || signature.length > 128) {
      return {
        pass: false,
        message: () =>
          `Solana signature length should be between 32-128 characters, got ${signature.length}`,
      };
    }

    // Check if it's valid base58 (no 0, O, I, l)
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)) {
      return {
        pass: false,
        message: () => `Solana signature must be valid base58 (excludes 0, O, I, l)`,
      };
    }
  } else {
    return {
      pass: false,
      message: () => `Unknown signature type: ${type}. Must be 'ethereum' or 'solana'`,
    };
  }

  return {
    pass: true,
    message: () => `Signature is a valid ${type} signature`,
  };
}

// Add the matcher to Jest
expect.extend({ toHaveValidSignature });

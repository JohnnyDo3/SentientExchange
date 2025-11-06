/**
 * Wallet address validation utilities for multi-chain support
 */

/**
 * Validate Ethereum/EVM address format
 */
export function isValidEVMAddress(address: string): boolean {
  // Must start with 0x and be 42 characters total
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  return true;
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, 32-44 characters
  // Valid characters in base58: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return false;
  }

  // Additional check: should not contain 0, O, I, l (not in base58 alphabet)
  if (/[0OIl]/.test(address)) {
    return false;
  }

  return true;
}

/**
 * Validate address for a specific chain
 */
export function validateChainAddress(
  address: string,
  chain: 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'solana' | 'evm'
): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  // Trim whitespace
  address = address.trim();

  // EVM chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
  if (chain === 'evm' || chain === 'ethereum' || chain === 'base' || chain === 'polygon' || chain === 'arbitrum' || chain === 'optimism') {
    if (!isValidEVMAddress(address)) {
      return {
        valid: false,
        error: `Invalid EVM address format. Must start with 0x and be 42 characters (e.g., 0x742d35Cc...)`
      };
    }
    return { valid: true };
  }

  // Solana
  if (chain === 'solana') {
    if (!isValidSolanaAddress(address)) {
      return {
        valid: false,
        error: `Invalid Solana address format. Must be base58 encoded, 32-44 characters (e.g., 8K4z7h...)`
      };
    }
    return { valid: true };
  }

  return { valid: false, error: `Unsupported chain: ${chain}` };
}

/**
 * Validate a payment addresses object for service registration
 * Format: { ethereum?: string, base?: string, polygon?: string, solana?: string }
 */
export function validatePaymentAddresses(
  addresses: Record<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have at least one address
  const addressKeys = Object.keys(addresses);
  if (addressKeys.length === 0) {
    return {
      valid: false,
      errors: ['At least one payment address is required']
    };
  }

  // Validate each provided address
  for (const [chain, address] of Object.entries(addresses)) {
    if (!address || typeof address !== 'string' || address.trim() === '') {
      errors.push(`${chain}: Address cannot be empty`);
      continue;
    }

    const result = validateChainAddress(
      address,
      chain as 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'solana' | 'evm'
    );

    if (!result.valid) {
      errors.push(`${chain}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize address to lowercase (for EVM addresses)
 */
export function normalizeAddress(address: string, chain: string): string {
  // EVM addresses should be lowercase for consistency
  if (chain === 'ethereum' || chain === 'base' || chain === 'polygon' || chain === 'arbitrum' || chain === 'optimism' || chain === 'evm') {
    return address.toLowerCase();
  }

  // Solana addresses are case-sensitive, don't modify
  return address;
}

/**
 * Format address for display (e.g., 0x742d...bEb5)
 */
export function formatAddressDisplay(address: string, chars: number = 6): string {
  if (!address || address.length <= chars * 2) {
    return address;
  }

  return `${address.substring(0, chars)}...${address.substring(address.length - chars + 2)}`;
}

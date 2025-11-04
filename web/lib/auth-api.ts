/**
 * Authentication API client
 * Handles Solana wallet authentication flow with the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/**
 * Get a nonce for signing
 */
export async function getNonce(address: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/nonce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error('Failed to get nonce');
  }

  const data = await response.json();
  return data.nonce;
}

/**
 * Verify Solana signature and get JWT token
 */
export async function verifySignature(
  message: string,
  signature: string
): Promise<{ token: string; address: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, signature }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Authentication failed');
  }

  const data = await response.json();
  return {
    token: data.token,
    address: data.address,
  };
}

/**
 * Create Solana authentication message for signing
 */
export function createSolanaMessage(
  address: string,
  nonce: string
): string {
  const timestamp = new Date().toISOString();
  return `Sign in to AgentMarket

Wallet: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}

This signature will be used to authenticate you with AgentMarket.`;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * Logout (mainly for clearing client-side state)
 */
export async function logout(token?: string) {
  if (token) {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Clear local storage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_address');
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getNonce, verifySignature, createSolanaMessage, logout as logoutApi } from '@/lib/auth-api';
import bs58 from 'bs58';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  address: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();

  const [token, setToken] = useState<string | null>(null);
  const [authAddress, setAuthAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedAddress = localStorage.getItem('auth_address');

    if (storedToken && storedAddress) {
      setToken(storedToken);
      setAuthAddress(storedAddress);
    }
  }, []);

  const signIn = async () => {
    if (!publicKey || !signMessage) {
      setError('Please connect your Solana wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const address = publicKey.toBase58();

      // Step 1: Get nonce from backend
      const nonce = await getNonce(address);

      // Step 2: Create authentication message
      const message = createSolanaMessage(address, nonce);

      // Step 3: Sign message with wallet
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Step 4: Verify signature and get JWT token
      const result = await verifySignature(message, signature);

      // Step 5: Save to state and localStorage
      setToken(result.token);
      setAuthAddress(result.address);

      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_address', result.address);

      console.log('✓ Solana authentication successful');
    } catch (err: any) {
      console.error('Solana authentication failed:', err);
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);

    try {
      await logoutApi(token || undefined);

      setToken(null);
      setAuthAddress(null);

      // Clear from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_address');

      console.log('✓ Signed out successfully');
    } catch (err: any) {
      console.error('Sign out failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If wallet disconnects, clear auth
  useEffect(() => {
    if (!connected && token) {
      signOut();
    }
  }, [connected]);

  const value: AuthContextType = {
    isAuthenticated: !!token && !!authAddress,
    token,
    address: authAddress,
    isLoading,
    signIn,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

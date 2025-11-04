'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnifiedConnectButton() {
  const { isAuthenticated, signIn, isLoading, error } = useAuth();
  const [showError, setShowError] = useState(false);
  const { connected, publicKey } = useWallet();

  const handleAuth = async () => {
    if (connected && !isAuthenticated) {
      try {
        await signIn();
      } catch (err) {
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      }
    }
  };

  return (
    <div className="relative flex gap-3 items-center">
      <div className="solana-wallet-button">
        <WalletMultiButton />
      </div>

      {/* Sign In Button (shown when wallet is connected but not authenticated) */}
      {connected && !isAuthenticated && (
        <button
          onClick={handleAuth}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-purple to-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-80 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

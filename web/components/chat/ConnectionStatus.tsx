'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';

interface ConnectionStatusProps {
  onRetry?: () => void;
}

export default function ConnectionStatus({ onRetry }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    // Check initial status
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-hide offline message after 10 seconds
  useEffect(() => {
    if (showOfflineMessage) {
      const timer = setTimeout(() => setShowOfflineMessage(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineMessage]);

  return (
    <>
      {/* Persistent status indicator (top right) */}
      <div
        className="fixed top-24 right-4 z-30"
        role="status"
        aria-live="polite"
        aria-label={isOnline ? 'Connected' : 'Disconnected'}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-xl border shadow-lg ${
            isOnline
              ? 'bg-green/10 border-green/30 text-green'
              : 'bg-red/10 border-red/30 text-red'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4 animate-pulse" />
          )}
          <span className="text-xs font-medium">{isOnline ? 'Connected' : 'Offline'}</span>
        </motion.div>
      </div>

      {/* Offline notification banner */}
      <AnimatePresence>
        {!isOnline && showOfflineMessage && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div className="bg-red/90 backdrop-blur-xl border border-red text-white rounded-lg p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">No Internet Connection</h3>
                  <p className="text-sm text-red-100">
                    You're offline. Check your connection and try again.
                  </p>
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm font-medium"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Service } from '@/lib/types';
import { X, Star, DollarSign, Clock, CheckCircle, Zap, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface ServiceModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

type PurchaseState = 'idle' | 'confirming' | 'signing' | 'processing' | 'success' | 'error';

export default function ServiceModal({ service, isOpen, onClose }: ServiceModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');

  if (!service) return null;

  const price = parseFloat(service.pricing.perRequest.replace('$', ''));

  const handlePurchase = async () => {
    soundManager.playClick();

    if (!publicKey) {
      alert('Please connect your Solana wallet first!');
      return;
    }

    setPurchaseState('confirming');
  };

  const executePurchase = async () => {
    if (!publicKey || !sendTransaction) {
      setErrorMessage('Wallet not connected');
      setPurchaseState('error');
      return;
    }

    try {
      setPurchaseState('signing');

      // For demo purposes, use a placeholder recipient address
      // In production, this would come from the service's payment address
      const recipientAddress = new PublicKey('7xKXqp9cGEH4FrXNBxHqrJpPGPBFqH5h9c3NSLB9YzB');

      // Convert USD price to SOL (approximate)
      // In production, this would come from x402 payment details
      const solAmount = price / 100; // Rough conversion for demo
      const lamports = solAmount * LAMPORTS_PER_SOL;

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientAddress,
          lamports: Math.floor(lamports),
        })
      );

      // Send transaction
      setPurchaseState('processing');
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      setPurchaseState('success');
      soundManager.playSuccess?.();

    } catch (error: any) {
      console.error('Purchase failed:', error);
      setErrorMessage(error.message || 'Transaction failed');
      setPurchaseState('error');
      soundManager.playError?.();
    }
  };

  const resetPurchaseFlow = () => {
    setPurchaseState('idle');
    setErrorMessage('');
    setTxSignature('');
  };

  const handleClose = () => {
    resetPurchaseFlow();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-4xl font-bold gradient-text mb-2">{service.name}</h2>
                <p className="text-gray-400 text-lg">{service.description}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                label="Rating"
                value={service.reputation.rating.toFixed(1)}
                subtitle={`${service.reputation.reviews} reviews`}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-green" />}
                label="Price"
                value={`$${price.toFixed(3)}`}
                subtitle="per request"
              />
              <StatCard
                icon={<CheckCircle className="w-5 h-5 text-green" />}
                label="Success Rate"
                value={`${service.reputation.successRate}%`}
                subtitle={`${service.reputation.totalJobs} jobs`}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-blue-400" />}
                label="Response Time"
                value={service.reputation.avgResponseTime}
                subtitle="average"
              />
            </div>

            {/* Capabilities */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple" />
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {service.capabilities.map((cap, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-purple/20 to-pink/20 border border-purple/30 text-white rounded-lg"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Technical Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h4 className="text-lg font-semibold text-white mb-4">Technical Details</h4>
                <div className="space-y-2 text-sm">
                  <DetailRow label="API Version" value={service.metadata.apiVersion} />
                  <DetailRow label="Rate Limit" value={service.metadata.rateLimit || 'Unlimited'} />
                  <DetailRow label="Max Payload" value={service.metadata.maxPayload || 'Unlimited'} />
                  <DetailRow label="Currency" value={service.pricing.currency} />
                  <DetailRow label="Network" value={service.pricing.network} />
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green" />
                  Performance
                </h4>
                <div className="space-y-3">
                  <ProgressBar
                    label="Success Rate"
                    value={service.reputation.successRate}
                    max={100}
                    color="green"
                  />
                  <ProgressBar
                    label="Rating"
                    value={service.reputation.rating}
                    max={5}
                    color="yellow"
                  />
                  <div className="text-sm text-gray-400">
                    Total Jobs Completed: <span className="text-white font-semibold">{service.reputation.totalJobs.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink" />
                Recent Reviews
              </h3>
              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <p className="text-gray-400 text-center py-8">
                  Reviews feature coming soon! <br />
                  Current rating: {service.reputation.rating.toFixed(1)}⭐ from {service.reputation.reviews} reviews
                </p>
              </div>
            </div>

            {/* Purchase CTA */}
            <div className="flex gap-4">
              <button
                onClick={handlePurchase}
                disabled={purchaseState !== 'idle'}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseState === 'idle' ? (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Purchase Service (${price.toFixed(3)})
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={purchaseState === 'signing' || purchaseState === 'processing'}
                className="px-8 py-3 border-2 border-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>

            {/* Payment Confirmation Modal */}
            <AnimatePresence>
              {purchaseState === 'confirming' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border-2 border-purple rounded-2xl p-8 max-w-md w-full"
                  >
                    <h3 className="text-2xl font-bold gradient-text mb-4">Confirm Purchase</h3>
                    <p className="text-gray-300 mb-6">
                      You're about to purchase <span className="text-white font-semibold">{service.name}</span> for{' '}
                      <span className="text-green font-semibold">${price.toFixed(3)}</span>
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network:</span>
                        <span className="text-white">Solana Devnet</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white">~{(price / 100).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wallet:</span>
                        <span className="text-white font-mono text-xs">{publicKey?.toBase58().slice(0, 8)}...</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={executePurchase}
                        className="flex-1 bg-gradient-to-r from-purple to-pink text-white font-semibold py-3 rounded-lg hover:scale-105 transition-transform"
                      >
                        Confirm & Pay
                      </button>
                      <button
                        onClick={resetPurchaseFlow}
                        className="px-6 py-3 border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Success Modal */}
              {purchaseState === 'success' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-8"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900 border-2 border-green rounded-2xl p-8 max-w-md w-full text-center"
                  >
                    <div className="w-16 h-16 bg-green rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-green mb-2">Purchase Successful!</h3>
                    <p className="text-gray-300 mb-6">
                      Your transaction has been confirmed on Solana
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                      <p className="text-xs text-gray-400 mb-1">Transaction Signature:</p>
                      <p className="text-white font-mono text-xs break-all">{txSignature}</p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full bg-gradient-to-r from-purple to-pink text-white font-semibold py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      Close
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Error Modal */}
              {purchaseState === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl flex items-center justify-center p-8"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full text-center"
                  >
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-500 mb-2">Purchase Failed</h3>
                    <p className="text-gray-300 mb-6">{errorMessage}</p>
                    <button
                      onClick={resetPurchaseFlow}
                      className="w-full bg-gradient-to-r from-purple to-pink text-white font-semibold py-3 rounded-lg hover:scale-105 transition-transform"
                    >
                      Try Again
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper components
function StatCard({ icon, label, value, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: {
  label: string;
  value: number;
  max: number;
  color: 'green' | 'yellow';
}) {
  const percentage = (value / max) * 100;
  const colorClass = color === 'green' ? 'bg-green' : 'bg-yellow-400';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">{value} / {max}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${colorClass} rounded-full`}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import ServiceRegistrationForm, { ServiceFormData } from '@/components/providers/ServiceRegistrationForm';
import ServicePreview from '@/components/providers/ServicePreview';
import ParticleScene from '@/components/3d/ParticleScene';
import { soundManager } from '@/lib/sound';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedConnectButton from '@/components/wallet/UnifiedConnectButton';

export default function RegisterServicePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, address } = useAuth();
  const { publicKey, connected } = useWallet();

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    endpoint: '',
    price: '',
    capabilities: [],
    walletAddress: '',
    image: '🔮',
    color: '#a855f7'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-fill Solana wallet address when connected
  useEffect(() => {
    if (connected && publicKey) {
      const solanaAddress = publicKey.toBase58();
      setFormData(prev => ({
        ...prev,
        walletAddress: solanaAddress
      }));
    }
  }, [connected, publicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if wallet is connected first
    if (!connected) {
      alert('Please connect your Solana wallet before registering a service');
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.description || !formData.endpoint || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate wallet addresses (either single wallet OR multi-chain addresses required)
    const hasWalletAddress = formData.walletAddress && formData.walletAddress.trim() !== '';
    const hasPaymentAddresses = formData.paymentAddresses && Object.keys(formData.paymentAddresses).length > 0;

    if (!hasWalletAddress && !hasPaymentAddresses) {
      alert('Please provide at least one wallet address (either single wallet or select payment chains)');
      return;
    }

    setIsSubmitting(true);
    soundManager.playClick();

    try {
      // Import MarketplaceAPI dynamically to avoid circular dependencies
      const { MarketplaceAPI } = await import('@/lib/marketplace-api');

      // Prepare service data for API
      const serviceData = {
        name: formData.name,
        description: formData.description,
        provider: 'Sentient Exchange Provider',
        endpoint: formData.endpoint,
        capabilities: formData.capabilities,
        pricing: {
          perRequest: formData.price,
        },
        walletAddress: formData.walletAddress,
        paymentAddresses: formData.paymentAddresses,
        image: formData.image || '🔮',
        color: formData.color || '#a855f7',
      };

      // Call API to create service
      await MarketplaceAPI.createService(serviceData);

      // Show success message
      setShowSuccess(true);
      soundManager.playSuccessChord();

      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        router.push('/providers/my-services');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to register service:', error);
      alert(`Failed to register service: ${error.message || 'Please try again.'}`);
      soundManager.playError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-30">
          <ParticleScene />
        </div>
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not Connected or Not Authenticated - Show Connect Wallet Prompt
  if (!connected || !isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-30">
          <ParticleScene />
        </div>

        <div className="relative z-10">
          <motion.div
            className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-4 gradient-text">
              Register Your Service
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-400">
              Join the marketplace and start earning from your AI services
            </p>
          </motion.div>

          <div className="container mx-auto px-4 md:px-6 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center py-20"
            >
              <div className="glass rounded-3xl p-12 border border-gray-800">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-3xl font-bold gradient-text mb-4">
                  {!connected ? 'Connect Your Solana Wallet' : 'Sign In Required'}
                </h2>

                <p className="text-xl text-gray-400 mb-8">
                  {!connected
                    ? 'Please connect your Solana wallet to register a service on Sentient Exchange.'
                    : 'Please sign in with your wallet to verify ownership and register a service.'
                  }
                </p>

                <div className="flex justify-center">
                  <UnifiedConnectButton />
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  You'll need to sign a message to verify ownership of your wallet address.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (showSuccess) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
        {/* Particle Background */}
        <div className="fixed inset-0 z-0 opacity-30">
          <ParticleScene />
        </div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center max-w-md mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple to-pink flex items-center justify-center"
          >
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h1 className="text-4xl font-bold gradient-text mb-4">
            Service Submitted!
          </h1>

          <p className="text-xl text-gray-400 mb-6">
            Your service has been submitted for review.
          </p>

          <p className="text-gray-500">
            You'll receive a confirmation once it's approved (typically 24-48 hours).
            Redirecting to your dashboard...
          </p>

          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleScene />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-4 gradient-text">
            Register Your Service
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400">
            Join the marketplace and start earning from your AI services
          </p>
        </motion.div>

        {/* Two-Column Layout */}
        <div className="container mx-auto px-4 md:px-6 pb-16">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass rounded-2xl md:rounded-3xl p-6 md:p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Service Details</h2>
                <ServiceRegistrationForm
                  formData={formData}
                  onFormChange={setFormData}
                />

                {/* Submit Buttons */}
                <div className="mt-8 flex gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple to-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit for Review
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-4 border border-gray-700 text-gray-400 rounded-xl font-semibold hover:bg-gray-800 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>

                {/* Help Text */}
                <p className="mt-4 text-sm text-gray-500">
                  By submitting, you agree to our terms of service and confirm that your service endpoint is accessible and functional.
                </p>
              </motion.div>

              {/* Right Column - Live Preview */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <ServicePreview formData={formData} />
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

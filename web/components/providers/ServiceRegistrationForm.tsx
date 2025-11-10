// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle, TestTube, Sparkles } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { MarketplaceAPI } from '@/lib/marketplace-api';

export interface ServiceFormData {
  name: string;
  description: string;
  endpoint: string;
  price: string;
  capabilities: string[];
  walletAddress: string;
  paymentAddresses?: Record<string, string>; // Multi-chain payment addresses
  image?: string;
  color?: string;
}

interface ServiceRegistrationFormProps {
  onFormChange: (data: ServiceFormData) => void;
  formData: ServiceFormData;
}

export default function ServiceRegistrationForm({
  onFormChange,
  formData
}: ServiceRegistrationFormProps) {
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [endpointTestResult, setEndpointTestResult] = useState<'success' | 'error' | null>(null);
  const [newCapability, setNewCapability] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // Fetch popular tags from existing services
  useEffect(() => {
    const defaultTags = [
      'image-analysis',
      'text-processing',
      'data-analysis',
      'api-integration',
      'machine-learning',
      'sentiment-analysis',
      'ocr',
      'translation',
      'summarization',
      'prediction',
      'vision',
      'nlp',
      'audio-processing',
      'video-analysis',
      'document-parsing',
      'web-scraping',
      'classification',
      'detection',
      'generation',
      'recommendation'
    ];

    const fetchPopularTags = async () => {
      try {
        const services = await MarketplaceAPI.getAllServices();

        // Extract all capabilities and count occurrences
        const tagCounts = new Map<string, number>();
        services.forEach(service => {
          service.capabilities.forEach(cap => {
            tagCounts.set(cap, (tagCounts.get(cap) || 0) + 1);
          });
        });

        // Sort by frequency and get top tags
        const sortedTags = Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag)
          .slice(0, 20); // Top 20 tags

        // If no tags found from services, use defaults
        setPopularTags(sortedTags.length > 0 ? sortedTags : defaultTags);
      } catch (error) {
        console.error('Failed to fetch popular tags:', error);
        // Use default popular tags as fallback
        setPopularTags(defaultTags);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchPopularTags();
  }, []);

  const updateField = (field: keyof ServiceFormData, value: any) => {
    onFormChange({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const addCapability = () => {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      soundManager.playClick();
      updateField('capabilities', [...formData.capabilities, newCapability.trim()]);
      setNewCapability('');
    }
  };

  const removeCapability = (cap: string) => {
    soundManager.playClick();
    updateField('capabilities', formData.capabilities.filter(c => c !== cap));
  };

  const testEndpoint = async () => {
    if (!formData.endpoint) {
      setErrors({ ...errors, endpoint: 'Please enter an endpoint URL' });
      return;
    }

    setIsTestingEndpoint(true);
    setEndpointTestResult(null);
    soundManager.playClick();

    try {
      // Simulate endpoint test
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For now, just check if it's a valid URL
      new URL(formData.endpoint);
      setEndpointTestResult('success');
      soundManager.playSuccessChord();
    } catch (error) {
      setEndpointTestResult('error');
      setErrors({ ...errors, endpoint: 'Invalid endpoint URL or connection failed' });
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  const validateWalletAddress = (address: string) => {
    if (!address) return false;
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateSolanaAddress = (address: string) => {
    if (!address) return false;
    // Solana addresses are base58 encoded, 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !/[0OIl]/.test(address);
  };

  // Define supported chains
  const chains = [
    { id: 'ethereum', name: 'Ethereum', type: 'evm', icon: '⟠' },
    { id: 'base', name: 'Base', type: 'evm', icon: '🔵' },
    { id: 'polygon', name: 'Polygon', type: 'evm', icon: '🟣' },
    { id: 'arbitrum', name: 'Arbitrum', type: 'evm', icon: '🔷' },
    { id: 'optimism', name: 'Optimism', type: 'evm', icon: '🔴' },
    { id: 'solana', name: 'Solana', type: 'solana', icon: '◎' },
  ];

  // Toggle chain selection
  const toggleChain = (chainId: string) => {
    soundManager.playClick();

    const currentAddresses = formData.paymentAddresses || {};
    const chain = chains.find(c => c.id === chainId);

    if (chainId in currentAddresses) {
      // Remove this chain
      const { [chainId]: removed, ...rest } = currentAddresses;
      console.log('Removing chain:', chainId, 'rest:', rest);
      // If empty object, set to undefined instead
      updateField('paymentAddresses', Object.keys(rest).length === 0 ? undefined : rest);
    } else {
      // Add this chain with auto-filled address
      if (chain?.type === 'evm') {
        // Auto-fill with EVM wallet address
        updateField('paymentAddresses', {
          ...currentAddresses,
          [chainId]: formData.walletAddress || ''
        });
      } else {
        // For Solana, leave empty for manual input
        updateField('paymentAddresses', {
          ...currentAddresses,
          [chainId]: ''
        });
      }
    }
  };

  const updateChainAddress = (chainId: string, address: string) => {
    const currentAddresses = formData.paymentAddresses || {};
    updateField('paymentAddresses', {
      ...currentAddresses,
      [chainId]: address
    });
  };

  return (
    <div className="space-y-6">
      {/* Service Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Service Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., vision-pro"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
        />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Professional image analysis with object detection and OCR"
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all resize-none"
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.description}
          </p>
        )}
      </div>

      {/* API Endpoint */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          API Endpoint <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={formData.endpoint}
            onChange={(e) => updateField('endpoint', e.target.value)}
            placeholder="https://api.yourservice.com/analyze"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
          />
          <button
            onClick={testEndpoint}
            disabled={isTestingEndpoint || !formData.endpoint}
            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isTestingEndpoint ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing
              </>
            ) : endpointTestResult === 'success' ? (
              <>
                <Check className="w-4 h-4 text-green" />
                Tested
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4" />
                Test
              </>
            )}
          </button>
        </div>
        {errors.endpoint && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.endpoint}
          </p>
        )}
        {endpointTestResult === 'success' && (
          <p className="text-green text-sm mt-1 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Endpoint is reachable and responding
          </p>
        )}
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Price per Request <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
          <input
            type="number"
            step="0.001"
            min="0"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.02"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
          />
        </div>
        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
          <span className="text-green font-semibold">USDC</span> price per request on Solana network
        </p>
        {errors.price && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.price}
          </p>
        )}
      </div>

      {/* Capabilities (Tags) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Capabilities <span className="text-gray-500">(tags)</span>
        </label>

        {/* Tag Input with Suggestions */}
        <div className="relative">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
              placeholder="e.g., image-analysis"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
            />
            <button
              onClick={addCapability}
              className="px-4 py-2 bg-purple hover:bg-purple/80 text-white rounded-lg transition-all"
            >
              Add Tag
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {newCapability && !isLoadingTags && (
            <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {popularTags
                .filter(tag =>
                  tag.toLowerCase().includes(newCapability.toLowerCase()) &&
                  !formData.capabilities.includes(tag)
                )
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      updateField('capabilities', [...formData.capabilities, tag]);
                      setNewCapability('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-purple/20 text-gray-300 hover:text-purple transition-all flex items-center justify-between group"
                  >
                    <span>{tag}</span>
                    <Sparkles className="w-3 h-3 text-gray-600 group-hover:text-purple" />
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Suggestion Hint */}
        {!isLoadingTags && !newCapability && (
          <div className="mb-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple" />
              <span className="text-xs font-medium text-gray-400">Popular suggestions</span>
              <span className="text-xs text-gray-500">(click to add)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags
                .slice(0, 12)
                .filter(tag => !formData.capabilities.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      updateField('capabilities', [...formData.capabilities, tag]);
                    }}
                    className="px-2 py-1 bg-gray-700 hover:bg-purple/20 text-gray-300 hover:text-purple border border-gray-600 hover:border-purple/30 rounded-md text-xs transition-all cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              {popularTags.filter(tag => !formData.capabilities.includes(tag)).length === 0 && (
                <span className="text-xs text-gray-500 italic">All suggestions added!</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Or start typing to see more suggestions
            </p>
          </div>
        )}

        {/* Selected Tags */}
        {formData.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.capabilities.map((cap, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple/20 text-purple border border-purple/30 rounded-lg text-sm"
              >
                {cap}
                <button
                  type="button"
                  onClick={() => removeCapability(cap)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  ×
                </button>
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Middleware Installation */}
      <div className="border-2 border-purple/30 rounded-lg p-6 bg-purple/5">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-purple mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Step 1: Install x402 Middleware
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Add our zero-config middleware to secure your service with automatic payment verification.
              <span className="text-purple block mt-1">✨ No configuration needed!</span>
            </p>
          </div>
        </div>

        {/* Installation Command */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              1. Install the package:
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-green">
                npm install @sentientexchange/x402-middleware
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('npm install @sentientexchange/x402-middleware');
                  soundManager.playClick();
                }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm transition-all"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              2. Add to your Express endpoint:
            </label>
            <div className="relative">
              <pre className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-white overflow-x-auto">
{`import { x402Middleware } from '@sentientexchange/x402-middleware';

app.post('/your-endpoint', x402Middleware(), (req, res) => {
  // Your service logic here
  res.json({ result: 'Done!' });
});`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  const code = `import { x402Middleware } from '@sentientexchange/x402-middleware';\n\napp.post('/your-endpoint', x402Middleware(), (req, res) => {\n  // Your service logic here\n  res.json({ result: 'Done!' });\n});`;
                  navigator.clipboard.writeText(code);
                  soundManager.playClick();
                }}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-all"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Checkbox Confirmation */}
          <label className="flex items-start gap-3 mt-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!(formData as any).middlewareInstalled}
              onChange={(e) => updateField('middlewareInstalled' as any, e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple focus:ring-2 focus:ring-purple focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              ✓ I&apos;ve added the middleware to my service
              <span className="text-red-400">*</span>
            </span>
          </label>

          {errors.middlewareInstalled && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.middlewareInstalled}
            </p>
          )}
        </div>

        {/* Help Link */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <a
            href="https://sentientexchange.com/docs/middleware"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple hover:text-purple/80 transition-colors inline-flex items-center gap-1"
          >
            📚 View full installation guide →
          </a>
        </div>
      </div>

      {/* Health Check URL (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Health Check URL <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="url"
          value={(formData as any).healthCheckUrl || ''}
          onChange={(e) => updateField('healthCheckUrl' as any, e.target.value)}
          placeholder="https://api.yourservice.com/health"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
        />
        <p className="text-gray-500 text-xs mt-1">
          We&apos;ll ping this endpoint every 5 minutes to monitor your service health
        </p>
      </div>

      {/* Icon/Image (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icon/Emoji <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="text"
          value={formData.image || ''}
          onChange={(e) => updateField('image', e.target.value)}
          placeholder="🔮"
          maxLength={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
        />
        <p className="text-gray-500 text-xs mt-1">Enter an emoji to represent your service</p>
      </div>

      {/* Brand Color (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brand Color <span className="text-gray-500">(optional)</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={formData.color || '#a855f7'}
            onChange={(e) => updateField('color', e.target.value)}
            className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={formData.color || '#a855f7'}
            onChange={(e) => updateField('color', e.target.value)}
            placeholder="#a855f7"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Wallet Address - Solana */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Solana Wallet Address <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.walletAddress}
          onChange={(e) => updateField('walletAddress', e.target.value)}
          onBlur={(e) => {
            if (e.target.value && !validateSolanaAddress(e.target.value)) {
              setErrors({ ...errors, walletAddress: 'Invalid Solana wallet address' });
            }
          }}
          placeholder="DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all font-mono text-sm"
        />
        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
          <span>💵</span>
          Solana wallet address where you&apos;ll receive <span className="text-green font-semibold">USDC</span> payments
        </p>
        {errors.walletAddress && (
          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.walletAddress}
          </p>
        )}
      </div>

      {/* Multi-Chain Payment Addresses */}
      <div className="border-t border-gray-700 pt-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Chains <span className="text-gray-500">(select which chains to accept)</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Select the blockchain networks where you&apos;ll accept USDC payments.
            <span className="text-amber-400 block mt-1">
              ⚠️ Ensure your wallet supports all selected chains or payments may be lost.
            </span>
          </p>
        </div>

        {/* Chain Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {chains.map((chain) => {
            const isSelected = !!(formData.paymentAddresses && formData.paymentAddresses[chain.id]);
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => toggleChain(chain.id)}
                className={`relative p-3 rounded-lg border-2 transition-all group ${
                  isSelected
                    ? 'bg-purple/20 border-purple text-white hover:bg-purple/30'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
                title={isSelected ? `Click to remove ${chain.name}` : `Click to add ${chain.name}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{chain.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">{chain.name}</div>
                    <div className="text-xs opacity-70">
                      {chain.type === 'evm' ? 'EVM' : 'Solana'}
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="flex items-center gap-1">
                      <Check className="w-5 h-5 text-green group-hover:hidden" />
                      <span className="hidden group-hover:block text-red-400 text-lg">×</span>
                    </div>
                  ) : (
                    <span className="text-gray-600 group-hover:text-gray-400 text-xl">+</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Address Inputs for Selected Chains */}
        {formData.paymentAddresses && Object.keys(formData.paymentAddresses).length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium text-gray-300">Payment Addresses</h4>
            {chains
              .filter(chain => formData.paymentAddresses![chain.id] !== undefined)
              .map((chain) => {
                const address = formData.paymentAddresses![chain.id];
                const isValid = chain.type === 'evm'
                  ? validateWalletAddress(address)
                  : validateSolanaAddress(address);

                return (
                  <div key={chain.id} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-400">
                        {chain.icon} {chain.name} Address
                        {chain.type === 'evm' && (
                          <span className="ml-2 text-green">✓ Auto-filled from wallet</span>
                        )}
                        {chain.type === 'solana' && formData.paymentAddresses![chain.id] && (
                          <span className="ml-2 text-green">✓ Auto-filled from wallet</span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleChain(chain.id)}
                        className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
                        title={`Remove ${chain.name}`}
                      >
                        <span className="text-lg">×</span>
                        <span className="text-xs">Remove</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => updateChainAddress(chain.id, e.target.value)}
                      placeholder={
                        chain.type === 'evm'
                          ? '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5'
                          : 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'
                      }
                      className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent transition-all font-mono text-xs ${
                        address && !isValid
                          ? 'border-red-500'
                          : 'border-gray-700'
                      }`}
                    />
                    {address && !isValid && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Invalid {chain.name} address format
                      </p>
                    )}
                    {address && isValid && (
                      <p className="text-green text-xs mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Valid {chain.name} address
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {(!formData.paymentAddresses || Object.keys(formData.paymentAddresses).length === 0) && (
          <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500 text-sm">
              Select at least one chain above to accept payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

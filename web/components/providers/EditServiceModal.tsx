'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { Service } from '@/lib/types';
import { MarketplaceAPI, ServiceUpdateInput } from '@/lib/marketplace-api';
import { soundManager } from '@/lib/sound';

interface EditServiceModalProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedService: Service) => void;
}

export default function EditServiceModal({
  service,
  isOpen,
  onClose,
  onSuccess,
}: EditServiceModalProps) {
  const [formData, setFormData] = useState({
    name: service.name,
    description: service.description,
    endpoint: service.endpoint,
    price: service.pricing.perRequest,
    capabilities: service.capabilities.join(', '),
    image: (service.metadata as any)?.image || '🔮',
    color: (service.metadata as any)?.color || '#a855f7',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when service changes
  useEffect(() => {
    setFormData({
      name: service.name,
      description: service.description,
      endpoint: service.endpoint,
      price: service.pricing.perRequest,
      capabilities: service.capabilities.join(', '),
      image: (service.metadata as any)?.image || '🔮',
      color: (service.metadata as any)?.color || '#a855f7',
    });
    setError('');
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Prepare update payload
      const updates: ServiceUpdateInput = {
        name: formData.name,
        description: formData.description,
        endpoint: formData.endpoint,
        pricing: {
          perRequest: formData.price,
        },
        capabilities: formData.capabilities
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0),
        image: formData.image,
        color: formData.color,
      };

      // Call API
      const updatedService = await MarketplaceAPI.updateService(service.id, updates);

      soundManager.playSuccessChord();
      onSuccess(updatedService);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
    } finally{
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50"
          >
            <div className="glass rounded-2xl border border-gray-800 p-6 md:p-8 h-full md:h-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold gradient-text">
                  Edit Service
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Service Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors resize-none"
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Endpoint URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Endpoint URL *
                  </label>
                  <input
                    type="url"
                    value={formData.endpoint}
                    onChange={(e) => handleChange('endpoint', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors"
                    placeholder="https://api.example.com/service"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price per Request *
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors"
                    placeholder="$0.05"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Capabilities */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capabilities (comma separated) *
                  </label>
                  <input
                    type="text"
                    value={formData.capabilities}
                    onChange={(e) => handleChange('capabilities', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors"
                    placeholder="text-analysis, sentiment, ml"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Icon & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Icon/Emoji
                    </label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => handleChange('image', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors text-center text-2xl"
                      maxLength={10}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Brand Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleChange('color', e.target.value)}
                        className="w-16 h-12 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer"
                        disabled={isSubmitting}
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => handleChange('color', e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple transition-colors"
                        placeholder="#a855f7"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Preview:</div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${formData.color}20, ${formData.color}40)`,
                        border: `2px solid ${formData.color}60`,
                      }}
                    >
                      {formData.image}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{formData.name}</div>
                      <div className="text-sm text-gray-400">{formData.price}/request</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple to-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

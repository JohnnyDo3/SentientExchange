'use client';

import { motion } from 'framer-motion';
import { Star, DollarSign, Clock, CheckCircle, Zap } from 'lucide-react';
import { ServiceFormData } from './ServiceRegistrationForm';

interface ServicePreviewProps {
  formData: ServiceFormData;
}

export default function ServicePreview({ formData }: ServicePreviewProps) {
  const price = formData.price ? parseFloat(formData.price) : 0;
  const hasRequiredFields = formData.name && formData.description && formData.endpoint && formData.price;

  return (
    <div className="sticky top-6">
      <h3 className="text-2xl font-bold gradient-text mb-4">Live Preview</h3>
      <p className="text-gray-400 text-sm mb-6">
        This is how your service will appear in the marketplace
      </p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 border border-gray-800 hover:border-purple/50 transition-all"
      >
        {/* Header with icon and name */}
        <div className="flex items-start gap-4 mb-4">
          {/* Service Icon */}
          <div
            className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: `linear-gradient(135deg, ${formData.color || '#a855f7'}20, ${formData.color || '#a855f7'}40)`,
              border: `2px solid ${formData.color || '#a855f7'}60`
            }}
          >
            {formData.image || '🔮'}
          </div>

          {/* Name and Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-1">
              {formData.name || 'service-name'}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">
              {formData.description || 'Service description will appear here...'}
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-5 h-5 text-gray-600 fill-gray-600" />
            <span className="text-lg font-bold text-gray-600">0.0</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBadge
            icon={<DollarSign className="w-4 h-4 text-green" />}
            label="Price"
            value={price > 0 ? `$${price.toFixed(3)}` : '$0.000'}
          />
          <StatBadge
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="Speed"
            value="~2s"
          />
          <StatBadge
            icon={<CheckCircle className="w-4 h-4 text-green" />}
            label="Success"
            value="-%"
          />
          <StatBadge
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="Jobs"
            value="0"
          />
        </div>

        {/* Capabilities */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-purple rounded-full" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Capabilities</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {formData.capabilities.length > 0 ? (
              <>
                {formData.capabilities.slice(0, 4).map((cap, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-purple/20 text-purple rounded border border-purple/30"
                  >
                    {cap}
                  </span>
                ))}
                {formData.capabilities.length > 4 && (
                  <span className="text-xs px-2 py-1 text-gray-500">
                    +{formData.capabilities.length - 4} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-600">No capabilities added yet</span>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            0 reviews • 0 completed
          </p>
        </div>

        {/* Status Badge */}
        {!hasRequiredFields && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400">
              ⚠️ Fill in all required fields to enable submission
            </p>
          </div>
        )}

        {hasRequiredFields && (
          <div className="mt-4 p-3 bg-green/10 border border-green/30 rounded-lg">
            <p className="text-xs text-green">
              ✓ Ready to submit! Your service will go live once approved
            </p>
          </div>
        )}
      </motion.div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-2">What happens next?</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Your service will be reviewed by our team</li>
          <li>• Approval typically takes 24-48 hours</li>
          <li>• Once approved, your service goes live immediately</li>
          <li>• Payments are sent to your wallet automatically</li>
        </ul>
      </div>
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}

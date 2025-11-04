'use client';

import { motion } from 'framer-motion';
import { Star, DollarSign, TrendingUp, Edit, Trash2, BarChart3, Play, Pause } from 'lucide-react';
import { Service } from '@/lib/types';
import { soundManager } from '@/lib/sound';

interface ServiceListProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
  onViewAnalytics?: (service: Service) => void;
  onToggleActive?: (service: Service) => void;
}

export default function ServiceList({
  services,
  onEdit,
  onDelete,
  onViewAnalytics,
  onToggleActive
}: ServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Services Yet</h3>
        <p className="text-gray-400 mb-6">
          You haven't registered any services. Get started by creating your first service!
        </p>
        <a
          href="/providers/register"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple to-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform"
        >
          Register Your First Service
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service, index) => (
        <ServiceItem
          key={service.id}
          service={service}
          index={index}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}

function ServiceItem({
  service,
  index,
  onEdit,
  onDelete,
  onViewAnalytics,
  onToggleActive
}: {
  service: Service;
  index: number;
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
  onViewAnalytics?: (service: Service) => void;
  onToggleActive?: (service: Service) => void;
}) {
  const price = parseFloat(service.pricing.perRequest.replace('$', ''));
  const revenue = (service.reputation.totalJobs * price).toFixed(2);
  const isActive = true; // TODO: Get from service status

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass rounded-xl p-6 border border-gray-800 hover:border-purple/50 transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Service Icon & Info */}
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: `linear-gradient(135deg, ${service.color || '#a855f7'}20, ${service.color || '#a855f7'}40)`,
              border: `2px solid ${service.color || '#a855f7'}60`
            }}
          >
            {service.image || '🔮'}
          </div>

          {/* Name & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white">{service.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                isActive
                  ? 'bg-green/20 text-green border border-green/30'
                  : 'bg-gray-700 text-gray-400 border border-gray-600'
              }`}>
                {isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
              {service.description}
            </p>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1.5">
              {service.capabilities.slice(0, 3).map((cap, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-purple/20 text-purple rounded border border-purple/30"
                >
                  {cap}
                </span>
              ))}
              {service.capabilities.length > 3 && (
                <span className="text-xs px-2 py-0.5 text-gray-500">
                  +{service.capabilities.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-3">
          <StatBox
            icon={<DollarSign className="w-4 h-4 text-green" />}
            label="Revenue"
            value={`$${revenue}`}
            trend="+23%"
          />
          <StatBox
            icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
            label="Requests"
            value={service.reputation.totalJobs.toLocaleString()}
            trend="+12"
          />
          <StatBox
            icon={<Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
            label="Rating"
            value={service.reputation.rating.toFixed(1)}
            subtitle={`${service.reputation.reviews} reviews`}
          />
          <StatBox
            icon={<DollarSign className="w-4 h-4 text-purple" />}
            label="Price"
            value={service.pricing.perRequest}
            subtitle="per request"
          />
        </div>

        {/* Actions */}
        <div className="flex md:flex-col gap-2">
          {onViewAnalytics && (
            <button
              onClick={() => {
                soundManager.playClick();
                onViewAnalytics(service);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
              title="View Analytics"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="md:hidden">Analytics</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => {
                soundManager.playClick();
                onEdit(service);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
              title="Edit Service"
            >
              <Edit className="w-4 h-4" />
              <span className="md:hidden">Edit</span>
            </button>
          )}

          {onToggleActive && (
            <button
              onClick={() => {
                soundManager.playClick();
                onToggleActive(service);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
              title={isActive ? 'Pause Service' : 'Activate Service'}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="md:hidden">{isActive ? 'Pause' : 'Activate'}</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                soundManager.playClick();
                if (confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) {
                  onDelete(service);
                }
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg transition-all"
              title="Delete Service"
            >
              <Trash2 className="w-4 h-4" />
              <span className="md:hidden">Delete</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({
  icon,
  label,
  value,
  trend,
  subtitle
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-sm font-bold text-white">{value}</div>
        {trend && (
          <span className="text-xs text-green">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

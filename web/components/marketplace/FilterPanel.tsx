'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ServiceFilters } from '@/lib/types';
import { getAllCapabilities100, getPriceRange100 } from '@/lib/mock-services-100';
import { Star, DollarSign, X } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface FilterPanelProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: Partial<ServiceFilters>) => void;
  onClearFilters: () => void;
}

export default function FilterPanel({ filters, onFiltersChange, onClearFilters }: FilterPanelProps) {
  const [allCapabilities, setAllCapabilities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0.1 });

  useEffect(() => {
    setAllCapabilities(getAllCapabilities100());
    setPriceRange(getPriceRange100());
  }, []);

  const toggleCapability = (capability: string) => {
    soundManager.playClick();
    const currentCaps = filters.capabilities || [];
    const newCaps = currentCaps.includes(capability)
      ? currentCaps.filter(c => c !== capability)
      : [...currentCaps, capability];
    onFiltersChange({ capabilities: newCaps });
  };

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    onFiltersChange({
      [type === 'min' ? 'minPrice' : 'maxPrice']: value
    });
  };

  const handleRatingChange = (rating: number) => {
    soundManager.playClick();
    onFiltersChange({
      minRating: filters.minRating === rating ? undefined : rating
    });
  };

  const hasActiveFilters =
    (filters.capabilities && filters.capabilities.length > 0) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.minRating !== undefined;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl md:rounded-3xl p-4 md:p-6 h-full overflow-y-auto hide-scrollbar"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-xl md:text-2xl font-bold gradient-text">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={() => {
              soundManager.playClick();
              onClearFilters();
            }}
            className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      {/* Capabilities */}
      <div className="mb-6 md:mb-8">
        <h4 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
          <span className="w-1 h-4 md:h-6 bg-purple rounded-full" />
          Capabilities
        </h4>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {allCapabilities.map(cap => {
            const isSelected = filters.capabilities?.includes(cap);
            return (
              <button
                key={cap}
                onClick={() => toggleCapability(cap)}
                className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple to-pink text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cap}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6 md:mb-8">
        <h4 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green" />
          Price Range
        </h4>

        <div className="space-y-3 md:space-y-4">
          {/* Min Price */}
          <div>
            <label className="text-xs md:text-sm text-gray-400 mb-1 block">
              Min: ${(filters.minPrice || priceRange.min).toFixed(3)}
            </label>
            <input
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              step={0.001}
              value={filters.minPrice || priceRange.min}
              onChange={(e) => handlePriceChange('min', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-purple"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="text-xs md:text-sm text-gray-400 mb-1 block">
              Max: ${(filters.maxPrice || priceRange.max).toFixed(3)}
            </label>
            <input
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              step={0.001}
              value={filters.maxPrice || priceRange.max}
              onChange={(e) => handlePriceChange('max', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-purple"
            />
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-4 md:mb-6">
        <h4 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm md:text-base">Min Rating</span>
        </h4>
        <div className="flex gap-1 md:gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(rating => {
            const isSelected = filters.minRating === rating;
            return (
              <button
                key={rating}
                onClick={() => handleRatingChange(rating)}
                className={`flex items-center justify-center gap-0.5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple to-pink text-white scale-105'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span className="text-xs md:text-sm font-semibold">{rating}</span>
                <Star className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 ${isSelected ? 'fill-white' : 'fill-gray-400'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort By */}
      <div className="mb-6 md:mb-8">
        <h4 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
          <span className="w-1 h-4 md:h-6 bg-blue rounded-full" />
          Sort By
        </h4>
        <select
          value={filters.sortBy || ''}
          onChange={(e) => {
            soundManager.playClick();
            onFiltersChange({ sortBy: e.target.value as any || undefined });
          }}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple focus:outline-none text-sm"
        >
          <option value="">Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating-desc">Rating: High to Low</option>
          <option value="rating-asc">Rating: Low to High</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
        </select>
      </div>

      {/* Active Filters Count */}
      {hasActiveFilters && (
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-800">
          <p className="text-xs md:text-sm text-gray-400">
            {(filters.capabilities?.length || 0) +
             (filters.minPrice !== undefined ? 1 : 0) +
             (filters.maxPrice !== undefined ? 1 : 0) +
             (filters.minRating !== undefined ? 1 : 0)} filter(s) active
          </p>
        </div>
      )}

      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          cursor: pointer;
        }
        .slider-purple::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </motion.div>
  );
}

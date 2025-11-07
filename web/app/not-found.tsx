'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Home, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-dark via-dark-secondary to-dark">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple/20 via-transparent to-blue/20 animate-pulse-slow" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <h1 className="text-[12rem] md:text-[20rem] font-bold leading-none mb-4">
            <span className="gradient-text text-glow-lg">404</span>
          </h1>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Lost in the Marketplace?
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
            This AI service doesn't exist... yet. Maybe you should create it?
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="/"
            className="btn-primary text-lg group"
          >
            <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Go Home
          </a>
          <a
            href="/marketplace"
            className="btn-secondary text-lg group"
          >
            <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Browse Services
          </a>
          <button
            onClick={() => window.history.back()}
            className="btn-tertiary text-lg group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </motion.div>

        {/* Popular Pages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 pt-8 border-t border-gray-800"
        >
          <p className="text-gray-500 text-sm uppercase tracking-wide mb-4">
            Popular Pages
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/marketplace" className="text-purple hover:text-purple-light transition-colors">
              Marketplace
            </a>
            <span className="text-gray-700">•</span>
            <a href="/docs" className="text-purple hover:text-purple-light transition-colors">
              Documentation
            </a>
            <span className="text-gray-700">•</span>
            <a href="/about" className="text-purple hover:text-purple-light transition-colors">
              About
            </a>
            <span className="text-gray-700">•</span>
            <a href="https://github.com/anthropics/claude-mcp" className="text-purple hover:text-purple-light transition-colors">
              GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
